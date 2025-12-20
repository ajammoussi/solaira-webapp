import pandas as pd
import numpy as np
from typing import Optional, Tuple, Dict, List
from datetime import datetime, timedelta


class DeviationScoreCalculator:

    def __init__(self, config):
        self.config = config
        self.dev_config = config.deviation_score
        self.pv_systems_config = config.pv_systems.systems
        
        # System names (N systems)
        self.pv_names = [system['name'] for system in self.pv_systems_config]
        self.n_systems = len(self.pv_names)
        
        # Thresholds (for pairwise mean deviation)
        self.warning_threshold = self.dev_config.warning_threshold  # 0.20 (20%)
        self.critical_threshold = self.dev_config.critical_threshold  # 0.30 (30%)
        
        # Smoothing parameters
        self.ma_days = self.dev_config.moving_average_days
        self.consecutive_days_alert = self.dev_config.consecutive_days_alert
        
        print(f"📐 Comparative Deviation Calculator initialized")
        print(f"   Systems: {self.n_systems} - {', '.join(self.pv_names)}")
        print(f"   Thresholds: Healthy≤{self.warning_threshold:.0%}, "
              f"Warning {self.warning_threshold:.0%}-{self.critical_threshold:.0%}, "
              f"Critical>{self.critical_threshold:.0%}")
    
    def _categorize_deviation(self, deviation: float) -> str:
        """Categorize deviation: NORMAL (≤0.2), MEDIUM (0.2-0.3), CRITICAL (>0.3)"""
        if pd.isna(deviation):
            return 'NORMAL'
        elif deviation <= self.warning_threshold:  # ≤ 0.20 (20%)
            return 'NORMAL'
        elif deviation <= self.critical_threshold:  # 0.20 < dev ≤ 0.30
            return 'MEDIUM'
        else:  # > 0.30 (30%)
            return 'CRITICAL'
    
    def analyze_pairwise_deviations(self, pr_df: pd.DataFrame, 
                                    pairwise_result: Dict) -> Dict:
        print("\n📊 Analyzing N-System Pairwise Deviations...")
        
        if 'error' in pairwise_result:
            print(f"   ⚠️  {pairwise_result['error']}")
            return {'error': pairwise_result['error']}
        
        mean_deviations = pairwise_result['mean_deviations']
        faulty_systems = pairwise_result['faulty_systems']
        deviation_matrix = pairwise_result['deviation_matrix']
        pv_names = pairwise_result['pv_names']
        n_systems = pairwise_result['n_systems']
        
        # Categorize each system by severity
        system_status = {}
        for pv_name in pv_names:
            mean_dev = mean_deviations[pv_name]
            system_status[pv_name] = {
                'mean_deviation': mean_dev,
                'category': self._categorize_deviation(mean_dev),
                'is_faulty': mean_dev >= self.warning_threshold,
                'severity_score': mean_dev / self.critical_threshold
            }
        
        # Identify healthy cluster (systems with low mean deviation)
        healthy_systems = [pv for pv, status in system_status.items() 
                          if status['mean_deviation'] < self.warning_threshold]
        
        # Calculate cluster statistics
        cluster_analysis = {
            'healthy_cluster': healthy_systems,
            'n_healthy': len(healthy_systems),
            'n_faulty': len(faulty_systems),
            'cluster_health_ratio': len(healthy_systems) / n_systems if n_systems > 0 else 0
        }
        
        if healthy_systems:
            healthy_devs = [mean_deviations[pv] for pv in healthy_systems]
            cluster_analysis['healthy_mean_deviation'] = np.mean(healthy_devs)
            cluster_analysis['healthy_max_deviation'] = np.max(healthy_devs)
        
        # Generate summary
        summary = {
            'n_systems': n_systems,
            'system_names': pv_names,
            'system_status': system_status,
            'faulty_systems': faulty_systems,
            'cluster_analysis': cluster_analysis,
            'deviation_matrix': deviation_matrix.tolist(),
            'mean_deviations': mean_deviations,
            'analysis_date': datetime.now().isoformat()
        }
        
        # Print results
        print(f"\n   📈 System Health Summary:")
        print(f"   Total systems: {n_systems}")
        print(f"   Healthy: {cluster_analysis['n_healthy']}")
        print(f"   Faulty: {cluster_analysis['n_faulty']}")
        
        if faulty_systems:
            print(f"\n   🚨 Faulty Systems Detected:")
            for fault in faulty_systems:
                print(f"   - {fault['pv_system']}: {fault['mean_deviation']:.1%} ({fault['severity']})")
        else:
            print(f"\n   ✅ All systems operating normally")
        
        if healthy_systems:
            print(f"\n   ✅ Healthy Cluster: {', '.join(healthy_systems)}")
            print(f"   Cluster mean deviation: {cluster_analysis['healthy_mean_deviation']:.1%}")
        
        return summary