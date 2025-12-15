/**
 * PV Systems Configuration Component
 * Allows users to configure the number of PV systems to monitor
 */

import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import styles from './styles.module.css';
import pvMonitoringService from '../../lib/services/pvMonitoring';

const PVSystemsConfig = ({ onConfigured }) => {
  const [numSystems, setNumSystems] = useState(4);
  const [capacityPerSystem, setCapacityPerSystem] = useState(5.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      const config = await pvMonitoringService.getConfig();
      setCurrentConfig(config);
      setNumSystems(config.num_systems || 4);
      setMonitoringActive(config.monitoring_active || false);
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const handleConfigure = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Configure systems
      await pvMonitoringService.configureSystems(numSystems, capacityPerSystem);

      // Start monitoring
      await pvMonitoringService.startMonitoring(60); // 1 minute interval

      setSuccess(true);
      setMonitoringActive(true);
      
      if (onConfigured) {
        onConfigured();
      }

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error configuring systems:', err);
      setError(err.response?.data?.detail || 'Failed to configure systems');
    } finally {
      setLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await pvMonitoringService.stopMonitoring();
      setMonitoringActive(false);
    } catch (err) {
      console.error('Error stopping monitoring:', err);
      setError('Failed to stop monitoring');
    }
  };

  const handleStartMonitoring = async () => {
    try {
      await pvMonitoringService.startMonitoring(60);
      setMonitoringActive(true);
    } catch (err) {
      console.error('Error starting monitoring:', err);
      setError('Failed to start monitoring');
    }
  };

  return (
    <div>
      {currentConfig && (
        <div className={styles.currentStatus}>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Current Systems:</span>
            <span className={styles.statusValue}>{currentConfig.num_systems}</span>
          </div>
          <div className={styles.statusItem}>
            <span className={styles.statusLabel}>Monitoring Status:</span>
            <span 
              className={styles.statusBadge}
              style={{ background: monitoringActive ? '#00D9A3' : '#999' }}
            >
              {monitoringActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      )}

      <div className={styles.configForm}>
        <div className={styles.formGroup}>
          <label htmlFor="numSystems">
            <LucideIcons.Sun size={18} />
            Number of PV Systems
          </label>
          <input
            id="numSystems"
            type="number"
            min="1"
            max="20"
            value={numSystems}
            onChange={(e) => setNumSystems(parseInt(e.target.value))}
            className={styles.input}
          />
          <span className={styles.helpText}>Between 1 and 20 systems</span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="capacity">
            <LucideIcons.Zap size={18} />
            Capacity per System (kW)
          </label>
          <input
            id="capacity"
            type="number"
            min="1"
            max="50"
            step="0.5"
            value={capacityPerSystem}
            onChange={(e) => setCapacityPerSystem(parseFloat(e.target.value))}
            className={styles.input}
          />
          <span className={styles.helpText}>Between 1.0 and 50.0 kW</span>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <LucideIcons.AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className={styles.successMessage}>
            <LucideIcons.CheckCircle size={18} />
            Configuration updated successfully!
          </div>
        )}

        <div className={styles.buttonGroup}>
          <button
            onClick={handleConfigure}
            disabled={loading}
            className={styles.primaryButton}
          >
            {loading ? (
              <>
                <div className={styles.buttonSpinner}></div>
                Configuring...
              </>
            ) : (
              <>
                <LucideIcons.Save size={18} />
                Configure & Start Monitoring
              </>
            )}
          </button>

          {monitoringActive ? (
            <button
              onClick={handleStopMonitoring}
              className={styles.secondaryButton}
            >
              <LucideIcons.Square size={18} />
              Stop Monitoring
            </button>
          ) : (
            currentConfig?.num_systems > 0 && (
              <button
                onClick={handleStartMonitoring}
                className={styles.secondaryButton}
              >
                <LucideIcons.Play size={18} />
                Start Monitoring
              </button>
            )
          )}
        </div>
      </div>

      <div className={styles.infoBox}>
        <LucideIcons.Info size={20} />
        <div>
          <strong>How it works:</strong>
          <p>
            The system will generate realistic production data every minute for each 
            configured PV system. Occasional anomalies will be injected to simulate 
            real-world conditions like panel soiling, shading, or inverter issues.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PVSystemsConfig;
