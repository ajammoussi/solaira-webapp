import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
import seaborn as sns
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# Set style
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (14, 8)
plt.rcParams['font.size'] = 10


class MaintenanceVisualizer:
    def __init__(self, config):
        """
        Initialize visualizer
        
        Args:
            config: Configuration object
        """
        self.config = config
        self.pr_config = config.performance_ratio
        self.dev_config = config.deviation_score
        
        # Color schemes
        self.severity_colors = {
            'normal': '#2ecc71',      # Green
            'warning': '#f39c12',     # Orange
            'alert': '#e67e22',       # Dark orange
            'critical': '#e74c3c',    # Red
            'severe': '#c0392b',      # Dark red
            'excellent': '#27ae60',   # Dark green
            'good': '#2ecc71',        # Green
            'fair': '#f1c40f',        # Yellow
            'poor': '#e67e22',        # Orange
            'unknown': '#95a5a6'      # Gray
        }
        
        print(f"📊 Maintenance Visualizer initialized")
    
    def plot_pr_trends(self,
                      pr_df: pd.DataFrame,
                      save_path: Optional[str] = None,
                      show_thresholds: bool = True) -> plt.Figure:

        print("\n📈 Creating PR trends plot...")
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10), 
                                        height_ratios=[3, 1])
        
        # Filter valid data
        valid_df = pr_df[pr_df['sufficient_data']].copy()
        
        if len(valid_df) == 0:
            print("   No valid data to plot")
            return fig
        
        # Top plot: Daily PR with rolling average
        ax1.plot(valid_df['date'], valid_df['pr_daily'], 
                'o-', alpha=0.6, markersize=3, label='Daily PR', color='#3498db')
        
        # Add rolling average if enough data
        if len(valid_df) >= 7:
            rolling_7d = valid_df['pr_daily'].rolling(window=7, min_periods=3).mean()
            ax1.plot(valid_df['date'], rolling_7d, 
                    '-', linewidth=2, label='7-day average', color='#2c3e50')
        
        if len(valid_df) >= 30:
            rolling_30d = valid_df['pr_daily'].rolling(window=30, min_periods=15).mean()
            ax1.plot(valid_df['date'], rolling_30d, 
                    '-', linewidth=2, label='30-day average', color='#8e44ad')
        
        # Threshold lines
        if show_thresholds:
            ax1.axhline(y=self.pr_config.optimal_pr, color='#27ae60', 
                       linestyle='--', alpha=0.7, label=f'Optimal ({self.pr_config.optimal_pr:.0%})')
            ax1.axhline(y=self.pr_config.expected_pr_min, color='#e67e22', 
                       linestyle='--', alpha=0.7, label=f'Minimum ({self.pr_config.expected_pr_min:.0%})')
        
        ax1.set_ylabel('Performance Ratio', fontsize=12, fontweight='bold')
        ax1.set_title('PV System Performance Ratio Over Time', fontsize=14, fontweight='bold')
        ax1.legend(loc='best')
        ax1.grid(True, alpha=0.3)
        ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f'{y:.0%}'))
        
        # Bottom plot: PR status color bar
        for idx, row in valid_df.iterrows():
            date = row['date']
            status = row.get('status', 'unknown')
            color = self.severity_colors.get(status, '#95a5a6')
            ax2.axvspan(date, date + pd.Timedelta(days=1), 
                       color=color, alpha=0.8)
        
        ax2.set_ylabel('Status', fontsize=10)
        ax2.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax2.set_yticks([])
        ax2.set_xlim(valid_df['date'].min(), valid_df['date'].max() + pd.Timedelta(days=1))
        
        # Format x-axis
        for ax in [ax1, ax2]:
            ax.xaxis.set_major_formatter(mdates.DateFormatter('%Y-%m-%d'))
            plt.setp(ax.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved to {save_path}")
        
        return fig
    
    def plot_deviation_heatmap(self,
                              deviation_df: pd.DataFrame,
                              save_path: Optional[str] = None) -> plt.Figure:
        """
        Plot deviation scores as heatmap
        
        Args:
            deviation_df: DataFrame with deviation scores
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        print("\n🔥 Creating deviation heatmap...")
        
        # Prepare data
        deviation_cols = [col for col in deviation_df.columns if col.startswith('deviation_')]
        
        if not deviation_cols:
            print("   No deviation data to plot")
            return plt.figure()
        
        df = deviation_df[['date'] + deviation_cols].copy()
        df = df.set_index('date')
        
        # Rename columns for better labels
        df.columns = [col.replace('deviation_', '').replace('d', ' days') for col in df.columns]
        
        fig, ax = plt.subplots(figsize=(14, 6))
        
        # Create heatmap
        sns.heatmap(df.T, cmap='RdYlGn_r', center=0.10, vmin=0, vmax=0.30,
                   cbar_kws={'label': 'Deviation Score'}, ax=ax,
                   linewidths=0.5, linecolor='white')
        
        ax.set_title('Deviation Score Heatmap', fontsize=14, fontweight='bold')
        ax.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax.set_ylabel('Comparison Window', fontsize=12, fontweight='bold')
        
        # Format x-axis labels
        n_ticks = min(10, len(df))
        tick_positions = np.linspace(0, len(df)-1, n_ticks, dtype=int)
        ax.set_xticks(tick_positions)
        ax.set_xticklabels([df.index[i].strftime('%Y-%m-%d') for i in tick_positions], 
                          rotation=45, ha='right')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved to {save_path}")
        
        return fig
    
    def plot_health_timeline(self,
                           health_history: List[Dict],
                           save_path: Optional[str] = None) -> plt.Figure:
        """
        Plot system health score timeline
        
        Args:
            health_history: List of health analysis results over time
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        print("\n💚 Creating health timeline...")
        
        if not health_history:
            print("   No health history to plot")
            return plt.figure()
        
        df = pd.DataFrame(health_history)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        fig, ax = plt.subplots(figsize=(14, 6))
        
        # Plot health score
        ax.plot(df['timestamp'], df['overall_health_score'], 
               'o-', linewidth=2, markersize=6, color='#3498db')
        
        # Color background by health category
        for i in range(len(df)):
            timestamp = df.loc[i, 'timestamp']
            score = df.loc[i, 'overall_health_score']
            category = df.loc[i, 'health_category']
            color = self.severity_colors.get(category, '#95a5a6')
            
            if i < len(df) - 1:
                next_timestamp = df.loc[i+1, 'timestamp']
                ax.axvspan(timestamp, next_timestamp, alpha=0.2, color=color)
        
        # Health category thresholds
        ax.axhline(y=90, color='#27ae60', linestyle='--', alpha=0.5, label='Excellent')
        ax.axhline(y=75, color='#2ecc71', linestyle='--', alpha=0.5, label='Good')
        ax.axhline(y=60, color='#f1c40f', linestyle='--', alpha=0.5, label='Fair')
        ax.axhline(y=40, color='#e67e22', linestyle='--', alpha=0.5, label='Poor')
        
        ax.set_ylabel('Health Score', fontsize=12, fontweight='bold')
        ax.set_xlabel('Date', fontsize=12, fontweight='bold')
        ax.set_title('System Health Score Timeline', fontsize=14, fontweight='bold')
        ax.set_ylim(0, 105)
        ax.legend(loc='best')
        ax.grid(True, alpha=0.3)
        
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved to {save_path}")
        
        return fig
    
    def plot_pattern_detection(self,
                              patterns: List[Dict],
                              save_path: Optional[str] = None) -> plt.Figure:
        """
        Visualize detected failure patterns
        
        Args:
            patterns: List of detected patterns
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        print("\n🔍 Creating pattern detection chart...")
        
        if not patterns:
            print("   No patterns to plot")
            return plt.figure()
        
        detected_patterns = [p for p in patterns if p.get('detected', False)]
        
        if not detected_patterns:
            print("   No detected patterns")
            return plt.figure()
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        pattern_types = [p['pattern_type'].replace('_', ' ').title() 
                        for p in detected_patterns]
        confidences = [p['confidence'] * 100 for p in detected_patterns]
        severities = [p['severity'] for p in detected_patterns]
        
        colors = [self.severity_colors.get(sev, '#95a5a6') for sev in severities]
        
        bars = ax.barh(pattern_types, confidences, color=colors, alpha=0.8)
        
        ax.set_xlabel('Confidence (%)', fontsize=12, fontweight='bold')
        ax.set_title('Detected Failure Patterns', fontsize=14, fontweight='bold')
        ax.set_xlim(0, 100)
        ax.grid(True, alpha=0.3, axis='x')
        
        # Add confidence values on bars
        for bar, conf in zip(bars, confidences):
            width = bar.get_width()
            ax.text(width + 2, bar.get_y() + bar.get_height()/2, 
                   f'{conf:.0f}%', va='center', fontweight='bold')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved to {save_path}")
        
        return fig
    
    def plot_alert_frequency(self,
                           alerts: List[Dict],
                           save_path: Optional[str] = None) -> plt.Figure:
        """
        Plot alert frequency by type and priority
        
        Args:
            alerts: List of alert dictionaries
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        print("\n🚨 Creating alert frequency charts...")
        
        if not alerts:
            print("   No alerts to plot")
            return plt.figure()
        
        df = pd.DataFrame(alerts)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
        
        # Alert by priority
        priority_counts = df['priority'].value_counts()
        priority_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        priority_counts = priority_counts.reindex([p for p in priority_order if p in priority_counts.index])
        
        colors_priority = ['#c0392b', '#e74c3c', '#f39c12', '#3498db'][:len(priority_counts)]
        
        ax1.bar(priority_counts.index, priority_counts.values, color=colors_priority, alpha=0.8)
        ax1.set_ylabel('Number of Alerts', fontsize=12, fontweight='bold')
        ax1.set_title('Alerts by Priority', fontsize=13, fontweight='bold')
        ax1.grid(True, alpha=0.3, axis='y')
        
        # Alert by type
        type_counts = df['type'].value_counts().head(8)
        type_labels = [t.replace('_', ' ').title() for t in type_counts.index]
        
        ax2.barh(type_labels, type_counts.values, color='#3498db', alpha=0.8)
        ax2.set_xlabel('Number of Alerts', fontsize=12, fontweight='bold')
        ax2.set_title('Alerts by Type', fontsize=13, fontweight='bold')
        ax2.grid(True, alpha=0.3, axis='x')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Saved to {save_path}")
        
        return fig
    
    def create_dashboard(self,
                        pr_df: pd.DataFrame,
                        deviation_df: pd.DataFrame,
                        health_analysis: Dict,
                        patterns: List[Dict],
                        alerts: List[Dict],
                        save_path: Optional[str] = None) -> plt.Figure:
        """
        Create comprehensive dashboard with all visualizations
        
        Args:
            pr_df: DataFrame with PR data
            deviation_df: DataFrame with deviation scores
            health_analysis: Health analysis results
            patterns: List of detected patterns
            alerts: List of alerts
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        print("\n📊 Creating comprehensive dashboard...")
        
        fig = plt.figure(figsize=(18, 12))
        gs = fig.add_gridspec(3, 3, hspace=0.3, wspace=0.3)
        
        # 1. PR Trend (top row, full width)
        ax1 = fig.add_subplot(gs[0, :])
        valid_df = pr_df[pr_df['sufficient_data']].copy()
        ax1.plot(valid_df['date'], valid_df['pr_daily'], 'o-', alpha=0.6, markersize=3)
        if len(valid_df) >= 7:
            rolling = valid_df['pr_daily'].rolling(window=7, min_periods=3).mean()
            ax1.plot(valid_df['date'], rolling, '-', linewidth=2, color='#2c3e50')
        ax1.axhline(y=self.pr_config.optimal_pr, color='#27ae60', linestyle='--', alpha=0.5)
        ax1.set_title('Performance Ratio Trend', fontsize=13, fontweight='bold')
        ax1.set_ylabel('PR', fontweight='bold')
        ax1.grid(True, alpha=0.3)
        ax1.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f'{y:.0%}'))
        plt.setp(ax1.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 2. Health Score (middle left)
        ax2 = fig.add_subplot(gs[1, 0])
        health_score = health_analysis.get('overall_health_score', 0)
        health_category = health_analysis.get('health_category', 'unknown')
        color = self.severity_colors.get(health_category, '#95a5a6')
        
        ax2.pie([health_score, 100-health_score], colors=[color, '#ecf0f1'], 
               startangle=90, counterclock=False)
        ax2.text(0, 0, f'{health_score:.0f}', ha='center', va='center', 
                fontsize=40, fontweight='bold', color=color)
        ax2.text(0, -0.3, health_category.upper(), ha='center', va='center', 
                fontsize=12, fontweight='bold')
        ax2.set_title('System Health', fontsize=13, fontweight='bold')
        
        # 3. Deviation Scores (middle center)
        ax3 = fig.add_subplot(gs[1, 1])
        if len(deviation_df) > 0:
            recent_dev = deviation_df.tail(30)
            if 'deviation_7d' in recent_dev.columns:
                ax3.plot(recent_dev['date'], recent_dev['deviation_7d'], 
                        'o-', color='#e74c3c', label='7-day')
            if 'deviation_30d' in recent_dev.columns:
                ax3.plot(recent_dev['date'], recent_dev['deviation_30d'], 
                        's-', color='#f39c12', label='30-day')
            ax3.axhline(y=self.dev_config.warning_threshold, color='#f39c12', 
                       linestyle='--', alpha=0.5)
            ax3.axhline(y=self.dev_config.critical_threshold, color='#e74c3c', 
                       linestyle='--', alpha=0.5)
            ax3.set_title('Deviation Scores', fontsize=13, fontweight='bold')
            ax3.set_ylabel('Deviation', fontweight='bold')
            ax3.legend(loc='best', fontsize=9)
            ax3.grid(True, alpha=0.3)
            ax3.yaxis.set_major_formatter(plt.FuncFormatter(lambda y, _: f'{y:.0%}'))
            plt.setp(ax3.xaxis.get_majorticklabels(), rotation=45, ha='right')
        
        # 4. Detected Patterns (middle right)
        ax4 = fig.add_subplot(gs[1, 2])
        detected = [p for p in patterns if p.get('detected', False)]
        if detected:
            pattern_names = [p['pattern_type'].replace('_', '\n').title() 
                           for p in detected]
            confidences = [p['confidence'] * 100 for p in detected]
            colors_patterns = [self.severity_colors.get(p['severity'], '#95a5a6') 
                             for p in detected]
            ax4.barh(pattern_names, confidences, color=colors_patterns, alpha=0.8)
            ax4.set_xlabel('Confidence (%)', fontweight='bold')
            ax4.set_title('Detected Patterns', fontsize=13, fontweight='bold')
            ax4.set_xlim(0, 100)
            ax4.grid(True, alpha=0.3, axis='x')
        else:
            ax4.text(0.5, 0.5, 'No Patterns\nDetected', ha='center', va='center',
                    fontsize=14, color='#27ae60', fontweight='bold',
                    transform=ax4.transAxes)
            ax4.set_xticks([])
            ax4.set_yticks([])
        
        # 5. Alert Priority (bottom left)
        ax5 = fig.add_subplot(gs[2, 0])
        if alerts:
            df_alerts = pd.DataFrame(alerts)
            priority_counts = df_alerts['priority'].value_counts()
            priority_order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
            priority_counts = priority_counts.reindex([p for p in priority_order 
                                                      if p in priority_counts.index])
            colors_priority = ['#c0392b', '#e74c3c', '#f39c12', '#3498db'][:len(priority_counts)]
            ax5.bar(priority_counts.index, priority_counts.values, 
                   color=colors_priority, alpha=0.8)
            ax5.set_ylabel('Count', fontweight='bold')
            ax5.set_title('Alerts by Priority', fontsize=13, fontweight='bold')
            ax5.grid(True, alpha=0.3, axis='y')
        else:
            ax5.text(0.5, 0.5, 'No Alerts', ha='center', va='center',
                    fontsize=14, color='#27ae60', fontweight='bold',
                    transform=ax5.transAxes)
            ax5.set_xticks([])
            ax5.set_yticks([])
        
        # 6. PR Distribution (bottom center)
        ax6 = fig.add_subplot(gs[2, 1])
        if len(valid_df) > 0:
            ax6.hist(valid_df['pr_daily'].dropna(), bins=30, color='#3498db', 
                    alpha=0.7, edgecolor='black')
            ax6.axvline(x=self.pr_config.optimal_pr, color='#27ae60', 
                       linestyle='--', linewidth=2, label='Optimal')
            ax6.set_xlabel('Performance Ratio', fontweight='bold')
            ax6.set_ylabel('Frequency', fontweight='bold')
            ax6.set_title('PR Distribution', fontsize=13, fontweight='bold')
            ax6.legend(loc='best')
            ax6.grid(True, alpha=0.3, axis='y')
            ax6.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{x:.0%}'))
        
        # 7. Summary Stats (bottom right)
        ax7 = fig.add_subplot(gs[2, 2])
        ax7.axis('off')
        
        stats_text = f"""
        SUMMARY STATISTICS
        
        Period: {valid_df['date'].min().strftime('%Y-%m-%d')} to
                {valid_df['date'].max().strftime('%Y-%m-%d')}
        
        Avg PR: {valid_df['pr_daily'].mean():.1%}
        Min PR: {valid_df['pr_daily'].min():.1%}
        Max PR: {valid_df['pr_daily'].max():.1%}
        
        Health: {health_category.title()} ({health_score:.0f}/100)
        
        Patterns: {len(detected)} detected
        Alerts: {len(alerts)} total
        Critical: {sum(1 for a in alerts if a.get('priority') == 'CRITICAL')}
        """
        
        ax7.text(0.1, 0.9, stats_text, transform=ax7.transAxes,
                fontsize=10, verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.3))
        
        fig.suptitle('PV System Predictive Maintenance Dashboard', 
                    fontsize=16, fontweight='bold', y=0.995)
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Dashboard saved to {save_path}")
        
        return fig
    
    def plot_pairwise_deviation_matrix(self, 
                                       pairwise_result: dict,
                                       save_path: Optional[str] = None) -> plt.Figure:
        """
        Plot pairwise deviation matrix heatmap for N systems
        
        Args:
            pairwise_result: Result dictionary from create_pairwise_comparison_matrix()
            save_path: Optional path to save figure
        
        Returns:
            Matplotlib figure
        """
        if 'error' in pairwise_result:
            print(f"Cannot plot: {pairwise_result['error']}")
            return None
        
        deviation_matrix = pairwise_result['deviation_matrix']
        pv_names = pairwise_result['pv_names']
        mean_deviations = pairwise_result['mean_deviations']
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 6))
        
        # Plot 1: Pairwise deviation matrix heatmap
        im = ax1.imshow(deviation_matrix, cmap='YlOrRd', aspect='auto', vmin=0, vmax=0.3)
        
        ax1.set_xticks(range(len(pv_names)))
        ax1.set_yticks(range(len(pv_names)))
        ax1.set_xticklabels(pv_names, rotation=45, ha='right')
        ax1.set_yticklabels(pv_names)
        
        # Add deviation values to cells
        for i in range(len(pv_names)):
            for j in range(len(pv_names)):
                if i != j:
                    text = ax1.text(j, i, f'{deviation_matrix[i][j]:.1%}',
                                  ha="center", va="center", color="black", fontsize=9)
        
        ax1.set_title('Pairwise Deviation Matrix\n(Lower is better)', fontweight='bold')
        ax1.set_xlabel('System')
        ax1.set_ylabel('System')
        
        plt.colorbar(im, ax=ax1, label='Deviation')
        
        # Plot 2: Mean deviation bar chart
        sorted_systems = sorted(mean_deviations.items(), key=lambda x: x[1], reverse=True)
        systems = [s[0] for s in sorted_systems]
        deviations = [s[1] for s in sorted_systems]
        
        colors = ['red' if d >= self.dev_config.critical_threshold 
                 else 'orange' if d >= self.dev_config.warning_threshold 
                 else 'green' for d in deviations]
        
        bars = ax2.barh(systems, deviations, color=colors, alpha=0.7)
        
        # Add threshold lines
        ax2.axvline(self.dev_config.warning_threshold, color='orange', 
                   linestyle='--', label='Warning', linewidth=2)
        ax2.axvline(self.dev_config.critical_threshold, color='red', 
                   linestyle='--', label='Critical', linewidth=2)
        
        ax2.set_xlabel('Mean Deviation from Other Systems')
        ax2.set_title('System Health Ranking\n(Based on mean pairwise deviation)', 
                     fontweight='bold')
        ax2.legend()
        ax2.grid(axis='x', alpha=0.3)
        
        # Add deviation values on bars
        for i, (sys, dev) in enumerate(zip(systems, deviations)):
            ax2.text(dev + 0.01, i, f'{dev:.1%}', va='center', fontsize=9)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"   Pairwise matrix plot saved to {save_path}")
        
        return fig
