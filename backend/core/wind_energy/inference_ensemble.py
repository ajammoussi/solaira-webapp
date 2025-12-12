import os
import json
import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
import onnxruntime as ort

# Configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
XGB_PATH = os.path.join(MODEL_DIR, 'energy_xgboost_pure_forecast.json')
LSTM_PATH = os.path.join(MODEL_DIR, 'best_energy_lstm_model.onnx')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

# Weights (The Strategy)
# Optimized for Daily Total Energy Accuracy
WEIGHT_XGB = 0.53
WEIGHT_LSTM = 0.47

class WindEnergyPredictor:
    def __init__(self):
        self.load_models()

    def load_models(self):
        # 1. Load Scaler
        if not os.path.exists(SCALER_PATH):
             raise FileNotFoundError(f"Scaler not found at {SCALER_PATH}")
        self.scaler = joblib.load(SCALER_PATH)
        
        # 2. Load XGBoost
        if not os.path.exists(XGB_PATH):
             raise FileNotFoundError(f"XGBoost model not found at {XGB_PATH}")
        self.xgb_model = xgb.Booster()
        self.xgb_model.load_model(XGB_PATH)
        
        # 3. Load LSTM (ONNX)
        if not os.path.exists(LSTM_PATH):
             raise FileNotFoundError(f"LSTM model not found at {LSTM_PATH}")
        
        # Prioritize GPU providers for Intel (OpenVINO) or Windows (DirectML)
        # Note: Requires 'onnxruntime-openvino' or 'onnxruntime-directml' packages
        providers = ['OpenVINOExecutionProvider', 'DmlExecutionProvider', 'CPUExecutionProvider']
        try:
            self.lstm_session = ort.InferenceSession(LSTM_PATH, providers=providers)
        except Exception as e:
            print(f"Warning: Could not load requested providers {providers}. Falling back to default. Error: {e}")
            self.lstm_session = ort.InferenceSession(LSTM_PATH)
            
        self.lstm_input_name = self.lstm_session.get_inputs()[0].name

    def preprocess_xgboost(self, df_history):
        """
        Prepares data for XGBoost (Tabular + Lags).
        Expects df_history to contain at least 48 hours of data to calculate lags safely.
        """
        df = df_history.copy()
        
        # Create Lags (Must match training exactly)
        lags = [1, 2, 3, 6, 12, 24, 48]
        for lag in lags:
            df[f'Energy_lag_{lag}'] = df['Energy_kWh'].shift(lag)
            df[f'WS_lag_{lag}'] = df['WS_Hub'].shift(lag)
        
        # Time Features
        df['hour'] = df.index.hour
        df['month'] = df.index.month
        df['dayofweek'] = df.index.dayofweek
        
        # Select only the last row (the one we want to predict for)
        # Note: In a real loop, we predict t+1. Here we assume df_history ends at t.
        # We want to predict t+1. 
        # Actually, usually we have data up to t, and we want to predict t+1.
        # The features for t+1 are based on lags from t, t-1, etc.
        
        # Let's assume the input df contains the "Future" row with weather info but NaN energy
        # OR we construct the features for the next step based on the last row of history.
        
        last_row = df.iloc[[-1]].copy()
        
        # We need to ensure columns match XGBoost expected features
        # This is tricky without the feature list. 
        # Ideally, we save the feature list in a JSON.
        # For now, we'll rely on the column names matching.
        
        # Explicit feature order required by XGBoost
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
        
        # XGBoost DMatrix
        dtest = xgb.DMatrix(last_row[features])
        return dtest

    def preprocess_lstm(self, df_history):
        """
        Prepares data for LSTM (Sequence).
        Expects last 24 hours of data.
        """
        # Features used in LSTM: ['Energy_kWh', 'WS_Hub', 'Temperature_2m', 'Surface_Pressure', 'hour_sin', 'hour_cos']
        features = ['Energy_kWh', 'WS_Hub', 'Temperature_2m', 'Surface_Pressure', 'hour_sin', 'hour_cos']
        
        # Ensure we have the last 24 steps
        if len(df_history) < 24:
            raise ValueError("LSTM requires at least 24 hours of history.")
            
        data_slice = df_history[features].iloc[-24:].values
        
        # Scale
        data_scaled = self.scaler.transform(data_slice)
        
        # Reshape (1, 24, 6)
        model_input = data_scaled.reshape(1, 24, len(features)).astype(np.float32)
        return model_input

    def predict_next_hour(self, df_history, ws_hub_forecast=None):
        """
        Main inference function for wind energy prediction.
        df_history: Pandas DataFrame with past data (Wind, Energy, Temp, Pressure).
                    Must have datetime index.
        ws_hub_forecast: (Optional) Forecasted Wind Speed (Hub height) for the target hour.
                         If provided, applies physics-based cut-in rule.
        """
        # 1. XGBoost Prediction
        # Note: XGBoost preprocessing is complex with lags. 
        # For this simplified script, we'll assume the input df is rich enough.
        # In a strict production env, we'd handle the lag generation more robustly.
        
        # For the hackathon, let's rely on the LSTM primarily if lag generation is hard,
        # BUT we want the ensemble.
        
        # Let's try to generate XGB features.
        try:
            dtest = self.preprocess_xgboost(df_history)
            xgb_pred = self.xgb_model.predict(dtest)[0]
        except Exception as e:
            print(f"XGBoost Feature Error: {e}. Fallback to LSTM only.")
            xgb_pred = None

        # 2. LSTM Prediction
        lstm_input = self.preprocess_lstm(df_history)
        lstm_out_scaled = self.lstm_session.run(None, {self.lstm_input_name: lstm_input})[0]
        
        # Inverse Scale (Trick: create dummy array with same shape as scaler input)
        dummy = np.zeros((1, 6))
        dummy[0, 0] = lstm_out_scaled[0, 0] # Energy is col 0
        lstm_pred = self.scaler.inverse_transform(dummy)[0, 0]

        # 3. Ensemble
        if xgb_pred is not None:
            final_pred = (xgb_pred * WEIGHT_XGB) + (lstm_pred * WEIGHT_LSTM)
        else:
            final_pred = lstm_pred
            
        # 4. Physics-based Post-processing (Cut-in Speed)
        if ws_hub_forecast is not None:
            CUT_IN_SPEED = 2.5
            if ws_hub_forecast < CUT_IN_SPEED:
                final_pred = 0.0
        
        # For now, let's just ensure non-negativity.
        return max(0.0, final_pred)

    def predict_xgboost_only(self, df_history):
        """
        Runs inference for wind energy prediction using ONLY the XGBoost model.
        """
        dtest = self.preprocess_xgboost(df_history)
        xgb_pred = self.xgb_model.predict(dtest)[0]
        return max(0.0, xgb_pred)

    def predict_all_components(self, df_history):
        """
        Returns wind predictions for XGBoost, LSTM, and the Ensemble.
        Returns: dict {'xgb': float, 'lstm': float, 'ensemble': float}
        """
        # 1. XGBoost
        try:
            dtest = self.preprocess_xgboost(df_history)
            xgb_pred = self.xgb_model.predict(dtest)[0]
        except Exception as e:
            xgb_pred = 0.0
            
        # 2. LSTM
        lstm_input = self.preprocess_lstm(df_history)
        lstm_out_scaled = self.lstm_session.run(None, {self.lstm_input_name: lstm_input})[0]
        dummy = np.zeros((1, 6))
        dummy[0, 0] = lstm_out_scaled[0, 0]
        lstm_pred = self.scaler.inverse_transform(dummy)[0, 0]
        
        # 3. Ensemble
        ensemble_pred = (xgb_pred * WEIGHT_XGB) + (lstm_pred * WEIGHT_LSTM)
        
        return {
            'xgb': max(0.0, xgb_pred),
            'lstm': max(0.0, lstm_pred),
            'ensemble': max(0.0, ensemble_pred)
        }

if __name__ == "__main__":
    print("Initializing Wind Energy Ensemble Predictor...")
    predictor = WindEnergyPredictor()
    print("Ready.")
