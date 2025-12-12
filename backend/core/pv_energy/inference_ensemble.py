"""
PV Energy Ensemble Predictor (XGBoost + LSTM)

This module provides an optimized ensemble predictor for solar PV energy production,
combining XGBoost and LSTM models with weighted averaging.
"""

import os
import sys
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

# Configuration
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models')
XGB_PATH = os.path.join(MODEL_DIR, "xgb_model.pkl")
LSTM_PATH = os.path.join(MODEL_DIR, 'best_energy_lstm_model.onnx')

# Ensemble Weights (The Strategy)
# TODO: Optimize these weights using inference_test.py
WEIGHT_XGB = 0.50
WEIGHT_LSTM = 0.50


# ============================================================================
# DATA PREPROCESSING FUNCTIONS (Match Training Pipeline)
# ============================================================================

def prepare_nasa_power_data(df):
    """
    Prepare NASA POWER data - convert to datetime and ensure proper format.
    Combines load_nasa_power_data and prepare_data_for_analysis functionality.
    
    Args:
        df (pd.DataFrame): Raw NASA POWER data
        
    Returns:
        pd.DataFrame: Prepared data with datetime index
    """
    df_prep = df.copy()
    
    # Create datetime index if not already present
    if not isinstance(df_prep.index, pd.DatetimeIndex):
        if 'DATETIME' in df_prep.columns:
            df_prep['DATETIME'] = pd.to_datetime(df_prep['DATETIME'])
            df_prep.set_index('DATETIME', inplace=True)
        elif all(col in df_prep.columns for col in ['YEAR', 'MO', 'DY', 'HR']):
            df_prep['DATETIME'] = pd.to_datetime(df_prep[['YEAR', 'MO', 'DY', 'HR']].rename(columns={
                'YEAR': 'year', 'MO': 'month', 'DY': 'day', 'HR': 'hour'
            }))
            df_prep.set_index('DATETIME', inplace=True)
    
    # Set explicit hourly frequency
    if hasattr(df_prep.index, 'freq') and df_prep.index.freq is None:
        df_prep.index.freq = 'H'
    
    # Convert MJ/hr to Watts (1 MJ/hr = 277.778 W) - CRITICAL for proper irradiance values
    irradiance_columns = ['ALLSKY_SFC_SW_DWN', 'CLRSKY_SFC_SW_DWN', 
                         'ALLSKY_SFC_SW_DIFF', 'ALLSKY_SFC_SW_DNI']
    
    for col in irradiance_columns:
        if col in df_prep.columns:
            # Only convert if values seem to be in MJ/hr (typically < 5)
            if df_prep[col].max() < 10:
                df_prep[col] = df_prep[col] * 277.778
    
    return df_prep


def calculate_pv_system_features(df, system_params=None):
    """
    Calculate PV system features: POA_IRRADIANCE, CELL_TEMP_C, TEMP_DERATE, AC_POWER_KW.
    This matches the calculate_pv_power function used during training.
    
    Args:
        df (pd.DataFrame): DataFrame with NASA POWER data
        system_params (dict): PV system parameters
        
    Returns:
        pd.DataFrame: DataFrame with added PV system features
    """
    if system_params is None:
        system_params = {
            "capacity_kw": 1,
            "dc_ac_ratio": 1.2,
            "inverter_eff": 0.96,
            "temp_coeff": -0.0045,
            "system_losses": 0.14,
            "tilt": 30,
            "soiling_loss": 0.02,
            "ref_temp": 25,
            "noct": 45,
        }
    
    df_result = df.copy()
    
    # Extract required columns
    ghi = df["ALLSKY_SFC_SW_DWN"].values
    dhi = df["ALLSKY_SFC_SW_DIFF"].values
    temp_ambient = df["T2M"].values
    wind_speed = df["WS10M"].values
    
    # Calculate cell temperature using NOCT model
    irradiance_ratio = ghi / 800
    temp_cell = temp_ambient + (system_params["noct"] - 20) * irradiance_ratio
    
    # Wind cooling effect
    wind_cooling = 1.5 * wind_speed
    temp_cell = temp_cell - wind_cooling
    
    # Calculate temperature derating factor
    temp_derate = 1 + system_params["temp_coeff"] * (temp_cell - system_params["ref_temp"])
    temp_derate = np.clip(temp_derate, 0, 1.2)
    
    # Calculate POA (Plane of Array) irradiance
    tilt_factor = 1.0
    tilt_angle = system_params.get("tilt", 30)
    poa_irradiance = np.where(
        ghi > 0, ghi * tilt_factor + dhi * (1 + np.cos(np.radians(tilt_angle))) / 2, 0
    )
    
    # Calculate AC power (for historical data, needed for lag features)
    poa_normalized = poa_irradiance / 1000
    dc_power = system_params["capacity_kw"] * poa_normalized * temp_derate
    dc_power = dc_power * (1 - system_params["soiling_loss"])
    dc_power = dc_power * (1 - system_params["system_losses"])
    
    ac_capacity = system_params["capacity_kw"] / system_params["dc_ac_ratio"]
    ac_power = dc_power * system_params["inverter_eff"]
    ac_power = np.minimum(ac_power, ac_capacity)
    ac_power = np.where(ac_power < 0.001, 0, ac_power)
    
    # Add calculated columns
    df_result["CELL_TEMP_C"] = np.round(temp_cell, 2)
    df_result["TEMP_DERATE"] = np.round(temp_derate, 4)
    df_result["POA_IRRADIANCE"] = np.round(poa_irradiance, 2)
    df_result["AC_POWER_KW"] = np.round(ac_power, 3)
    
    return df_result


