import pandas as pd
import numpy as np

from .inference_ensemble import WindEnergyPredictor as WindEnsemblePredictor

class WindEnergyPredictorService:
    def __init__(self):
        """
        Initializes the optimized wind energy ensemble model (XGBoost + LSTM).
        """
        try:
            self.model = WindEnsemblePredictor()
            print("✅ Optimized Ensemble Wind Energy Predictor (XGBoost + LSTM) initialized successfully.")
        except Exception as e:
            print(f"❌ Failed to initialize wind energy model: {e}")
            raise

    def predict_next_hour(self, df_history, ws_hub_forecast=None):
        """
        Predicts the wind energy production for the next hour.
        
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
    print("--- Starting Wind Energy Inference Service ---")
    service = WindEnergyPredictorService()
    print("Wind Energy InferenceService is ready to accept requests.")
