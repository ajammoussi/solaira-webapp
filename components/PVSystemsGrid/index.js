/**
 * PV Systems Grid - Visual representation of PV systems with status
 * Shows systems as cards with color-coded status indicators
 */

import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import styles from './styles.module.css';
import pvMonitoringService from '../../lib/services/pvMonitoring';

const PVSystemsGrid = ({ refreshInterval = 30000 }) => {
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);

  const fetchSystemsStatus = async () => {
    try {
      const data = await pvMonitoringService.getAllSystemsStatus();
      setSystems(data.systems || []);
      setLastUpdated(new Date(data.timestamp));
      setError(null);
    } catch (err) {
      console.error('Error fetching systems status:', err);
      setError('Failed to fetch systems status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemsStatus();

    // Auto-refresh
    const interval = setInterval(fetchSystemsStatus, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (severity) => {
    switch (severity) {
      case 'critical':
        return '#ff4444'; // Red
      case 'warning':
        return '#ffaa00'; // Yellow/Orange
      case 'normal':
      default:
        return '#00D9A3'; // Green (Solaira teal)
    }
  };

  const getStatusIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <LucideIcons.AlertTriangle size={24} />;
      case 'warning':
        return <LucideIcons.AlertCircle size={24} />;
      default:
        return <LucideIcons.CheckCircle size={24} />;
    }
  };

  const getAnomalyText = (anomaly) => {
    const anomalyLabels = {
      panel_soiling: 'Panel Soiling Detected',
      partial_shading: 'Partial Shading',
      inverter_issue: 'Inverter Issue',
      micro_failure: 'Micro Failure'
    };
    return anomalyLabels[anomaly] || 'Unknown Anomaly';
  };

  const formatPR = (pr) => {
    return (pr * 100).toFixed(1) + '%';
  };

  if (loading && systems.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading PV systems...</p>
      </div>
    );
  }

  if (error && systems.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <LucideIcons.AlertCircle size={48} color="#ff4444" />
        <p>{error}</p>
        <button onClick={fetchSystemsStatus} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  if (systems.length === 0) {
    return (
      <div className={styles.emptyState}>
        <LucideIcons.Sun size={64} color="#00D9A3" />
        <h3>No PV Systems Configured</h3>
        <p>Configure your PV systems in settings to start monitoring.</p>
      </div>
    );
  }

  return (
    <div className={styles.pvGridContainer}>
      <div className={styles.gridHeader}>
        <div>
          <h2>PV Systems Monitoring</h2>
          <p className={styles.subtitle}>
            {systems.length} system{systems.length !== 1 ? 's' : ''} • 
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
          </p>
        </div>
        <button onClick={fetchSystemsStatus} className={styles.refreshButton}>
          <LucideIcons.RefreshCw size={20} />
          Refresh
        </button>
      </div>

      <div className={styles.systemsGrid}>
        {systems.map((system) => (
          <div
            key={system.system_id}
            className={styles.systemCard}
            onClick={() => setSelectedSystem(system)}
            style={{
              borderLeft: `4px solid ${getStatusColor(system.severity)}`
            }}
          >
            <div className={styles.systemHeader}>
              <div className={styles.systemInfo}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: `${getStatusColor(system.severity)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: getStatusColor(system.severity)
                }}>
                  {system.system_id}
                </div>
                <span className={styles.systemName}>{system.system_name}</span>
              </div>
              <div 
                className={styles.statusIcon}
                style={{ color: getStatusColor(system.severity) }}
              >
                {getStatusIcon(system.severity)}
              </div>
            </div>

            <div className={styles.systemMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Deviation Score</span>
                <span 
                  className={styles.metricValue}
                  style={{ color: getStatusColor(system.severity) }}
                >
                  {system.mean_deviation !== undefined ? `${(system.mean_deviation * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>

              <div className={styles.metric}>
                <span className={styles.metricLabel}>Status</span>
                <span className={styles.metricValue}>
                  {system.status === 'healthy' ? 'Healthy' : 
                   system.status === 'critical' ? 'Critical' : 'Warning'}
                </span>
              </div>
            </div>

            {system.issues_detected && system.issues_detected.length > 0 && (
              <div className={styles.issues}>
                {system.issues_detected.slice(0, 2).map((issue, idx) => (
                  <div key={idx} className={styles.issue}>
                    <LucideIcons.Info size={14} />
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSystem && (
        <SystemDetailModal
          system={selectedSystem}
          onClose={() => setSelectedSystem(null)}
        />
      )}
    </div>
  );
};

const SystemDetailModal = ({ system, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await pvMonitoringService.getSystemHistory(system.system_id, 2);
        setHistory(data.history || []);
      } catch (err) {
        console.error('Error fetching history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [system.system_id]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{system.system_name}</h3>
          <button onClick={onClose} className={styles.closeButton}>
            <LucideIcons.X size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailSection}>
            <h4>Current Status</h4>
            <div className={styles.detailGrid}>
              <div>
                <span className={styles.label}>Performance Ratio:</span>
                <span className={styles.value}>{(system.recent_pr * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className={styles.label}>Status:</span>
                <span className={styles.value}>{system.status}</span>
              </div>
              <div>
                <span className={styles.label}>Data Points:</span>
                <span className={styles.value}>{system.data_points}</span>
              </div>
              {system.current_anomaly && (
                <div>
                  <span className={styles.label}>Active Anomaly:</span>
                  <span className={styles.value} style={{ color: '#ff4444' }}>
                    {system.current_anomaly.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {system.analysis && system.analysis.issues && system.analysis.issues.length > 0 && (
            <div className={styles.detailSection}>
              <h4>Detected Issues</h4>
              <ul className={styles.issuesList}>
                {system.analysis.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {!loading && history.length > 0 && (
            <div className={styles.detailSection}>
              <h4>Recent History (Last 2 Hours)</h4>
              <div className={styles.historyChart}>
                <p className={styles.chartPlaceholder}>
                  {history.length} data points collected
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PVSystemsGrid;
