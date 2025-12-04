/**
 * Energy Page - PV Energy Management System
 * 
 * Detailed energy analysis including:
 * - Solar production panel
 * - Consumption analysis
 * - Energy distribution (Sankey diagrams)
 * - Grid interaction stats
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import styles from './styles.module.css';

const Energy = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user && !isGuest) {
      router.replace('/signin');
    }
  }, [user, isGuest, authLoading, router]);

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
