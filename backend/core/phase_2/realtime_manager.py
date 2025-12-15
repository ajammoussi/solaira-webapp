"""
Realtime Energy Manager for API Integration
Enhanced version that integrates PV + Wind energy predictions with battery management
"""
import sys
import os
import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import warnings

warnings.filterwarnings('ignore')

# Add paths for imports - must be before local imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Local imports from same directory
from battery_manager import BatteryManager
from config_models import SystemConfig, BatteryConfig


class RealtimeEnergyManager:
    """
    Manages realtime energy flow simulation with:
    - PV Energy predictions (XGBoost 0.45 + LSTM 0.55)
    - Wind Energy predictions (XGBoost + LSTM 0.53/0.47)
    - Consumption forecasting
    - Battery management
    - Decision making
    """
    
    def __init__(self, 
                 config_path: Optional[str] = None,
                 battery_capacity_kwh: float = 13.5,
                 initial_soc: float = 50.0):
        """
        Initialize the realtime energy manager
        
        Args:
            config_path: Path to system config YAML (optional)
            battery_capacity_kwh: Battery capacity in kWh
            initial_soc: Initial state of charge (%)
        """
        
        # Load or create config
        if config_path and os.path.exists(config_path):
            self.config = SystemConfig.from_yaml(config_path)
        else:
            # Create minimal config for API use
            battery_config = BatteryConfig(
                capacity_kwh=battery_capacity_kwh,
                max_charge_kw=5.0,
                max_discharge_kw=5.0,
                round_trip_efficiency=0.95,
                min_soc_percent=20.0,
                max_soc_percent=100.0,
                initial_soc_percent=initial_soc
            )
            self.config = SystemConfig(battery=battery_config)
        
        # Initialize battery manager
        self.battery = BatteryManager(self.config.battery)
        
        # Load historical data
        self._load_historical_data()
        
        # Load prediction models
        self._load_models()
        
        print("✅ Realtime Energy Manager initialized")
        print(f"   Battery: {self.config.battery.capacity_kwh} kWh @ {initial_soc}% SOC")
    
    def _load_historical_data(self):
        """Load real historical PV, consumption, and wind data"""
        try:
            # Get data directory: from phase_2 -> core -> backend -> backend/data
            backend_dir = os.path.dirname(os.path.dirname(current_dir))  # backend/core -> backend
            data_dir = os.path.join(backend_dir, 'data')
            
            # Load PV production data
            pv_path = os.path.join(data_dir, 'processed_pv_data_2022_2025.csv')
            if os.path.exists(pv_path):
                self.pv_data = pd.read_csv(pv_path)
                self.pv_data['datetime'] = pd.to_datetime(self.pv_data['datetime'])
                self.pv_data.set_index('datetime', inplace=True)
                print(f"   ✅ Loaded {len(self.pv_data)} hours of PV production data")
                print(f"      Date range: {self.pv_data.index.min()} to {self.pv_data.index.max()}")
            else:
                print(f"   ⚠️ PV data not found at {pv_path}, using simulated patterns")
                self.pv_data = None
            
            # Load consumption data  
            consumption_path = os.path.join(data_dir, 'consumption', 'processed_power_usage_2022_2025.csv')
            if os.path.exists(consumption_path):
                self.consumption_data = pd.read_csv(consumption_path)
                self.consumption_data['datetime'] = pd.to_datetime(self.consumption_data['datetime'])
                self.consumption_data.set_index('datetime', inplace=True)
                print(f"   ✅ Loaded {len(self.consumption_data)} hours of consumption data")
                print(f"      Date range: {self.consumption_data.index.min()} to {self.consumption_data.index.max()}")
            else:
                print(f"   ⚠️ Consumption data not found at {consumption_path}, using simulated patterns")
                self.consumption_data = None
            
            # Load wind/weather data (ERA5) - use the file with pre-calculated energy
            wind_path = os.path.join(data_dir, 'era5_data_with_energy.csv')
            if os.path.exists(wind_path):
                self.wind_data = pd.read_csv(wind_path)
                self.wind_data['time'] = pd.to_datetime(self.wind_data['time'])
                self.wind_data.set_index('time', inplace=True)
                
                # Rename Energy_kWh to wind_energy_kwh if needed
                if 'Energy_kWh' in self.wind_data.columns:
                    self.wind_data['wind_energy_kwh'] = self.wind_data['Energy_kWh']
                elif 'wind_energy_kwh' not in self.wind_data.columns and 'WS_Hub' in self.wind_data.columns:
                    # Fallback: Calculate wind energy from wind speed if not present
                    # Wind power formula: P = 0.5 * ρ * A * v³ * η
                    # ρ = 1.225 kg/m³ (air density)
                    # A = 2.0 m² (assumed turbine swept area)
                    # v = wind speed (m/s)
                    # η = 0.25 (efficiency)
                    # Result in kW, converted to kWh for 1 hour
                    self.wind_data['wind_energy_kwh'] = (
                        0.5 * 1.225 * 2.0 * (self.wind_data['WS_Hub'] ** 3) * 0.25 / 1000
                    )
                
                print(f"   ✅ Loaded {len(self.wind_data)} hours of wind/weather data")
                print(f"      Date range: {self.wind_data.index.min()} to {self.wind_data.index.max()}")
                avg_wind = self.wind_data['wind_energy_kwh'].mean()
                print(f"      Average wind energy: {avg_wind:.3f} kWh/hour")
            else:
                print(f"   ⚠️ Wind data not found at {wind_path}, using simulated patterns")
                self.wind_data = None
                
        except Exception as e:
            print(f"   ⚠️ Error loading historical data: {e}")
            import traceback
            traceback.print_exc()
            self.pv_data = None
            self.consumption_data = None
            self.wind_data = None
    
    def _load_models(self):
        """Load PV and Wind energy prediction models"""
        # Add parent directory to path for sibling imports
        parent_dir = os.path.dirname(current_dir)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
        
        try:
            # Import PV predictor
            from pv_energy.inference_service import PVEnergyPredictorService
            self.pv_predictor = PVEnergyPredictorService()
            print("   ✅ PV Energy predictor loaded")
        except Exception as e:
            print(f"   ⚠️ PV predictor not available: {e}")
            self.pv_predictor = None
        
        try:
            # Import Wind predictor
            from wind_energy.inference_service import WindEnergyPredictorService
            self.wind_predictor = WindEnergyPredictorService()
            print("   ✅ Wind Energy predictor loaded")
        except Exception as e:
            print(f"   ⚠️ Wind predictor not available: {e}")
            self.wind_predictor = None
    
    def simulate_period(self,
                       start_time: datetime,
                       hours: int = 24,
                       pv_history: Optional[pd.DataFrame] = None,
                       wind_history: Optional[pd.DataFrame] = None,
                       consumption_profile: Optional[List[float]] = None,
                       use_historical_data: bool = True) -> Dict:
        """
        Simulate energy flow for a period
        
        Args:
            start_time: Starting datetime for simulation
            hours: Number of hours to simulate (default 24)
            pv_history: Historical PV data (for predictions)
            wind_history: Historical wind data (for predictions)
            consumption_profile: Hourly consumption values (kWh), if None uses defaults
            
        Returns:
            Dict with simulation results including hourly data and summary
        """
        
        results = {
            'timestamps': [],
            'pv_energy_kwh': [],
            'wind_energy_kwh': [],
            'total_production_kwh': [],
            'consumption_kwh': [],
            'battery_soc_percent': [],
            'battery_energy_kwh': [],
            'net_power_kw': [],
            'wasted_energy_kwh': [],
            'deficit_kwh': []
        }
        
        # If no consumption profile provided, use realistic pattern based on historical data
        if consumption_profile is None:
            consumption_profile = self._generate_consumption_pattern(hours, start_time)
        
        # Ensure consumption profile matches hours
        if len(consumption_profile) < hours:
            consumption_profile = consumption_profile + [0.5] * (hours - len(consumption_profile))
        consumption_profile = consumption_profile[:hours]
        
        # Determine actual start time from historical data if available
        actual_start = start_time
        if use_historical_data:
            # Use most recent available data point as reference
            if self.pv_data is not None and len(self.pv_data) > 0:
                # Get the latest timestamp from PV data and go back 'hours' from there
                latest_time = self.pv_data.index.max()
                actual_start = latest_time - timedelta(hours=hours)
                print(f"   📅 Using historical data from {actual_start} to {latest_time}")
            elif self.consumption_data is not None and len(self.consumption_data) > 0:
                latest_time = self.consumption_data.index.max()
                actual_start = latest_time - timedelta(hours=hours)
                print(f"   📅 Using historical data from {actual_start} to {latest_time}")
        
        total_pv = 0
        total_wind = 0
        total_consumption = 0
        total_wasted = 0
        total_deficit = 0
        
        for hour in range(hours):
            current_time = actual_start + timedelta(hours=hour)
            
            # Get PV energy - use historical data if available
            if use_historical_data and self.pv_data is not None:
                pv_kwh = self._get_historical_pv(current_time)
            else:
                pv_kwh = self._predict_pv_energy(current_time, pv_history)
            
            # Get Wind energy - use historical data if available
            if use_historical_data and self.wind_data is not None:
                wind_kwh = self._get_historical_wind(current_time)
            else:
                wind_kwh = self._predict_wind_energy(current_time, wind_history)
            
            # Debug first hour to verify data sources
            if hour == 0:
                print(f"   📊 Hour 0 data sources:")
                print(f"      PV: {pv_kwh:.3f} kWh (from {'historical' if (use_historical_data and self.pv_data is not None) else 'pattern'})")
                print(f"      Wind: {wind_kwh:.3f} kWh (from {'historical' if (use_historical_data and self.wind_data is not None) else 'pattern'})")
            
            # Total production
            production_kwh = pv_kwh + wind_kwh
            
            # Get consumption - use historical data if available
            if not consumption_profile and use_historical_data and self.consumption_data is not None:
                consumption_kwh = self._get_historical_consumption(current_time)
            elif consumption_profile:
                consumption_kwh = consumption_profile[hour]
            else:
                consumption_kwh = 1.5  # Default fallback
            
            # Calculate net power
            net_power_kw = production_kwh - consumption_kwh
            
            # Update battery state
            wasted = 0.0
            deficit = 0.0
            
            if net_power_kw > 0:  # Surplus - try to charge battery
                actual_power, energy_change = self.battery.update_state(net_power_kw, duration_hours=1.0)
                # Any remaining surplus is wasted
                wasted = max(0, net_power_kw - actual_power)
            elif net_power_kw < 0:  # Deficit - discharge battery
                actual_power, energy_change = self.battery.update_state(net_power_kw, duration_hours=1.0)
                # If battery couldn't cover all deficit, we have shortage
                deficit = max(0, abs(net_power_kw) - abs(actual_power))
            
            # Record results
            results['timestamps'].append(current_time.isoformat())
            results['pv_energy_kwh'].append(round(pv_kwh, 3))
            results['wind_energy_kwh'].append(round(wind_kwh, 3))
            results['total_production_kwh'].append(round(production_kwh, 3))
            results['consumption_kwh'].append(round(consumption_kwh, 3))
            results['battery_soc_percent'].append(round(self.battery.get_soc(), 2))
            results['battery_energy_kwh'].append(round(self.battery.get_energy(), 3))
            results['net_power_kw'].append(round(net_power_kw, 3))
            results['wasted_energy_kwh'].append(round(wasted, 3))
            results['deficit_kwh'].append(round(deficit, 3))
            
            # Update totals
            total_pv += pv_kwh
            total_wind += wind_kwh
            total_consumption += consumption_kwh
            total_wasted += wasted
            total_deficit += deficit
        
        # Add summary
        results['summary'] = {
            'total_pv_energy_kwh': round(total_pv, 2),
            'total_wind_energy_kwh': round(total_wind, 2),
            'total_production_kwh': round(total_pv + total_wind, 2),
            'total_consumption_kwh': round(total_consumption, 2),
            'total_wasted_kwh': round(total_wasted, 2),
            'total_deficit_kwh': round(total_deficit, 2),
            'min_soc_percent': round(min(results['battery_soc_percent']), 2),
            'max_soc_percent': round(max(results['battery_soc_percent']), 2),
            'avg_soc_percent': round(sum(results['battery_soc_percent']) / len(results['battery_soc_percent']), 2),
            'energy_balance_kwh': round(total_pv + total_wind - total_consumption, 2)
        }
        
        return results
    
    def _get_historical_pv(self, timestamp: datetime) -> float:
        """Get actual PV production from historical data"""
        if self.pv_data is None:
            return self._simple_solar_pattern(timestamp)
        
        try:
            # Try exact timestamp match
            if timestamp in self.pv_data.index:
                return max(0, float(self.pv_data.loc[timestamp, 'pv_production_kwh']))
            
            # Try to find closest timestamp within ±30 minutes
            time_diff = abs(self.pv_data.index - timestamp)
            closest_idx = time_diff.argmin()
            if time_diff[closest_idx] < timedelta(minutes=30):
                return max(0, float(self.pv_data.iloc[closest_idx]['pv_production_kwh']))
            
            # If no close match, use pattern matching (same month/day/hour from history)
            month, day, hour = timestamp.month, timestamp.day, timestamp.hour
            mask = (
                (self.pv_data.index.month == month) &
                (self.pv_data.index.day == day) &
                (self.pv_data.index.hour == hour)
            )
            matching = self.pv_data[mask]
            
            if len(matching) > 0:
                return max(0, float(matching['pv_production_kwh'].mean()))
                
        except Exception as e:
            print(f"   ⚠️ Error getting historical PV: {e}")
        
        return self._simple_solar_pattern(timestamp)
    
    def _get_historical_wind(self, timestamp: datetime) -> float:
        """Get actual wind production from historical data"""
        if self.wind_data is None:
            return self._simple_wind_pattern(timestamp)
        
        try:
            # Try exact timestamp match
            if timestamp in self.wind_data.index:
                return max(0, float(self.wind_data.loc[timestamp, 'wind_energy_kwh']))
            
            # Try to find closest timestamp within ±30 minutes
            time_diff = abs(self.wind_data.index - timestamp)
            closest_idx = time_diff.argmin()
            if time_diff[closest_idx] < timedelta(minutes=30):
                return max(0, float(self.wind_data.iloc[closest_idx]['wind_energy_kwh']))
            
            # If no close match, use pattern matching
            month, day, hour = timestamp.month, timestamp.day, timestamp.hour
            mask = (
                (self.wind_data.index.month == month) &
                (self.wind_data.index.day == day) &
                (self.wind_data.index.hour == hour)
            )
            matching = self.wind_data[mask]
            
            if len(matching) > 0:
                return max(0, float(matching['wind_energy_kwh'].mean()))
                
        except Exception as e:
            print(f"   ⚠️ Error getting historical wind: {e}")
        
        return self._simple_wind_pattern(timestamp)
    
    def _get_historical_consumption(self, timestamp: datetime) -> float:
        """Get actual consumption from historical data"""
        if self.consumption_data is None:
            return self._simple_consumption_for_hour(timestamp.hour)
        
        try:
            # Try exact timestamp match
            if timestamp in self.consumption_data.index:
                return max(0.1, float(self.consumption_data.loc[timestamp, 'consumption_kwh']))
            
            # Try to find closest timestamp within ±30 minutes
            time_diff = abs(self.consumption_data.index - timestamp)
            closest_idx = time_diff.argmin()
            if time_diff[closest_idx] < timedelta(minutes=30):
                return max(0.1, float(self.consumption_data.iloc[closest_idx]['consumption_kwh']))
            
            # If no close match, use pattern matching
            month, day, hour = timestamp.month, timestamp.day, timestamp.hour
            mask = (
                (self.consumption_data.index.month == month) &
                (self.consumption_data.index.day == day) &
                (self.consumption_data.index.hour == hour)
            )
            matching = self.consumption_data[mask]
            
            if len(matching) > 0:
                return max(0.1, float(matching['consumption_kwh'].mean()))
                
        except Exception as e:
            print(f"   ⚠️ Error getting historical consumption: {e}")
        
        return self._simple_consumption_for_hour(timestamp.hour)
    
    def _predict_pv_energy(self, timestamp: datetime, history: Optional[pd.DataFrame]) -> float:
        """Predict PV energy for one hour using historical data"""
        if self.pv_data is not None:
            try:
                # Try to find exact timestamp match
                if timestamp in self.pv_data.index:
                    return max(0, self.pv_data.loc[timestamp, 'pv_production_kwh'])
                
                # Otherwise, find closest match by month/day/hour from historical data
                month = timestamp.month
                day = timestamp.day
                hour = timestamp.hour
                
                # Filter data for same month, day, hour from any year
                mask = (
                    (self.pv_data.index.month == month) &
                    (self.pv_data.index.day == day) &
                    (self.pv_data.index.hour == hour)
                )
                matching = self.pv_data[mask]
                
                if len(matching) > 0:
                    # Use mean of matching historical data
                    return max(0, matching['pv_production_kwh'].mean())
                
            except Exception as e:
                pass
        
        # Fallback to simple pattern
        return self._simple_solar_pattern(timestamp)
    
    def _predict_wind_energy(self, timestamp: datetime, history: Optional[pd.DataFrame]) -> float:
        """Predict wind energy - use historical wind data if available"""
        # Try to get historical wind data first
        if self.wind_data is not None:
            return self._get_historical_wind(timestamp)
        # Fallback to pattern
        return self._simple_wind_pattern(timestamp)
    
    def _generate_consumption_pattern(self, hours: int, start_time: datetime = None) -> List[float]:
        """Generate consumption pattern using real historical data"""
        if self.consumption_data is not None and start_time is not None:
            pattern = []
            
            for h in range(hours):
                current_time = start_time + timedelta(hours=h)
                
                try:
                    # Try exact match first
                    if current_time in self.consumption_data.index:
                        pattern.append(max(0.1, self.consumption_data.loc[current_time, 'consumption_kwh']))
                        continue
                    
                    # Match by month/day/hour from historical data
                    month = current_time.month
                    day = current_time.day
                    hour = current_time.hour
                    
                    mask = (
                        (self.consumption_data.index.month == month) &
                        (self.consumption_data.index.day == day) &
                        (self.consumption_data.index.hour == hour)
                    )
                    matching = self.consumption_data[mask]
                    
                    if len(matching) > 0:
                        pattern.append(max(0.1, matching['consumption_kwh'].mean()))
                    else:
                        # Fallback to hourly average
                        pattern.append(self._simple_consumption_for_hour(hour))
                        
                except Exception:
                    pattern.append(self._simple_consumption_for_hour(current_time.hour))
            
            return pattern
        
        # Fallback to simple pattern
        return [self._simple_consumption_for_hour(h % 24) for h in range(hours)]
    
    def _simple_consumption_for_hour(self, hour: int) -> float:
        """Simple consumption pattern for one hour"""
        if 0 <= hour < 6:  # Night
            return 0.5
        elif 6 <= hour < 9:  # Morning peak
            return 2.5
        elif 9 <= hour < 17:  # Day
            return 1.5
        elif 17 <= hour < 22:  # Evening peak
            return 3.0
        else:  # Late evening
            return 1.0
    
    def _simple_solar_pattern(self, timestamp: datetime) -> float:
        """Generate realistic solar production pattern (fallback)"""
        hour = timestamp.hour
        month = timestamp.month
        
        # Solar production pattern (0-24h)
        if hour < 6 or hour > 19:
            return 0.0
        
        # Seasonal adjustment (summer higher, winter lower)
        seasonal_factor = 1.0
        if month in [6, 7, 8]:  # Summer
            seasonal_factor = 1.3
        elif month in [12, 1, 2]:  # Winter
            seasonal_factor = 0.7
        
        # Peak at noon
        if 10 <= hour <= 14:
            base = 3.5 * seasonal_factor
        elif 8 <= hour < 10 or 14 < hour <= 17:
            base = 2.5 * seasonal_factor
        elif 7 <= hour < 8 or 17 < hour <= 19:
            base = 1.2 * seasonal_factor
        else:
            base = 0.3 * seasonal_factor
        
        return base
    
    def _simple_wind_pattern(self, timestamp: datetime) -> float:
        """Generate realistic wind production pattern (fallback)"""
        hour = timestamp.hour
        
        # Wind typically higher at night and morning
        if 0 <= hour < 6:
            base = 1.5
        elif 6 <= hour < 12:
            base = 1.2
        elif 12 <= hour < 18:
            base = 0.8
        else:
            base = 1.4
        
        return base
    
    def reset_battery(self, soc_percent: float):
        """Reset battery to specific SOC"""
        self.battery.current_soc_percent = soc_percent
        self.battery.current_energy_kwh = (soc_percent / 100) * self.config.battery.capacity_kwh


if __name__ == "__main__":
    # Quick test
    manager = RealtimeEnergyManager(battery_capacity_kwh=13.5, initial_soc=50.0)
    
    results = manager.simulate_period(
        start_time=datetime.now(),
        hours=24
    )
    
    print("\n📊 Simulation Summary:")
    for key, value in results['summary'].items():
        print(f"   {key}: {value}")
