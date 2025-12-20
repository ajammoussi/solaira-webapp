"""
PV Monitoring System - Refactored (Drop-in Replacement)
Keeps the same interface as old code but WITHOUT the insanity
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import json
from dataclasses import dataclass
from enum import Enum


class HealthStatus(Enum):
    """System health categories"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass
class PVSystem:
    """Simple PV system configuration"""
    system_id: int
    name: str
    capacity_kw: float = 5.0
    health: HealthStatus = HealthStatus.HEALTHY
    _base_performance: float = None  # Set once during initialization
    anomaly_probability: float = 0.02  # For compatibility
    current_anomaly: str = None  # For compatibility
    anomaly_start: datetime = None  # For compatibility
    
    def __post_init__(self):
        """Set consistent degradation factor"""
        if self._base_performance is None:
            # Set once and keep it consistent
            # Healthy systems: ~95% ±1%
            # Warning systems: ~88% (7% below, ~10-12% deviation)
            # Critical systems: ~80% (15% below, ~18-20% deviation)
            if self.health == HealthStatus.HEALTHY:
                self._base_performance = np.random.uniform(0.94, 0.96)
            elif self.health == HealthStatus.WARNING:
                self._base_performance = np.random.uniform(0.87, 0.89)
            else:  # CRITICAL
                self._base_performance = np.random.uniform(0.79, 0.81)
    
    @property
    def id(self) -> int:
        """Alias for system_id"""
        return self.system_id
    
    @property
    def health_status(self) -> str:
        """Return health as string for API compatibility"""
        return self.health.value
    
    @property
    def degradation_factor(self) -> float:
        """
        Performance multiplier based on health
        Returns consistent value with small daily variation (±2%)
        """
        # Add small daily variation to simulate weather/conditions
        daily_variation = np.random.uniform(0.98, 1.02)
        return self._base_performance * daily_variation


