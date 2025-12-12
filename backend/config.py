"""
Configuration module for energy management pipeline.
Loads environment variables and provides central config object.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

class Config:
    """Central configuration for orchestrator."""
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'energy_db')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    
    # Weather API
    WEATHER_API_KEY = os.getenv('WEATHER_API_KEY', '')
    WEATHER_API_URL = os.getenv('WEATHER_API_URL', 'https://api.nasa.gov/planetary/earth/assets')
    
    # Model paths
    MODEL_DIR = Path(__file__).parent / 'models'
    PV_MODEL_PATH = MODEL_DIR / 'best_energy_lstm_model.onnx'
    WIND_MODEL_PATH = MODEL_DIR / 'energy_lstm_model.onnx'
    CONSUMPTION_MODEL_PATH = MODEL_DIR / 'energy_xgboost_pure_forecast.json'
    
    # Logging
    LOG_DIR = Path(__file__).parent / 'logs'
    LOG_FILE = LOG_DIR / 'orchestrator.log'
    
    # Feature specs
    HISTORIC_DAYS = 40
    FORECAST_DAYS_AHEAD = 1
    
    # Battery thresholds
    BATTERY_EXPORT_THRESHOLD_SOC = 80  # Export when SOC > 80%
    BATTERY_IMPORT_THRESHOLD_SOC = 20  # Import when SOC < 20%
    
    # Activation thresholds
    MIN_PV_GENERATION_KWH = 0.5
    MIN_WIND_GENERATION_KWH = 0.3
    
    @staticmethod
    def validate():
        """Validate configuration."""
        if not Config.PV_MODEL_PATH.exists():
            raise FileNotFoundError(f"PV model not found: {Config.PV_MODEL_PATH}")
        if not Config.WIND_MODEL_PATH.exists():
            raise FileNotFoundError(f"Wind model not found: {Config.WIND_MODEL_PATH}")
        print("[Config] Validation passed.")

# Create log directory if not exists
Config.LOG_DIR.mkdir(exist_ok=True)

# Instance
config = Config()
