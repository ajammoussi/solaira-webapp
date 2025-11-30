/**
 * Maintenance Page - PV Energy Management System
 * 
 * System health and maintenance alerts:
 * - System health dashboard
 * - Active maintenance alerts
 * - Component status monitoring
 * - Service recommendations
 */

import React from 'react';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import styles from '../energy/styles.module.css';

const Maintenance = () => {
  const { alerts, systemHealth, loading } = useMaintenanceAlerts();

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Maintenance & System Health</h1>
          <p className={styles.pageSubtitle}>
            Monitor system performance and receive proactive maintenance alerts
          </p>
        </div>

        {/* Quick System Health Preview */}
        {!loading && systemHealth && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              System Status: 
              {systemHealth.overall_status === 'healthy' ? (
                <>
                  <LucideIcons.CheckCircle size={20} color="#00A86B" />
                  <span>Healthy</span>
                </>
              ) : (
                <>
                  <LucideIcons.AlertTriangle size={20} color="#FF9800" />
                  <span>Needs Attention</span>
                </>
              )}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {Object.entries(systemHealth.components).map(([key, component]) => (
                <div 
                  key={key}
                  style={{
                    backgroundColor: '#FFF',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#6B7280', marginBottom: '8px', textTransform: 'capitalize' }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: component.status === 'healthy' ? '#00A86B' : component.status === 'warning' ? '#FF9800' : '#F44336',
                    }}></div>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#333' }}>
                      {component.health_percent}%
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {component.details}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Alerts Preview */}
        {!loading && alerts && alerts.filter(a => a.status === 'active').length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
              Active Alerts ({alerts.filter(a => a.status === 'active').length})
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {alerts.filter(a => a.status === 'active').map((alert) => (
                <div 
                  key={alert.id}
                  style={{
                    backgroundColor: '#FFF',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderLeft: `4px solid ${
                      alert.severity === 'critical' ? '#F44336' :
                      alert.severity === 'warning' ? '#FF9800' :
                      '#2196F3'
                    }`,
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                    {alert.title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                    {alert.description}
                  </div>
                  {alert.suggested_action && (
                    <div style={{ fontSize: '12px', color: '#00D9A3', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <LucideIcons.Lightbulb size={14} /> {alert.suggested_action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}><LucideIcons.Wrench size={64} strokeWidth={1.5} /></div>
          <h2 className={styles.placeholderTitle}>Full Maintenance Dashboard Coming Soon</h2>
          <p className={styles.placeholderText}>
            Tasks 13-14: System Health Dashboard & Detailed Alerts Panel
          </p>
          <ul className={styles.featureList}>
            <li>Real-time component health monitoring</li>
            <li>Performance degradation detection</li>
            <li>Maintenance scheduling and tracking</li>
            <li>Service history and warranty information</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Maintenance;
