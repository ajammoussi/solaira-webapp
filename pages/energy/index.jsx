/**
 * Energy Page - PV Energy Management System
 * 
 * Detailed energy analysis including:
 * - Solar production panel
 * - Consumption analysis
 * - Energy distribution (Sankey diagrams)
 * - Grid interaction stats
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import styles from './styles.module.css';
import EnergyDistributionCard from '../../components/EnergyDistributionCard';
import BarChart from '../../components/BarChart';
import PowerSourcesChart from '../../components/PowerSourcesChart';

const Energy = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('day');

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

  if (authLoading || (!user && !isGuest)) {
    return (
      <Layout>
        <div className={styles.pageContainer}>
          <div className={styles.loading}>Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className={styles.pageContainer}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Energy Analysis</h1>
          <p className={styles.pageSubtitle}>
            Detailed breakdown of production, consumption, and distribution
          </p>
        </div>

        {/* Solar Production Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Sun className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Solar Production</h2>
          </div>
          <p className={styles.sectionDescription}>
            Monitor your solar panel output with interactive charts
          </p>
          
          <BarChart 
            color="#4FC3F7"
            unit="kW"
            yAxisTitle="Power (kW)"
            card={false}
          />
        </section>

        {/* Power Sources Chart Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Activity className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Power Sources</h2>
          </div>
          <p className={styles.sectionDescription}>
            Breakdown of power sources over the last 24 hours
          </p>
          <PowerSourcesChart card={false} />
        </section>

        {/* Consumption Patterns Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Home className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Consumption Patterns</h2>
          </div>
          <p className={styles.sectionDescription}>
            Analyze your energy usage with heatmaps and patterns
          </p>
          
          <div className={styles.grid}>
            {/* Heatmap */}
            <div className={styles.heatmapContainer}>
              <div className={styles.heatmapHeader}>
                <h3>Daily Consumption Heatmap</h3>
                <span className={styles.legend}>kWh</span>
              </div>
              <div className={styles.heatmap}>
                {Array.from({ length: 7 * 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={styles.heatmapCell}
                    style={{ 
                      backgroundColor: `rgba(59, 130, 246, ${Math.random() * 0.7 + 0.3})`
                    }}
                    title={`Hour ${i % 24 + 1} - ${Math.random().toFixed(2)} kWh`}
                  />
                ))}
              </div>
              <div className={styles.heatmapLabels}>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
                <div>Sun</div>
              </div>
            </div>

            {/* Consumption Stats */}
            <div className={styles.statsContainer}>
              <h3>Consumption Overview</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <LucideIcons.Zap className={styles.statIcon} />
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>24.3 kWh</div>
                    <div className={styles.statLabel}>Daily Average</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <LucideIcons.Clock className={styles.statIcon} />
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>14:00-18:00</div>
                    <div className={styles.statLabel}>Peak Hours</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <LucideIcons.Thermometer className={styles.statIcon} />
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>65%</div>
                    <div className={styles.statLabel}>HVAC Usage</div>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <LucideIcons.Battery className={styles.statIcon} />
                  <div className={styles.statContent}>
                    <div className={styles.statValue}>3.2 kW</div>
                    <div className={styles.statLabel}>Base Load</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Energy Distribution Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Share2 className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Energy Distribution</h2>
          </div>
          <p className={styles.sectionDescription}>
            Visualize how energy flows through your system with Sankey diagrams
          </p>
          <EnergyDistributionCard
            title="Energy Usage" 
            darkMode={false}
            locale="en-US"
          />
        </section>

        {/* Grid Interaction Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Grid3x3 className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Grid Interaction</h2>
          </div>
          <p className={styles.sectionDescription}>
            Monitor your grid import and export statistics
          </p>
          
          <div className={styles.gridContainer}>
            {/* Import/Export Cards */}
            <div className={styles.gridStats}>
              <div className={`${styles.gridCard} ${styles.exportCard}`}>
                <LucideIcons.Upload className={styles.gridIcon} />
                <div className={styles.gridCardContent}>
                  <div className={styles.gridCardValue}>1.5 kWh</div>
                  <div className={styles.gridCardLabel}>Exported Today</div>
                  <div className={styles.gridCardSub}>≈ $0.18 earned</div>
                </div>
              </div>
              
              <div className={`${styles.gridCard} ${styles.importCard}`}>
                <LucideIcons.Download className={styles.gridIcon} />
                <div className={styles.gridCardContent}>
                  <div className={styles.gridCardValue}>0.8 kWh</div>
                  <div className={styles.gridCardLabel}>Imported Today</div>
                  <div className={styles.gridCardSub}>≈ $0.10 cost</div>
                </div>
              </div>
            </div>
            {/* Grid Balance */}
            <div className={styles.balanceContainer}>
              <h3>Grid Balance</h3>
              <div className={styles.balanceMeter}>
                <div className={styles.balanceScale}>
                  <div className={styles.balanceIndicator} style={{ left: '65%' }}>
                    <div className={styles.indicatorLabel}>Net Export: 0.7 kWh</div>
                  </div>
                </div>
                <div className={styles.balanceLabels}>
                  <span>Import</span>
                  <span>Export</span>
                </div>
              </div>
              
              <div className={styles.netStats}>
                <div className={styles.netStat}>
                  <span className={styles.netLabel}>Net Energy:</span>
                  <span className={styles.netValuePositive}>+0.7 kWh</span>
                </div>
                <div className={styles.netStat}>
                  <span className={styles.netLabel}>Net Savings:</span>
                  <span className={styles.netValuePositive}>+$0.08</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default Energy;