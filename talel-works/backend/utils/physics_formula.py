"""
Physics-based energy cost calculations for activation & maintenance.
"""

def calculate_activation_cost(source_type: str, predicted_generation_kwh: float = 0) -> float:
    """
    Calculate energy cost to activate and maintain a renewable source.
    
    Args:
        source_type: 'pv' or 'wind_tree'
        predicted_generation_kwh: Predicted generation (for dynamic cost calculation)
    
    Returns:
        Energy cost in kWh
    """
    
    if source_type == 'pv':
        # PV panels: minimal activation cost (inverter startup + control systems)
        startup_cost_kwh = 0.05
        maintenance_cost_kwh = 0.02 * predicted_generation_kwh  # 2% of generation
        return startup_cost_kwh + maintenance_cost_kwh
    
    elif source_type == 'wind_tree':
        # Wind turbines: higher activation cost (motor startup, mechanical losses)
        startup_cost_kwh = 0.2
        # Maintenance cost depends on wind speed (higher wind = more wear)
        maintenance_cost_kwh = 0.05 * predicted_generation_kwh  # 5% of generation
        return startup_cost_kwh + maintenance_cost_kwh
    
    else:
        return 0.0

def calculate_battery_efficiency_loss(charge_discharge_kwh: float) -> float:
    """
    Calculate energy loss due to battery charge/discharge efficiency.
    
    Args:
        charge_discharge_kwh: Amount of energy to charge or discharge
    
    Returns:
        Energy loss in kWh
    """
    BATTERY_EFFICIENCY = 0.90  # 90% round-trip efficiency
    loss = abs(charge_discharge_kwh) * (1 - BATTERY_EFFICIENCY)
    return loss

def calculate_transmission_loss(distance_m: float, power_kw: float) -> float:
    """
    Calculate energy loss during transmission to/from microgrid.
    
    Args:
        distance_m: Distance to microgrid hub (meters)
        power_kw: Power transmitted (kW)
    
    Returns:
        Energy loss in kWh (for 1 hour transmission)
    """
    # Simplified model: loss = resistance * I^2 * time
    # Assume 0.1% loss per 100m
    loss_factor = (distance_m / 100) * 0.001
    loss_kwh = power_kw * loss_factor
    return loss_kwh
