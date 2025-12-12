"""
Phase 2 decision engine: activation, battery management, appliance scheduling.
"""

from backend.config import config
from backend.utils.physics_formula import calculate_activation_cost

def compute_decisions(predictions):
    """
    Phase 2 logic: decide activation, battery management, appliance scheduling.
    
    Args:
        predictions: Dict with {pv: [...], wind_tree: {...}, consumption: {...}}
    
    Returns:
        Dict with decisions: sources, battery, microgrid, appliances
    """
    
    # Sum predicted generation
    pv_pred = sum([p['value'] for p in predictions['pv']]) if isinstance(predictions['pv'], list) else predictions['pv']['value']
    wind_pred = predictions['wind_tree']['value']
    consumption_pred = predictions['consumption']['value']
    
    # Add safety margin to consumption (10% buffer)
    consumption_pred_with_margin = consumption_pred * 1.10
    
    print(f"[Decision Engine] PV: {pv_pred:.2f} kWh, Wind: {wind_pred:.2f} kWh, Consumption (with margin): {consumption_pred_with_margin:.2f} kWh")
    
    # === ACTIVATION DECISIONS ===
    # Decide whether to activate PV
    pv_activate = pv_pred > config.MIN_PV_GENERATION_KWH
    pv_reason = "Sufficient solar irradiance forecast" if pv_activate else f"Low solar forecast ({pv_pred:.2f} kWh < {config.MIN_PV_GENERATION_KWH} kWh threshold)"
    
    # Decide whether to activate wind-tree (ROI check)
    wind_activation_cost = calculate_activation_cost('wind_tree', wind_pred)
    wind_roi_positive = wind_pred > (wind_activation_cost * 1.5)  # Need 1.5x cost to justify
    wind_activate = wind_pred > config.MIN_WIND_GENERATION_KWH and wind_roi_positive
    wind_reason = f"Wind sufficient for net gain (ROI positive)" if wind_activate else f"Insufficient wind or high activation cost ({wind_activation_cost:.2f} kWh cost vs {wind_pred:.2f} kWh generation)"
    
    # Compute active generation
    active_generation = (pv_pred if pv_activate else 0) + (wind_pred if wind_activate else 0)
    
    # Compute battery bilan (positive = surplus, negative = deficit)
    battery_bilan_kwh = active_generation - consumption_pred_with_margin
    
    # Estimate SOC (simplified model: assume 10 kWh battery capacity, start at 50%)
    BATTERY_CAPACITY_KWH = 10.0
    soc_estimate = 50 + (battery_bilan_kwh / BATTERY_CAPACITY_KWH) * 100
    soc_estimate = max(0, min(100, soc_estimate))
    
    print(f"[Decision Engine] Active generation: {active_generation:.2f} kWh, Bilan: {battery_bilan_kwh:.2f} kWh, SOC estimate: {soc_estimate:.1f}%")
    
    # === BATTERY & MICROGRID MANAGEMENT ===
    microgrid_action = 'none'
    microgrid_power_kw = 0
    
    if soc_estimate > config.BATTERY_EXPORT_THRESHOLD_SOC:
        # Export to microgrid
        microgrid_action = 'export'
        microgrid_power_kw = max(0, battery_bilan_kwh)
    elif soc_estimate < config.BATTERY_IMPORT_THRESHOLD_SOC:
        # Import from microgrid
        microgrid_action = 'import'
        microgrid_power_kw = max(0, -battery_bilan_kwh)
    
    # === APPLIANCE SCHEDULING ===
    appliances = []
    
    if battery_bilan_kwh > 2.0:
        # Surplus: schedule heavy loads during peak generation
        appliances.append({
            'id': 'washing_machine',
            'scheduled_time': '10:00',
            'reason': 'Schedule during peak generation (surplus available)',
            'action': 'schedule'
        })
        appliances.append({
            'id': 'dishwasher',
            'scheduled_time': '11:00',
            'reason': 'Optimize energy usage with surplus',
            'action': 'schedule'
        })
    elif battery_bilan_kwh < -1.0:
        # Deficit: defer heavy loads
        appliances.append({
            'id': 'washing_machine',
            'scheduled_time': 'defer',
            'reason': 'Insufficient energy, defer to reduce load',
            'action': 'defer'
        })
        appliances.append({
            'id': 'hvac',
            'scheduled_time': 'reduce',
            'reason': 'Reduce HVAC usage to conserve energy',
            'action': 'reduce'
        })
    else:
        # Balanced: normal operation
        appliances.append({
            'id': 'all',
            'scheduled_time': 'normal',
            'reason': 'Energy supply balanced, normal operation',
            'action': 'normal'
        })
    
    return {
        'sources': {
            'pv': {
                'activate': pv_activate,
                'reason': pv_reason
            },
            'wind_tree': {
                'activate': wind_activate,
                'reason': wind_reason
            }
        },
        'totals': {
            'generation_kwh': active_generation,
            'consumption_kwh': consumption_pred_with_margin
        },
        'battery': {
            'bilan_kwh': battery_bilan_kwh,
            'soc_estimate_percent': round(soc_estimate, 1)
        },
        'microgrid': {
            'action': microgrid_action,
            'power_kw': round(microgrid_power_kw, 2)
        },
        'appliances': appliances
    }
