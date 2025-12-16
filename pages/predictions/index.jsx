/**
 * Predictions Page - PV Energy Management System
 * 
 * Future forecasts and recommendations:
 * - 7-day production/load forecast
 * - Smart recommendations panel
 * - Weather integration
 * - Optimal usage windows
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PowerSourcesChart from '../../components/PowerSourcesChart';
import EnergySimulationChart from '../../components/EnergySimulationChart';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRecommendations } from '../../lib/hooks/useEnergyData';
import { useEnergySimulation } from '../../lib/hooks/useEnergySimulation';
import { useDailyPrediction } from '../../lib/hooks/useDailyPrediction';
import pythonApi from '../../lib/services/pythonApi';
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import { PVForecastForm, PredictionChart, PredictionTable } from '../../components/solar-forecast';
import styles from './styles.module.css';

const Predictions = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { data: recommendations, loading } = useRecommendations();

  const { alerts: staticAlerts, systemHealth, loading: staticLoading } = useMaintenanceAlerts();
  
  // Time period state (in hours)
  const [timePeriod, setTimePeriod] = useState(720); // Default: 30 days

  // Maintenance cards state (moved from old Maintenance page)
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const [forecastPredictions, setForecastPredictions] = useState(null);
  
  // New comprehensive energy simulation (PV + Wind + Battery)
  const { 
    data: energySimData, 
    loading: energySimLoading, 
    error: energySimError,
    refetch: refetchEnergySim
  } = useEnergySimulation({
    hours: timePeriod,
    initialSoc: 50,
    autoFetch: true
  });
  
  // Daily prediction with caching
  const {
    data: simulationResults,
    loading: simLoading,
    error: simError
  } = useDailyPrediction({
    initialSoc: 50.0,
    timezone: profile?.timezone,
    autoFetch: !!user
  });

  // Run Maintenance Analysis (adds the old Maintenance cards to this page)
  useEffect(() => {
    const runAnalysis = async () => {
      if (!user || maintenanceData || maintLoading) return;
      setMaintLoading(true);
      setMaintError(null);

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
          predicted.push(Number(baseProd.toFixed(2)));

          // Simulate degradation in last 5 days to trigger alert
          let efficiency = 0.95;
          if (i < 5) efficiency = 0.65;

          actual.push(Number((baseProd * efficiency * (0.95 + Math.random() * 0.1)).toFixed(2)));
        }

        const results = await pythonApi.analyzeMaintenance(dates, actual, predicted);

        const alerts = (results.analysis?.issues || []).map((issue) => ({
          issue: 'Performance Issue',
          severity: results.analysis?.status === 'critical' ? 'Critical' : 'Warning',
          description: issue,
        }));

        const prMap = {};
        if (results.pr_history) {
          results.pr_history.forEach((item) => {
            const d = new Date(item.date).toISOString().split('T')[0];
            prMap[d] = item.pr;
          });
        }

        const chartData = dates.map((date, idx) => ({
          date,
          actual: actual[idx],
          predicted: predicted[idx],
          pr: (prMap[date] || 0) * 100,
        }));

        setMaintenanceData({ alerts, chartData });
      } catch (err) {
        console.error('Maintenance analysis failed:', err);
        setMaintError('Failed to analyze maintenance data. Is the backend running?');
      } finally {
        setMaintLoading(false);
      }
    };

    runAnalysis();
  }, [user, maintenanceData, maintLoading]);

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/signin');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className={styles.contentLoader}>
          <div className={styles.spinner} />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Predictions & Recommendations</h1>
            <p className={styles.pageSubtitle}>
              Smart insights and future forecasts for optimal energy usage
            </p>
          </div>
        </div>

        {/* Error State */}
        {simError && (
          <div className={styles.errorContainer}>
            <LucideIcons.AlertCircle size={20} />
            <span>{simError}</span>
          </div>
        )}

        {/* Loading State */}
        {simLoading && !simulationResults && (
          <div className={styles.contentLoader}>
            <div className={styles.spinner} />
            <p style={{ marginTop: '1rem', color: '#666' }}>Generating predictions...</p>
          </div>
        )}

        {/* Simulation Results */}
        {!simLoading && simulationResults && (
          <div className={styles.contentGrid}>
            
            {/* Summary Cards */}
            <div className={styles.metricGrid}>
              <SummaryCard 
                title="Total PV Generation" 
                value={`${simulationResults.summary.total_pv_generation.toFixed(2)} kWh`}
                icon={<LucideIcons.Sun size={24} />}
                trend="up"
                trendValue="+12%"
              />
              <SummaryCard 
                title="Total Consumption" 
                value={`${simulationResults.summary.total_consumption.toFixed(2)} kWh`}
                icon={<LucideIcons.Zap size={24} />}
                trend="down"
                trendValue="-5%"
              />
              <SummaryCard 
                title="Grid Import" 
                value={`${simulationResults.summary.grid_import.toFixed(2)} kWh`}
                icon={<LucideIcons.ArrowDownFromLine size={24} />}
                trend="neutral"
                trendValue="0%"
              />
              <SummaryCard 
                title="Grid Export" 
                value={`${simulationResults.summary.grid_export.toFixed(2)} kWh`}
                icon={<LucideIcons.ArrowUpFromLine size={24} />}
                trend="up"
                trendValue="+8%"
              />
            </div>

            {/* Chart Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper}>
                  <LucideIcons.Activity size={20} />
                </div>
                <div>
                  <h2 className={styles.sectionTitle}>24-Hour Energy Forecast</h2>
                  <p className={styles.sectionDescription}>
                    Predicted energy flow including solar generation, consumption, and grid interaction.
                  </p>
                </div>
              </div>
              
              <div className={styles.chartContainer}>
                <PowerSourcesChart 
                  solarData={simulationResults.hourly_details.map(h => h.pv_generation)}
                  gridData={simulationResults.hourly_details.map(h => h.consumption)}
                  labels={simulationResults.hourly_details.map(h => h.displayTime)}
                  seriesNames={{ solar: 'Predicted Generation', grid: 'Predicted Consumption' }}
                  card={false}
                />
              </div>
            </section>

            {/* Comprehensive Energy Simulation Chart (PV + Wind + Battery) */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper}>
                  <LucideIcons.BarChart3 size={20} />
                </div>
                <div className={styles.sectionHeaderContent}>
                  <h2 className={styles.sectionTitle}>Comprehensive Energy Simulation</h2>
                  <p className={styles.sectionDescription}>
                    Detailed analysis of PV energy, wind energy, consumption patterns, and battery state of charge.
                  </p>
                </div>
                <div className={styles.sectionActions}>
                  <div className={styles.periodSelector}>
                    <button 
                      onClick={() => setTimePeriod(24)}
                      className={`${styles.periodButton} ${timePeriod === 24 ? styles.active : ''}`}
                      disabled={energySimLoading}
                    >
                      1 Day
                    </button>
                    <button 
                      onClick={() => setTimePeriod(168)}
                      className={`${styles.periodButton} ${timePeriod === 168 ? styles.active : ''}`}
                      disabled={energySimLoading}
                    >
                      1 Week
                    </button>
                    <button 
                      onClick={() => setTimePeriod(720)}
                      className={`${styles.periodButton} ${timePeriod === 720 ? styles.active : ''}`}
                      disabled={energySimLoading}
                    >
                      1 Month
                    </button>
                  </div>
                  <button 
                    onClick={refetchEnergySim}
                    className={styles.refreshButton}
                    disabled={energySimLoading}
                  >
                    <LucideIcons.RefreshCw size={16} />
                    Refresh
                  </button>
                </div>
              </div>
              
              <EnergySimulationChart 
                data={energySimData}
                loading={energySimLoading}
                error={energySimError}
              />
            </section>

            {/* AI Recommendations */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper}>
                  <LucideIcons.BrainCircuit size={20} />
                </div>
                <div>
                  <h2 className={styles.sectionTitle}>AI Optimization Advice</h2>
                  <p className={styles.sectionDescription}>
                    Smart recommendations to optimize your energy usage and reduce costs.
                  </p>
                </div>
              </div>
              
              <div className={styles.recommendationsGrid}>
                {simulationResults.advice.map((tip, idx) => (
                  <div key={idx} className={styles.recommendationCard}>
                    <div className={styles.recommendationIcon}>
                      <LucideIcons.Lightbulb size={24} />
                    </div>
                    <p className={styles.recommendationText}>{tip}</p>
                  </div>
                ))}
                {simulationResults.advice.length === 0 && (
                  <p className={styles.emptyState}>System is running optimally. No specific actions required at this time.</p>
                )}
              </div>
            </section>

            {/* Maintenance & System Health (from old Maintenance page) */}
            {maintError && (
              <div className={styles.errorContainer}>
                <LucideIcons.AlertCircle size={20} />
                <span>{maintError}</span>
              </div>
            )}

            {!maintLoading && maintenanceData && (
              <>
                {/* Overall Status Card */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionIconWrapper}>
                      <LucideIcons.Wrench size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.sectionTitle}>System Health Status</h2>
                      <p className={styles.sectionDescription}>Based on Performance Ratio (PR) analysis</p>
                    </div>
                    <span
                      className={`${styles.trendBadge} ${maintenanceData.alerts.length > 0 ? styles.down : styles.up}`}
                    >
                      {maintenanceData.alerts.length > 0 ? (
                        <>
                          <LucideIcons.AlertTriangle size={14} /> Issues Detected
                        </>
                      ) : (
                        <>
                          <LucideIcons.CheckCircle size={14} /> System Healthy
                        </>
                      )}
                    </span>
                  </div>
                </section>

                {/* Performance Chart */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionIconWrapper}>
                      <LucideIcons.LineChart size={20} />
                    </div>
                    <div>
                      <h2 className={styles.sectionTitle}>Performance Ratio & Production (30 Days)</h2>
                      <p className={styles.sectionDescription}>Actual vs predicted production with PR percentage</p>
                    </div>
                  </div>

                  <div style={{ height: 400, width: '100%' }}>
                    <ResponsiveContainer>
                      <ComposedChart data={maintenanceData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tickFormatter={(d) => d.split('-').slice(1).join('/')} />
                        <YAxis yAxisId="left" label={{ value: 'kWh', angle: -90, position: 'insideLeft' }} />
                        <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 120]} />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="actual" fill="#3B82F6" name="Actual Production" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="left" type="monotone" dataKey="predicted" strokeDasharray="5 5" name="Predicted (Ideal)" dot={false} />
                        <Line yAxisId="right" type="monotone" dataKey="pr" strokeWidth={2} name="Performance Ratio %" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                {/* AI Detected Alerts */}
                {maintenanceData.alerts.length > 0 && (
                  <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionIconWrapper}>
                        <LucideIcons.Siren size={20} />
                      </div>
                      <div>
                        <h2 className={styles.sectionTitle}>AI Detected Issues</h2>
                        <p className={styles.sectionDescription}>Potential performance problems found in the last 30 days</p>
                      </div>
                    </div>

                    <div className={styles.recommendationsGrid}>
                      {maintenanceData.alerts.map((alert, idx) => (
                        <div key={idx} className={styles.recommendationCard}>
                          <div className={styles.recommendationIcon}>
                            <LucideIcons.AlertTriangle size={24} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p className={styles.recommendationText} style={{ marginBottom: 6 }}>
                              <strong>{alert.issue}</strong> — {alert.severity}
                            </p>
                            <p className={styles.recommendationText} style={{ margin: 0 }}>
                              {alert.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Solar Forecast Section */}
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <div className={styles.sectionIconWrapper}>
                      <LucideIcons.Sun size={20} />
                    </div>
                    <div>
                      <h2 className={styles.sectionTitle}>Solar Generation Forecast</h2>
                      <p className={styles.sectionDescription}>
                        Predict future solar generation based on your system configuration and weather data.
                      </p>
                    </div>
                  </div>

                  <PVForecastForm updatePredictions={setForecastPredictions} />

                  {forecastPredictions && (
                    <>
                      <PredictionChart predictions={forecastPredictions} />
                      <PredictionTable predictions={forecastPredictions} />
                    </>
                  )}
                </section>
              </>
            )}

          </div>
        )}
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, icon, trend, trendValue }) => (
  <div className={styles.metricCard}>
    <div className={styles.metricHeader}>
      <div className={styles.metricIcon}>
        {icon}
      </div>
      {trend && (
        <span className={`${styles.trendBadge} ${styles[trend]}`}>
          {trend === 'up' ? <LucideIcons.TrendingUp size={14} /> : 
           trend === 'down' ? <LucideIcons.TrendingDown size={14} /> : 
           <LucideIcons.Minus size={14} />}
          {trendValue}
        </span>
      )}
    </div>
    <div className={styles.metricContent}>
      <p className={styles.metricLabel}>{title}</p>
      <p className={styles.metricValue}>{value}</p>
    </div>
  </div>
);

export default Predictions;
