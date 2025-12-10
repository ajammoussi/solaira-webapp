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

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.core.phase_1.data_processing import prepare_features_for_ml
from backend.core.phase_2.simulator import EnergySimulator
from backend.core.phase_3.maintenance import PerformanceRatioCalculator, MaintenanceAnalyzer

app = FastAPI(title="PV Production Prediction API", version="1.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev. In production, specify the frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables to store models
models = {}
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'core', 'phase_2', 'system_config.yaml')
CONSUMPTION_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'processed_power_usage_2023_2024.csv')
PV_DATA_PATH = os.path.join(os.path.dirname(__file__), 'data', 'processed_pv_data_2023_2024.csv')

# Initialize Simulator
simulator = None
consumption_df = None
pv_df = None

class WeatherData(BaseModel):
    timestamp: str  # ISO format
    ALLSKY_SFC_SW_DWN: float
    T2M: float
    RH2M: float
    WS10M: float
    WD10M: float
    # Add other fields if necessary

class PredictionRequest(BaseModel):
    data: List[WeatherData]
    model_type: str = "xgboost"  # xgboost, lstm, sarima

class SimulationRequest(BaseModel):
    weather_data: Optional[List[WeatherData]] = None
    current_soc: float
    consumption_profile: Optional[List[float]] = None # Hourly consumption for the period
    date: Optional[str] = None # Date to simulate (YYYY-MM-DD)

class MaintenanceRequest(BaseModel):
    actual_production: List[float] # Daily actuals
    predicted_production: List[float] # Daily predictions
    dates: List[str] # ISO dates

@app.on_event("startup")
async def load_models():
    """
    Load trained models on startup
    """
    global simulator, consumption_df, pv_df
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
        # We need a default config file. For now, we'll assume one exists or create a dummy one.
        # If config path doesn't exist, we might fail or use defaults.
        if os.path.exists(CONFIG_PATH):
             simulator = EnergySimulator(CONFIG_PATH, MODELS_DIR)
             print("Energy Simulator initialized.")
        else:
            print(f"Warning: Config not found at {CONFIG_PATH}. Simulator not initialized.")

    except Exception as e:
        print(f"Error loading models: {e}")

@app.get("/")
def read_root():
    return {"message": "PV Production Prediction API is running"}

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
        # Convert input to DataFrame
        data_dicts = [item.dict() for item in request.data]
        df = pd.DataFrame(data_dicts)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df.set_index('timestamp', inplace=True)
        
        # Prepare features
        # We need to ensure the input dataframe has the same structure as training data
        # prepare_features_for_ml expects certain columns.
        # It calculates rolling averages, so we might need historical data or just accept that
        # the first few predictions might be NaN if we don't provide enough context.
        
        # For simplicity, we'll assume the user provides enough data or we handle NaNs.
        
        # Note: prepare_features_for_ml adds columns like 'hour', 'month', etc.
        df_features = prepare_features_for_ml(df)
        
        # Filter columns to match training features
        if 'xgboost_features' in models:
            feature_cols = models['xgboost_features']
            # Add missing columns with 0 or appropriate default
            for col in feature_cols:
                if col not in df_features.columns:
                    df_features[col] = 0
            
            X = df_features[feature_cols]
        else:
            # Fallback if feature list not found
            X = df_features.select_dtypes(include=[np.number])
            
        # Predict
        predictions = models['xgboost'].predict(X)
        
        # Format response
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
        
        # Determine target date (default to today)
        target_date = pd.to_datetime(request.date) if request.date else pd.Timestamp.now()
        # Shift to last year
        historical_date = target_date.replace(year=target_date.year - 1)
        
        # 1. Get Weather/Production Data
        if request.weather_data:
            # Use provided weather data
            data_dicts = [item.dict() for item in request.weather_data]
            df_weather = pd.DataFrame(data_dicts)
            df_weather['timestamp'] = pd.to_datetime(df_weather['timestamp'])
            df_weather.set_index('timestamp', inplace=True)
        elif pv_df is not None:
            # Look up historical weather/features
            # Filter for the specific day and year
            day_data = pv_df[
                (pv_df['datetime'].dt.year == historical_date.year) &
                (pv_df['datetime'].dt.month == historical_date.month) &
                (pv_df['datetime'].dt.day == historical_date.day)
            ].copy()
            
            if not day_data.empty:
                day_data.set_index('datetime', inplace=True)
                # Resample to ensure hourly frequency
                day_data = day_data.resample('h').mean().fillna(method='ffill').fillna(method='bfill')
                df_weather = day_data
            else:
                # Fallback if exact date missing (e.g. leap year issues or missing data)
                # Try to find ANY data for this month/day from other years
                print(f"Warning: No data found for {historical_date}, trying other years.")
                day_data = pv_df[
                    (pv_df['datetime'].dt.month == historical_date.month) &
                    (pv_df['datetime'].dt.day == historical_date.day)
                ].copy()
                
                if not day_data.empty:
                    # Take the first 24 hours found (likely from another year)
                    day_data = day_data.iloc[:24].copy()
                    day_data.set_index('datetime', inplace=True)
                    # Reset index to match requested date to avoid frequency issues? 
                    # Actually, simulator might not care about the exact date, just the profile.
                    # But prepare_features_for_ml might.
                    df_weather = day_data
                else:
                    print(f"Warning: No data found for {historical_date} in any year, using first available day.")
                    df_weather = pv_df.iloc[:24].copy()
                    df_weather.set_index('datetime', inplace=True)
        else:
             raise HTTPException(status_code=400, detail="No weather data provided and historical data not available.")

        # 2. Get Consumption Data
        consumption_profile = request.consumption_profile
        
        if not consumption_profile:
            if consumption_df is None:
                 # Fallback if no data loaded
                 consumption_profile = [0.5] * len(df_weather)
            else:
                # Look up consumption based on month, day
                # Filter for the specific day
                day_cons = consumption_df[
                    (consumption_df['Datetime'].dt.month == historical_date.month) &
                    (consumption_df['Datetime'].dt.day == historical_date.day)
                ].sort_values('hour')
                
                if not day_cons.empty:
                    # Ensure we have 24 hours or match weather length
                    consumption_profile = day_cons['consumption_kwh'].tolist()
                    # Pad or truncate if necessary
                    if len(consumption_profile) < 24:
                        consumption_profile += [0.5] * (24 - len(consumption_profile))
                    consumption_profile = consumption_profile[:24]
                else:
                    # Fallback average
                    consumption_profile = [0.5] * 24

        result = simulator.simulate_scenario(
            weather_data=df_weather,
            current_soc=request.current_soc,
            consumption_profile=consumption_profile
        )
        
        return result
        
    except Exception as e:
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
        
        # Include PR history in response
        pr_history = pr_df[['date', 'pr']].dropna().to_dict(orient='records')
        
        return {
            "analysis": analysis,
            "pr_history": pr_history
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/retrain")
async def retrain_endpoint():
    """
    Trigger model retraining (background task in real scenario)
    """
    # In a real app, use BackgroundTasks
    from backend.core.phase_1.retrain_models import main as retrain_main
    try:
        retrain_main()
        # Reload models
        await load_models()
        return {"message": "Retraining completed and models reloaded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
