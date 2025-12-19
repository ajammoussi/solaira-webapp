import os
import sys
import pandas as pd
import numpy as np

# Ensure we can import from the same directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from inference_ensemble import EnergyPredictor as EnsemblePredictor

class EnergyPredictorService:
    def __init__(self):
        """
        Initializes the optimized ensemble model (XGBoost + LSTM).
        """
        try:
            self.model = EnsemblePredictor()
            print("✅ Optimized Ensemble Predictor (XGBoost + LSTM) initialized successfully.")
        except Exception as e:
            print(f"❌ Failed to initialize model: {e}")
            raise

    def predict_next_hour(self, df_history, ws_hub_forecast=None):
        """
        Predicts the energy production for the next hour.
        
        Args:
            df_history (pd.DataFrame): Historical data (must include 'Energy_kWh', 'WS_Hub', etc.)
                                       Must have a datetime index.
            ws_hub_forecast (float, optional): Forecasted wind speed (Hub height) for the target hour.
                                               Used for the physics-based cut-in rule.
        
        Returns:
            float: Predicted Energy (kWh)
        """
        return self.model.predict_next_hour(df_history, ws_hub_forecast)

if __name__ == "__main__":
    print("--- Starting Inference Service ---")
    service = EnergyPredictorService()
    print("Service is ready to accept requests.")