def prepare_ml_features(df):
    """
    Prepare features for ML models - creates temporal, lag, and rolling features.
    Matches the prepare_features_for_ml function used during training.
    
    Args:
        df (pd.DataFrame): DataFrame with PV system features
        
    Returns:
        pd.DataFrame: DataFrame with all ML features
    """
    df_ml = df.copy()
    
    # Ensure datetime index
    if not isinstance(df_ml.index, pd.DatetimeIndex):
        raise ValueError("DataFrame must have a DatetimeIndex")
    
    # Set explicit frequency
    if hasattr(df_ml.index, 'freq') and df_ml.index.freq is None:
        df_ml.index.freq = 'H'
    
    # Add YEAR, MO, DY, HR columns from datetime index (required for XGBoost)
    df_ml['YEAR'] = df_ml.index.year
    df_ml['MO'] = df_ml.index.month
    df_ml['DY'] = df_ml.index.day
    df_ml['HR'] = df_ml.index.hour
    
    # Basic temporal features
    df_ml['hour'] = df_ml.index.hour
    df_ml['day_of_year'] = df_ml.index.dayofyear
    df_ml['month'] = df_ml.index.month
    df_ml['day_of_week'] = df_ml.index.dayofweek
    df_ml['is_weekend'] = (df_ml.index.dayofweek >= 5).astype(int)
    
    # Solar position features (cyclical encoding)
    df_ml['hour_sin'] = np.sin(2 * np.pi * df_ml['hour'] / 24)
    df_ml['hour_cos'] = np.cos(2 * np.pi * df_ml['hour'] / 24)
    df_ml['doy_sin'] = np.sin(2 * np.pi * df_ml['day_of_year'] / 365)
    df_ml['doy_cos'] = np.cos(2 * np.pi * df_ml['day_of_year'] / 365)
    
    # Weather and system features
    df_ml['irradiance_wm2'] = df_ml['ALLSKY_SFC_SW_DWN'] * 277.778
    df_ml['clearness_ratio'] = (df_ml['ALLSKY_SFC_SW_DWN'] / 
                               df_ml['CLRSKY_SFC_SW_DWN']).replace([np.inf, -np.inf], 0).clip(0, 1)
    
    # Lag features (CRITICAL for model performance)
    for lag in [1, 2, 3, 24]:
        df_ml[f'ac_power_lag_{lag}'] = df_ml['AC_POWER_KW'].shift(lag)
        df_ml[f'poa_irradiance_lag_{lag}'] = df_ml['POA_IRRADIANCE'].shift(lag)
        df_ml[f'temp_lag_{lag}'] = df_ml['T2M'].shift(lag)
    
    # Rolling features
    df_ml['ac_power_rolling_3h_mean'] = df_ml['AC_POWER_KW'].rolling(3).mean()
    df_ml['ac_power_rolling_6h_std'] = df_ml['AC_POWER_KW'].rolling(6).std()
    df_ml['irradiance_rolling_3h_mean'] = df_ml['irradiance_wm2'].rolling(3).mean()
    
    return df_ml

# ============================================================================
# ENSEMBLE PREDICTOR CLASS
# ============================================================================

