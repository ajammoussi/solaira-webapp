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
from src_final.phase_3.config_loader import load_config, get_data_paths
from src_final.phase_3.performance_ratio import PerformanceRatioCalculator
from src_final.phase_3.deviation_score import DeviationScoreCalculator
# from src_final.phase_3.visualization import MaintenanceVisualizer  # Disabled - requires matplotlib


class PredictiveMaintenancePipeline:

    def __init__(self, config_path: str = None):
        """
        Initialize pipeline
        
        Args:
            config_path: Optional path to configuration file
        """
        print("=" * 80)
        print("PV SYSTEM PREDICTIVE MAINTENANCE - PHASE 3")
        print("=" * 80)
        
        # Load configuration
        self.config = load_config(config_path)
        self.data_paths = get_data_paths(self.config)
        
        # Initialize modules
        self.pr_calculator = PerformanceRatioCalculator(self.config)
        self.deviation_calculator = DeviationScoreCalculator(self.config)
        # self.visualizer = MaintenanceVisualizer(self.config)  # Disabled - requires matplotlib
        
        # Results storage
        self.results = {}
        
        print("\n✅ Pipeline initialized successfully\n")
    
    def load_data(self) -> dict:

        print("\n" + "=" * 80)
        print("STEP 1: LOADING DATA FOR N PV SYSTEMS")
        print("=" * 80)
        
        pv_data = {}
        systems = self.config.pv_systems.systems
        
        print(f"\n📂 Loading data for {len(systems)} systems...")
        
        for system in systems:
            pv_name = system['name']
            actual_data_path = system['actual_data']
            predicted_data_path = system['predicted_data']
            
            print(f"\n   System: {pv_name}")
            
            # Load actual data
            actual_path = project_root / actual_data_path
            if not actual_path.exists():
                print(f"      ⚠️  Actual data not found: {actual_path}")
                continue
            
            actual_df = pd.read_csv(actual_path)
            print(f"      ✓ Actual: {len(actual_df)} records")
            
            # Load predicted data
            pred_path = project_root / predicted_data_path
            if not pred_path.exists():
                print(f"      ⚠️  Predicted data not found: {pred_path}")
                continue
            
            predicted_df = pd.read_csv(pred_path)
            print(f"      ✓ Predicted: {len(predicted_df)} records")
            
            pv_data[pv_name] = {
                'actual': actual_df,
                'predicted': predicted_df
            }
        
        if not pv_data:
            raise FileNotFoundError("No valid PV system data loaded!")
        
        print(f"\n✅ Loaded data for {len(pv_data)} systems: {', '.join(pv_data.keys())}")
        
        self.results['data'] = pv_data
        return pv_data
    
    def calculate_performance_ratios(self, pv_data: dict) -> pd.DataFrame:

        print("\n" + "=" * 80)
        print("STEP 2: CALCULATING PERFORMANCE RATIOS FOR N SYSTEMS")
        print("=" * 80)
        
        # Calculate PR for all systems
        pr_all_systems = self.pr_calculator.calculate_all_systems_pr(pv_data)
        
        self.results['pr_all_systems'] = pr_all_systems
        
        return pr_all_systems
    
    def calculate_pairwise_deviations(self, pr_all_systems: pd.DataFrame) -> dict:

        print("\n" + "=" * 80)
        print("STEP 3: CALCULATING PAIRWISE DEVIATION MATRIX")
        print("=" * 80)
        
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

        print("\n" + "=" * 80)
        print("STEP 4: CREATING VISUALIZATIONS (DISABLED)")
        print("=" * 80)
        
        # Visualization disabled - requires matplotlib
        print("\n   ⚠️  Visualization disabled (matplotlib not installed)")
        
        figures = {}
        self.results['figures'] = figures
        
        return figures
    
    def export_results(self, output_dir: Path = None):

        print("\n" + "=" * 80)
        print("STEP 5: EXPORTING RESULTS")
        print("=" * 80)
        
        if output_dir is None:
            output_dir = project_root / 'results' / 'phase_3'
        
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        data_dir = output_dir / 'data'
        reports_dir = output_dir / 'reports'
        data_dir.mkdir(exist_ok=True)
        reports_dir.mkdir(exist_ok=True)
        
        # Export DataFrames
        print("\n📊 Exporting data files...")
        
        if 'pr_all_systems' in self.results:
            pr_path = data_dir / 'pr_all_systems.csv'
            self.results['pr_all_systems'].to_csv(pr_path, index=False)
            print(f"   ✓ PR all systems: {pr_path.name}")
        
        # Export JSON reports
        print("\n📄 Exporting JSON reports...")
        
        # Pairwise matrix
        if 'pairwise_matrix' in self.results:
            pairwise_path = reports_dir / 'pairwise_deviation_matrix.json'
            with open(pairwise_path, 'w') as f:
                json.dump(self.results['pairwise_matrix'], f, indent=2, default=str)
            print(f"   ✓ Pairwise matrix: {pairwise_path.name}")
        
        # Deviation analysis
        if 'deviation_analysis' in self.results:
            deviation_path = reports_dir / 'deviation_analysis.json'
            with open(deviation_path, 'w') as f:
                json.dump(self.results['deviation_analysis'], f, indent=2, default=str)
            print(f"   ✓ Deviation analysis: {deviation_path.name}")
        
        print(f"\n   ✅ All results exported to: {output_dir}")
    

    
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
            
            print("\n" + "=" * 80)
            print("✅ N-SYSTEM ANALYSIS COMPLETE")
            print("=" * 80)
            
            # Print summary
            self._print_summary_n_systems()
            
            return self.results
            
        except Exception as e:
            print(f"\n❌ Error during analysis: {e}")
            import traceback
            traceback.print_exc()
            raise
    

    
    def _print_summary_n_systems(self):
        """Print executive summary for N-system analysis"""
        
        print("\n📊 N-SYSTEM ANALYSIS SUMMARY")
        print("-" * 80)
        
        if 'deviation_analysis' in self.results:
            analysis = self.results['deviation_analysis']
            
            if 'error' not in analysis:
                print(f"\n Total Systems: {analysis['n_systems']}")
                print(f" Systems: {', '.join(analysis['system_names'])}")
                
                cluster = analysis['cluster_analysis']
                print(f"\n System Health Distribution:")
                print(f"   Healthy: {cluster['n_healthy']}")
                print(f"   Faulty: {cluster['n_faulty']}")
                print(f"   Health Ratio: {cluster['cluster_health_ratio']:.1%}")
                
                if analysis['faulty_systems']:
                    print(f"\n 🚨 Faulty Systems Detected:")
                    for fault in analysis['faulty_systems']:
                        print(f"   • {fault['pv_system']}: "
                              f"{fault['mean_deviation']:.1%} deviation ({fault['severity']})")
                else:
                    print(f"\n ✅ All systems operating within normal parameters")
                
                if cluster.get('healthy_cluster'):
                    print(f"\n Healthy Cluster:")
                    print(f"   Systems: {', '.join(cluster['healthy_cluster'])}")
                    print(f"   Mean Deviation: {cluster.get('healthy_mean_deviation', 0):.1%}")
        
        if 'pairwise_matrix' in self.results:
            matrix_result = self.results['pairwise_matrix']
            if 'error' not in matrix_result:
                print(f"\n Pairwise Matrix Stats:")
                print(f"   Valid comparison days: {matrix_result['n_valid_days']}")
        
        print("\n" + "=" * 80)


def main():
    """Main entry point"""
    
    # Create and run pipeline
    pipeline = PredictiveMaintenancePipeline()
    results = pipeline.run_full_analysis()
    
    return results


if __name__ == '__main__':
    main()
