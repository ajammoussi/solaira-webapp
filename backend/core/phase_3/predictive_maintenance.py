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


class PredictiveMaintenancePipeline:

    def __init__(self, config_path: str = None):
        """
        Initialize pipeline
        
        Args:
            config_path: Optional path to configuration file
        """
        
        # Load configuration
        self.config = load_config(config_path)
        self.data_paths = get_data_paths(self.config)
        
        # Initialize modules
        self.pr_calculator = PerformanceRatioCalculator(self.config)
        self.deviation_calculator = DeviationScoreCalculator(self.config)
        # self.visualizer = MaintenanceVisualizer(self.config)  # Disabled - requires matplotlib
        
        # Results storage
        self.results = {}
    
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
