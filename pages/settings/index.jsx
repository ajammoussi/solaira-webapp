/**
 * Settings Page - PV Energy Management System
 * 
 * System configuration forms:
 * - PV system specifications
 * - Location settings
 * - Tariff configuration
 * - Notification preferences
 */

import React from 'react';
import Layout from '../../components/Layout';
import { useSystemConfig } from '../../lib/hooks/useEnergyData';
import styles from '../energy/styles.module.css';

const Settings = () => {
  const { config, loading } = useSystemConfig();

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>System Settings</h1>
          <p className={styles.pageSubtitle}>
            Configure your PV system parameters and preferences
          </p>
        </div>

        {/* Quick Config Preview */}
        {!loading && config && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
              Current Configuration
            </h3>
            <div style={{ 
              backgroundColor: '#FFF', 
              padding: '24px', 
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    PV Capacity
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.pv_capacity_kw} kW
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Panel Tilt
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.panel_tilt}°
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Panel Azimuth
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.panel_azimuth}° (South)
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Battery Capacity
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.battery_capacity_kwh} kWh
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Location
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.location?.address || 'Not set'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Peak Rate
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    €{config.tariff?.import_rate_peak}/kWh
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>⚙️</div>
          <h2 className={styles.placeholderTitle}>Configuration Forms Coming Soon</h2>
          <p className={styles.placeholderText}>
            Task 12: System Configuration Forms with validation
          </p>
          <ul className={styles.featureList}>
            <li>Edit PV system specifications (capacity, tilt, azimuth)</li>
            <li>Configure location settings with map picker</li>
            <li>Set electricity tariffs and feed-in rates</li>
            <li>Manage notification preferences</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
