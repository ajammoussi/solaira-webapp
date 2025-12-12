import pandas as pd
import numpy as np
import joblib
import os
import sys
from typing import List, Dict
from datetime import datetime, timedelta

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from backend.core.phase_2.config_models import SystemConfig
from backend.core.phase_2.battery_manager import BatteryManager
from backend.core.phase_1.data_processing import prepare_features_for_ml

class EnergySimulator:
    def __init__(self, config_path, models_dir):
        self.config = SystemConfig.from_yaml(config_path)
        self.models_dir = models_dir
        self.production_model = None
        self.consumption_model = None # Placeholder if we had one
        self.load_models()
        
    def load_models(self):
        prod_path = os.path.join(self.models_dir, 'production_xgboost.pkl')
        if os.path.exists(prod_path):
            self.production_model = joblib.load(prod_path)
            
        # Load feature columns
        feat_path = os.path.join(self.models_dir, 'xgboost_features.json')
        if os.path.exists(feat_path):
            import json
            with open(feat_path, 'r') as f:
                self.production_features = json.load(f)
        else:
            self.production_features = []

    def simulate_scenario(self, weather_data: pd.DataFrame, current_soc: float, consumption_profile: List[float]):
        """
        Simulate energy flow for a given period (e.g., 24 hours)
        
        Args:
            weather_data: DataFrame with weather features for prediction
            current_soc: Initial Battery SOC %
            consumption_profile: List of hourly consumption values (kWh)
            
        Returns:
            Dict with simulation results and advice
        """
        
        # 1. Predict Production
        if self.production_model is None:
            raise ValueError("Production model not loaded")
            
        # Prepare features
        df_features = prepare_features_for_ml(weather_data)
        
        # Align features
        X = pd.DataFrame(index=df_features.index)
        for col in self.production_features:
            if col in df_features.columns:
                X[col] = df_features[col]
            else:
                X[col] = 0
                
        production_preds = self.production_model.predict(X)
        production_preds = np.maximum(production_preds, 0) # No negative production
        
        # 2. Initialize Battery
        # Create a temporary battery manager for simulation
        sim_battery_config = self.config.battery
        sim_battery_config.initial_soc_percent = current_soc
        battery = BatteryManager(sim_battery_config)
        
        results = []
        advice = []
        
        total_production = 0
        total_consumption = 0
        total_wasted = 0
        total_deficit = 0
        
        for i in range(len(production_preds)):
            prod = production_preds[i]
            cons = consumption_profile[i] if i < len(consumption_profile) else 0
            
            net_power = prod - cons
            
            # Update Battery
            actual_power, _ = battery.update_state(net_power)
            
            # Calculate metrics
            soc = battery.get_soc()
            
            wasted = 0
            deficit = 0
            
            if net_power > 0:
                # If we had surplus, did we store it all?
                # actual_power is what went into battery
                surplus = net_power
                stored = actual_power
                wasted = surplus - stored
            else:
                # If we had deficit, did we cover it?
                # actual_power is negative (discharge)
                needed = abs(net_power)
                supplied = abs(actual_power)
                deficit = needed - supplied
            
            total_production += prod
            total_consumption += cons
            total_wasted += wasted
            total_deficit += deficit
            
            results.append({
                "hour": i,
                "production_kwh": float(prod),
                "consumption_kwh": float(cons),
                "battery_soc": float(soc),
                "grid_import_kwh": float(deficit), # Assuming deficit comes from grid/blackout
                "wasted_kwh": float(wasted)
            })
            
        # 3. Generate Advice
        min_soc = min(r['battery_soc'] for r in results)
        max_soc = max(r['battery_soc'] for r in results)
        
        if min_soc < self.config.battery.min_soc_percent:
            advice.append({
                "type": "warning",
                "message": f"Battery predicted to drop below {self.config.battery.min_soc_percent}% minimum. Consider reducing consumption during evening hours."
            })
            
        if total_deficit > 0:
             advice.append({
                "type": "critical",
                "message": f"Predicted energy deficit of {total_deficit:.2f} kWh. Backup power or grid import required."
            })
            
        if total_wasted > 5.0: # Threshold for advice
             advice.append({
                "type": "info",
                "message": f"High excess energy ({total_wasted:.2f} kWh) detected. Consider shifting high-load appliances to daytime."
            })
            
        return {
            "summary": {
                "total_production": float(total_production),
                "total_consumption": float(total_consumption),
                "total_deficit": float(total_deficit),
                "total_wasted": float(total_wasted),
                "min_soc": float(min_soc),
                "max_soc": float(max_soc)
            },
            "hourly_results": results,
            "advice": advice
        }
