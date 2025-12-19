"""
PV (Photovoltaic) generation prediction model.
Predicts tomorrow's solar panel generation based on historic data and weather forecast.
"""

import numpy as np
import onnxruntime as rt
from backend.config import config

def predict_pv(historic_data: list, forecast: dict, num_panels: int = 3) -> list:
    """
    Predict PV generation for tomorrow.
    
    Args:
        historic_data: List of dicts with {timestamp, consumption_kwh, temperature_c, irradiance_w_m2, wind_speed_m_s}
        forecast: Dict with tomorrow's weather {temperature_c, irradiance_w_m2, wind_speed_m_s, cloud_cover_percent}
        num_panels: Number of PV panels (default: 3)
    
    Returns:
        List of dicts: [{panel_id: 1, value: 5.2, error_margin: 0.4}, ...]
    """
    
    try:
        # Load ONNX model
        sess = rt.InferenceSession(str(config.PV_MODEL_PATH), providers=['CPUExecutionProvider'])
        
        # Extract features from historic data
        irradiance_values = [d.get('irradiance_w_m2', 0) for d in historic_data]
        temperature_values = [d.get('temperature_c', 15) for d in historic_data]
        
        # Normalize/prepare features for model
        # Assuming model expects: [mean_irradiance, mean_temp, forecast_irradiance, forecast_temp]
        mean_irradiance = np.mean(irradiance_values) if irradiance_values else 0
        mean_temperature = np.mean(temperature_values) if temperature_values else 15
        
        input_features = np.array([[
            mean_irradiance,
            mean_temperature,
            forecast.get('irradiance_w_m2', mean_irradiance),
            forecast.get('temperature_c', mean_temperature),
            forecast.get('cloud_cover_percent', 0)
        ]], dtype=np.float32)
        
        # Run inference
        input_name = sess.get_inputs()[0].name
        output_name = sess.get_outputs()[0].name
        prediction = sess.run([output_name], {input_name: input_features})[0][0]
        
        # Distribute across panels and add error margin
        generation_per_panel = prediction / num_panels
        error_margin = max(0.3, generation_per_panel * 0.15)  # 15% error or 0.3 kWh min
        
        results = [
            {
                'panel_id': i + 1,
                'value': float(generation_per_panel),
                'error_margin': float(error_margin)
            }
            for i in range(num_panels)
        ]
        
        print(f"[PV Model] Predicted {sum(r['value'] for r in results):.2f} kWh total across {num_panels} panels")
        return results
        
    except Exception as e:
        print(f"[PV Model] ERROR: {e}")
        # Fallback: estimate based on irradiance
        baseline = forecast.get('irradiance_w_m2', 400) / 200
        return [
            {
                'panel_id': i + 1,
                'value': float(baseline / num_panels),
                'error_margin': 0.5
            }
            for i in range(num_panels)
        ]
