"""
PV Energy Prediction Service

This service provides a clean interface for PV energy predictions using the
optimized ensemble model (XGBoost + LSTM).
"""

import pandas as pd
import numpy as np

from .inference_ensemble import PVEnergyPredictor


class PVEnergyPredictorService:
    def __init__(self, system_params=None):
        """
        Initializes the optimized PV energy ensemble model (XGBoost + LSTM).
        
        Args:
            system_params (dict): PV system parameters (optional, uses defaults if None)
        """
        try:
            self.model = PVEnergyPredictor(system_params=system_params)
            print("✅ Optimized Ensemble PV Energy Predictor (XGBoost + LSTM) initialized successfully.")
        except Exception as e:
            print(f"❌ Failed to initialize PV energy model: {e}")
            raise

    def predict_next_hour(self, df_history, irradiance_forecast=None):
        """
        Predicts the PV energy production (AC Power) for the next hour.
        
        Args:
            df_history (pd.DataFrame): Historical PV data (must include AC_POWER_KW, POA_IRRADIANCE, 
                                       T2M, CELL_TEMP_C, TEMP_DERATE, WS10M, RH2M, etc.)
                                       Must have a datetime index.
            irradiance_forecast (float, optional): Forecasted POA irradiance for the target hour.
                                                   Used for physics-based validation.
        
        Returns:
            float: Predicted AC Power (kW) for next hour
        """
        return self.model.predict_next_hour(df_history, irradiance_forecast)
    
    def predict_xgboost_only(self, df_history):
        """
        Get prediction from XGBoost model only.
        
        Args:
            df_history (pd.DataFrame): Historical PV data with datetime index
            
        Returns:
            float: Predicted AC Power (kW) from XGBoost model
        """
        return self.model.predict_xgboost_only(df_history)
    
    def predict_lstm_only(self, df_history):
        """
        Get prediction from LSTM model only.
        
        Args:
            df_history (pd.DataFrame): Historical PV data with datetime index
            
        Returns:
            float: Predicted AC Power (kW) from LSTM model
        """
        return self.model.predict_lstm_only(df_history)
    
    def predict_all_components(self, df_history, irradiance_forecast=None):
        """
        Get predictions from all components (XGBoost, LSTM, and Ensemble).
        
        Args:
            df_history (pd.DataFrame): Historical PV data with datetime index
            irradiance_forecast (float, optional): Forecasted POA irradiance
            
        Returns:
            dict: Contains predictions from XGBoost, LSTM, Ensemble, and weights
        """
        return self.model.predict_all_components(df_history, irradiance_forecast)


if __name__ == "__main__":
    print("--- Starting PV Energy Inference Service ---")
    service = PVEnergyPredictorService()
    print("PV Energy InferenceService is ready to accept requests.")
