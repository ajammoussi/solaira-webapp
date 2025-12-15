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
import PVSystemsConfig from '../../components/PVSystemsConfig';
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import pythonApi from '../../lib/services/pythonApi';
import { PVForecastForm, PredictionChart, PredictionTable } from '../../components/solar-forecast';
import styles from '../energy/styles.module.css';

const Maintenance = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { alerts: staticAlerts, systemHealth, loading: staticLoading } = useMaintenanceAlerts();

  const [maintenanceData, setMaintenanceData] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const [forecastPredictions, setForecastPredictions] = useState(null);
  const [showConfig, setShowConfig] = useState(true);
  const [configKey, setConfigKey] = useState(0);

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

  // Run Maintenance Analysis
  useEffect(() => {
    const runAnalysis = async () => {
      if ((!user && !isGuest) || maintenanceData) return;
      setMaintLoading(true);
      try {
        // Generate 30 days of mock data
        const dates = [];
        const actual = [];
        const predicted = [];
        const now = new Date();
        
        for (let i = 29; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
          
          const baseProd = 40 + Math.random() * 10; // 40-50 kWh
          predicted.push(parseFloat(baseProd.toFixed(2)));
          
          // Simulate degradation in last 5 days to trigger alert
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
  }, [user, isGuest]);

  if (authLoading || (!user && !isGuest)) {
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
          <button 
            onClick={() => setShowConfig(!showConfig)}
            style={{
              padding: '0.75rem 1.5rem',
              background: showConfig ? '#666' : '#00D9A3',
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
            <LucideIcons.Settings size={18} />
            {showConfig ? 'Hide Configuration' : 'Show Configuration'}
          </button>
        </div>

        {showConfig && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <LucideIcons.Settings className={styles.sectionIcon} />
              <div>
                <h2 className={styles.sectionTitle}>System Configuration</h2>
                <p className={styles.sectionDescription} style={{marginBottom: 0}}>
                  Configure your PV system parameters.
                </p>
              </div>
            </div>
            <PVSystemsConfig 
              onConfigured={() => {
                setShowConfig(false);
                setConfigKey(prev => prev + 1);
              }}
            />
          </section>
        )}

        <section className={styles.section}>
          <PVSystemsGrid key={configKey} refreshInterval={30000} noPadding={true} />
        </section>

        <SolarChatbot />
      </div>
    </Layout>
  );
};

export default Maintenance;
