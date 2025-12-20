/**
 * Predictions Page - PV Energy Management System
 * 
 * Future forecasts and recommendations:
 * - 7-day production/load forecast
 * - Smart recommendations panel
 * - Weather integration
 * - Optimal usage windows
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PowerSourcesChart from '../../components/PowerSourcesChart';
import EnergySimulationChart from '../../components/EnergySimulationChart';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useEnergySimulation } from '../../lib/hooks/useEnergySimulation';
import { useDailyPrediction } from '../../lib/hooks/useDailyPrediction';
import pythonApi from '../../lib/services/pythonApi';
import { useMaintenanceAlerts } from '../../lib/hooks/useEnergyData';
import { useCSVData } from '../../lib/hooks/useCSVData';
import { PVForecastForm, PredictionChart, PredictionTable } from '../../components/solar-forecast';
import styles from './styles.module.css';

const Predictions = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();

  const { alerts: staticAlerts, systemHealth, loading: staticLoading } = useMaintenanceAlerts();
  
  // Get CSV data for trend calculations
  const { historical, loading: csvLoading } = useCSVData();
  
  // Time period state (in hours)
  const [timePeriod, setTimePeriod] = useState(720); // Default: 30 days

  // Maintenance cards state (moved from old Maintenance page)
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [maintLoading, setMaintLoading] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const [forecastPredictions, setForecastPredictions] = useState(null);
  const [showForecastInfo, setShowForecastInfo] = useState(false);
  const [show24hInfo, setShow24hInfo] = useState(false);
  const [showSimInfo, setShowSimInfo] = useState(false);
  const [showPerfInfo, setShowPerfInfo] = useState(false);
  
  // Calculate trends from historical CSV data
  const trends = useMemo(() => {
    if (!historical || historical.length < 14) {
      return {
        pvTrend: { value: '+0%', direction: 'neutral' },
        consumptionTrend: { value: '0%', direction: 'neutral' },
        gridImportTrend: { value: '0%', direction: 'neutral' },
        gridExportTrend: { value: '0%', direction: 'neutral' }
      };
    }
    
    // Compare last 7 days vs previous 7 days
    const last7 = historical.slice(-7);
    const prev7 = historical.slice(-14, -7);
    
    const calcTrend = (field) => {
      const lastSum = last7.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
      const prevSum = prev7.reduce((sum, d) => sum + (Number(d[field]) || 0), 0);
      
      if (prevSum === 0) return { value: '+0%', direction: 'neutral' };
      
      const change = ((lastSum - prevSum) / prevSum) * 100;
      const direction = change > 2 ? 'up' : change < -2 ? 'down' : 'neutral';
      const prefix = change >= 0 ? '+' : '';
      
      return {
        value: `${prefix}${Math.round(change)}%`,
        direction
      };
    };
    
    return {
      pvTrend: calcTrend('actual_pv_kwh'),
      consumptionTrend: calcTrend('consumption_kwh'),
      gridImportTrend: calcTrend('grid_import_kwh'),
      gridExportTrend: calcTrend('grid_export_kwh')
    };
  }, [historical]);
  
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
                trend={trends.pvTrend.direction}
                trendValue={trends.pvTrend.value}
              />
              <SummaryCard 
                title="Total Consumption" 
                value={`${simulationResults.summary.total_consumption.toFixed(2)} kWh`}
                icon={<LucideIcons.Zap size={24} />}
                trend={trends.consumptionTrend.direction}
                trendValue={trends.consumptionTrend.value}
              />
              <SummaryCard 
                title="Grid Import" 
                value={`${simulationResults.summary.grid_import.toFixed(2)} kWh`}
                icon={<LucideIcons.ArrowDownFromLine size={24} />}
                trend={trends.gridImportTrend.direction}
                trendValue={trends.gridImportTrend.value}
              />
              <SummaryCard 
                title="Grid Export" 
                value={`${simulationResults.summary.grid_export.toFixed(2)} kWh`}
                icon={<LucideIcons.ArrowUpFromLine size={24} />}
                trend={trends.gridExportTrend.direction}
                trendValue={trends.gridExportTrend.value}
              />
            </div>

            {/* Chart Section */}
            <section className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIconWrapper}>
                  <LucideIcons.Activity size={20} />
                </div>
                <div className={styles.sectionHeaderContent}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>24-Hour Energy Forecast</h2>
                    <button 
                      className={styles.infoButton}
                      onClick={() => setShow24hInfo(true)}
                      aria-label="How does this forecast work?"
                    >
                      <LucideIcons.HelpCircle size={24} />
                    </button>
                  </div>
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
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <h2 className={styles.sectionTitle}>Comprehensive Energy Simulation</h2>
                    <button 
                      className={styles.infoButton}
                      onClick={() => setShowSimInfo(true)}
                      aria-label="How does this simulation work?"
                    >
                      <LucideIcons.HelpCircle size={24} />
                    </button>
                  </div>
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
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h2 className={styles.sectionTitle}>Performance Ratio & Production (30 Days)</h2>
                        <button 
                          className={styles.infoButton}
                          onClick={() => setShowPerfInfo(true)}
                          aria-label="How is performance calculated?"
                        >
                          <LucideIcons.HelpCircle size={24} />
                        </button>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <h2 className={styles.sectionTitle}>Solar Generation Forecast</h2>
                        <button 
                          className={styles.infoButton}
                          onClick={() => setShowForecastInfo(true)}
                          aria-label="How does this forecast work?"
                        >
                          <LucideIcons.HelpCircle size={24} />
                        </button>
                      </div>
                      <p className={styles.sectionDescription}>
                        Predict future solar generation based on your system configuration and weather data.
                      </p>
                    </div>
                  </div>

                  <PVForecastForm 
                    updatePredictions={setForecastPredictions} 
                    user={user}
                  />

                  {forecastPredictions && (
                    <>
                      <PredictionChart predictions={forecastPredictions} />
                      <div className={styles.forecastResults}>
                        <PredictionTable predictions={forecastPredictions} />
                      </div>
                    </>
                  )}
                </section>
              </>
            )}

          </div>
        )}
      </div>

      {/* Forecast Info Modal */}
      {showForecastInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowForecastInfo(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => setShowForecastInfo(false)}
            >
              <LucideIcons.X size={24} />
            </button>
            
            <h3 className={styles.modalTitle}>Solar Generation Forecast</h3>
            
            <p className={styles.modalText}>
              Powered by <strong>Quartz Solar Forecast</strong>, an advanced AI that predicts your solar energy production for the next 48 hours.
            </p>
            
            <h4 className={styles.modalSubtitle}>Why use this forecast?</h4>
            <ul className={styles.modalList}>
              <li><strong>Plan Ahead:</strong> Know the best times to run high-energy appliances.</li>
              <li><strong>Optimize Storage:</strong> Manage your battery charging efficiently.</li>
              <li><strong>Save Money:</strong> Maximize your self-consumption and reduce grid reliance.</li>
            </ul>

            <h4 className={styles.modalSubtitle}>How it works</h4>
            <p className={styles.modalText}>
              The model combines real-time satellite imagery, professional weather data, and machine learning trained on over 25,000 solar installations. This delivers predictions accurate within ~6.5% during daylight hours.
            </p>

            <p className={styles.modalText}>
              This state-of-the-art open-source technology helps us provide you with reliable energy insights.
            </p>
          </div>
        </div>
      )}

      {/* 24-Hour Forecast Info Modal */}
      {show24hInfo && (
        <div className={styles.modalOverlay} onClick={() => setShow24hInfo(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => setShow24hInfo(false)}
            >
              <LucideIcons.X size={24} />
            </button>
            
            <h3 className={styles.modalTitle}>24-Hour Energy Forecast</h3>
            
            <p className={styles.modalText}>
              This chart visualizes your home's predicted energy balance for the upcoming 24 hours, helping you make smarter energy decisions.
            </p>
            
            <h4 className={styles.modalSubtitle}>Understanding the Chart</h4>
            <ul className={styles.modalList}>
              <li><strong>Predicted Generation (Yellow):</strong> The amount of energy your solar panels are expected to produce.</li>
              <li><strong>Predicted Consumption (Blue):</strong> Your estimated household energy usage based on historical patterns.</li>
            </ul>

            <h4 className={styles.modalSubtitle}>How to use this information</h4>
            <ul className={styles.modalList}>
              <li><strong>Optimize Usage:</strong> Schedule high-energy appliances (like washing machines or EV chargers) when the yellow line (generation) is highest.</li>
              <li><strong>Manage Storage:</strong> If generation exceeds consumption, your battery will charge. If consumption is higher, you'll draw from the battery or grid.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Simulation Info Modal */}
      {showSimInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowSimInfo(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => setShowSimInfo(false)}
            >
              <LucideIcons.X size={24} />
            </button>
            
            <h3 className={styles.modalTitle}>Comprehensive Energy Simulation</h3>
            
            <p className={styles.modalText}>
              This simulation provides a holistic view of your home's energy ecosystem, combining multiple power sources and storage.
            </p>
            
            <h4 className={styles.modalSubtitle}>What's included?</h4>
            <ul className={styles.modalList}>
              <li><strong>Solar (PV) Generation:</strong> Energy produced by your solar panels.</li>
              <li><strong>Wind Energy:</strong> Estimated contribution from wind turbines (if applicable).</li>
              <li><strong>Consumption:</strong> Your household's energy usage patterns.</li>
              <li><strong>Battery State of Charge (SoC):</strong> Real-time tracking of your battery's charge level.</li>
            </ul>

            <h4 className={styles.modalSubtitle}>How to use this chart</h4>
            <p className={styles.modalText}>
              Use the time period selectors (1 Day, 1 Week, 1 Month) to switch between short-term detail and long-term trends. This helps you understand how your energy balance shifts over time and how well your battery is performing.
            </p>
          </div>
        </div>
      )}

      {/* Performance Info Modal */}
      {showPerfInfo && (
        <div className={styles.modalOverlay} onClick={() => setShowPerfInfo(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button 
              className={styles.modalClose}
              onClick={() => setShowPerfInfo(false)}
            >
              <LucideIcons.X size={24} />
            </button>
            
            <h3 className={styles.modalTitle}>Performance Ratio (PR) Analysis</h3>
            
            <p className={styles.modalText}>
              This chart helps you understand how well your solar system is performing compared to its theoretical potential.
            </p>
            
            <h4 className={styles.modalSubtitle}>Key Metrics</h4>
            <ul className={styles.modalList}>
              <li><strong>Actual Production (Blue Bar):</strong> The real energy generated by your panels.</li>
              <li><strong>Predicted (Dashed Line):</strong> The ideal generation expected based on your system size and local weather data.</li>
              <li><strong>Performance Ratio (Orange Line):</strong> The efficiency of your system, calculated as <em>(Actual / Predicted) × 100</em>.</li>
            </ul>

            <h4 className={styles.modalSubtitle}>What does the PR mean?</h4>
            <ul className={styles.modalList}>
              <li><strong>80% - 90%:</strong> Excellent performance. Your system is working efficiently.</li>
              <li><strong>60% - 80%:</strong> Good, but potential for minor improvements (e.g., cleaning panels).</li>
              <li><strong>Below 60%:</strong> Indicates a potential issue such as shading, dirt, or equipment fault.</li>
            </ul>
          </div>
        </div>
      )}
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
