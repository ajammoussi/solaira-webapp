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
import PowerSourcesChart from '../../components/PowerSourcesChart';
import EnergySimulationChart from '../../components/EnergySimulationChart';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRecommendations } from '../../lib/hooks/useEnergyData';
import { useEnergySimulation } from '../../lib/hooks/useEnergySimulation';
import { useDailyPrediction } from '../../lib/hooks/useDailyPrediction';
import pythonApi from '../../lib/services/pythonApi';
import styles from './styles.module.css';

const Predictions = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { data: recommendations, loading } = useRecommendations();
  
  // Time period state (in hours)
  const [timePeriod, setTimePeriod] = useState(720); // Default: 30 days
  
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
    autoFetch: !!(user || isGuest)
  });

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

  if (authLoading || (!user && !isGuest)) {
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
