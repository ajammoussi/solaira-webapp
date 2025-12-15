"""
Configuration module for energy management pipeline.
Loads environment variables and provides central config object.
"""

import os
from pathlib import Path
try:
    from dotenv import load_dotenv
except Exception:
    def load_dotenv(_path=None):
        return False

# Load .env file (graceful if python-dotenv not installed)
env_path = Path(__file__).parent.parent / '.env'
try:
    load_dotenv(env_path)
except Exception:
    pass

class Config:
    """Central configuration for orchestrator."""
    
    # Database (SQLite)
    DB_PATH = os.getenv('DB_PATH', str(Path(__file__).parent.parent / 'database' / 'energy.db'))
    
    # Location (for weather fetching and energy system placement)
    LATITUDE = float(os.getenv('LATITUDE', 36.8065))  # Default: Tunisia
    LONGITUDE = float(os.getenv('LONGITUDE', 10.1815))
    LOCATION_NAME = os.getenv('LOCATION_NAME', 'Tunisia')
    
    # Weather API
    # Weather API keys (OpenWeather primary). Support both OPENWEATHER_API_KEY and WEATHER_API_KEY for backward compatibility.
    WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
    OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', WEATHER_API_KEY)
    WEATHER_API_PROVIDER = os.getenv('WEATHER_API_PROVIDER', 'auto')  # 'openweather', 'nasa', 'mock', 'auto'
    WEATHER_API_URL = os.getenv('WEATHER_API_URL', 'https://api.nasa.gov/planetary/earth/assets')
    
    # Model paths
    MODEL_DIR = Path(__file__).parent / 'models'
    
    # Wind model paths (hybrid ensemble: LSTM + XGBoost)
    # Models copied from backend/useful1/final_delivery/models/
    WIND_MODEL_DIR = MODEL_DIR / 'wind'
    WIND_LSTM_MODEL_PATH = WIND_MODEL_DIR / 'best_energy_lstm_model.onnx'
    WIND_XGBOOST_MODEL_PATH = WIND_MODEL_DIR / 'energy_xgboost_pure_forecast.json'
    WIND_SCALER_PATH = WIND_MODEL_DIR / 'scaler.pkl'
    
    # PV model path (optional for now)
    PV_MODEL_PATH = MODEL_DIR / 'pv_model.onnx'  # Placeholder
    
    # Consumption model path (optional)
    CONSUMPTION_MODEL_PATH = MODEL_DIR / 'consumption_model.onnx'  # Placeholder
    
    # Logging
    LOG_DIR = Path(__file__).parent / 'logs'
    LOG_FILE = LOG_DIR / 'orchestrator.log'
    
    # Feature specs
    HISTORIC_DAYS = 40
    FORECAST_DAYS_AHEAD = 1
    
    # Battery configuration
    BATTERY_CAPACITY_KWH = 10.0  # Total battery capacity in kWh
    BATTERY_EXPORT_THRESHOLD_SOC = 80  # Export when SOC > 80%
    BATTERY_IMPORT_THRESHOLD_SOC = 20  # Alert and import when SOC < 20%
    BATTERY_MAX_CHARGE_KW = 5.0  # Max charging rate
    BATTERY_MAX_DISCHARGE_KW = 5.0  # Max discharge rate

    # Minimal operational energy thresholds (kWh)
    PV_MIN_OPERATE_KWH = float(os.getenv('PV_MIN_OPERATE_KWH', 0.5))
    WIND_MIN_OPERATE_KWH = float(os.getenv('WIND_MIN_OPERATE_KWH', 0.3))
    
    @staticmethod
    def validate():
        """Validate configuration and warn about missing models."""
        missing = []
        
        # Wind models are required for accurate wind predictions
        if not Config.WIND_LSTM_MODEL_PATH.exists():
            missing.append(f"Wind LSTM: {Config.WIND_LSTM_MODEL_PATH}")
        if not Config.WIND_XGBOOST_MODEL_PATH.exists():
            missing.append(f"Wind XGBoost: {Config.WIND_XGBOOST_MODEL_PATH}")
        if not Config.WIND_SCALER_PATH.exists():
            missing.append(f"Wind Scaler: {Config.WIND_SCALER_PATH}")

        if missing:
            print("[Config] WARNING: Missing models will use fallback predictions:")
            for msg in missing:
                print(f"  - {msg}")
        else:
            print("[Config] OK: All wind models loaded successfully.")

# Create log directory if not exists
Config.LOG_DIR.mkdir(exist_ok=True)

# Instance
config = Config()
