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


def sanitize_for_json(value):
    """Convert NaN/Inf values to None for JSON serialization"""
    if value is None:
        return None
    if isinstance(value, (int, str, bool)):
        return value
    if isinstance(value, float):
        if np.isnan(value) or np.isinf(value):
            return None
        return value
    return value


class PVSystemConfig:
    """Configuration for a single PV system"""
    
    def __init__(
        self, 
        system_id: int, 
        capacity_kw: float = 5.0,
        name: Optional[str] = None,
        anomaly_probability: float = 0.05,
        health_status: str = 'healthy'  # 'healthy', 'warning', 'critical'
    ):
        self.system_id = system_id
        self.capacity_kw = capacity_kw
        self.name = name or f"PV System {system_id}"
        self.anomaly_probability = anomaly_probability
        self.health_status = health_status
        self.current_anomaly = None
        self.anomaly_start = None
        self.degradation_factor = self._get_degradation_factor()
    
    def _get_degradation_factor(self) -> float:
        """Get consistent degradation factor based on health status"""
        if self.health_status == 'critical':
            # Critical: 35-45% degradation (mean deviation > 30%)
            return np.random.uniform(0.55, 0.65)
        elif self.health_status == 'warning':
            # Warning: 20-30% degradation (mean deviation 20-30%)
            return np.random.uniform(0.70, 0.80)
        else:  # healthy
            # Healthy: 0-10% degradation (mean deviation < 20%)
            return np.random.uniform(0.90, 1.00)


