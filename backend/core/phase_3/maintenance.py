import pandas as pd
import numpy as np
from typing import Dict, List

class PerformanceRatioCalculator:
    """Calculates PR for PV systems"""
    
    def __init__(self, min_production_kwh=5.0):
        self.min_production = min_production_kwh
    
    def calculate_pr(self, actual_df: pd.DataFrame, predicted_df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate Performance Ratio (PR) = Actual / Predicted
        Expects DataFrames with 'date' and 'energy_kwh' columns
        """
        # Merge on date
        merged = pd.merge(
            actual_df, 
            predicted_df, 
            on='date', 
            how='inner', 
            suffixes=('_actual', '_predicted')
        )
        
        # Calculate PR
        # Avoid division by zero or very small numbers
        merged['pr'] = np.where(
            merged['energy_kwh_predicted'] > self.min_production,
            merged['energy_kwh_actual'] / merged['energy_kwh_predicted'],
            np.nan
        )
        
        # Filter invalid PRs (e.g. > 1.5 or < 0)
        merged['pr'] = np.where(
            (merged['pr'] >= 0) & (merged['pr'] <= 1.5),
            merged['pr'],
            np.nan
        )
        
        return merged

class MaintenanceAnalyzer:
    """Analyzes PR to detect anomalies"""
    
    def __init__(self, pr_threshold=0.75, degradation_threshold=0.05):
        self.pr_threshold = pr_threshold
        self.degradation_threshold = degradation_threshold
        
    def analyze(self, pr_df: pd.DataFrame) -> Dict:
        """
        Analyze PR data for maintenance issues
        """
        results = {
            "status": "healthy",
            "issues": [],
            "metrics": {}
        }
        
        # 1. Check recent PR
        recent_pr = pr_df['pr'].tail(7).mean()
        results['metrics']['recent_pr'] = float(recent_pr) if not pd.isna(recent_pr) else 0.0
        
        if recent_pr < self.pr_threshold:
            results['status'] = "warning"
            results['issues'].append(f"Low performance detected (Recent PR: {recent_pr:.2f})")
            
        # 2. Check for degradation trend
        # Simple linear regression on PR over time
        if len(pr_df) > 30:
            y = pr_df['pr'].dropna()
            x = np.arange(len(y))
            if len(y) > 10:
                slope, _ = np.polyfit(x, y, 1)
                results['metrics']['degradation_slope'] = float(slope)
                
                if slope < -0.001: # Significant negative slope
                    results['status'] = "critical" if results['status'] == "warning" else "warning"
                    results['issues'].append("Degradation trend detected")
                    
        return results
