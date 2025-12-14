"""
Wind-tree generation prediction model.
Hybrid ensemble: LSTM + XGBoost for wind energy forecasting.
Implements exact specifications from final_delivery:
  - Physics-based cut-in (2.5 m/s) and cut-out (25 m/s) speeds
  - Optimized ensemble weights: XGBoost 0.53 + LSTM 0.47
  - Validation error: MAE 0.038 kWh, RMSE 0.079 kWh
Loads trained models from backend/models/wind/ (copied from final_delivery).
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import onnxruntime as ort
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# === ENSEMBLE CONFIGURATION (from final_delivery) ===
WEIGHT_XGB = 0.53      # 53% XGBoost (more accurate on pure forecast)
WEIGHT_LSTM = 0.47     # 47% LSTM (more stable and robust)

# === PHYSICS CONSTRAINTS (from physics_formula.py) ===
CUT_IN_SPEED = 2.5     # No rotation below 2.5 m/s
CUT_OUT_SPEED = 25.0   # Emergency brake above 25 m/s
RATED_SPEED = 11.0     # Nominal operating point

# === VALIDATION ERROR MARGINS ===
# From final_delivery test results: MAE=0.038 kWh, RMSE=0.079 kWh
# Use RMSE as error margin (conservative, accounts for outliers)
BASE_ERROR_MARGIN = 0.079  # kWh


class WindEnergyPredictor:
    """Hybrid LSTM + XGBoost ensemble for wind energy prediction."""
    
    def __init__(self):
        self.scaler = None
        self.xgb_model = None
        self.lstm_session = None
        self.load_models()
    
    def load_models(self):
        """Load scaler, XGBoost, and LSTM models."""
        # Models are now in backend/models/wind/ (copied from final_delivery)
        model_dir = Path(__file__).parent.parent / 'models' / 'wind'
        
        scaler_path = model_dir / 'scaler.pkl'
        xgb_path = model_dir / 'energy_xgboost_pure_forecast.json'
        lstm_path = model_dir / 'best_energy_lstm_model.onnx'
        
        # Load Scaler
        if not scaler_path.exists():
            raise FileNotFoundError(f"Scaler not found at {scaler_path}")
        self.scaler = joblib.load(scaler_path)
        logger.info(f"[Wind Model] Loaded scaler from {scaler_path}")
        
        # Load XGBoost
        if not xgb_path.exists():
            raise FileNotFoundError(f"XGBoost model not found at {xgb_path}")
        self.xgb_model = xgb.Booster()
        self.xgb_model.load_model(str(xgb_path))
        logger.info(f"[Wind Model] Loaded XGBoost from {xgb_path}")
        
        # Load LSTM (ONNX)
        if not lstm_path.exists():
            raise FileNotFoundError(f"LSTM model not found at {lstm_path}")
        
        # Try hardware acceleration providers first, fallback to CPU
        providers = ['OpenVINOExecutionProvider', 'DmlExecutionProvider', 'CPUExecutionProvider']
        try:
            self.lstm_session = ort.InferenceSession(str(lstm_path), providers=providers)
            logger.info(f"[Wind Model] Loaded LSTM from {lstm_path}")
        except Exception as e:
            logger.warning(f"[Wind Model] Could not load requested providers. Falling back to CPU. Error: {e}")
            self.lstm_session = ort.InferenceSession(str(lstm_path))
        
        self.lstm_input_name = self.lstm_session.get_inputs()[0].name
    
    def preprocess_xgboost(self, df_history):
        """
        Prepare data for XGBoost (tabular with lags).
        Expected columns: Energy_kWh, WS_Hub, temperature, pressure.
        Must match training feature order exactly.
        """
        df = df_history.copy()
        
        # Create lags (MUST match training exactly: [1, 2, 3, 6, 12, 24, 48])
        lags = [1, 2, 3, 6, 12, 24, 48]
        for lag in lags:
            df[f'Energy_lag_{lag}'] = df['Energy_kWh'].shift(lag)
            df[f'WS_lag_{lag}'] = df['WS_Hub'].shift(lag)
        
        # Time features
        df['hour'] = df.index.hour if hasattr(df.index, 'hour') else 12
        df['month'] = df.index.month if hasattr(df.index, 'month') else 1
        df['dayofweek'] = df.index.dayofweek if hasattr(df.index, 'dayofweek') else 0
        
        # Use last row for prediction
        last_row = df.iloc[[-1]].copy()
        
        # Features in exact order expected by XGBoost (from final_delivery)
        features = [
            'hour', 'month', 'dayofweek',
            'Energy_lag_1', 'WS_lag_1',
            'Energy_lag_2', 'WS_lag_2',
            'Energy_lag_3', 'WS_lag_3',
            'Energy_lag_6', 'WS_lag_6',
            'Energy_lag_12', 'WS_lag_12',
            'Energy_lag_24', 'WS_lag_24',
            'Energy_lag_48', 'WS_lag_48'
        ]
        
        # Fill NaN lags with 0 (early in sequence when lags don't exist)
        for feat in features:
            if feat not in last_row.columns:
                last_row[feat] = 0.0
            last_row[feat] = last_row[feat].fillna(0.0)
        
        dtest = xgb.DMatrix(last_row[features])
        return dtest
    
    def preprocess_lstm(self, df_history):
        """
        Prepare data for LSTM (sequence of last 24 hours).
        Expected features: Energy_kWh, WS_Hub, Temperature_2m, Surface_Pressure, hour_sin, hour_cos.
        """
        features = ['Energy_kWh', 'WS_Hub', 'Temperature_2m', 'Surface_Pressure', 'hour_sin', 'hour_cos']
        
        if len(df_history) < 24:
            raise ValueError("LSTM requires at least 24 hours of history.")
        
        data_slice = df_history[features].iloc[-24:].values
        
        # Scale using the fitted scaler
        data_scaled = self.scaler.transform(data_slice)
        
        # Reshape to (1, 24, 6) for LSTM
        model_input = data_scaled.reshape(1, 24, len(features)).astype(np.float32)
        return model_input
    
    def predict_next_hour(self, df_history, ws_hub_forecast=None):
        """
        Main inference: returns ensemble prediction with error margin.
        
        Args:
            df_history: Pandas DataFrame with past data (index=datetime, 
                       columns include Energy_kWh, WS_Hub, temp, pressure).
            ws_hub_forecast: (Optional) Forecasted wind speed for next hour.
                            Used to apply physics cut-in/cut-out constraints.
        
        Returns:
            Dict: {value: prediction_kwh, error_margin: margin_kwh, 
                   components: {xgb, lstm, ensemble}}
        """
        
        # 1. XGBoost Prediction
        xgb_pred = None
        try:
            dtest = self.preprocess_xgboost(df_history)
            xgb_pred = self.xgb_model.predict(dtest)[0]
            logger.debug(f"[Wind Model] XGBoost output: {xgb_pred:.3f}")
        except Exception as e:
            logger.warning(f"[Wind Model] XGBoost inference failed: {e}. Using LSTM only.")
        
        # 2. LSTM Prediction
        try:
            lstm_input = self.preprocess_lstm(df_history)
            lstm_out_scaled = self.lstm_session.run(None, {self.lstm_input_name: lstm_input})[0]
            
            # Inverse scale (Energy_kWh is col 0)
            dummy = np.zeros((1, 6))
            dummy[0, 0] = lstm_out_scaled[0, 0]
            lstm_pred = self.scaler.inverse_transform(dummy)[0, 0]
            logger.debug(f"[Wind Model] LSTM output: {lstm_pred:.3f}")
        except Exception as e:
            logger.error(f"[Wind Model] LSTM inference failed: {e}")
            lstm_pred = 0.0
        
        # 3. Ensemble (weighted average)
        if xgb_pred is not None:
            ensemble_pred = (xgb_pred * WEIGHT_XGB) + (lstm_pred * WEIGHT_LSTM)
        else:
            ensemble_pred = lstm_pred
        
        # 4. Physics constraint: cut-in and cut-out speeds
        if ws_hub_forecast is not None:
            if ws_hub_forecast < CUT_IN_SPEED or ws_hub_forecast > CUT_OUT_SPEED:
                ensemble_pred = 0.0
                logger.info(
                    f"[Wind Model] Wind speed {ws_hub_forecast:.1f} m/s outside operating range "
                    f"[{CUT_IN_SPEED}, {CUT_OUT_SPEED}] -> Prediction = 0"
                )
        
        # 5. Ensure non-negative
        ensemble_pred = max(0.0, ensemble_pred)
        
        # 6. Error margin (based on validation RMSE: 0.079 kWh)
        # Conservative: use fixed RMSE from validation
        error_margin = BASE_ERROR_MARGIN
        
        logger.info(
            f"[Wind Model] Predicted {ensemble_pred:.2f} +/- {error_margin:.2f} kWh "
            f"(XGB: {max(0, xgb_pred) if xgb_pred else 'N/A':.2f}, LSTM: {max(0, lstm_pred):.2f})"
        )
        
        return {
            'value': float(ensemble_pred),
            'error_margin': float(error_margin),
            'components': {
                'xgb': float(max(0.0, xgb_pred)) if xgb_pred is not None else None,
                'lstm': float(max(0.0, lstm_pred)),
                'ensemble': float(ensemble_pred)
            }
        }


# Global predictor instance
_predictor = None


def get_wind_predictor():
    """Lazy-load predictor singleton."""
    global _predictor
    if _predictor is None:
        _predictor = WindEnergyPredictor()
    return _predictor


def predict_wind(historic_data: list, forecast: dict) -> dict:
    """
    Predict wind energy for tomorrow using hybrid ensemble.
    
    Args:
        historic_data: List of dicts with {timestamp, Energy_kWh, WS_Hub, Temperature_2m, Surface_Pressure, hour_sin, hour_cos}
        forecast: Dict with tomorrow's weather {wind_speed_m_s, ...}
    
    Returns:
        Dict: {value: generation_kwh, error_margin: margin_kwh, components: {...}}
    """
    
    try:
        # Convert historic_data to DataFrame if needed
        if isinstance(historic_data, list) and len(historic_data) > 0:
            df = pd.DataFrame(historic_data)
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df.set_index('timestamp', inplace=True)
        else:
            raise ValueError("historic_data is empty or invalid")
        
        # Ensure required columns exist
        required_cols = ['Energy_kWh', 'WS_Hub', 'Temperature_2m', 'Surface_Pressure', 'hour_sin', 'hour_cos']
        for col in required_cols:
            if col not in df.columns:
                df[col] = 0.0  # Fill missing columns with 0
        
        # Get predictor and run inference
        predictor = get_wind_predictor()
        ws_hub_forecast = forecast.get('wind_speed_m_s', None)
        
        result = predictor.predict_next_hour(df, ws_hub_forecast=ws_hub_forecast)
        return result
        
    except Exception as e:
        logger.error(f"[Wind Model] ERROR: {e}")
        # Fallback: simple estimate based on wind speed
        wind_speed = forecast.get('wind_speed_m_s', 3.0)
        baseline = max(0, wind_speed * 0.5) if wind_speed >= CUT_IN_SPEED else 0.0
        return {
            'value': float(baseline),
            'error_margin': 0.3,
            'components': {'xgb': None, 'lstm': None, 'ensemble': baseline},
            'fallback': True
        }
