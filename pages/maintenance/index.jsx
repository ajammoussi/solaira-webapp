/**
 * Maintenance Page - PV Energy Management System
 * 
 * System health and maintenance alerts:
 * - System health dashboard
 * - Active maintenance alerts
 * - Component status monitoring
 * - Service recommendations
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import SolarChatbot from '../../components/SolarChatbot';
import PVSystemsGrid from '../../components/PVSystemsGrid';
// import PVSystemsConfig from '../../components/PVSystemsConfig';
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import pythonApi from '../../lib/services/pythonApi';
import pvMonitoringService from '../../lib/services/pvMonitoring';
import { PVForecastForm, PredictionChart, PredictionTable } from '../../components/solar-forecast';
import styles from '../energy/styles.module.css';

const SOLAR_SYSTEMS = [
  { value: '2', panelCount: 2, capacity_kw: 0.9 },
  { value: '4', panelCount: 4, capacity_kw: 1.8 },
  { value: '8', panelCount: 8, capacity_kw: 3.5 },
  { value: '10', panelCount: 10, capacity_kw: 4.4 },
  { value: '12', panelCount: 12, capacity_kw: 5.3 },
  { value: '16', panelCount: 16, capacity_kw: 7.0 },
];

const Maintenance = () => {
  const router = useRouter();
  const { user, profile, isGuest, loading: authLoading } = useAuth();
  const { alerts: staticAlerts, systemHealth, loading: staticLoading } = useMaintenanceAlerts();

  const [maintenanceData, setMaintenanceData] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const [forecastPredictions, setForecastPredictions] = useState(null);
  const [configKey, setConfigKey] = useState(0);
  const [systemsLastUpdated, setSystemsLastUpdated] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/signin');
    }
  }, [user, authLoading, router]);

  // Auto-configure systems based on profile
  useEffect(() => {
    const checkAndConfigureSystems = async () => {
      if (profile && profile.current_system) {
        const systemConfig = SOLAR_SYSTEMS.find(s => s.value === String(profile.current_system));
        if (systemConfig) {
          try {
            // Check current status first to avoid resetting simulation on every page load
            const status = await pvMonitoringService.getAllSystemsStatus();
            const currentCount = status.systems ? status.systems.length : 0;
            
            // Calculate capacity per PV system (all systems have equal capacity)
            const numSystems = systemConfig.panelCount;  // Number of PV systems user has
            const capacityPerSystem = systemConfig.capacity_kw / numSystems;
            
            console.log(`User has ${numSystems} PV systems, ${capacityPerSystem.toFixed(2)} kW each`);
            console.log(`Total capacity: ${systemConfig.capacity_kw} kW`);
            
            // Only reconfigure if count doesn't match
            if (currentCount !== numSystems) {
              console.log(`Reconfiguring: Current ${currentCount} systems → Target ${numSystems} systems`);
              
              await pvMonitoringService.configureSystems(numSystems, capacityPerSystem);
              
              // Start monitoring after configuration
              await pvMonitoringService.startMonitoring(60);
              
              // Wait a moment for data to be generated
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              setConfigKey(prev => prev + 1); // Refresh grid
            } else {
              // Systems already configured, ensure monitoring is active
              console.log(`Systems already configured (${currentCount}), ensuring monitoring is active`);
              try {
                await pvMonitoringService.startMonitoring(60);
              } catch (monitorErr) {
                console.log('Monitoring already active or failed to start:', monitorErr.message);
              }
            }
          } catch (err) {
            console.error("Failed to check/configure systems:", err);
            // If check fails (e.g. 404 or empty), try to configure
            try {
               const numSystems = systemConfig.panelCount;
               const capacityPerSystem = systemConfig.capacity_kw / numSystems;
               
               console.log(`Configuring ${numSystems} PV systems, ${capacityPerSystem.toFixed(2)} kW each`);
               
               await pvMonitoringService.configureSystems(numSystems, capacityPerSystem);
               
               // Start monitoring after configuration
               await pvMonitoringService.startMonitoring(60);
               
               // Wait a moment for data to be generated
               await new Promise(resolve => setTimeout(resolve, 1000));
               
               setConfigKey(prev => prev + 1);
            } catch (retryErr) {
               console.error("Retry configuration failed:", retryErr);
            }
          }
        }
      }
    };
    
    if (profile) {
      checkAndConfigureSystems();
    }
  }, [profile]);

  // Run Maintenance Analysis
  useEffect(() => {
    const runAnalysis = async () => {
      if (!user || maintenanceData) return;
      setMaintLoading(true);
      try {
        // Generate 30 days of mock data
        const dates = [];
        const actual = [];
        const predicted = [];
        const now = new Date();
        
        for (let i = 29; i >= 0; i--) {
          let efficiency = 0.95;
          if (i < 5) efficiency = 0.65; // Fault!
          
          actual.push(parseFloat((baseProd * efficiency * (0.95 + Math.random() * 0.1)).toFixed(2)));
        }
        
        const results = await pythonApi.analyzeMaintenance(dates, actual, predicted);
        
        // Transform backend response to frontend state
        const alerts = (results.analysis?.issues || []).map(issue => ({
            issue: "Performance Issue",
            severity: results.analysis?.status === 'critical' ? 'Critical' : 'Warning',
            description: issue
        }));

        // Create a map of PR values by date for easy lookup
        const prMap = {};
        if (results.pr_history) {
            results.pr_history.forEach(item => {
                const d = new Date(item.date).toISOString().split('T')[0];
                prMap[d] = item.pr;
            });
        }

        const chartData = dates.map((date, idx) => ({
            date,
            actual: actual[idx],
            predicted: predicted[idx],
            pr: (prMap[date] || 0) * 100
        }));

        setMaintenanceData({
            alerts,
            chartData
        });
      } catch (err) {
        console.error("Maintenance analysis failed:", err);
        setMaintError("Failed to analyze maintenance data. Is the backend running?");
      } finally {
        setMaintLoading(false);
      }
    };
    
    runAnalysis();
  }, [user]);

  if (authLoading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <div className="spinner" />
        <style jsx>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e2e2;
            border-top-color: #00D9A3;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>PV Systems Maintenance Monitoring</h1>
            <p className={styles.pageSubtitle}>
              Real-time anomaly detection and performance monitoring for your PV systems
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => setConfigKey(prev => prev + 1)}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#00D9A3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.95rem',
                fontWeight: '500'
              }}
            >
              <LucideIcons.RefreshCw size={18} />
              Refresh Results
            </button>
            
            <button 
              className={styles.infoButton}
              onClick={() => setShowHelp(true)}
              aria-label="How does this work?"
            >
              <LucideIcons.HelpCircle size={24} />
            </button>
          </div>
        </div>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Activity className={styles.sectionIcon} />
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 className={styles.sectionTitle}>PV System Monitoring</h2>
                <p className={styles.sectionDescription} style={{marginBottom: 0}}>
                  Real-time status of all connected PV systems.
                </p>
              </div>
              {systemsLastUpdated && (
                <div style={{ fontSize: '0.9rem', color: '#666', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LucideIcons.Clock size={16} />
                  Last updated: {systemsLastUpdated.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          <PVSystemsGrid 
            key={configKey} 
            refreshInterval={60000} 
            noPadding={true} 
            onUpdate={(data) => setSystemsLastUpdated(data.lastUpdated)}
          />
        </section>

        {/* SolarChatbot handled in _app.js */}

        {/* Help Modal */}
        {showHelp && (
          <div className={styles.modalOverlay} onClick={() => setShowHelp(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <button 
                className={styles.modalClose}
                onClick={() => setShowHelp(false)}
              >
                <LucideIcons.X size={24} />
              </button>
              
              <h3 className={styles.modalTitle}>System Monitoring Guide</h3>
              
              <p className={styles.modalText}>
                This dashboard monitors your solar panels in real-time to detect performance issues and anomalies.
              </p>
              
              <h4 className={styles.modalSubtitle}>Understanding the Metrics</h4>
              <ul className={styles.modalList}>
                <li><strong>Deviation Score:</strong> Indicates how much the actual performance differs from the expected output based on weather conditions.</li>
                <li><strong>Status Colors:</strong>
                  <ul style={{ marginTop: '8px' }}>
                    <li><span style={{ color: '#00D9A3', fontWeight: 'bold' }}>Green (Healthy):</span> Deviation &lt; 10%. System is performing optimally.</li>
                    <li><span style={{ color: '#ffaa00', fontWeight: 'bold' }}>Orange (Warning):</span> Deviation 10-20%. Performance is slightly below expected.</li>
                    <li><span style={{ color: '#ff4444', fontWeight: 'bold' }}>Red (Critical):</span> Deviation &gt; 20%. Significant issue detected (e.g., shading, dirt, failure).</li>
                  </ul>
                </li>
              </ul>

              <h4 className={styles.modalSubtitle}>Automatic Configuration</h4>
              <p className={styles.modalText}>
                The number of panels is automatically configured based on your profile settings. You can update your system size in the Settings page.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Maintenance;
