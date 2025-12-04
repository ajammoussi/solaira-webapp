/**
 * Predictions Page - PV Energy Management System
 * 
 * Future forecasts and recommendations:
 * - 7-day production/load forecast
 * - Smart recommendations panel
 * - Weather integration
 * - Optimal usage windows
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useRecommendations } from '../../lib/hooks/useEnergyData';
import styles from '../energy/styles.module.css';

const Predictions = () => {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const { data: recommendations, loading } = useRecommendations();

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
          <h1 className={styles.pageTitle}>Predictions & Recommendations</h1>
          <p className={styles.pageSubtitle}>
            Smart insights and future forecasts for optimal energy usage
          </p>
        </div>

        {/* Quick Recommendations Preview */}
        {!loading && recommendations && recommendations.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
              Active Recommendations ({recommendations.length})
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {recommendations.slice(0, 3).map((rec) => (
                <div 
                  key={rec.id}
                  style={{
                    backgroundColor: '#FFF',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    borderLeft: `4px solid ${
                      rec.severity === 'warning' ? '#FF9800' :
                      rec.severity === 'success' ? '#00A86B' :
                      '#00D9A3'
                    }`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#333', marginBottom: '4px' }}>
                        {rec.title}
                      </div>
                      <div style={{ fontSize: '13px', color: '#6B7280' }}>
                        {rec.description}
                      </div>
                    </div>
                    {rec.estimated_savings && (
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 700, 
                        color: '#00A86B',
                        marginLeft: '16px',
                        whiteSpace: 'nowrap',
                      }}>
                        {rec.estimated_savings}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}><LucideIcons.TrendingUp size={64} strokeWidth={1.5} /></div>
          <h2 className={styles.placeholderTitle}>Forecast Charts Coming Soon</h2>
          <p className={styles.placeholderText}>
            Tasks 10-11: Forecast Charts & Full Recommendations Panel
          </p>
          <ul className={styles.featureList}>
            <li>7-day production forecast with confidence intervals</li>
            <li>Load forecast and weather integration</li>
            <li>Detailed recommendations with actions</li>
            <li>Peak pricing alerts and optimization tips</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Predictions;
