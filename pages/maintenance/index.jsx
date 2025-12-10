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
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import pythonApi from '../../lib/services/pythonApi';
import styles from '../energy/styles.module.css';

const Maintenance = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { alerts: staticAlerts, systemHealth, loading: staticLoading } = useMaintenanceAlerts();

  const [maintenanceData, setMaintenanceData] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState(null);

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
          <h1 className={styles.pageTitle}>Maintenance & System Health</h1>
          <p className={styles.pageSubtitle}>
            Monitor system performance and receive proactive maintenance alerts
          </p>
        </div>

        {/* Error State */}
        {maintError && (
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LucideIcons.AlertCircle size={20} />
              <span>{maintError}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {maintLoading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: '#666' }}>Analyzing System Performance...</p>
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
        )}

        {!maintLoading && maintenanceData && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Overall Status Card */}
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>System Health Status</h2>
                            <p style={{ color: '#6B7280', marginTop: '4px' }}>Based on Performance Ratio (PR) Analysis</p>
                        </div>
                        <div style={{ 
                            padding: '8px 16px', 
                            borderRadius: '20px', 
                            backgroundColor: maintenanceData.alerts.length > 0 ? '#FEF2F2' : '#ECFDF5',
                            color: maintenanceData.alerts.length > 0 ? '#EF4444' : '#10B981',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {maintenanceData.alerts.length > 0 ? <LucideIcons.AlertTriangle size={20} /> : <LucideIcons.CheckCircle size={20} />}
                            {maintenanceData.alerts.length > 0 ? 'Issues Detected' : 'System Healthy'}
                        </div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>Performance Ratio & Production (30 Days)</h3>
                    <div style={{ height: '400px', width: '100%' }}>
                        <ResponsiveContainer>
                            <ComposedChart data={maintenanceData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="date" tickFormatter={(d) => d.split('-').slice(1).join('/')} stroke="#9CA3AF" />
                                <YAxis yAxisId="left" stroke="#9CA3AF" label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" unit="%" domain={[0, 120]} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="actual" fill="#3B82F6" name="Actual Production" radius={[4, 4, 0, 0]} />
                                <Line yAxisId="left" type="monotone" dataKey="predicted" stroke="#9CA3AF" strokeDasharray="5 5" name="Predicted (Ideal)" dot={false} />
                                <Line yAxisId="right" type="monotone" dataKey="pr" stroke="#10B981" strokeWidth={2} name="Performance Ratio %" dot={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Detected Alerts */}
                {maintenanceData.alerts.length > 0 && (
                    <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ padding: '8px', borderRadius: '8px' }}>
                                <LucideIcons.Siren size={24} color="#EF4444" />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>AI Detected Issues</h3>
                        </div>
                        
                        <div style={{ display: 'grid', gap: '16px' }}>
                            {maintenanceData.alerts.map((alert, idx) => (
                                <div key={idx} style={{ 
                                    padding: '16px', 
                                    backgroundColor: '#FEF2F2', 
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #EF4444'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#991B1B' }}>{alert.issue}</h4>
                                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#EF4444', textTransform: 'uppercase' }}>{alert.severity}</span>
                                    </div>
                                    <p style={{ margin: '0 0 12px', color: '#374151' }}>{alert.description}</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontWeight: '500', fontSize: '14px' }}>
                                        <LucideIcons.Wrench size={16} />
                                        <span>Recommendation: {alert.recommendation}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Fallback to static content if no backend data yet */}
        {!maintLoading && !maintenanceData && !maintError && (
             <div className={styles.placeholder}>
                <div className={styles.placeholderIcon}><LucideIcons.Wrench size={64} strokeWidth={1.5} /></div>
                <h2 className={styles.placeholderTitle}>Waiting for Analysis...</h2>
             </div>
        )}
      </div>
    </Layout>
  );
};

export default Maintenance;