class SolarDataGenerator:
    """Generates realistic daily solar production data"""
    
    @staticmethod
    def daily_production(
        date: datetime,
        capacity_kw: float,
        degradation: float = 1.0
    ) -> tuple[float, float]:
        """
        Generate predicted and actual production for a single day
        
        Returns: (predicted_kwh, actual_kwh)
        """
        # Seasonal factor (higher in summer)
        month = date.month
        seasonal = 0.7 + 0.3 * np.sin((month - 3) * np.pi / 6)
        
        # Base daily production (~6 effective sun hours)
        base_kwh = capacity_kw * 6 * seasonal
        
        # Weather variability (±20%)
        weather = np.random.uniform(0.80, 1.00)
        predicted = base_kwh * weather
        
        # Apply degradation with small random variation
        actual = predicted * degradation * np.random.uniform(0.98, 1.02)
        
        return max(0, predicted), max(0, actual)
    
    @staticmethod
    def generate_history(
        system: PVSystem,
        days: int = 30,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Generate historical data for a system"""
        if end_date is None:
            end_date = datetime.now()
        
        dates = [end_date - timedelta(days=i) for i in range(days, 0, -1)]
        
        data = []
        for date in dates:
            predicted, actual = SolarDataGenerator.daily_production(
                date, 
                system.capacity_kw,
                system.degradation_factor
            )
            data.append({
                'date': date.strftime('%Y-%m-%d'),
                'system_id': system.system_id,
                'predicted_kwh': predicted,
                'actual_kwh': actual,
            })
        
        return pd.DataFrame(data)


class DataStore:
    """Handles data persistence"""
    
    def __init__(self, base_path: Path):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def save_system_data(self, system_id: int, df: pd.DataFrame):
        """Save system data to CSV files"""
        # Actual data
        actual = df[['date', 'actual_kwh']].copy()
        actual.columns = ['date', 'energy_kwh']
        actual.to_csv(
            self.base_path / f'pv_system_{system_id}_actual.csv',
            index=False
        )
        
        # Predicted data
        predicted = df[['date', 'predicted_kwh']].copy()
        predicted.columns = ['date', 'energy_kwh']
        predicted.to_csv(
            self.base_path / f'pv_system_{system_id}_predicted.csv',
            index=False
        )
    
    def load_system_data(self, system_id: int) -> Optional[pd.DataFrame]:
        """Load system data from CSV files"""
        actual_path = self.base_path / f'pv_system_{system_id}_actual.csv'
        predicted_path = self.base_path / f'pv_system_{system_id}_predicted.csv'
        
        if not actual_path.exists() or not predicted_path.exists():
            return None
        
        actual = pd.read_csv(actual_path)
        predicted = pd.read_csv(predicted_path)
        
        return pd.DataFrame({
            'date': actual['date'],
            'system_id': system_id,
            'actual_kwh': actual['energy_kwh'],
            'predicted_kwh': predicted['energy_kwh'],
        })


class SimpleAnalyzer:
    """Basic performance analysis without external dependencies"""
    
    @staticmethod
    def calculate_pr(actual: float, predicted: float) -> float:
        """Performance Ratio = actual / predicted"""
        return (actual / predicted) if predicted > 0 else 0
    
    @staticmethod
    def analyze_system(df: pd.DataFrame) -> Dict:
        """
        Analyze system performance
        
        Returns health status based on recent performance ratio
        """
        if len(df) < 7:
            return {
                'status': 'insufficient_data',
                'severity': 'normal',
                'message': 'Need at least 7 days of data',
                'data_points': len(df)
            }
        
        # Use last 7 days
        recent = df.tail(7)
        
        total_actual = recent['actual_kwh'].sum()
        total_predicted = recent['predicted_kwh'].sum()
        pr = SimpleAnalyzer.calculate_pr(total_actual, total_predicted)
        
        # Calculate deviation from expected
        deviation = 1.0 - pr
        
        # Determine status based on deviation thresholds
        # <10% deviation: healthy
        # 10-20% deviation: warning
        # >20% deviation: critical
        if deviation < 0.10:
            status = 'healthy'
            severity = 'normal'
            issues = []
        elif deviation < 0.20:
            status = 'warning'
            severity = 'warning'
            issues = ['Performance below normal range']
        else:
            status = 'critical'
            severity = 'critical'
            issues = ['Performance significantly below expected']
        
        # Daily PR values
        daily_pr = [
            SimpleAnalyzer.calculate_pr(row['actual_kwh'], row['predicted_kwh'])
            for _, row in recent.iterrows()
        ]
        
        return {
            'status': status,
            'severity': severity,
            'recent_pr': float(pr),
            'mean_deviation': float(deviation),
            'category': 'CRITICAL' if deviation >= 0.20 else 'MEDIUM' if deviation >= 0.15 else 'NORMAL',
            'issues_detected': issues,
            'data_points': int(len(recent)),
            'analysis_method': 'single_system'
        }


class PVMonitoringService:
    """
    Main monitoring service - drop-in replacement for old code
    Same interface, but WITHOUT background threads and spam
    """
    
    def __init__(self, data_dir: Optional[str] = None, maintenance_pipeline=None):
        self.data_dir = Path(data_dir) if data_dir else Path("backend/core/phase_3/monitoring_data")
        self.store = DataStore(self.data_dir)
        self.systems: Dict[int, PVSystem] = {}
        self.monitoring_active = False  # For compatibility, but we don't use it
        self.maintenance_pipeline = maintenance_pipeline  # For pairwise deviation analysis
        self.last_reading_time = None  # Track when we last generated readings
    
    def configure_systems(self, num_systems: int, capacity_per_system: float = 5.0) -> Dict:
        """Configure the number of PV systems to monitor"""
        
        self.systems.clear()
        
        # Delete all existing CSV files to start fresh
        for csv_file in self.data_dir.glob('*.csv'):
            csv_file.unlink()
        print(f"🗑️ Cleared old monitoring data")
        
        # Distribute health statuses
        if num_systems >= 3:
            healths = [HealthStatus.CRITICAL, HealthStatus.WARNING] + \
                     [HealthStatus.HEALTHY] * (num_systems - 2)
        elif num_systems == 2:
            healths = [HealthStatus.WARNING, HealthStatus.HEALTHY]
        else:
            healths = [HealthStatus.HEALTHY]
        
        for i in range(num_systems):
            system_id = i + 1
            system = PVSystem(
                system_id=system_id,
                name=f"Solar Panel {system_id}",
                capacity_kw=capacity_per_system,
                health=healths[i]
            )
            self.systems[system_id] = system
            
            # Generate initial 30-day history ending TODAY
            df = SolarDataGenerator.generate_history(system, days=30, end_date=datetime.now())
            self.store.save_system_data(system_id, df)
            print(f"📊 Generated 30 days of data for System {system_id} (ending {datetime.now().strftime('%Y-%m-%d')})")
        
        # Reset last reading time so it generates next reading immediately
        self.last_reading_time = None
            
        return {
            'num_systems': num_systems,
            'systems': [
                {
                    'id': s.system_id,
                    'name': s.name,
                    'capacity_kw': s.capacity_kw
                }
                for s in self.systems.values()
            ]
        }
    
    def generate_readings(self) -> List[Dict]:
        """
        Generate new daily readings for all systems
        Generates data for the NEXT day (for fast testing)
        """
        readings = []
        
        for system in self.systems.values():
            # Load existing data
            df = self.store.load_system_data(system.system_id)
            if df is None or df.empty:
                # No data yet, start with today
                next_date = datetime.now()
            else:
                # Find the most recent date and add 1 day
                most_recent = pd.to_datetime(df['date']).max()
                next_date = most_recent + timedelta(days=1)
            
            next_date_str = next_date.strftime('%Y-%m-%d')
            
            # Generate new reading for the next day
            predicted, actual = SolarDataGenerator.daily_production(
                next_date,
                system.capacity_kw,
                system.degradation_factor
            )
            
            # Append
            new_row = pd.DataFrame([{
                'date': next_date_str,
                'system_id': system.system_id,
                'predicted_kwh': predicted,
                'actual_kwh': actual,
            }])
            
            if df is None or df.empty:
                df = new_row
            else:
                df = pd.concat([df, new_row], ignore_index=True)
            
            # Keep last 30 days
            df = df.tail(30)
            
            # Save
            self.store.save_system_data(system.system_id, df)
            
            pr = SimpleAnalyzer.calculate_pr(actual, predicted)
            
            readings.append({
                'timestamp': next_date.isoformat(),
                'date': next_date_str,
                'system_id': system.system_id,
                'actual_kwh': actual,
                'predicted_kwh': predicted,
                'pr': pr
            })
        
        return readings
    
    def analyze_system(self, system_id: int, hours: int = 24) -> Dict:
        """Analyze a specific PV system"""
        if system_id not in self.systems:
            return {'error': 'System not found'}
        
        df = self.store.load_system_data(system_id)
        if df is None:
            return {
                'system_id': system_id,
                'status': 'no_data',
                'severity': 'normal',
                'message': 'No data available'
            }
        
        analysis = SimpleAnalyzer.analyze_system(df)
        analysis['system_id'] = system_id
        analysis['system_name'] = self.systems[system_id].name
        
        return analysis
    
    def get_all_systems_status(self) -> List[Dict]:
        """Get status for all systems using pairwise comparative analysis"""
        if not self.systems:
            return []
        
        # Auto-generate new readings once per day (86400 seconds)
        now = datetime.now()
        if self.last_reading_time is None or (now - self.last_reading_time).seconds >= 86400:
            print(f"⏰ Generating new readings at {now.strftime('%H:%M:%S')}")
            self.generate_readings()
            self.last_reading_time = now
        
        # Use predictive maintenance pipeline if available (for multi-system analysis)
        if self.maintenance_pipeline and len(self.systems) >= 2:
            try:
                result = self.maintenance_pipeline.analyze_monitoring_systems(self.data_dir)
                
                if 'error' not in result and 'systems' in result:
                    # Format the results for the API
                    statuses = []
                    for system_id in sorted(self.systems.keys()):
                        if system_id in result['systems']:
                            analysis = result['systems'][system_id]
                            analysis['system_id'] = system_id
                            analysis['system_name'] = self.systems[system_id].name
                            statuses.append(analysis)
                        else:
                            # Fallback if system not in analysis
                            statuses.append(self.analyze_system(system_id))
                    
                    return statuses
            except Exception as e:
                print(f"Warning: Pairwise analysis failed, using fallback: {e}")
                import traceback
                traceback.print_exc()
        
        # Fallback to simple single-system analysis
        return [self.analyze_system(sid) for sid in self.systems.keys()]
    
    def get_system_history(self, system_id: int, hours: int = 24) -> List[Dict]:
        """Get historical data for a system"""
        if system_id not in self.systems:
            return []
        
        df = self.store.load_system_data(system_id)
        if df is None:
            return []
        
        # Convert to list of dicts
        return df.to_dict('records')
    
    # Compatibility methods (old interface)
    def start_monitoring(self, interval_seconds: int = 60):
        """
        Start monitoring simulation.
        Triggers an immediate reading generation to simulate system activity.
        """
        self.monitoring_active = True
        
        # Trigger immediate reading generation so user sees "something happening"
        readings = self.generate_readings()
        
        return {
            'status': 'started', 
            'message': f'Monitoring started. Generated {len(readings)} new readings.',
            'active_systems': len(self.systems)
        }
    
    def stop_monitoring(self):
        """Stop monitoring simulation"""
        self.monitoring_active = False
        return {'status': 'stopped'}


# Global instance (for compatibility with old code)
_monitoring_service = None
_maintenance_pipeline = None


def get_monitoring_service(maintenance_pipeline=None) -> PVMonitoringService:
    """Get or create the global monitoring service instance"""
    global _monitoring_service, _maintenance_pipeline
    
    # Store pipeline on first call
    if maintenance_pipeline is not None and _maintenance_pipeline is None:
        _maintenance_pipeline = maintenance_pipeline
    
    # Create service once and reuse it
    if _monitoring_service is None:
        print(f"🔧 Creating new PVMonitoringService instance")
        _monitoring_service = PVMonitoringService(maintenance_pipeline=_maintenance_pipeline)
    else:
        print(f"♻️ Reusing existing PVMonitoringService (has {len(_monitoring_service.systems)} systems)")
    
    return _monitoring_service


# Clean up on module reload
def reset_monitoring_service():
    """Reset the global service (useful for testing)"""
    global _monitoring_service
    _monitoring_service = None