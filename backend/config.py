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
    
    # Database (MySQL)
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_USER = os.getenv('MYSQL_USER', 'solaira')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
    MYSQL_DATABASE = os.getenv('MYSQL_DATABASE', 'solaira_energy')
    
    # Weather API
    WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
    WEATHER_API_URL = os.getenv('WEATHER_API_URL', 'https://api.nasa.gov/planetary/earth/assets')
    
    # Model paths
    MODEL_DIR = Path(__file__).parent / 'models'
    
    # Wind model paths (hybrid ensemble: LSTM + XGBoost)
    WIND_LSTM_MODEL_PATH = MODEL_DIR / 'best_energy_lstm_model.onnx'
    WIND_XGBOOST_MODEL_PATH = MODEL_DIR / 'energy_xgboost_pure_forecast.json'
    WIND_SCALER_PATH = MODEL_DIR / 'scaler.pkl'
    
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
        """Validate configuration."""
        # Wind models are required for wind inference
        if not Config.WIND_LSTM_MODEL_PATH.exists():
            raise FileNotFoundError(f"Wind LSTM model not found: {Config.WIND_LSTM_MODEL_PATH}")
        if not Config.WIND_XGBOOST_MODEL_PATH.exists():
            raise FileNotFoundError(f"Wind XGBoost model not found: {Config.WIND_XGBOOST_MODEL_PATH}")
        print("[Config] Validation passed (wind models present).")

# Create log directory if not exists
Config.LOG_DIR.mkdir(exist_ok=True)

# Instance
config = Config()
