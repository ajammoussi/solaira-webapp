"""
PV Systems Monitoring Service
Generates realistic production data with anomalies and monitors system health
Compatible with src_final/phase_3 pipeline
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import os
from pathlib import Path
import threading
import time
import yaml
import sys

# Add src_final to path
project_root = Path(__file__).parent.parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Fix the imports in predictive_maintenance.py by adding src_final to path first
src_final_path = project_root / 'src_final'
if str(src_final_path) not in sys.path:
    sys.path.insert(0, str(src_final_path))

from src_final.phase_3.predictive_maintenance import PredictiveMaintenancePipeline


class PVSystemConfig:
    """Configuration for a single PV system"""
    
    def __init__(
        self, 
        system_id: int, 
        capacity_kw: float = 5.0,
        name: Optional[str] = None,
        anomaly_probability: float = 0.05
    ):
        self.system_id = system_id
        self.capacity_kw = capacity_kw
        self.name = name or f"PV System {system_id}"
        self.anomaly_probability = anomaly_probability
        self.current_anomaly = None
        self.anomaly_start = None
        

class PVDataGenerator:
    """Generates realistic PV production data with anomalies"""
    
    def __init__(self, system_config: PVSystemConfig):
        self.config = system_config
        self.history = []
        
    def _get_solar_multiplier(self, hour: int, month: int) -> float:
        """Calculate solar production multiplier based on time"""
        # Night time
        if hour < 6 or hour > 20:
            return 0.0
            
        # Seasonal adjustment
        seasonal_factor = 0.7 + 0.3 * np.sin((month - 3) * np.pi / 6)
        
        # Bell curve centered at 1pm
        peak_hour = 13
        std_dev = 4
        gaussian = np.exp(-((hour - peak_hour) ** 2) / (2 * std_dev ** 2))
        
        return gaussian * seasonal_factor
    
    def _inject_anomaly(self, base_production: float) -> tuple[float, Optional[str]]:
        """Inject anomalies into production data"""
        # Check if we should start a new anomaly
        if self.config.current_anomaly is None:
            if np.random.random() < self.config.anomaly_probability:
                anomaly_type = np.random.choice([
                    'panel_soiling',      # 10-20% reduction
                    'partial_shading',    # 15-30% reduction
                    'inverter_issue',     # 20-40% reduction
                    'micro_failure'       # 5-15% reduction
                ])
                self.config.current_anomaly = anomaly_type
                self.config.anomaly_start = datetime.now()
        
        # Apply anomaly if active
        if self.config.current_anomaly:
            duration = (datetime.now() - self.config.anomaly_start).total_seconds() / 60
            
            # Resolve anomaly after some time (10-60 minutes)
            if duration > np.random.uniform(10, 60):
                self.config.current_anomaly = None
                self.config.anomaly_start = None
                return base_production, None
            
            # Apply degradation based on anomaly type
            if self.config.current_anomaly == 'panel_soiling':
                degradation = np.random.uniform(0.10, 0.20)
            elif self.config.current_anomaly == 'partial_shading':
                degradation = np.random.uniform(0.15, 0.30)
            elif self.config.current_anomaly == 'inverter_issue':
                degradation = np.random.uniform(0.20, 0.40)
            else:  # micro_failure
                degradation = np.random.uniform(0.05, 0.15)
            
            return base_production * (1 - degradation), self.config.current_anomaly
        
        return base_production, None
    
    def generate_reading(self) -> Dict:
        """Generate a single production reading"""
        now = datetime.now()
        hour = now.hour
        month = now.month
        
        # Base production
        solar_multiplier = self._get_solar_multiplier(hour, month)
        base_production = self.config.capacity_kw * solar_multiplier
        
        # Add weather variability (±20%)
        weather_factor = np.random.uniform(0.80, 1.00)
        base_production *= weather_factor
        
        # Add small random noise (±5%)
        noise = np.random.uniform(-0.05, 0.05)
        base_production *= (1 + noise)
        
        # Inject anomalies
        actual_production, anomaly = self._inject_anomaly(base_production)
        
        # Calculate predicted production (what it should be without anomalies)
        predicted_production = base_production
        
        reading = {
            'timestamp': now.isoformat(),
            'system_id': self.config.system_id,
            'actual_kwh': max(0, actual_production),
            'predicted_kwh': max(0, predicted_production),
            'anomaly': anomaly
        }
        
        self.history.append(reading)
        
        # Keep only last 24 hours
        if len(self.history) > 1440:  # 24 hours * 60 minutes
            self.history = self.history[-1440:]
        
        return reading


class PVMonitoringService:
    """Main service for monitoring multiple PV systems"""
    
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).parent / "monitoring_data"
        self.data_dir.mkdir(exist_ok=True)
        
        self.systems: Dict[int, PVSystemConfig] = {}
        self.generators: Dict[int, PVDataGenerator] = {}
        
        # Pipeline will be initialized when systems are configured
        self.pipeline = None
        self.config_path = None
        
        self.monitoring_active = False
        self.monitoring_thread = None
        
        self._load_config()
    
    def _create_dynamic_config_file(self, num_systems: int) -> Path:
        """Create a dynamic YAML config file compatible with src_final/phase_3"""
        systems_list = []
        for i in range(1, num_systems + 1):
            systems_list.append({
                'name': f'PV_System_{i}',
                'actual_data': f'backend/core/phase_3/monitoring_data/pv_system_{i}_actual.csv',
                'predicted_data': f'backend/core/phase_3/monitoring_data/pv_system_{i}_predicted.csv'
            })
        
        config_dict = {
            'config_version': '3.0.0',
            'system_name': 'Real-time PV Monitoring System',
            'pv_systems': {
                'systems': systems_list,
                'max_proximity_km': 5.0
            },
            'deviation_score': {
                'warning_threshold': 0.20,      # 20% deviation: warning
                'critical_threshold': 0.30,     # 30% deviation: critical
                'moving_average_days': 3,
                'consecutive_days_alert': 2,
                'min_valid_pairs': 2
            },
            'performance_ratio': {
                'expected_pr_min': 0.60,
                'expected_pr_max': 0.90,
                'optimal_pr': 0.80
            },
            'analysis': {
                'analysis_level': 'daily',
                'min_hours_for_daily_pr': 8,
                'min_production_kwh': 0.1,
                'short_term_window_days': 7,
                'long_term_window_days': 30
            },
            'data_sources': {
                'timestamp_column': 'date',
                'actual_power_column': 'energy_kwh',
                'predicted_power_column': 'energy_kwh'
            }
        }
        
        # Save to YAML file
        config_path = self.data_dir / 'monitoring_config.yaml'
        with open(config_path, 'w') as f:
            yaml.dump(config_dict, f, default_flow_style=False, sort_keys=False)
        
        return config_path
    
    def _save_readings_to_csv(self, system_id: int):
        """Save system readings to CSV files compatible with phase_3 pipeline"""
        if system_id not in self.generators:
            return
        
        generator = self.generators[system_id]
        if not generator.history:
            return
        
        # Group by date and aggregate
        df = pd.DataFrame(generator.history)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df['date'] = df['timestamp'].dt.date
        
        # Daily aggregation
        daily_actual = df.groupby('date')['actual_kwh'].sum().reset_index()
        daily_actual.columns = ['date', 'energy_kwh']
        
        daily_predicted = df.groupby('date')['predicted_kwh'].sum().reset_index()
        daily_predicted.columns = ['date', 'energy_kwh']
        
        # Save to CSV
        actual_path = self.data_dir / f'pv_system_{system_id}_actual.csv'
        predicted_path = self.data_dir / f'pv_system_{system_id}_predicted.csv'
        
        daily_actual.to_csv(actual_path, index=False)
        daily_predicted.to_csv(predicted_path, index=False)
    
    def _load_config(self):
        """Load PV systems configuration"""
        config_file = self.data_dir / "pv_config.json"
        if config_file.exists():
            with open(config_file, 'r') as f:
                data = json.load(f)
                num_systems = data.get('num_systems', 0)
                if num_systems > 0:
                    # Recreate systems
                    for system_data in data.get('systems', []):
                        config = PVSystemConfig(**system_data)
                        self.systems[config.system_id] = config
                        self.generators[config.system_id] = PVDataGenerator(config)
                    
                    # Create config file but don't initialize pipeline yet
                    self.config_path = self._create_dynamic_config_file(num_systems)
                    # Pipeline will be initialized on first analysis when data exists
                    self.pipeline = None
    
    def _save_config(self):
        """Save PV systems configuration"""
        config_file = self.data_dir / "pv_config.json"
        data = {
            'num_systems': len(self.systems),
            'systems': [
                {
                    'system_id': s.system_id,
                    'capacity_kw': s.capacity_kw,
                    'name': s.name,
                    'anomaly_probability': s.anomaly_probability
                }
                for s in self.systems.values()
            ]
        }
        with open(config_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def configure_systems(self, num_systems: int, capacity_per_system: float = 5.0) -> Dict:
        """Configure the number of PV systems to monitor"""
        try:
            self.systems.clear()
            self.generators.clear()
            
            for i in range(1, num_systems + 1):
                config = PVSystemConfig(
                    system_id=i,
                    capacity_kw=capacity_per_system,
                    name=f"PV System {i}",
                    anomaly_probability=0.02  # 2% chance per minute
                )
                self.systems[i] = config
                self.generators[i] = PVDataGenerator(config)
            
            # Generate initial historical data (last 7 days) for immediate analysis
            self._generate_initial_historical_data()
            
            # Create config file but don't initialize pipeline yet (will do on first analysis)
            self.config_path = self._create_dynamic_config_file(num_systems)
            self.pipeline = None  # Will be initialized on first analysis when data exists
            
            self._save_config()
            
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
        except Exception as e:
            print(f"Error in configure_systems: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def _generate_initial_historical_data(self):
        """Generate 7 days of historical data for immediate analysis"""
        
        print("Generating initial historical data...")
        
        for system_id, generator in self.generators.items():
            # Generate data for last 7 days
            for days_ago in range(7, 0, -1):
                date = datetime.now() - timedelta(days=days_ago)
                
                # Generate daily total (sum of hourly production)
                daily_actual = 0
                daily_predicted = 0
                
                for hour in range(24):
                    timestamp = date.replace(hour=hour, minute=0, second=0)
                    month = timestamp.month
                    
                    # Calculate production for this hour
                    solar_multiplier = generator._get_solar_multiplier(hour, month)
                    base_production = generator.config.capacity_kw * solar_multiplier
                    
                    # Add weather variability
                    weather_factor = np.random.uniform(0.85, 0.95)
                    base_production *= weather_factor
                    
                    # For some systems, inject performance issues
                    degradation = 1.0
                    if system_id % 3 == 0 and days_ago < 3:  # Every 3rd system has recent issues
                        degradation = np.random.uniform(0.75, 0.85)
                    elif system_id % 5 == 0 and days_ago < 2:  # Every 5th system has critical issues
                        degradation = np.random.uniform(0.60, 0.70)
                    
                    actual_production = base_production * degradation
                    
                    daily_actual += actual_production
                    daily_predicted += base_production
                
                # Store as fake history entry
                generator.history.append({
                    'timestamp': date.isoformat(),
                    'system_id': system_id,
                    'actual_kwh': daily_actual,
                    'predicted_kwh': daily_predicted,
                    'anomaly': None
                })
            
            # Save to CSV immediately
            self._save_readings_to_csv(system_id)
        
        print(f"Generated 7 days of historical data for {len(self.generators)} systems")
    
    def generate_readings(self) -> List[Dict]:
        """Generate readings for all systems"""
        readings = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\n{'='*80}")
        print(f"⚡ Generating PV Data - {timestamp}")
        print(f"{'='*80}")
        
        for generator in self.generators.values():
            reading = generator.generate_reading()
            readings.append(reading)
            
            # Display the reading
            system_id = reading['system_id']
            actual = reading['actual_kwh']
            predicted = reading['predicted_kwh']
            anomaly = reading.get('anomaly', None)
            pr = (actual / predicted * 100) if predicted > 0 else 0
            
            status_symbol = "🔴" if anomaly else "🟢"
            anomaly_text = f" [{anomaly.replace('_', ' ').title()}]" if anomaly else ""
            
            print(f"{status_symbol} System {system_id}: "
                  f"Actual={actual:.2f} kWh | "
                  f"Predicted={predicted:.2f} kWh | "
                  f"PR={pr:.1f}%{anomaly_text}")
        
        print(f"{'='*80}\n")
        return readings
    
    def _initialize_pipeline_if_needed(self):
        """Initialize pipeline lazily when first needed"""
        if self.pipeline is None and self.config_path and self.config_path.exists():
            try:
                # Suppress the verbose output from pipeline initialization
                import io
                import contextlib
                
                # Capture stdout to suppress initialization messages
                with contextlib.redirect_stdout(io.StringIO()):
                    self.pipeline = PredictiveMaintenancePipeline(str(self.config_path))
            except Exception as e:
                print(f"Warning: Could not initialize pipeline: {e}")
                self.pipeline = None
    
    def analyze_system(self, system_id: int, hours: int = 24) -> Dict:
        """Analyze a specific PV system using phase_3 pipeline"""
        if system_id not in self.generators:
            return {'error': 'System not found'}
        
        print(f"\n🔍 Analyzing System {system_id}...")
        
        # Initialize pipeline if not already done
        self._initialize_pipeline_if_needed()
        
        if not self.pipeline:
            print(f"⚠️  Pipeline not initialized for system {system_id}")
            return {
                'system_id': system_id,
                'status': 'not_configured',
                'message': 'Pipeline not initialized. Please configure systems first.',
                'severity': 'normal'
            }
        
        # Save current data to CSV for all systems
        for sid in self.systems.keys():
            self._save_readings_to_csv(sid)
        
        # Check if we have enough data
        generator = self.generators[system_id]
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_data = [
            r for r in generator.history 
            if datetime.fromisoformat(r['timestamp']) > cutoff_time
        ]
        
        print(f"   Data points in history: {len(generator.history)}")
        print(f"   Recent data points (last {hours}h): {len(recent_data)}")
        
        if len(recent_data) < 10:
            print(f"⚠️  Insufficient data for system {system_id}")
            return {
                'system_id': system_id,
                'status': 'insufficient_data',
                'message': 'Not enough data for analysis',
                'severity': 'normal'
            }
        
        try:
            print(f"   📊 Running pipeline analysis...")
            
            # Run the full pipeline
            pv_data = self.pipeline.load_data()
            print(f"   ✓ Loaded data for {len(pv_data)} systems")
            
            if len(pv_data) < 2:
                print(f"   ⚠️  Need at least 2 systems for pairwise comparison, falling back")
                # Need at least 2 systems for pairwise comparison
                return self._analyze_single_system(system_id, recent_data)
            
            # Calculate PR for all systems
            pr_all_systems = self.pipeline.calculate_performance_ratios(pv_data)
            print(f"   ✓ Calculated PR for all systems")
            
            # Calculate pairwise deviations
            deviation_analysis = self.pipeline.calculate_pairwise_deviations(pr_all_systems)
            print(f"   ✓ Calculated pairwise deviations")
            
            if 'error' in deviation_analysis:
                print(f"   ⚠️  Error in deviation analysis, falling back")
                return self._analyze_single_system(system_id, recent_data)
            
            # Extract status for this specific system
            system_name = f'PV_System_{system_id}'
            system_status = deviation_analysis.get('system_status', {}).get(system_name, {})
            
            mean_deviation = system_status.get('mean_deviation', 0.0)
            category = system_status.get('category', 'NORMAL')
            
            # Map category to status and severity
            if category == 'CRITICAL':
                status = 'critical'
                severity = 'critical'
            elif category == 'MEDIUM':
                status = 'warning'
                severity = 'warning'
            else:
                status = 'healthy'
                severity = 'normal'
            
            # Get current PR from latest data
            system_pr_col = f'{system_name}_pr'
            recent_pr = pr_all_systems[system_pr_col].iloc[-1] if system_pr_col in pr_all_systems.columns else None
            
            print(f"   ✅ System {system_id}: Category={category}, Deviation={mean_deviation:.1%}, Status={status}")
            
            # Determine issues based on analysis (without mentioning anomaly types)
            issues = []
            if category == 'CRITICAL':
                issues.append(f'Critical deviation: {mean_deviation:.1%} from peer systems')
            elif category == 'MEDIUM':
                issues.append(f'Performance deviation: {mean_deviation:.1%} from peer systems')
            
            return {
                'system_id': system_id,
                'system_name': self.systems[system_id].name,
                'status': status,
                'severity': severity,
                'recent_pr': recent_pr,
                'mean_deviation': mean_deviation,
                'category': category,
                'issues_detected': issues,
                'data_points': len(recent_data),
                'analysis_method': 'pairwise_comparison'
            }
            
        except Exception as e:
            print(f"❌ Error in pipeline analysis for system {system_id}: {e}")
            import traceback
            traceback.print_exc()
            return self._analyze_single_system(system_id, recent_data)
    
    def _analyze_single_system(self, system_id: int, recent_data: List[Dict]) -> Dict:
        """Fallback analysis for a single system when pairwise comparison unavailable"""
        # Simple PR-based analysis
        actual_sum = sum(r['actual_kwh'] for r in recent_data)
        predicted_sum = sum(r['predicted_kwh'] for r in recent_data)
        
        pr = actual_sum / predicted_sum if predicted_sum > 0 else 0
        
        status = 'healthy'
        severity = 'normal'
        
        if pr < 0.70:
            status = 'critical'
            severity = 'critical'
        elif pr < 0.80:
            status = 'warning'
            severity = 'warning'
        
        issues = []
        if pr < 0.70:
            issues.append(f'Performance significantly below expected')
        elif pr < 0.80:
            issues.append(f'Performance below normal range')
        
        return {
            'system_id': system_id,
            'system_name': self.systems[system_id].name,
            'status': status,
            'severity': severity,
            'recent_pr': pr,
            'mean_deviation': 0.0,
            'issues_detected': issues,
            'data_points': len(recent_data),
            'analysis_method': 'single_system'
        }
    
    def get_all_systems_status(self) -> List[Dict]:
        """Get status for all systems"""
        statuses = []
        for system_id in self.systems.keys():
            status = self.analyze_system(system_id)
            statuses.append(status)
        return statuses
    
    def start_monitoring(self, interval_seconds: int = 60):
        """Start continuous monitoring (generates data every interval)"""
        if self.monitoring_active:
            return {'status': 'already_running'}
        
        self.monitoring_active = True
        
        def monitor_loop():
            while self.monitoring_active:
                self.generate_readings()
                time.sleep(interval_seconds)
        
        self.monitoring_thread = threading.Thread(target=monitor_loop, daemon=True)
        self.monitoring_thread.start()
        
        return {'status': 'started', 'interval_seconds': interval_seconds}
    
    def stop_monitoring(self):
        """Stop continuous monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        return {'status': 'stopped'}
    
    def get_system_history(self, system_id: int, hours: int = 24) -> List[Dict]:
        """Get historical data for a system"""
        if system_id not in self.generators:
            return []
        
        cutoff_time = datetime.now() - timedelta(hours=hours)
        generator = self.generators[system_id]
        
        return [
            r for r in generator.history 
            if datetime.fromisoformat(r['timestamp']) > cutoff_time
        ]


# Global instance
_monitoring_service = None

def get_monitoring_service() -> PVMonitoringService:
    """Get or create the global monitoring service instance"""
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = PVMonitoringService()
    return _monitoring_service
