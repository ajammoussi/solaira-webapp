"""
Consumption prediction model.
Predicts tomorrow's energy consumption based on historic usage patterns.
"""

import numpy as np
import onnxruntime as rt
from datetime import datetime, timedelta
from backend.config import config

def predict_consumption(historic_data: list, forecast: dict) -> dict:
    """
    Predict total consumption for tomorrow.
    
    Args:
        historic_data: List of dicts with historic consumption & dates
        forecast: Dict with tomorrow's weather (for context)
    
    Returns:
        Dict: {value: consumption_kwh, error_margin: margin_kwh}
    """
    
    try:
        # Load ONNX model
        sess = rt.InferenceSession(str(config.CONSUMPTION_MODEL_PATH), providers=['CPUExecutionProvider'])
        
        # Extract consumption values
        consumption_values = [d.get('consumption_kwh', 8) for d in historic_data]
        
        mean_consumption = np.mean(consumption_values) if consumption_values else 8
        min_consumption = np.min(consumption_values) if consumption_values else 6
        max_consumption = np.max(consumption_values) if consumption_values else 12
        
        # Add day-of-week features (tomorrow)
        tomorrow = datetime.now() + timedelta(days=1)
        day_of_week = tomorrow.weekday()  # 0=Mon, 6=Sun
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Prepare input: [mean_consumption, min, max, day_of_week, is_weekend, temp]
        input_features = np.array([[
            mean_consumption,
            min_consumption,
            max_consumption,
            day_of_week,
            is_weekend,
            forecast.get('temperature_c', 15)
        ]], dtype=np.float32)
        
        # Run inference
        input_name = sess.get_inputs()[0].name
        output_name = sess.get_outputs()[0].name
        prediction = sess.run([output_name], {input_name: input_features})[0][0]
        
        # Ensure prediction is positive
        prediction = max(1.0, float(prediction))
        error_margin = max(0.5, prediction * 0.12)
        
        print(f"[Consumption Model] Predicted {prediction:.2f} kWh for tomorrow (day_of_week={day_of_week}, weekend={is_weekend})")
        return {
            'value': prediction,
            'error_margin': error_margin
        }
        
    except Exception as e:
        print(f"[Consumption Model] ERROR: {e}")
        # Fallback: average consumption
        consumption_values = [d.get('consumption_kwh', 8) for d in historic_data]
        baseline = np.mean(consumption_values) if consumption_values else 8
        return {
            'value': baseline,
            'error_margin': 1.0
        }
