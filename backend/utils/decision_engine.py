"""
Phase 2 decision engine: activation, battery management, appliance scheduling.
Rules per spec:
- No blackout/waste concepts
- Activate a source only if predicted_kwh >= 1.2 * minimal_operational_kwh
- Export surplus when SOC > 80% (after scheduling user actions)
- Import and alert when SOC < 20%
"""

from backend.config import config

def compute_decisions(predictions, user_appliances=None, current_battery_soc=50.0, weekly_actions=None):
    """
    Phase 2 logic: decide activation, battery management, appliance scheduling.
    
    Args:
        predictions: Dict with {pv: [...], wind_tree: {...}, consumption: {...}}
        user_appliances: List of dicts with user machines [{id, name, power_kwh, cost_per_kwh, duration_hours}]
        current_battery_soc: Current battery state of charge (0-100%)
    
    Returns:
        Dict with decisions: sources, battery, microgrid, appliances
    """
    
    # Sum predicted generation
    pv_pred = sum([p['value'] for p in predictions['pv']]) if isinstance(predictions['pv'], list) else predictions['pv']['value']
    wind_pred = predictions['wind_tree']['value']
    consumption_pred = predictions['consumption']['value']
    
    # Add safety margin to consumption (20% buffer to account for prediction error)
    consumption_pred_with_margin = consumption_pred * 1.20
    
    print(f"[Decision Engine] PV: {pv_pred:.2f} kWh, Wind: {wind_pred:.2f} kWh, Consumption (with margin): {consumption_pred_with_margin:.2f} kWh")
    
    # === ACTIVATION DECISIONS ===
    # Activate only if predicted_kwh >= 1.2 * minimal_operational_kwh
    pv_min_operate = getattr(config, 'PV_MIN_OPERATE_KWH', 0.5)
    wind_min_operate = getattr(config, 'WIND_MIN_OPERATE_KWH', 0.3)

    pv_activate = pv_pred >= (pv_min_operate * 1.2)
    pv_reason = (
        f"Sufficient generation ({pv_pred:.2f} kWh >= 1.2×min {pv_min_operate*1.2:.2f} kWh)"
        if pv_activate else
        f"Low generation ({pv_pred:.2f} kWh < 1.2×min {pv_min_operate*1.2:.2f} kWh)"
    )

    wind_activate = wind_pred >= (wind_min_operate * 1.2)
    wind_reason = (
        f"Sufficient generation ({wind_pred:.2f} kWh >= 1.2×min {wind_min_operate*1.2:.2f} kWh)"
        if wind_activate else
        f"Low generation ({wind_pred:.2f} kWh < 1.2×min {wind_min_operate*1.2:.2f} kWh)"
    )
    
    # Compute active generation
    active_generation = (pv_pred if pv_activate else 0) + (wind_pred if wind_activate else 0)
    
    # Compute battery bilan (positive = surplus, negative = deficit)
    battery_bilan_kwh = active_generation - consumption_pred_with_margin
    
    # Estimate future SOC based on bilan
    BATTERY_CAPACITY_KWH = config.BATTERY_CAPACITY_KWH
    soc_change = (battery_bilan_kwh / BATTERY_CAPACITY_KWH) * 100
    soc_estimate = current_battery_soc + soc_change
    soc_estimate = max(0, min(100, soc_estimate))
    
    print(f"[Decision Engine] Active generation: {active_generation:.2f} kWh, Bilan: {battery_bilan_kwh:.2f} kWh, SOC: {current_battery_soc:.1f}% → {soc_estimate:.1f}%")
    
    # === BATTERY & MICROGRID MANAGEMENT ===
    microgrid_action = 'none'
    microgrid_power_kw = 0
    battery_action = 'idle'
    alerts = []
    
    # Battery management at 80% threshold (export surplus)
    if soc_estimate > config.BATTERY_EXPORT_THRESHOLD_SOC and battery_bilan_kwh > 0:
        excess_energy = battery_bilan_kwh
        microgrid_action = 'export'
        microgrid_power_kw = round(excess_energy, 2)
        battery_action = 'export_excess'
        alerts.append(f"Battery above 80% ({soc_estimate:.1f}%), exporting {excess_energy:.2f} kWh to microgrid")
    
    # Battery management at 20% threshold (import from grid + alert user)
    elif soc_estimate < config.BATTERY_IMPORT_THRESHOLD_SOC:
        deficit_energy = abs(battery_bilan_kwh) if battery_bilan_kwh < 0 else 0
        microgrid_action = 'import'
        microgrid_power_kw = round(deficit_energy, 2)
        battery_action = 'import_deficit'
        alerts.append(f"⚠️ ALERT: Battery below 20% ({soc_estimate:.1f}%), importing {deficit_energy:.2f} kWh from microgrid")
        alerts.append("⚠️ Reduce non-essential loads to preserve battery")
    
    # Normal operation (20% < SOC < 80%)
    elif battery_bilan_kwh > 0:
        battery_action = 'charging'
    elif battery_bilan_kwh < 0:
        battery_action = 'discharging'
    
    # === APPLIANCE SCHEDULING (Weekly actions prioritized, then export surplus) ===
    appliances = []
    available_surplus = max(0, battery_bilan_kwh)

    # Prioritize weekly planned actions (if provided)
    planned_actions = weekly_actions or []
    if planned_actions:
        # Each action: {id, name, power_kwh, preferred_time}
        for action in planned_actions:
            power_needed = action.get('power_kwh', 0)
            if available_surplus >= power_needed and soc_estimate > 50:
                appliances.append({
                    'id': action.get('id'),
                    'name': action.get('name', 'Planned action'),
                    'scheduled_time': action.get('preferred_time', '10:00'),
                    'power_kwh': power_needed,
                    'reason': 'Weekly planned action prioritized with available surplus',
                    'action': 'schedule'
                })
                available_surplus -= power_needed

    # Then schedule user appliances opportunistically
    if user_appliances:
        for appliance in user_appliances:
            power_needed = appliance.get('power_kwh', 0)
            if available_surplus >= power_needed and soc_estimate > 50:
                appliances.append({
                    'id': appliance.get('id'),
                    'name': appliance.get('name', 'Appliance'),
                    'scheduled_time': 'optimal_window',
                    'power_kwh': power_needed,
                    'reason': 'Surplus available; scheduling user appliance',
                    'action': 'schedule'
                })
                available_surplus -= power_needed
            elif soc_estimate < config.BATTERY_IMPORT_THRESHOLD_SOC and power_needed > 1.0:
                appliances.append({
                    'id': appliance.get('id'),
                    'name': appliance.get('name', 'Appliance'),
                    'scheduled_time': 'defer',
                    'power_kwh': power_needed,
                    'reason': 'Low battery; deferring appliance',
                    'action': 'defer'
                })
    
    # If no user appliances or none scheduled, add generic guidance
    if len(appliances) == 0:
        if battery_bilan_kwh > 2.0:
            appliances.append({
                'id': 'generic',
                'name': 'Heavy loads (washing, dishwasher)',
                'scheduled_time': 'optimal_window',
                'reason': f'Surplus available ({battery_bilan_kwh:.1f} kWh), good time for heavy appliances',
                'action': 'schedule'
            })
        elif soc_estimate < 30:
            appliances.append({
                'id': 'generic',
                'name': 'Non-essential loads',
                'scheduled_time': 'reduce',
                'reason': f'Low battery ({soc_estimate:.1f}%), reduce non-essential consumption',
                'action': 'reduce'
            })
    
    return {
        'sources': {
            'pv': {
                'activate': pv_activate,
                'reason': pv_reason,
                'predicted_kwh': pv_pred,
                'min_operate_kwh': pv_min_operate
            },
            'wind_tree': {
                'activate': wind_activate,
                'reason': wind_reason,
                'predicted_kwh': wind_pred,
                'min_operate_kwh': wind_min_operate
            }
        },
        'totals': {
            'generation_kwh': active_generation,
            'consumption_kwh': consumption_pred_with_margin,
            'net_bilan_kwh': battery_bilan_kwh
        },
        'battery': {
            'current_soc_percent': round(current_battery_soc, 1),
            'estimated_soc_percent': round(soc_estimate, 1),
            'action': battery_action,
            'bilan_kwh': round(battery_bilan_kwh, 2)
        },
        'microgrid': {
            'action': microgrid_action,
            'power_kw': microgrid_power_kw
        },
        'appliances': appliances,
        'alerts': alerts
    }