class PVEnergyPredictor:
    def __init__(self, system_params=None):
        """
        Initialize PV Energy Predictor with optional system parameters.
        
        Args:
            system_params (dict): PV system parameters (uses defaults if None)
        """
        self.system_params = system_params or {
            "capacity_kw": 1,
            "dc_ac_ratio": 1.2,
            "inverter_eff": 0.96,
            "temp_coeff": -0.0045,
            "system_losses": 0.14,
            "tilt": 30,
            "soiling_loss": 0.02,
            "ref_temp": 25,
            "noct": 45,
        }
        self.load_models()

    def load_models(self):
        """Load XGBoost and LSTM (ONNX) models"""
        from sklearn.preprocessing import MinMaxScaler
        import onnxruntime as ort
        
        # 1. Load XGBoost model (PKL format)
        if not os.path.exists(XGB_PATH):
            raise FileNotFoundError(f"XGBoost model not found at {XGB_PATH}")
        self.xgb_model = joblib.load(XGB_PATH)
        print(f"✅ Loaded XGBoost model from {XGB_PATH}")
        
        # 2. Load LSTM model (ONNX format)
        if not os.path.exists(LSTM_PATH):
            raise FileNotFoundError(f"LSTM model not found at {LSTM_PATH}")
        self.lstm_session = ort.InferenceSession(LSTM_PATH)
        print(f"✅ Loaded LSTM ONNX model from {LSTM_PATH}")
        
        # Get LSTM input/output names for inference
        self.lstm_input_name = self.lstm_session.get_inputs()[0].name
        self.lstm_output_name = self.lstm_session.get_outputs()[0].name
        print(f"   LSTM input: {self.lstm_input_name}, output: {self.lstm_output_name}")
        
        # 3. Create scaler for LSTM preprocessing
        # LSTM expects scaled features (0-1 range) using MinMaxScaler
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        print(f"✅ Initialized MinMaxScaler for LSTM preprocessing")

    def preprocess_data(self, df_history):
        """
        Complete preprocessing pipeline that matches training data preparation.
        Applies all transformations: NASA POWER prep, PV calculations, and ML features.
        
        Args:
            df_history (pd.DataFrame): Raw or partially processed historical data
            
        Returns:
            pd.DataFrame: Fully preprocessed data ready for model inference
        """
        # Step 1: Prepare NASA POWER data (datetime, frequency, irradiance conversion)
        df_prep = prepare_nasa_power_data(df_history)
        
        # Step 2: Calculate PV system features (POA_IRRADIANCE, CELL_TEMP_C, etc.)
        df_with_pv = calculate_pv_system_features(df_prep, self.system_params)
        
        # Step 3: Prepare ML features (temporal, lag, rolling features)
        df_ml = prepare_ml_features(df_with_pv)
        
        return df_ml

    def preprocess_xgboost(self, df_history):
        """
        Prepares data for XGBoost prediction.
        XGBoost was trained on RAW NASA POWER columns + PV physics features.
        
        Args:
            df_history (pd.DataFrame): Historical PV data (must have PV features calculated)
            
        Returns:
            pd.DataFrame: Preprocessed data for XGBoost prediction
        """
        # Apply full preprocessing if needed (to ensure PV features exist)
        if 'POA_IRRADIANCE' not in df_history.columns:
            df = self.preprocess_data(df_history)
        else:
            df = df_history.copy()
        
        # Select the last row for prediction
        last_row = df.iloc[[-1]].copy()
        
        # XGBoost features (RAW NASA POWER + PV physics features)
        features = [
            'YEAR', 'MO', 'DY', 'HR',  # Temporal (from datetime index)
            'ALLSKY_SFC_SW_DWN', 'WS10M', 'CLRSKY_SFC_SW_DWN', 'T2M',  # NASA POWER raw
            'ALLSKY_SFC_LW_DWN', 'PS', 'RH2M', 'ALLSKY_SFC_SW_DIFF',
            'PRECTOTCORR', 'ALLSKY_SFC_SW_DNI',
            'CELL_TEMP_C', 'TEMP_DERATE', 'POA_IRRADIANCE'  # Calculated PV features
        ]
        
        # Verify all features exist
        missing = [f for f in features if f not in last_row.columns]
        if missing:
            raise ValueError(f"Missing required XGBoost features: {missing}")
        
        # Return DataFrame with features in exact training order
        return last_row[features]

    def preprocess_lstm(self, df_history, time_steps=24):
        """
        Prepares data for LSTM (Sequence).
        
        Args:
            df_history (pd.DataFrame): Historical PV data (can be raw or preprocessed)
            time_steps (int): Number of time steps for LSTM sequence
            
        Returns:
            np.ndarray: Preprocessed sequence for LSTM prediction
        """
        # Apply full preprocessing if needed
        if 'clearness_ratio' not in df_history.columns or 'POA_IRRADIANCE' not in df_history.columns:
            df = self.preprocess_data(df_history)
        else:
            df = df_history.copy()
        
        # Features used in LSTM
        lstm_features = [
            'ALLSKY_SFC_SW_DWN',
            'POA_IRRADIANCE',
            'T2M',
            'CELL_TEMP_C',
            'TEMP_DERATE',
            'WS10M',
            'RH2M',
            'hour',
            'month',
            'clearness_ratio'
        ]
        
        # Check if we have enough data
        if len(df) < time_steps:
            raise ValueError(f"Need at least {time_steps} hours of data, got {len(df)}")
        
        # Select available features
        available_features = [f for f in lstm_features if f in df.columns]
        data_slice = df[available_features].iloc[-time_steps:].values
        
        # Scale the data
        data_scaled = self.scaler.transform(data_slice)
        
        # Reshape for LSTM (batch_size=1, time_steps, features)
        model_input = data_scaled.reshape(1, time_steps, len(available_features)).astype(np.float32)
        return model_input

    def predict_next_hour(self, df_history, irradiance_forecast=None):
        """
        Main inference function for PV energy prediction.
        
        Args:
            df_history (pd.DataFrame): Historical PV data with datetime index
                                      Must include: AC_POWER_KW, POA_IRRADIANCE, T2M, 
                                                    CELL_TEMP_C, TEMP_DERATE, WS10M, RH2M, etc.
            irradiance_forecast (float, optional): Forecasted POA irradiance for target hour
                                                  Used for physics-based validation
        
        Returns:
            float: Predicted AC Power (kW) for next hour
        """
        try:
            # XGBoost prediction
            xgb_input = self.preprocess_xgboost(df_history)
            xgb_pred = self.xgb_model.predict(xgb_input)[0]
            
            # LSTM prediction (ONNX runtime)
            lstm_input = self.preprocess_lstm(df_history)
            lstm_pred = self.lstm_session.run([self.lstm_output_name], {self.lstm_input_name: lstm_input})[0][0][0]
            
            # Ensemble prediction (weighted average)
            ensemble_pred = (WEIGHT_XGB * xgb_pred) + (WEIGHT_LSTM * lstm_pred)
            
            # Physics-based validation (if irradiance forecast is provided)
            if irradiance_forecast is not None:
                # No production if irradiance is very low (night time)
                if irradiance_forecast < 10:  # W/m²
                    ensemble_pred = 0.0
            
            # Ensure non-negative prediction
            ensemble_pred = max(0.0, ensemble_pred)
            
            return ensemble_pred
            
        except Exception as e:
            print(f"❌ Prediction error: {e}")
            raise

    def predict_xgboost_only(self, df_history):
        """XGBoost-only prediction for comparison"""
        xgb_input = self.preprocess_xgboost(df_history)
        return max(0.0, self.xgb_model.predict(xgb_input)[0])

    def predict_lstm_only(self, df_history):
        """LSTM-only prediction for comparison"""
        lstm_input = self.preprocess_lstm(df_history)
        pred = self.lstm_session.run([self.lstm_output_name], {self.lstm_input_name: lstm_input})[0][0][0]
        return max(0.0, pred)

    def predict_all_components(self, df_history, irradiance_forecast=None):
        """
        Returns predictions from all components for analysis.
        
        Returns:
            dict: Contains XGBoost, LSTM, and Ensemble predictions
        """
        xgb_pred = self.predict_xgboost_only(df_history)
        lstm_pred = self.predict_lstm_only(df_history)
        ensemble_pred = self.predict_next_hour(df_history, irradiance_forecast)
        
        return {
            'xgboost': xgb_pred,
            'lstm': lstm_pred,
            'ensemble': ensemble_pred,
            'weights': {
                'xgb': WEIGHT_XGB,
                'lstm': WEIGHT_LSTM
            }
        }


if __name__ == "__main__":
    print("Initializing PV Energy Ensemble Predictor...")
    try:
        predictor = PVEnergyPredictor()
        print("✅ PV Energy Predictor Ready.")
    except Exception as e:
        print(f"❌ Initialization failed: {e}")
