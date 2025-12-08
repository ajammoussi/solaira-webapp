/**
 * Dashboard Page - PV Energy Management System
 * 
 * Main overview page showing:
 * - Real-time energy metrics
 * - Energy flow diagram
 * - 24-hour production/consumption chart
 * - Summary statistics (Today/Month/Year)
 * - Quick recommendations
 * 
 * Design: Solaira clean aesthetic with teal accents
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import EnergyFlowDiagram from '../../components/EnergyFlowDiagram';
import ElectricityUsage from '../../components/ElectricityUsage';
import SolarChatbot from '../../components/SolarChatbot';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAllEnergyData } from '../../lib/hooks/useEnergyData';
import styles from './styles.module.css';

const Dashboard = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { realtime, stats, loading, error, lastUpdated } = useAllEnergyData();

  // Protect this page - redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      console.log('Dashboard: No auth, redirecting to signin');
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

  // Show loading while checking auth
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

  if (loading) {
    return (
      <Layout>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading energy data...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>⚠️ Error loading data: {error}</p>
          <button className={styles.retryButton}>Retry</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboard}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>
              Real-time energy monitoring • Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'N/A'}
            </p>
          </div>
        </div>

        {/* Real-time Metrics Cards */}
        <section className={styles.metricsSection}>
          <div className={styles.metricsGrid}>
            {/* PV Production */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}><LucideIcons.Sun size={24} strokeWidth={2} /></span>
                <span className={styles.metricLabel}>Solar Production</span>
              </div>
              <div className={styles.metricValue}>
                {realtime?.pv_production_kw?.toFixed(2) || '0.00'}
                <span className={styles.metricUnit}>kW</span>
              </div>
              <div className={styles.metricFooter}>
                <span className={styles.metricTrend}>↑ 12%</span>
                <span className={styles.metricCompare}>vs yesterday</span>
              </div>
            </div>

            {/* Consumption */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}><LucideIcons.Zap size={24} strokeWidth={2} /></span>
                <span className={styles.metricLabel}>Consumption</span>
              </div>
              <div className={styles.metricValue}>
                {realtime?.consumption_kw?.toFixed(2) || '0.00'}
                <span className={styles.metricUnit}>kW</span>
              </div>
              <div className={styles.metricFooter}>
                <span className={styles.metricTrend}>↓ 5%</span>
                <span className={styles.metricCompare}>vs yesterday</span>
              </div>
            </div>

            {/* Grid Flow */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}><LucideIcons.Plug size={24} strokeWidth={2} /></span>
                <span className={styles.metricLabel}>Grid Flow</span>
              </div>
              <div className={styles.metricValue}>
                {realtime?.grid_export_kw > 0 
                  ? `+${realtime.grid_export_kw.toFixed(2)}` 
                  : `-${realtime?.grid_import_kw?.toFixed(2) || '0.00'}`}
                <span className={styles.metricUnit}>kW</span>
              </div>
              <div className={styles.metricFooter}>
                <span className={styles.metricStatus}>
                  {realtime?.grid_export_kw > 0 ? 'Exporting' : 'Importing'}
                </span>
              </div>
            </div>

            {/* Battery SOC */}
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}><LucideIcons.Battery size={24} strokeWidth={2} /></span>
                <span className={styles.metricLabel}>Battery</span>
              </div>
              <div className={styles.metricValue}>
                {realtime?.battery_soc_percent?.toFixed(0) || '0'}
                <span className={styles.metricUnit}>%</span>
              </div>
              <div className={styles.metricFooter}>
                <div className={styles.batteryIndicator}>
                  <div 
                    className={styles.batteryFill} 
                    style={{ width: `${realtime?.battery_soc_percent || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 24h Chart */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.BarChart className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>24-Hour Overview</h2>
          </div>
          <p className={styles.sectionDescription}>
            Hourly breakdown of energy import, export, and solar production
          </p>
          <div className={styles.chartContainer}>
            <ElectricityUsage card={false} />
          </div>
        </section>

        {/* Energy Flow Diagram */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Activity className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Energy Flow</h2>
          </div>
          <p className={styles.sectionDescription}>
            Real-time visualization of energy distribution across your home
          </p>
          <div className={styles.flowContainer}>
            <EnergyFlowDiagram 
              card={false}
              data={{
                solar: realtime?.pv_production_kw || 0,
                grid_import: realtime?.grid_import_kw || 0,
                home_consumption: realtime?.consumption_kw || 0,
                grid_export: realtime?.grid_export_kw || 0,
                appliances: {
                  electric_car: (realtime?.consumption_kw || 0) * 0.21,
                  air_conditioning: (realtime?.consumption_kw || 0) * 0.17,
                  washing_machine: (realtime?.consumption_kw || 0) * 0.13,
                  dryer: (realtime?.consumption_kw || 0) * 0.17,
                  heat_pump: (realtime?.consumption_kw || 0) * 0.21,
                  boiler: (realtime?.consumption_kw || 0) * 0.11
                }
              }}
            />
          </div>
        </section>

        {/* Summary Statistics */}
        <section className={styles.summarySection}>
          <h2 className={styles.sectionTitle}>Energy Summary</h2>
          <div className={styles.summaryGrid}>
            {/* Today */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryPeriod}>Today</div>
              <div className={styles.summaryStats}>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Production</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.total_production_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.total_consumption_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.self_consumption_percent?.toFixed(0) || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.today?.cost_savings_eur?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* This Month */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryPeriod}>This Month</div>
              <div className={styles.summaryStats}>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Production</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.month?.total_production_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.month?.total_consumption_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.month?.self_consumption_percent?.toFixed(0) || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.month?.cost_savings_eur?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* This Year */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryPeriod}>This Year</div>
              <div className={styles.summaryStats}>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Production</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.year?.total_production_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.year?.total_consumption_kwh?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.year?.self_consumption_percent?.toFixed(0) || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.year?.cost_savings_eur?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <SolarChatbot energyData={null} />
    </Layout>
  );
};

export default Dashboard;