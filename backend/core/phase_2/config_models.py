from dataclasses import dataclass
from typing import Optional, List
import yaml

@dataclass
class BatteryConfig:
    """Battery specifications and limits"""
    capacity_kwh: float
    max_charge_kw: float
    max_discharge_kw: float
    round_trip_efficiency: float
    min_soc_percent: float
    max_soc_percent: float
    initial_soc_percent: float

@dataclass
class SystemConfig:
    battery: BatteryConfig
    
    @classmethod
    def from_yaml(cls, path: str):
        with open(path, 'r') as f:
            config_dict = yaml.safe_load(f)
            
        batt_data = config_dict['battery']
        battery_config = BatteryConfig(
            capacity_kwh=batt_data.get('capacity_kwh', 13.5),
            max_charge_kw=batt_data.get('max_charge_kw', 5.0),
            max_discharge_kw=batt_data.get('max_discharge_kw', 5.0),
            round_trip_efficiency=batt_data.get('round_trip_efficiency', 0.95),
            min_soc_percent=batt_data.get('min_soc_percent', 20.0),
            max_soc_percent=batt_data.get('max_soc_percent', 100.0),
            initial_soc_percent=batt_data.get('initial_soc_percent', 50.0)
        )
        
        return cls(battery=battery_config)
