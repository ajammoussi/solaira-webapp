"""
Wind-tree generation prediction model.
Predicts tomorrow's wind turbine generation based on wind speed forecast.
"""

import numpy as np
import onnxruntime as rt
from backend.config import config

def predict_wind(historic_data: list, forecast: dict) -> dict:
    """
    Predict wind-tree generation for tomorrow.
    
    Args:
        historic_data: List of dicts with historic weather data
        forecast: Dict with tomorrow's weather {wind_speed_m_s, ...}
    
    Returns:
        Dict: {value: generation_kwh, error_margin: margin_kwh}
    """
    
    try:
        # Load ONNX model
        sess = rt.InferenceSession(str(config.WIND_MODEL_PATH), providers=['CPUExecutionProvider'])
        
        # Extract wind speed features
        wind_speeds = [d.get('wind_speed_m_s', 0) for d in historic_data]
        mean_wind = np.mean(wind_speeds) if wind_speeds else 0
        max_wind = np.max(wind_speeds) if wind_speeds else 0
        
        forecast_wind = forecast.get('wind_speed_m_s', mean_wind)
        
        # Prepare input: [mean_wind, max_wind, forecast_wind]
        input_features = np.array([[
            mean_wind,
            max_wind,
            forecast_wind
        ]], dtype=np.float32)
        
        # Run inference
        input_name = sess.get_inputs()[0].name
        output_name = sess.get_outputs()[0].name
        prediction = sess.run([output_name], {input_name: input_features})[0][0]
        
        # Ensure prediction is non-negative
        prediction = max(0, float(prediction))
        error_margin = max(0.2, prediction * 0.15)
        
        print(f"[Wind Model] Predicted {prediction:.2f} kWh")
        return {
            'value': prediction,
            'error_margin': error_margin
        }
        
    except Exception as e:
        print(f"[Wind Model] ERROR: {e}")
        # Fallback: wind_speed * efficiency factor
        wind_speed = forecast.get('wind_speed_m_s', 3)
        baseline = max(0, wind_speed * 0.5)  # Rough estimate
        return {
            'value': baseline,
            'error_margin': 0.3
        }
