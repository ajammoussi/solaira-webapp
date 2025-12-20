import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
import json
import sys
import warnings
warnings.filterwarnings('ignore')

# Add project root to path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import phase 3 modules
from backend.core.phase_3.config_loader import load_config, get_data_paths
from backend.core.phase_3.performance_ratio import PerformanceRatioCalculator
from backend.core.phase_3.deviation_score import DeviationScoreCalculator
# from backend.core.phase_3.visualization import MaintenanceVisualizer  # Disabled - requires matplotlib


def convert_numpy_types(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization.
    """
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    elif isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif pd.isna(obj):
        return None
    else:
        return obj


class PredictiveMaintenancePipeline:

    def __init__(self, config_path: str = None):
        """
        Initialize pipeline
        
        Args:
            config_path: Optional path to configuration file (uses defaults if None)
        """
        
        # Load configuration (or use defaults)
        try:
            self.config = load_config(config_path)
            self.data_paths = get_data_paths(self.config)
        except Exception as e:
            print(f"Warning: Could not load config, using defaults: {e}")
            # Create minimal default config
            self.config = self._create_default_config()
            self.data_paths = {}
        
        # Initialize modules
        self.pr_calculator = PerformanceRatioCalculator(self.config)
        self.deviation_calculator = DeviationScoreCalculator(self.config)
        # self.visualizer = MaintenanceVisualizer(self.config)  # Disabled - requires matplotlib
        
        # Results storage
        self.results = {}
    
    def _create_default_config(self):
        """Create default configuration when YAML not available"""
        class DefaultConfig:
            pass
        
        config = DefaultConfig()
        config.system_name = 'Dynamic PV Monitoring'
        config.config_version = 'dynamic'
        
        # Set default thresholds
        deviation_score = DefaultConfig()
        deviation_score.warning_threshold = 0.20
        deviation_score.critical_threshold = 0.30
        deviation_score.moving_average_days = 3
        deviation_score.consecutive_days_alert = 2
        deviation_score.min_valid_pairs = 2
        config.deviation_score = deviation_score
        
        performance_ratio = DefaultConfig()
        performance_ratio.expected_pr_min = 0.60
        performance_ratio.expected_pr_max = 0.90
        performance_ratio.optimal_pr = 0.80
        config.performance_ratio = performance_ratio
        
        analysis = DefaultConfig()
        analysis.analysis_level = 'daily'
        analysis.min_hours_for_daily_pr = 8
        analysis.min_production_kwh = 0.1
        config.analysis = analysis
        
        # Empty systems list - will be dynamically discovered
        pv_systems = DefaultConfig()
        pv_systems.systems = []
        pv_systems.max_proximity_km = 5.0
        config.pv_systems = pv_systems
        
        return config
    
    def load_data(self) -> dict:
        
        pv_data = {}
        systems = self.config.pv_systems.systems
        
        for system in systems:
            pv_name = system['name']
            actual_data_path = system['actual_data']
            predicted_data_path = system['predicted_data']
            
            # Load actual data
            actual_path = project_root / actual_data_path
            if not actual_path.exists():
                continue
            
            actual_df = pd.read_csv(actual_path)
            
            # Load predicted data
            pred_path = project_root / predicted_data_path
            if not pred_path.exists():
                continue
            
            predicted_df = pd.read_csv(pred_path)
            
            pv_data[pv_name] = {
                'actual': actual_df,
                'predicted': predicted_df
            }
        
        if not pv_data:
            raise FileNotFoundError("No valid PV system data loaded!")
        
        self.results['data'] = pv_data
        return pv_data
    
    def calculate_performance_ratios(self, pv_data: dict) -> pd.DataFrame:
        
        # Calculate PR for all systems
        pr_all_systems = self.pr_calculator.calculate_all_systems_pr(pv_data)
        
        self.results['pr_all_systems'] = pr_all_systems
        
        return pr_all_systems
    
    def calculate_pairwise_deviations(self, pr_all_systems: pd.DataFrame) -> dict:
        
        # Create pairwise comparison matrix
        pairwise_result = self.pr_calculator.create_pairwise_comparison_matrix(pr_all_systems)
        
        # Analyze the pairwise deviations
        analysis = self.deviation_calculator.analyze_pairwise_deviations(
            pr_all_systems, 
            pairwise_result
        )
        
        self.results['pairwise_matrix'] = pairwise_result
        self.results['deviation_analysis'] = analysis
        
        return analysis
    
    def create_visualizations(self,
                            pr_all_systems: pd.DataFrame,
                            deviation_analysis: dict,
                            pairwise_matrix: dict,
                            output_dir: Path = None) -> dict:
        
        # Visualization disabled - requires matplotlib
        
        figures = {}
        self.results['figures'] = figures
        
        return figures
    
    def export_results(self, output_dir: Path = None):
        
        if output_dir is None:
            output_dir = project_root / 'results' / 'phase_3'
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        data_dir = output_dir / 'data'
        reports_dir = output_dir / 'reports'
        data_dir.mkdir(exist_ok=True)
        reports_dir.mkdir(exist_ok=True)
        
        # Export DataFrames
        
        if 'pr_all_systems' in self.results:
            pr_path = data_dir / 'pr_all_systems.csv'
            self.results['pr_all_systems'].to_csv(pr_path, index=False)
        
        # Export JSON reports
        
        # Pairwise matrix
        if 'pairwise_matrix' in self.results:
            pairwise_path = reports_dir / 'pairwise_deviation_matrix.json'
            with open(pairwise_path, 'w') as f:
                json.dump(self.results['pairwise_matrix'], f, indent=2, default=str)
        
        # Deviation analysis
        if 'deviation_analysis' in self.results:
            deviation_path = reports_dir / 'deviation_analysis.json'
            with open(deviation_path, 'w') as f:
                json.dump(self.results['deviation_analysis'], f, indent=2, default=str)
    

    
    def run_full_analysis(self) -> dict:
        """
        Run complete predictive maintenance analysis pipeline for N PV systems
        
        Returns:
            Dictionary with all results including deviation_analysis for chatbot
        """
        try:
            # Step 1: Load data for N systems
            pv_data = self.load_data()
            
            # Step 2: Calculate PR for all systems
            pr_all_systems = self.calculate_performance_ratios(pv_data)
            
            # Step 3: Calculate pairwise deviation matrix
            deviation_analysis = self.calculate_pairwise_deviations(pr_all_systems)
            
            # Step 4: Create visualizations
            self.create_visualizations(
                pr_all_systems,
                deviation_analysis,
                self.results.get('pairwise_matrix', {})
            )
            
            # Step 5: Export results
            self.export_results()
            
            # Print summary
            self._print_summary_n_systems()
            
            return self.results
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise
    

    
    def _print_summary_n_systems(self):
        """Print executive summary for N-system analysis"""
        pass

    def analyze_monitoring_systems(self, monitoring_data_dir: Path) -> dict:
        """
        Analyze multiple PV systems from monitoring_data directory using pairwise comparison.
        
        Args:
            monitoring_data_dir: Path to directory containing pv_system_N_actual.csv and 
                                pv_system_N_predicted.csv files
            
        Returns:
            Dictionary with per-system analysis including pairwise deviation scores
        """
        try:
            monitoring_data_dir = Path(monitoring_data_dir)
            
            # Find all system files
            actual_files = sorted(monitoring_data_dir.glob('pv_system_*_actual.csv'))
            
            if not actual_files:
                return {'error': 'No monitoring data files found'}
            
            # Load data for all systems
            pv_data = {}
            system_ids = []
            
            for actual_file in actual_files:
                # Extract system ID from filename (e.g., pv_system_1_actual.csv -> 1)
                filename = actual_file.stem  # 'pv_system_1_actual'
                system_id = filename.split('_')[2]  # Get '1'
                system_name = f'PV_System_{system_id}'
                system_ids.append(int(system_id))
                
                predicted_file = actual_file.parent / f'pv_system_{system_id}_predicted.csv'
                
                if not predicted_file.exists():
                    continue
                
                actual_df = pd.read_csv(actual_file)
                predicted_df = pd.read_csv(predicted_file)
                
                pv_data[system_name] = {
                    'actual': actual_df,
                    'predicted': predicted_df
                }
            
            if len(pv_data) < 2:
                # Need at least 2 systems for comparative analysis
                # Fall back to single system analysis
                return self._fallback_single_system_analysis(pv_data)
            
            # Temporarily override calculator's pv_names to match actual data
            actual_pv_names = list(pv_data.keys())
            original_pv_names = self.pr_calculator.pv_names
            original_n_systems = self.pr_calculator.n_systems
            
            self.pr_calculator.pv_names = actual_pv_names
            self.pr_calculator.n_systems = len(actual_pv_names)
            
            try:
                # Calculate PR for all systems
                pr_all_systems = self.pr_calculator.calculate_all_systems_pr(pv_data)
                
                # Calculate pairwise deviations
                pairwise_result = self.pr_calculator.create_pairwise_comparison_matrix(pr_all_systems)
                
                # Analyze deviations
                deviation_analysis = self.deviation_calculator.analyze_pairwise_deviations(
                    pr_all_systems, 
                    pairwise_result
                )
            finally:
                # Restore original values
                self.pr_calculator.pv_names = original_pv_names
                self.pr_calculator.n_systems = original_n_systems
            
            # Format results for monitoring API
            systems_status = {}
            
            # Convert to list to avoid "dictionary changed size during iteration" error
            for system_name in list(pv_data.keys()):
                if system_name not in deviation_analysis['system_status']:
                    continue
                
                status_info = deviation_analysis['system_status'][system_name]
                system_id = int(system_name.split('_')[-1])
                
                # Calculate recent PR from the data
                actual_df = pv_data[system_name]['actual']
                predicted_df = pv_data[system_name]['predicted']
                
                # Use last 7 days to calculate recent PR
                recent_actual = actual_df.tail(7)['energy_kwh'].sum()
                recent_predicted = predicted_df.tail(7)['energy_kwh'].sum()
                recent_pr = recent_actual / recent_predicted if recent_predicted > 0 else 0.0
                
                # Determine severity and issues
                category = status_info['category']
                mean_dev = status_info['mean_deviation']
                
                if category == 'CRITICAL':
                    severity = 'critical'
                    status = 'critical'
                    issues = [f'Critical deviation from peer systems ({mean_dev:.1%})']
                elif category == 'MEDIUM':
                    severity = 'warning'
                    status = 'warning'
                    issues = [f'Performance deviation detected ({mean_dev:.1%})']
                else:
                    severity = 'normal'
                    status = 'healthy'
                    issues = []
                
                systems_status[system_id] = {
                    'status': status,
                    'severity': severity,
                    'recent_pr': float(recent_pr),
                    'mean_deviation': float(mean_dev) if not pd.isna(mean_dev) else 0.0,
                    'issues_detected': issues,
                    'category': category,
                    'is_faulty': bool(status_info['is_faulty']),
                    'analysis_method': 'pairwise_comparative'
                }
            
            return {
                'systems': systems_status,
                'cluster_analysis': convert_numpy_types(deviation_analysis.get('cluster_analysis', {})),
                'analysis_date': deviation_analysis.get('analysis_date')
            }
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'error': str(e)}
    
    def _fallback_single_system_analysis(self, pv_data: dict) -> dict:
        """Fallback for when only one system is available"""
        systems_status = {}
        
        for system_name, data in pv_data.items():
            system_id = int(system_name.split('_')[-1])
            
            actual_df = data['actual']
            predicted_df = data['predicted']
            
            # Simple PR calculation
            total_actual = actual_df['energy_kwh'].sum()
            total_predicted = predicted_df['energy_kwh'].sum()
            
            pr = total_actual / total_predicted if total_predicted > 0 else 0
            deviation = 1.0 - pr
            
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
            
            systems_status[system_id] = {
                'status': status,
                'severity': severity,
                'mean_deviation': float(deviation),
                'issues_detected': issues,
                'category': 'NORMAL' if deviation < 0.10 else 'MEDIUM' if deviation < 0.20 else 'CRITICAL',
                'is_faulty': bool(deviation >= 0.10),
                'analysis_method': 'single_system_fallback'
            }
        
        return {'systems': systems_status}

    def analyze_single_system(self, dates: list, actual: list, predicted: list) -> dict:
        """
        Analyze a single PV system from memory data (for API endpoint).
        
        Args:
            dates: List of date strings
            actual: List of actual production values
            predicted: List of predicted production values
            
        Returns:
            Dictionary with analysis results and PR history
        """
        try:
            # Create DataFrame
            df = pd.DataFrame({
                'date': pd.to_datetime(dates),
                'actual_kwh': actual,
                'predicted_kwh': predicted
            })
            
            # Calculate PR
            # Avoid division by zero
            df['pr'] = df.apply(
                lambda row: (row['actual_kwh'] / row['predicted_kwh']) 
                if row['predicted_kwh'] > 0.1 else np.nan, 
                axis=1
            )
            
            # Filter invalid PRs
            df['pr'] = df['pr'].replace([np.inf, -np.inf], np.nan)
            
            # Calculate mean PR
            mean_pr = df['pr'].mean()
            
            # Determine status
            status = "normal"
            issues = []
            
            if pd.isna(mean_pr):
                status = "unknown"
                issues.append("Insufficient data to evaluate performance")
            else:
                if mean_pr < 0.7:
                    status = "critical"
                    issues.append("Performance significantly below expected (PR < 0.70)")
                elif mean_pr < 0.8:
                    status = "warning"
                    issues.append("Performance below normal range (0.70 ≤ PR < 0.80)")
            
            # Format history for frontend
            pr_history = []
            for _, row in df.iterrows():
                pr_val = row['pr']
                if pd.notna(pr_val):
                    pr_history.append({
                        'date': row['date'].strftime('%Y-%m-%d'),
                        'pr': float(pr_val)
                    })
            
            return {
                "analysis": {
                    "status": status,
                    "issues": issues,
                    "mean_pr": float(mean_pr) if pd.notna(mean_pr) else None
                },
                "pr_history": pr_history
            }
            
        except Exception as e:
            return {
                "analysis": {
                    "status": "error",
                    "issues": [str(e)],
                    "mean_pr": None
                },
                "pr_history": []
            }


def main():
    """Main entry point"""
    
    # Create and run pipeline
    pipeline = PredictiveMaintenancePipeline()
    results = pipeline.run_full_analysis()
    
    return results


if __name__ == '__main__':
    main()
