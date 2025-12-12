"""
Anomaly detection for PV panels.
Uses pair comparison + neighbor comparison to detect underperformance and faults.
"""

import numpy as np
from datetime import datetime, timedelta

def detect_anomalies(historic_generation: list, num_panels: int = 3) -> list:
    """
    Detect anomalies in PV panel performance using pair comparison & neighbor comparison.
    
    Args:
        historic_generation: List of dicts [{date, panel_id, total_kwh}, ...]
        num_panels: Number of PV panels
    
    Returns:
        List of anomaly dicts: [{panel_id, type, confidence, description}, ...]
    """
    
    anomalies = []
    
    if not historic_generation or len(historic_generation) < 5:
        print("[Anomaly Detector] Insufficient data for anomaly detection")
        return anomalies
    
    # Group by panel
    panels_data = {}
    for record in historic_generation:
        panel_id = record.get('panel_id', 1)
        if panel_id not in panels_data:
            panels_data[panel_id] = []
        panels_data[panel_id].append(record.get('total_kwh', 0))
    
    # Pair Comparison: compare each panel against average of others
    all_generations = np.array([r.get('total_kwh', 0) for r in historic_generation])
    mean_generation = np.mean(all_generations)
    std_generation = np.std(all_generations)
    
    for panel_id, generations in panels_data.items():
        panel_mean = np.mean(generations)
        panel_std = np.std(generations)
        
        # Detect underperformance: panel mean significantly below average
        if panel_mean < mean_generation * 0.7:
            z_score = abs((panel_mean - mean_generation) / (std_generation + 0.1))
            confidence = min(0.95, z_score / 3.0)  # Normalize to [0, 0.95]
            
            anomalies.append({
                'panel_id': panel_id,
                'type': 'underperformance',
                'confidence': float(confidence),
                'description': f'Panel {panel_id}: Mean output {panel_mean:.2f} kWh is {(1 - panel_mean/mean_generation)*100:.1f}% below average.'
            })
        
        # Neighbor Comparison: detect sudden drops in consecutive readings
        if len(generations) >= 2:
            for i in range(1, len(generations)):
                prev_gen = generations[i-1]
                curr_gen = generations[i]
                
                if prev_gen > 0.5 and curr_gen < prev_gen * 0.5:  # Sudden 50% drop
                    confidence = 0.7
                    anomalies.append({
                        'panel_id': panel_id,
                        'type': 'fault',
                        'confidence': confidence,
                        'description': f'Panel {panel_id}: Sudden drop from {prev_gen:.2f} to {curr_gen:.2f} kWh (possible fault).'
                    })
    
    print(f"[Anomaly Detector] Found {len(anomalies)} anomalies")
    return anomalies