class PVDataGenerator:
    """Generates realistic PV production data with anomalies"""
    
    def __init__(self, system_config: PVSystemConfig):
        self.config = system_config
        self.history = []  # Stores daily data
        self.current_day = 0  # Track which day we're on
        
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
    
    def generate_daily_reading(self) -> Dict:
        """Generate one day's worth of production data (called every minute for fast testing)"""
        # Each call represents one new day
        self.current_day += 1
        
        # Calculate the date for this reading (always in the past, never today)
        base_date = datetime.now().date() - timedelta(days=1)  # Start from yesterday
        reading_date = base_date - timedelta(days=max(0, 30 - self.current_day))
        
        # Generate daily total energy (kWh for the full day)
        # Typical daily production: capacity * sun hours * efficiency
        # For 5kW system: ~25-35 kWh/day in good conditions
        month = reading_date.month
        seasonal_factor = 0.7 + 0.3 * np.sin((month - 3) * np.pi / 6)
        
        # Base daily production (assuming ~6 effective sun hours)
        base_daily_kwh = self.config.capacity_kw * 6 * seasonal_factor
        
        # Add weather variability (±20%)
        weather_factor = np.random.uniform(0.80, 1.00)
        predicted_daily_kwh = base_daily_kwh * weather_factor
        
        # Apply health-based degradation
        degradation = self.config.degradation_factor * np.random.uniform(0.98, 1.02)
        degradation = np.clip(degradation, 0.5, 1.0)
        actual_daily_kwh = predicted_daily_kwh * degradation
        
        # Determine anomaly status
        anomaly = None
        if degradation < 0.80:
            anomaly = 'critical_degradation' if degradation < 0.65 else 'performance_degradation'
        
        reading = {
            'timestamp': datetime.combine(reading_date, datetime.min.time()).isoformat(),
            'date': reading_date.strftime('%Y-%m-%d'),
            'system_id': self.config.system_id,
            'actual_kwh': max(0, actual_daily_kwh),
            'predicted_kwh': max(0, predicted_daily_kwh),
            'anomaly': anomaly
        }
        
        self.history.append(reading)
        
        # Keep only last 30 days
        if len(self.history) > 30:
            self.history = self.history[-30:]
        
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
        
        # Data is already daily - just extract and format
        df = pd.DataFrame(generator.history)
        
        # Create actual data CSV
        actual_df = df[['date', 'actual_kwh']].copy()
        actual_df.columns = ['date', 'energy_kwh']
        
        # Create predicted data CSV
        predicted_df = df[['date', 'predicted_kwh']].copy()
        predicted_df.columns = ['date', 'energy_kwh']
        
        # Save to CSV
        actual_path = self.data_dir / f'pv_system_{system_id}_actual.csv'
        predicted_path = self.data_dir / f'pv_system_{system_id}_predicted.csv'
        
        actual_df.to_csv(actual_path, index=False)
        predicted_df.to_csv(predicted_path, index=False)
    
    def _load_config(self):
        """Load PV systems configuration"""
        # Don't auto-load from config file - require explicit user configuration
        # This prevents phantom systems from appearing
        pass
    
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
                    'anomaly_probability': s.anomaly_probability,
                    'health_status': s.health_status
                }
                for s in self.systems.values()
            ]
        }
        with open(config_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def configure_systems(self, num_systems: int, capacity_per_system: float = 5.0) -> Dict:
        """Configure the number of PV systems to monitor"""
        try:
            print("\n" + "="*80)
            print(f"🔧 Configuring {num_systems} PV Systems")
            print("="*80 + "\n")
            
            self.systems.clear()
            self.generators.clear()
            
            # Distribute health statuses to cover all scenarios
            # At least 1 critical, 1 warning, rest healthy
            health_statuses = []
            if num_systems >= 3:
                health_statuses.append('critical')
                health_statuses.append('warning')
                # Fill rest with healthy systems
                health_statuses.extend(['healthy'] * (num_systems - 2))
            elif num_systems == 2:
                health_statuses = ['warning', 'healthy']
            else:
                health_statuses = ['healthy']
            
            print("📄 System Health Distribution:")
            for i in range(1, num_systems + 1):
                config = PVSystemConfig(
                    system_id=i,
                    capacity_kw=capacity_per_system,
                    name=f"PV System {i}",
                    anomaly_probability=0.02,  # 2% chance per minute
                    health_status=health_statuses[i-1]
                )
                self.systems[i] = config
                self.generators[i] = PVDataGenerator(config)
                print(f"   System {i}: {health_statuses[i-1].upper()} (degradation: {config.degradation_factor:.1%})")
            print()
            
            # Generate initial historical data (last 7 days) for immediate analysis
            self._generate_initial_historical_data()
            
            # Create config file but don't initialize pipeline yet (will do on first analysis)
            self.config_path = self._create_dynamic_config_file(num_systems)
            self.pipeline = None  # Will be initialized on first analysis when data exists
            
            self._save_config()
            
            print("="*80)
            print(f"✅ Successfully configured {num_systems} PV systems")
            print("="*80 + "\n")
            
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
            print(f"❌ Error in configure_systems: {e}")
            import traceback
            traceback.print_exc()
            raise
    
    def _generate_initial_historical_data(self):
        """Generate 7 days of historical data for immediate analysis (Optimized)"""
        
        print("Generating initial historical data...")
        
        # Create hourly timestamps for the last 7 COMPLETE days (exclude today)
        end_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)  # Start of today
        start_date = end_date - timedelta(days=7)
        timestamps = pd.date_range(start=start_date, end=end_date, freq='H', inclusive='left')
        
        if len(timestamps) == 0:
            return

        hours = timestamps.hour.values
        months = timestamps.month.values
        
        # Vectorized solar multiplier calculation
        # Night time mask
        is_day = (hours >= 6) & (hours <= 20)
        
        # Seasonal adjustment
        seasonal_factor = 0.7 + 0.3 * np.sin((months - 3) * np.pi / 6)
        
        # Bell curve
        peak_hour = 13
        std_dev = 4
        gaussian = np.exp(-((hours - peak_hour) ** 2) / (2 * std_dev ** 2))
        
        base_multipliers = np.where(is_day, gaussian * seasonal_factor, 0.0)
        
        for system_id, generator in self.generators.items():
            config = generator.config
            # Base production
            production = config.capacity_kw * base_multipliers
            
            # Weather variability (random factor per hour)
            weather_factors = np.random.uniform(0.85, 0.95, size=len(timestamps))
            production *= weather_factors
            
            # Apply consistent degradation based on health status
            degradation = np.full(len(timestamps), config.degradation_factor)
            # Add small random variation (±5%)
            degradation *= np.random.uniform(0.95, 1.05, size=len(timestamps))
            degradation = np.clip(degradation, 0.5, 1.0)  # Keep reasonable bounds
                 
            actual_production = production * degradation
            
            # Create DataFrame for aggregation
            df = pd.DataFrame({
                'timestamp': timestamps,
                'actual_kwh': actual_production,
                'predicted_kwh': production
            })
            
            df['date'] = df['timestamp'].dt.date
            daily_df = df.groupby('date').agg({
                'actual_kwh': 'sum',
                'predicted_kwh': 'sum'
            }).reset_index()
            
            # Convert to list of dicts for generator.history
            generator.history = [] # Clear existing history just in case
            for _, row in daily_df.iterrows():
                generator.history.append({
                    'timestamp': datetime.combine(row['date'], datetime.min.time()).isoformat(),
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'system_id': system_id,
                    'actual_kwh': float(row['actual_kwh']),
                    'predicted_kwh': float(row['predicted_kwh']),
                    'anomaly': None
                })
            
            # Save to CSV
            self._save_readings_to_csv(system_id)
        
        print(f"Generated 7 days of historical data for {len(self.generators)} systems")
    
    def generate_readings(self) -> List[Dict]:
        """Generate one day of data for all systems (each minute = 1 day for fast testing)"""
        readings = []
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\n{'='*80}")
        print(f"⚡ Generating Daily PV Data - {timestamp}")
        print(f"   (Each reading = 1 day for accelerated testing)")
        print(f"{'='*80}")
        
        for generator in self.generators.values():
            reading = generator.generate_daily_reading()
            readings.append(reading)
            
            # Display the reading
            system_id = reading['system_id']
            date = reading['date']
            actual = reading['actual_kwh']
            predicted = reading['predicted_kwh']
            anomaly = reading.get('anomaly', None)
            pr = (actual / predicted * 100) if predicted > 0 else 0
            
            status_symbol = "🔴" if anomaly else "🟢"
            anomaly_text = f" [{anomaly.replace('_', ' ').title()}]" if anomaly else ""
            
            print(f"{status_symbol} System {system_id} [{date}]: "
                  f"Daily={actual:.1f} kWh | "
                  f"Expected={predicted:.1f} kWh | "
                  f"PR={pr:.1f}%{anomaly_text}")
            
            # Save updated data to CSV immediately
            self._save_readings_to_csv(system_id)
        
        print(f"{'='*80}\n")
        return readings
    
    def _initialize_pipeline_if_needed(self):
        """Initialize pipeline lazily when first needed"""
        if self.pipeline is None and self.config_path and self.config_path.exists():
            try:
                print("\n" + "="*80)
                print("🔧 Initializing Predictive Maintenance Pipeline")
                print("="*80)
                # Show full pipeline output for debugging
                self.pipeline = PredictiveMaintenancePipeline(str(self.config_path))
                print("="*80)
                print("✅ Pipeline initialized")
                print("="*80 + "\n")
            except Exception as e:
                print(f"❌ Warning: Could not initialize pipeline: {e}")
                import traceback
                traceback.print_exc()
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
        # Since we're generating daily data, just use all history (already capped at 30 days)
        recent_data = generator.history
        
        print(f"   Data points in history: {len(generator.history)}")
        print(f"   Using all historical data for analysis")
        
        if len(recent_data) < 7:
            print(f"⚠️  Insufficient data for system {system_id}")
            return {
                'system_id': system_id,
                'status': 'insufficient_data',
                'message': 'Not enough data for analysis',
                'severity': 'normal'
            }
        
        try:
            print(f"\n" + "="*80)
            print(f"📊 Running Full Pipeline Analysis")
            print("="*80 + "\n")
            
            # Run the full pipeline - all output will be shown
            pv_data = self.pipeline.load_data()
            
            if len(pv_data) < 2:
                print(f"\n⚠️  Need at least 2 systems for pairwise comparison, falling back")
                # Need at least 2 systems for pairwise comparison
                return self._analyze_single_system(system_id, recent_data)
            
            # Calculate PR for all systems
            pr_all_systems = self.pipeline.calculate_performance_ratios(pv_data)
            
            # Calculate pairwise deviations
            deviation_analysis = self.pipeline.calculate_pairwise_deviations(pr_all_systems)
            
            print("\n" + "="*80)
            print("✅ Pipeline Analysis Complete")
            print("="*80 + "\n")
            
            if 'error' in deviation_analysis:
                print(f"⚠️  Error in deviation analysis, falling back")
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

            # Ensure numeric fields are JSON-serializable (no NaN/inf)
            def _safe_float(value):
                if value is None:
                    return None
                try:
                    val = float(value)
                except (TypeError, ValueError):
                    return None
                # Replace NaN/inf with None so FastAPI JSON encoding doesn't fail
                if not np.isfinite(val):
                    return None
                return val

            recent_pr_safe = _safe_float(recent_pr)
            mean_deviation_safe = _safe_float(mean_deviation)
            
            print(f"\n📈 Results for System {system_id}:")
            print(f"   Status: {status.upper()}")
            print(f"   Category: {category}")
            print(f"   Mean Deviation: {mean_deviation_safe:.1%}" if mean_deviation_safe is not None else "   Mean Deviation: N/A")
            print(f"   Recent PR: {recent_pr_safe:.1%}" if recent_pr_safe is not None else "   Recent PR: N/A")
            print()
            
            # Determine issues based on analysis (without mentioning anomaly types)
            issues = []
            if category == 'CRITICAL' and mean_deviation_safe is not None:
                issues.append(f'Critical deviation: {mean_deviation_safe:.1%} from peer systems')
            elif category == 'MEDIUM' and mean_deviation_safe is not None:
                issues.append(f'Performance deviation: {mean_deviation_safe:.1%} from peer systems')
            
            return {
                'system_id': system_id,
                'system_name': self.systems[system_id].name,
                'status': status,
                'severity': severity,
                'recent_pr': recent_pr_safe,
                'mean_deviation': mean_deviation_safe,
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
            'recent_pr': sanitize_for_json(pr),
            'mean_deviation': 0.0,
            'issues_detected': issues,
            'data_points': len(recent_data),
            'analysis_method': 'single_system'
        }
    
    def get_all_systems_status(self) -> List[Dict]:
        """Get status for all systems"""
        if not self.systems:
            # No systems configured yet
            return []
        
        statuses = []
        for system_id in self.systems.keys():
            try:
                status = self.analyze_system(system_id)
                statuses.append(status)
            except Exception as e:
                print(f"Error analyzing system {system_id}: {e}")
                # Return a basic error status for this system
                statuses.append({
                    'system_id': system_id,
                    'system_name': self.systems[system_id].name,
                    'status': 'error',
                    'severity': 'normal',
                    'error': str(e)
                })
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
        
        result = []
        for r in generator.history:
            try:
                # Handle both ISO format strings and datetime objects
                ts = r['timestamp']
                if isinstance(ts, str):
                    # Try parsing with fromisoformat, fallback to strptime
                    try:
                        timestamp = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    except:
                        # Fallback for other formats
                        timestamp = datetime.strptime(ts.split('.')[0], '%Y-%m-%dT%H:%M:%S')
                else:
                    timestamp = ts
                    
                if timestamp > cutoff_time:
                    result.append(r)
            except Exception as e:
                # Skip records with invalid timestamps
                continue
                
        return result


# Global instance
_monitoring_service = None

def get_monitoring_service() -> PVMonitoringService:
    """Get or create the global monitoring service instance"""
    global _monitoring_service
    if _monitoring_service is None:
        _monitoring_service = PVMonitoringService()
    return _monitoring_service
