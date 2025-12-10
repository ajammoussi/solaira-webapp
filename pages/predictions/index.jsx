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
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRecommendations } from '../../lib/hooks/useEnergyData';
import pythonApi from '../../lib/services/pythonApi';
import styles from './styles.module.css';

const Predictions = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { data: recommendations, loading } = useRecommendations();
  
  const [simulationResults, setSimulationResults] = useState(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState(null);

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

  // Run simulation on load
  useEffect(() => {
    const runSim = async () => {
      if ((!user && !isGuest) || simulationResults) return;
      
      setSimLoading(true);
      try {
        // Use current date for simulation
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        
        // Pass null for weather and consumption to trigger backend historical lookup
        const results = await pythonApi.runSimulation(null, 50.0, null, dateStr);
        
        // Transform backend data to match UI expectations
        const transformedResults = {
            summary: {
                total_pv_generation: results.summary.total_production,
                total_consumption: results.summary.total_consumption,
                grid_import: results.summary.total_deficit,
                grid_export: results.summary.total_wasted
            },
            hourly_details: results.hourly_results.map((h) => ({
                hour: h.hour,
                // Use backend hour for X-axis labels (e.g., "14:00")
                displayTime: `${h.hour.toString().padStart(2, '0')}:00`,
                // Round values to 3 decimal places for Y-axis
                pv_generation: Number(h.production_kwh.toFixed(3)),
                consumption: Number(h.consumption_kwh.toFixed(3)),
                battery_soc: Number(h.battery_soc.toFixed(3)),
                grid_import: Number(h.grid_import_kwh.toFixed(3)),
                wasted: Number(h.wasted_kwh.toFixed(3))
            })),
            advice: results.advice.map(a => a.message)
        };

        setSimulationResults(transformedResults);
      } catch (err) {
        console.error("Simulation failed:", err);
        setSimError("Failed to load simulation data. Is the backend running?");
      } finally {
        setSimLoading(false);
      }
    };
    
    runSim();
  }, [user, isGuest]);

  if (authLoading || (!user && !isGuest)) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Predictions & Recommendations</h1>
          <p className={styles.pageSubtitle}>
            Smart insights and future forecasts for optimal energy usage
          </p>
        </div>

        {/* Error State */}
        {simError && (
          <div className={styles.errorContainer}>
            <LucideIcons.AlertCircle size={20} />
            <span>{simError}</span>
          </div>
        )}

        {/* Loading State */}
        {simLoading && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>Running AI Simulation...</p>
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
