class BatteryManager:
    """
    Manages battery state of charge and operations
    """
    
    def __init__(self, battery_config):
        self.config = battery_config
        self.current_soc_percent = battery_config.initial_soc_percent
        self.current_energy_kwh = (battery_config.initial_soc_percent / 100) * battery_config.capacity_kwh
        
    def get_soc(self) -> float:
        return self.current_soc_percent
    
    def get_energy(self) -> float:
        return self.current_energy_kwh
        
    def update_state(self, net_power_kw: float, duration_hours: float = 1.0):
        """
        Update battery state based on net power (Production - Consumption)
        Positive net_power -> Charge
        Negative net_power -> Discharge
        
        Returns:
            actual_power_kw: The actual power charged/discharged
            energy_change_kwh: The energy change in the battery
        """
        
        if net_power_kw > 0: # Charging
            # Limit by max charge rate
            power_to_charge = min(net_power_kw, self.config.max_charge_kw)
            
            # Limit by capacity
            max_energy_kwh = (self.config.max_soc_percent / 100) * self.config.capacity_kwh
            available_capacity = max_energy_kwh - self.current_energy_kwh
            
            # Energy to add (considering efficiency)
            # If we charge 1 kWh from grid/solar, battery gets 1 * efficiency
            energy_input = power_to_charge * duration_hours
            energy_added = energy_input * self.config.round_trip_efficiency # Simplified efficiency model
            
            if energy_added > available_capacity:
                energy_added = available_capacity
                # Reverse calculate power used
                power_to_charge = (energy_added / self.config.round_trip_efficiency) / duration_hours
                
            self.current_energy_kwh += energy_added
            actual_power = power_to_charge
            
        else: # Discharging
            power_needed = abs(net_power_kw)
            
            # Limit by max discharge rate
            power_to_discharge = min(power_needed, self.config.max_discharge_kw)
            
            # Limit by available energy
            min_energy_kwh = (self.config.min_soc_percent / 100) * self.config.capacity_kwh
            available_energy = self.current_energy_kwh - min_energy_kwh
            
            # Energy to remove
            # If we need 1 kWh output, we drain 1 / efficiency (or just 1 if efficiency is on input side)
            # Usually round trip efficiency is applied on one side or split. 
            # Let's apply discharge efficiency = sqrt(round_trip) or just assume simple model:
            # Energy removed from battery = Power * Time
            # But effective output is less? Or input is more?
            # Let's stick to: Energy removed = Power * Time. 
            # Efficiency loss happens during conversion. 
            # If we discharge 1kWh from battery, we get 1 * efficiency kWh AC?
            # Or if we need 1kWh AC, we drain 1/efficiency kWh?
            # Let's assume: We drain 'power_to_discharge' from battery.
            
            energy_removed = power_to_discharge * duration_hours
            
            if energy_removed > available_energy:
                energy_removed = available_energy
                power_to_discharge = energy_removed / duration_hours
                
            self.current_energy_kwh -= energy_removed
            actual_power = -power_to_discharge
            
        # Update SOC
        self.current_soc_percent = (self.current_energy_kwh / self.config.capacity_kwh) * 100
        
        return actual_power, (actual_power * duration_hours)
