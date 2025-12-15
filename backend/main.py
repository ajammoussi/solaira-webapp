from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import joblib
import os
import sys
from datetime import datetime
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import logging

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.phase_1.data_processing import prepare_features_for_ml
from backend.core.phase_2.simulator import EnergySimulator
from backend.core.phase_2.realtime_manager import RealtimeEnergyManager
from backend.core.phase_3.maintenance import PerformanceRatioCalculator, MaintenanceAnalyzer
from backend.core.phase_3.pv_monitor import get_monitoring_service
from backend.chatbot.src import SupportAgent, MESSAGES, rate_limited

# Load environment variables
# Explicitly load .env.local from the project root
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
env_path = os.path.join(root_dir, '.env.local')
load_dotenv(dotenv_path=env_path)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables to store models
models = {}
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'core', 'phase_2', 'system_config.yaml')
CONSUMPTION_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'processed_power_usage_2023_2024.csv')
PV_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'processed_pv_data_2023_2024.csv')

# Initialize Simulator
simulator = None
realtime_manager = None
consumption_df = None
pv_df = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context for FastAPI: initialize models and chatbot agent.
    """
    global simulator, realtime_manager, consumption_df, pv_df
    
    # --- Load ML Models & Data ---
    print("Loading models...")
    try:
        xgboost_path = os.path.join(MODELS_DIR, 'production_xgboost.pkl')
        if os.path.exists(xgboost_path):
            models['xgboost'] = joblib.load(xgboost_path)
            print("XGBoost model loaded.")
        
        # Load feature columns for XGBoost
        features_path = os.path.join(MODELS_DIR, 'xgboost_features.json')
        if os.path.exists(features_path):
            import json
            with open(features_path, 'r') as f:
                models['xgboost_features'] = json.load(f)
        
        # Load Consumption Data
        if os.path.exists(CONSUMPTION_DATA_PATH):
            consumption_df = pd.read_csv(CONSUMPTION_DATA_PATH)
            consumption_df['Datetime'] = pd.to_datetime(consumption_df['Datetime'])
            print("Consumption data loaded.")
        else:
            print(f"Warning: Consumption data not found at {CONSUMPTION_DATA_PATH}")

        # Load PV Data
        if os.path.exists(PV_DATA_PATH):
            pv_df = pd.read_csv(PV_DATA_PATH)
            pv_df['datetime'] = pd.to_datetime(pv_df['datetime'])
            print("PV data loaded.")
        else:
            print(f"Warning: PV data not found at {PV_DATA_PATH}")
            
        # Initialize Simulator
        if os.path.exists(CONFIG_PATH):
             simulator = EnergySimulator(CONFIG_PATH, MODELS_DIR)
             print("Energy Simulator initialized.")
             print("SERVER STARTING NOW - VERSION CHECK")
        else:
             print(f"Warning: Config not found at {CONFIG_PATH}")
        
        # Initialize Realtime Manager (for new energy simulation endpoint)
        try:
            realtime_manager = RealtimeEnergyManager(
                config_path=CONFIG_PATH if os.path.exists(CONFIG_PATH) else None,
                battery_capacity_kwh=13.5,
                initial_soc=50.0
            )
            print("✅ Realtime Energy Manager initialized.")
        except Exception as e:
            print(f"⚠️ Realtime Manager initialization failed: {e}")
            realtime_manager = None
             
    except Exception as e:
        print(f"Error loading models: {e}")

    # --- Initialize Chatbot Agent ---
    app.state.agent = None
    app.state.model_names = []

    CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
    MODEL_NAMES = os.getenv("MODEL_NAMES", "llama3.1-8b").split(",")

    if not CEREBRAS_API_KEY:
        logger.warning("CEREBRAS_API_KEY environment variable not found. Chatbot will not function.")
    else:
        logger.info("Initializing SupportAgent with models: %s", MODEL_NAMES)
        try:
            app.state.agent = SupportAgent(
                api_key=CEREBRAS_API_KEY,
                model_names=MODEL_NAMES,
                temperature=0.7,
            )
            app.state.model_names = MODEL_NAMES
        except Exception as e:
            logger.error(f"Failed to initialize SupportAgent: {e}")

    try:
        yield
    finally:
        # cleanup on shutdown
        agent = getattr(app.state, 'agent', None)
        if agent and hasattr(agent, 'close'):
            try:
                close_result = agent.close()
                if close_result and hasattr(close_result, '__await__'):
                    await close_result
            except Exception:
                logger.exception("Error while closing agent during shutdown")


app = FastAPI(title="Solaira Energy API", version="2.0", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev. In production, specify the frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---

class WeatherData(BaseModel):
    timestamp: str  # ISO format
    ALLSKY_SFC_SW_DWN: float
    T2M: float
    RH2M: float
    WS10M: float
    WD10M: float

class PredictionRequest(BaseModel):
    data: List[WeatherData]
    model_type: str = "xgboost"
    model_config = {'protected_namespaces': ()}
    model_config = {'protected_namespaces': ()}

class SimulationRequest(BaseModel):
    weather_data: Optional[List[WeatherData]] = None
    current_soc: float
    consumption_profile: Optional[List[float]] = None
    date: Optional[str] = None

class EnergySimulationRequest(BaseModel):
    """Request for multi-source energy simulation (PV + Wind)"""
    start_time: Optional[str] = None  # ISO format, defaults to now
    hours: int = 24
    initial_soc: float = 50.0
    consumption_profile: Optional[List[float]] = None

class MaintenanceRequest(BaseModel):
    actual_production: List[float]
    predicted_production: List[float]
    dates: List[str]

class ChatRequest(BaseModel):
    message: str
    user_id: str
    energy_data: Optional[dict] = None

class ChatResponse(BaseModel):
    response: str
    error: Optional[str] = None

class HealthResponse(BaseModel):
    status: str
    message: str

class PVSystemConfigRequest(BaseModel):
    num_systems: int
    capacity_per_system: float = 5.0

class MonitoringControlRequest(BaseModel):
    action: str  # 'start' or 'stop'
    interval_seconds: int = 60

# --- Endpoints ---

@app.get("/", response_model=HealthResponse)
def read_root():
    return {
        "status": "healthy",
        "message": "Solaira Energy API is running"
    }

@app.post("/predict")
def predict(request: PredictionRequest):
    """
    Generate predictions based on provided weather data
    """
    if request.model_type not in ['xgboost']:
        raise HTTPException(status_code=400, detail=f"Model {request.model_type} not supported or not loaded yet.")
    
    if 'xgboost' not in models:
        raise HTTPException(status_code=503, detail="XGBoost model not loaded.")
        
    try:
        data_dicts = [item.dict() for item in request.data]
        df = pd.DataFrame(data_dicts)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)
        
        df_features = prepare_features_for_ml(df)
        
        if 'xgboost_features' in models:
            feature_cols = models['xgboost_features']
            for col in feature_cols:
                if col not in df_features.columns:
                    df_features[col] = 0
            X = df_features[feature_cols]
        else:
            X = df_features.select_dtypes(include=[np.number])
            
        predictions = models['xgboost'].predict(X)
        
        results = []
        for i, (idx, val) in enumerate(zip(X.index, predictions)):
            results.append({
                "timestamp": idx.isoformat(),
                "predicted_production_kwh": float(val)
            })
            
        return {"model": "xgboost", "predictions": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate")
def simulate(request: SimulationRequest):
    """
    Run energy simulation and generate advice
    """
    if simulator is None:
        raise HTTPException(status_code=503, detail="Simulator not initialized (Config missing?)")
        
    try:
        df_weather = None
        target_date = pd.to_datetime(request.date) if request.date else pd.Timestamp.now()
        historical_date = target_date.replace(year=target_date.year - 1)
        
        if request.weather_data:
            data_dicts = [item.dict() for item in request.weather_data]
            df_weather = pd.DataFrame(data_dicts)
            df_weather['timestamp'] = pd.to_datetime(df_weather['timestamp'])
            df_weather.set_index('timestamp', inplace=True)
        elif pv_df is not None:
            day_data = pv_df[
                (pv_df['datetime'].dt.year == historical_date.year) &
                (pv_df['datetime'].dt.month == historical_date.month) &
                (pv_df['datetime'].dt.day == historical_date.day)
            ].copy()
            
            if not day_data.empty:
                day_data.set_index('datetime', inplace=True)
                day_data = day_data.resample('h').mean().ffill().bfill()
                df_weather = day_data
            else:
                day_data = pv_df[
                    (pv_df['datetime'].dt.month == historical_date.month) &
                    (pv_df['datetime'].dt.day == historical_date.day)
                ].copy()
                
                if not day_data.empty:
                    day_data = day_data.iloc[:24].copy()
                    day_data.set_index('datetime', inplace=True)
                    df_weather = day_data
                else:
                    df_weather = pv_df.iloc[:24].copy()
                    df_weather.set_index('datetime', inplace=True)
        else:
             raise HTTPException(status_code=400, detail="No weather data provided and historical data not available.")

        consumption_profile = request.consumption_profile
        
        if not consumption_profile:
            if consumption_df is None:
                 consumption_profile = [0.5] * len(df_weather)
            else:
                day_cons = consumption_df[
                    (consumption_df['Datetime'].dt.month == historical_date.month) &
                    (consumption_df['Datetime'].dt.day == historical_date.day)
                ].sort_values('hour')
                
                if not day_cons.empty:
                    consumption_profile = day_cons['consumption_kwh'].tolist()
                    if len(consumption_profile) < 24:
                        consumption_profile += [0.5] * (24 - len(consumption_profile))
                    consumption_profile = consumption_profile[:24]
                else:
                    consumption_profile = [0.5] * 24

        result = simulator.simulate_scenario(
            weather_data=df_weather,
            current_soc=request.current_soc,
            consumption_profile=consumption_profile
        )
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/energy-simulation")
def run_energy_simulation(request: EnergySimulationRequest):
    """
    Run comprehensive energy simulation with PV + Wind + Battery
    
    This endpoint simulates energy flow including:
    - PV energy production (XGBoost 0.45 + LSTM 0.55)
    - Wind energy production (XGBoost 0.53 + LSTM 0.47)
    - Consumption patterns
    - Battery charge/discharge
    
    Returns hourly data suitable for visualization charts
    """
    if realtime_manager is None:
        raise HTTPException(
            status_code=503, 
            detail="Realtime Energy Manager not initialized. Check backend logs."
        )
    
    try:
        # Parse start time or use default to a date with good data coverage
        if request.start_time:
            start_dt = datetime.fromisoformat(request.start_time.replace('Z', '+00:00'))
        else:
            # Default to Dec 1, 2023 - date where we have PV, Wind, and Consumption data
            start_dt = datetime(2023, 12, 1, 0, 0, 0)
        
        # Reset battery to requested SOC
        realtime_manager.reset_battery(request.initial_soc)
        
        # Run simulation
        results = realtime_manager.simulate_period(
            start_time=start_dt,
            hours=request.hours,
            consumption_profile=request.consumption_profile
        )
        
        return {
            "status": "success",
            "simulation_data": results
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/maintenance")
def analyze_maintenance(request: MaintenanceRequest):
    """
    Analyze performance ratio and detect maintenance issues
    """
    try:
        df_actual = pd.DataFrame({
            'date': pd.to_datetime(request.dates),
            'energy_kwh': request.actual_production
        })
        
        df_predicted = pd.DataFrame({
            'date': pd.to_datetime(request.dates),
            'energy_kwh': request.predicted_production
        })
        
        pr_calc = PerformanceRatioCalculator()
        pr_df = pr_calc.calculate_pr(df_actual, df_predicted)
        
        analyzer = MaintenanceAnalyzer()
        analysis = analyzer.analyze(pr_df)
        
        pr_history = pr_df[['date', 'pr']].dropna().to_dict(orient='records')
        
        return {
            "analysis": analysis,
            "pr_history": pr_history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint for the solar AI assistant.
    """
    try:
        # Validate message length
        if len(request.message) > 2000:
            return ChatResponse(
                response="",
                error=MESSAGES["length"]
            )
        
        # Check rate limiting
        if rate_limited(request.user_id):
            return ChatResponse(
                response="",
                error=MESSAGES["rate_limited"]
            )
        
        # Enhance prompt with energy data context if provided
        enhanced_prompt = request.message
        if request.energy_data:
            context = f"""
Current Energy System Status:
- Solar Production: {request.energy_data.get('solar', 0)} kW
- Grid Import: {request.energy_data.get('grid_import', 0)} kW
- Home Consumption: {request.energy_data.get('home_consumption', 0)} kW
- Grid Export: {request.energy_data.get('grid_export', 0)} kW

User Question: {request.message}
"""
            enhanced_prompt = context
        
        # Get AI response
        logger.info(f"Processing request from user: {request.user_id}")
        agent = getattr(app.state, 'agent', None)
        if not agent:
            logger.error("Agent not initialized")
            return ChatResponse(response="", error="Agent not initialized (Check API Key)")

        response_text = await app.state.agent.get_response(
            prompt=enhanced_prompt,
            member_username=request.user_id
        )
        
        return ChatResponse(
            response=response_text,
            error=None
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        return ChatResponse(
            response="",
            error="Sorry, I encountered an error processing your request. Please try again."
        )

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Detailed health check endpoint"""
    model_msg = None
    model_list = getattr(app.state, 'model_names', None)
    if model_list:
        model_msg = f"Agent initialized with model: {model_list[0]}"
    else:
        model_msg = "Agent not yet initialized"

    return {
        "status": "healthy",
        "message": model_msg
    }

# ============================================================================
# PV MONITORING ENDPOINTS
# ============================================================================

@app.post("/api/pv-systems/configure")
def configure_pv_systems(request: PVSystemConfigRequest):
    """
    Configure the number of PV systems to monitor
    """
    try:
        if request.num_systems < 1 or request.num_systems > 20:
            raise HTTPException(status_code=400, detail="Number of systems must be between 1 and 20")
        
        if request.capacity_per_system < 1.0 or request.capacity_per_system > 50.0:
            raise HTTPException(status_code=400, detail="Capacity must be between 1.0 and 50.0 kW")
        
        service = get_monitoring_service()
        result = service.configure_systems(request.num_systems, request.capacity_per_system)
        
        return result
    except Exception as e:
        logger.error(f"Error configuring PV systems: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/pv-systems/monitoring")
def control_monitoring(request: MonitoringControlRequest):
    """
    Start or stop the monitoring service
    """
    try:
        service = get_monitoring_service()
        
        if request.action == 'start':
            result = service.start_monitoring(request.interval_seconds)
        elif request.action == 'stop':
            result = service.stop_monitoring()
        else:
            raise HTTPException(status_code=400, detail="Action must be 'start' or 'stop'")
        
        return result
    except Exception as e:
        logger.error(f"Error controlling monitoring: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pv-systems/status")
def get_systems_status():
    """
    Get current status of all PV systems with anomaly detection
    """
    try:
        service = get_monitoring_service()
        statuses = service.get_all_systems_status()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'systems': statuses,
            'total_systems': len(statuses)
        }
    except Exception as e:
        logger.error(f"Error getting systems status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pv-systems/{system_id}/status")
def get_system_status(system_id: int):
    """
    Get detailed status for a specific PV system
    """
    try:
        service = get_monitoring_service()
        status = service.analyze_system(system_id, hours=2)
        
        if 'error' in status:
            raise HTTPException(status_code=404, detail=status['error'])
        
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pv-systems/{system_id}/history")
def get_system_history(system_id: int, hours: int = 24):
    """
    Get historical data for a specific PV system
    """
    try:
        service = get_monitoring_service()
        history = service.get_system_history(system_id, hours)
        
        return {
            'system_id': system_id,
            'hours': hours,
            'data_points': len(history),
            'history': history
        }
    except Exception as e:
        logger.error(f"Error getting system history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pv-systems/config")
def get_pv_config():
    """
    Get current PV systems configuration
    """
    try:
        service = get_monitoring_service()
        
        return {
            'num_systems': len(service.systems),
            'monitoring_active': service.monitoring_active,
            'systems': [
                {
                    'id': s.system_id,
                    'name': s.name,
                    'capacity_kw': s.capacity_kw,
                    'has_anomaly': s.current_anomaly is not None,
                    'anomaly_type': s.current_anomaly
                }
                for s in service.systems.values()
            ]
        }
    except Exception as e:
        logger.error(f"Error getting PV config: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    # Debug: Print all registered routes
    print("Registered Routes:")
    for route in app.routes:
        if hasattr(route, 'methods'):
            print(f"  {route.path} {route.methods}")
        else:
            print(f"  {route.path}")
            
    uvicorn.run(app, host="0.0.0.0", port=8001)
