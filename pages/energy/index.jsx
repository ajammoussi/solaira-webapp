/**
 * Energy Page - PV Energy Management System
 * 
 * Detailed energy analysis including:
 * - Solar production panel
 * - Consumption analysis
 * - Energy distribution (Sankey diagrams)
 * - Grid interaction stats
 */

import React from 'react';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import styles from './styles.module.css';

const Energy = () => {
  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Energy Analysis</h1>
          <p className={styles.pageSubtitle}>
            Detailed breakdown of production, consumption, and distribution
          </p>
        </div>

        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}><LucideIcons.Zap size={64} strokeWidth={1.5} /></div>
          <h2 className={styles.placeholderTitle}>Energy Analysis Coming Soon</h2>
          <p className={styles.placeholderText}>
            Tasks 8-9: Production Panel & Consumption Panel will be implemented here
          </p>
          <ul className={styles.featureList}>
            <li>Solar production charts with time-range selector</li>
            <li>Consumption patterns and heatmaps</li>
            <li>Energy distribution Sankey diagrams</li>
            <li>Grid import/export statistics</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Energy;
