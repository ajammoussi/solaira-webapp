"""
Main orchestration script - runs daily to predict, decide, and store.
Schedule as cron job: 0 6 * * * python -m backend.orchestrator
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.config import config
from backend.utils.database import (
    fetch_historic_data,
    fetch_forecast_data,
    store_predictions,
    store_decisions,
    store_anomalies,
    fetch_actual_generation,
    fetch_predictions_by_date,
    fetch_user_appliances,
    fetch_weekly_actions,
    is_tomorrow_vacation
)
from backend.utils.weather_api_v2 import (
    fetch_weather_forecast,
    store_weather_forecast,
    initialize_weather_provider
)
from backend.utils.decision_engine import compute_decisions
from backend.inference.pv_model import predict_pv
from backend.inference.wind_model import predict_wind
from backend.inference.consumption_model import predict_consumption
from backend.inference.anomaly_detector import detect_anomalies

def setup_logging():
    """Setup logging to file and console."""
    import logging
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(config.LOG_FILE),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)

def run_daily_pipeline():
    """Main orchestration: predict → decide → store."""
    logger = setup_logging()
    
    forecast_date = (datetime.now() + timedelta(days=config.FORECAST_DAYS_AHEAD)).strftime('%Y-%m-%d')
    today = datetime.now().strftime('%Y-%m-%d')
    
    logger.info("=" * 60)
    logger.info(f"Starting daily pipeline for forecast date: {forecast_date}")
    logger.info("=" * 60)
    
    try:
        # Validate configuration
        config.validate()
        
        # Initialize weather provider
        initialize_weather_provider(
            api_key=config.OPENWEATHER_API_KEY,
            provider_type=config.WEATHER_API_PROVIDER
        )
        
        # === STEP 1: FETCH WEATHER FORECAST ===
        logger.info("Step 1: Fetching weather forecast...")
        forecast = fetch_weather_forecast(
            forecast_date=forecast_date,
            latitude=config.LATITUDE,
            longitude=config.LONGITUDE
        )
        store_weather_forecast(forecast, forecast_date)
        logger.info(f"  Forecast: Temp={forecast['temperature_c']}°C, Irradiance={forecast['irradiance_w_m2']}W/m², Wind={forecast['wind_speed_m_s']}m/s")
        
        # === STEP 2: FETCH HISTORIC DATA ===
        logger.info(f"Step 2: Fetching historic data (last {config.HISTORIC_DAYS} days)...")
        historic_data = fetch_historic_data(days=config.HISTORIC_DAYS)
        logger.info(f"  Fetched {len(historic_data)} historic records")
        
        if not historic_data:
            logger.warning("  WARNING: No historic data available. Predictions may be inaccurate.")
        
        # === STEP 3: RUN PREDICTIONS ===
        logger.info("Step 3: Running prediction models...")
        
        # PV prediction (per panel)
        logger.info("  Running PV model...")
        pv_predictions = predict_pv(historic_data, forecast, num_panels=3)
        pv_total = sum([p['value'] for p in pv_predictions])
        logger.info(f"    PV Total: {pv_total:.2f} kWh across {len(pv_predictions)} panels")
        
        # Wind prediction
        logger.info("  Running Wind model...")
        wind_predictions = predict_wind(historic_data, forecast)
        logger.info(f"    Wind: {wind_predictions['value']:.2f} kWh")
        
        # Consumption prediction (apply vacation coefficient if needed)
        logger.info("  Running Consumption model...")
        vacation_flag = is_tomorrow_vacation()
        consumption_prediction = predict_consumption(historic_data, forecast)
        if vacation_flag:
            consumption_prediction['value'] = round(consumption_prediction['value'] * 0.6, 2)
            logger.info("    Vacation mode: applied 0.6 coefficient")
        logger.info(f"    Consumption: {consumption_prediction['value']:.2f} kWh")
        
        predictions = {
            'pv': pv_predictions,
            'wind_tree': wind_predictions,
            'consumption': consumption_prediction
        }
        
        # === STEP 4: STORE PREDICTIONS ===
        logger.info("Step 4: Storing predictions in database...")
        store_predictions(predictions, forecast_date)
        
        # === STEP 5: COMPUTE DECISIONS (PHASE 2) ===
        logger.info("Step 5: Computing Phase 2 decisions...")
        # Fetch user appliances & weekly planned actions (mocked for prototype)
        # Load appliances and weekly actions from DB
        user_appliances = fetch_user_appliances()
        weekly_actions = fetch_weekly_actions(today)

        # Current battery SOC (prototype: assume 50%)
        current_battery_soc = 50.0

        decisions = compute_decisions(
            predictions,
            user_appliances=user_appliances,
            current_battery_soc=current_battery_soc,
            weekly_actions=weekly_actions
        )
        logger.info(f"  PV activate: {decisions['sources']['pv']['activate']}")
        logger.info(f"  Wind activate: {decisions['sources']['wind_tree']['activate']}")
        logger.info(f"  Battery bilan: {decisions['battery']['bilan_kwh']:.2f} kWh")
        logger.info(f"  Microgrid action: {decisions['microgrid']['action']}")
        logger.info(f"  Appliances: {len(decisions['appliances'])} actions scheduled")
        if decisions.get('alerts'):
            for alert in decisions['alerts']:
                logger.warning(f"  ALERT: {alert}")
        
        # === STEP 6: STORE DECISIONS ===
        logger.info("Step 6: Storing decisions in database...")
        store_decisions(decisions, forecast_date)
        
        # === STEP 7: ANOMALY DETECTION ===
        logger.info("Step 7: Running anomaly detection...")
        # Fetch last 7 days of actual generation for anomaly detection
        seven_days_ago = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
        historic_generation = fetch_actual_generation(seven_days_ago, today)
        
        if historic_generation:
            # Target date is the most recent day with actuals; fetch matching predictions
            target_date = max(str(r.get('date')) for r in historic_generation)
            pv_predictions = fetch_predictions_by_date(target_date, source_type='pv')
            anomalies = detect_anomalies(historic_generation, predictions=pv_predictions, num_panels=3)
            if anomalies:
                logger.warning(f"  Found {len(anomalies)} anomalies!")
                for anomaly in anomalies:
                    logger.warning(f"    Panel {anomaly['panel_id']}: {anomaly['type']} (confidence: {anomaly['confidence']:.2f})")
                store_anomalies(anomalies, today)
            else:
                logger.info("  No anomalies detected.")
        else:
            logger.info("  No historic generation data available for anomaly detection.")
        
        logger.info("=" * 60)
        logger.info("Pipeline completed successfully!")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"Pipeline FAILED: {e}", exc_info=True)
        sys.exit(1)

if __name__ == '__main__':
    run_daily_pipeline()
