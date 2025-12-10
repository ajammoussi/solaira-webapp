import pandas as pd
import numpy as np
from typing import List, Dict, Tuple, Optional

class PerformanceRatioCalculator:
    """Calculates PR for N PV systems with pairwise comparison matrix"""
    
    def __init__(self, config):
        self.config = config
        self.pv_systems_config = config.pv_systems.systems
        self.analysis_config = config.analysis
        self.data_sources = config.data_sources
        self.pv_names = [system['name'] for system in self.pv_systems_config]
        self.n_systems = len(self.pv_names)
        self.min_production = self.analysis_config.min_production_kwh
        self.min_hours = self.analysis_config.min_hours_for_daily_pr
        self.timestamp_col = self.data_sources.timestamp_column
        self.actual_col = self.data_sources.actual_power_column
        self.predicted_col = self.data_sources.predicted_power_column
        print(f" Multi-PV PR Calculator: {self.n_systems} systems - {', '.join(self.pv_names)}")
    
    def _calculate_single_pv_pr(self, actual_df: pd.DataFrame, predicted_df: pd.DataFrame, pv_name: str) -> pd.DataFrame:
        actual_df = actual_df.copy()
        predicted_df = predicted_df.copy()
        
        # Handle timestamp column (case-insensitive)
        actual_ts_col = self.timestamp_col
        if actual_ts_col not in actual_df.columns:
            # Try case-insensitive match
            for col in actual_df.columns:
                if col.lower() == actual_ts_col.lower():
                    actual_ts_col = col
                    break
        
        pred_ts_col = self.timestamp_col
        if pred_ts_col not in predicted_df.columns:
            # Try case-insensitive match
            for col in predicted_df.columns:
                if col.lower() == pred_ts_col.lower():
                    pred_ts_col = col
                    break
        
        if actual_ts_col in actual_df.columns:
            actual_df[actual_ts_col] = pd.to_datetime(actual_df[actual_ts_col])
            actual_df['date'] = pd.to_datetime(actual_df[actual_ts_col]).dt.date
        
        if pred_ts_col in predicted_df.columns:
            predicted_df[pred_ts_col] = pd.to_datetime(predicted_df[pred_ts_col])
            predicted_df['date'] = pd.to_datetime(predicted_df[pred_ts_col]).dt.date
        
        # Data is already daily, just rename columns
        actual_daily = actual_df[['date', self.actual_col]].copy()
        actual_daily.columns = ['date', f'{pv_name}_actual_kwh']
        
        predicted_daily = predicted_df[['date', self.predicted_col]].copy()
        predicted_daily.columns = ['date', f'{pv_name}_predicted_kwh']
        
        # Merge actual and predicted
        merged_df = pd.merge(actual_daily, predicted_daily, on='date', how='inner')
        
        # Calculate PR
        predicted_safe = np.where(merged_df[f'{pv_name}_predicted_kwh'] < self.min_production, np.nan, merged_df[f'{pv_name}_predicted_kwh'])
        merged_df[f'{pv_name}_pr'] = merged_df[f'{pv_name}_actual_kwh'] / predicted_safe
        
        # For daily data, all valid days have sufficient data
        merged_df[f'{pv_name}_sufficient_data'] = merged_df[f'{pv_name}_actual_kwh'] >= self.min_production
        pr_suspicious = (merged_df[f'{pv_name}_pr'] < 0) | (merged_df[f'{pv_name}_pr'] > 1.5)
        merged_df[f'{pv_name}_pr'] = np.where(merged_df[f'{pv_name}_sufficient_data'] & ~pr_suspicious, merged_df[f'{pv_name}_pr'], np.nan)
        merged_df['date'] = pd.to_datetime(merged_df['date'])
        return merged_df
    
    def calculate_all_systems_pr(self, pv_data_dict: Dict[str, Dict[str, pd.DataFrame]]) -> pd.DataFrame:
        print("\n Calculating PR for all systems...")
        pr_dataframes = []
        for pv_name in self.pv_names:
            if pv_name not in pv_data_dict:
                print(f"     {pv_name}: No data")
                continue
            pr_df = self._calculate_single_pv_pr(pv_data_dict[pv_name]['actual'], pv_data_dict[pv_name]['predicted'], pv_name)
            pr_dataframes.append(pr_df)
            valid = pr_df[pr_df[f'{pv_name}_sufficient_data']].shape[0]
            print(f"    {pv_name}: {valid} days, avg PR = {pr_df[f'{pv_name}_pr'].mean():.1%}")
        if not pr_dataframes:
            raise ValueError("No valid PV data!")
        merged_df = pr_dataframes[0]
        for pr_df in pr_dataframes[1:]:
            merged_df = pd.merge(merged_df, pr_df, on='date', how='outer', suffixes=('', '_dup'))
        merged_df = merged_df[[col for col in merged_df.columns if not col.endswith('_dup')]]
        merged_df = merged_df.sort_values('date').reset_index(drop=True)
        if 'day_of_week' not in merged_df.columns:
            merged_df['day_of_week'] = merged_df['date'].dt.dayofweek
            merged_df['week'] = merged_df['date'].dt.isocalendar().week
            merged_df['month'] = merged_df['date'].dt.month
        sufficient_cols = [col for col in merged_df.columns if col.endswith('_sufficient_data')]
        merged_df['all_systems_valid'] = merged_df[sufficient_cols].all(axis=1)
        print(f"\n    Total: {len(merged_df)} days, {merged_df['all_systems_valid'].sum()} all valid")
        return merged_df
    
    def create_pairwise_comparison_matrix(self, pr_df: pd.DataFrame) -> Dict:
        print("\n Creating pairwise comparison matrix...")
        valid_df = pr_df[pr_df['all_systems_valid']].copy()
        if len(valid_df) == 0:
            return {'error': 'No valid comparison data'}
        print(f"   Valid days: {len(valid_df)}")
        n = self.n_systems
        deviation_matrix = np.zeros((n, n))
        for i, pv_i in enumerate(self.pv_names):
            for j, pv_j in enumerate(self.pv_names):
                if i != j:
                    pr_i = valid_df[f'{pv_i}_pr']
                    pr_j = valid_df[f'{pv_j}_pr']
                    daily_dev = np.abs(pr_i - pr_j) / np.maximum(pr_i, pr_j)
                    deviation_matrix[i][j] = daily_dev.mean()
        mean_deviations = {}
        for i, pv_name in enumerate(self.pv_names):
            other_devs = [deviation_matrix[i][j] for j in range(n) if i != j]
            mean_deviations[pv_name] = np.mean(other_devs) if other_devs else 0.0
        dev_config = self.config.deviation_score
        faulty_systems = []
        for pv_name, mean_dev in mean_deviations.items():
            if mean_dev > dev_config.critical_threshold:  # > 0.30 (30%)
                severity = 'CRITICAL'
            elif mean_dev > dev_config.warning_threshold:  # 0.20 < dev ≤ 0.30
                severity = 'MEDIUM'
            else:  # ≤ 0.20 (20%) - NORMAL, not faulty
                continue
            faulty_systems.append({'pv_system': pv_name, 'mean_deviation': mean_dev, 'severity': severity, 'confidence': min(mean_dev / dev_config.critical_threshold, 1.0)})
        faulty_systems.sort(key=lambda x: x['mean_deviation'], reverse=True)
        print(f"\n    Deviation Matrix:")
        print(f"   {'':15} " + " ".join([f"{pv:>10}" for pv in self.pv_names]))
        for i, pv_i in enumerate(self.pv_names):
            row = " ".join([f"{deviation_matrix[i][j]:>9.1%}" for j in range(n)])
            print(f"   {pv_i:15} {row}")
        print(f"\n    Mean Deviation per System:")
        for pv in sorted(mean_deviations.keys(), key=lambda x: mean_deviations[x], reverse=True):
            mean_dev = mean_deviations[pv]
            status = 'FAULTY' if mean_dev >= dev_config.warning_threshold else 'HEALTHY'
            print(f"   {pv:15} {mean_dev:>7.1%}  [{status}]")
        if faulty_systems:
            print(f"\n    Faulty Systems: {len(faulty_systems)}")
            for f in faulty_systems:
                print(f"   - {f['pv_system']}: {f['mean_deviation']:.1%} ({f['severity']})")
        else:
            print(f"\n    All systems healthy")
        return {'deviation_matrix': deviation_matrix, 'pv_names': self.pv_names, 'mean_deviations': mean_deviations, 'faulty_systems': faulty_systems, 'n_systems': n, 'n_valid_days': len(valid_df)}
