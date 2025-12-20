/**
 * Dashboard Page - PV Energy Management System
 * 
 * Main overview page showing:
 * - Real-time energy metrics
 * - Energy flow diagram
 * - 24-hour production/consumption chart
 * - Summary statistics (Today/Month/Year)
 * - CO₂ Emissions tracking
 * - Quick recommendations
 * 
 * Design: Solaira clean aesthetic with teal accents
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import EnergyFlowDiagram from '../../components/EnergyFlowDiagram';
import ElectricityUsage from '../../components/ElectricityUsage';
import SolarChatbot from '../../components/SolarChatbot';
import { useAuth } from '../../lib/hooks/useAuth';
import { useAllEnergyData } from '../../lib/hooks/useEnergyData';
import { calculateCO2Emissions, predictFutureCO2 } from '../../lib/utils/co2Calculations';
import styles from './styles.module.css';

const Dashboard = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { realtime, stats, forecast, loading, error, lastUpdated } = useAllEnergyData();
  const [predictedProduction, setPredictedProduction] = useState(null);
  
  // Help Modal States
  const [showSolarHelp, setShowSolarHelp] = useState(false);
  const [showConsumptionHelp, setShowConsumptionHelp] = useState(false);
  const [showGridHelp, setShowGridHelp] = useState(false);
  const [showBatteryHelp, setShowBatteryHelp] = useState(false);
  const [show24hHelp, setShow24hHelp] = useState(false);
  const [showFlowHelp, setShowFlowHelp] = useState(false);
  const [showCO2Help, setShowCO2Help] = useState(false);
  const [showSummaryHelp, setShowSummaryHelp] = useState(false);

  // Protect this page - redirect to signin if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('Dashboard: No auth, redirecting to signin');
      router.replace('/signin');
    }
  }, [user, authLoading, router]);

  // Fetch production prediction from trained models
  useEffect(() => {
    if (realtime && !loading) {
      // This would be replaced with actual API call to your ML models
      // For now, simulate prediction based on current production
      const simulatePrediction = async () => {
        try {
          // Simulate API call delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Simple prediction based on current production and time of day
          const hour = new Date().getHours();
          let prediction = realtime.pv_production_kw || 0;
          
          // Apply some prediction logic (would come from your trained models)
          if (hour < 12) {
            // Morning: predict increase
            prediction = prediction * 1.3;
          } else if (hour < 16) {
            // Afternoon: peak production
            prediction = prediction * 1.1;
          } else {
            // Evening: predict decrease
            prediction = prediction * 0.7;
          }
          
          setPredictedProduction(prediction);
        } catch (error) {
          console.error('Error fetching prediction:', error);
          setPredictedProduction(realtime.pv_production_kw || 0);
        }
      };
      
      simulatePrediction();
    }
  }, [realtime, loading]);

  // Calculate CO₂ emissions
  const co2Data = calculateCO2Emissions({ realtime, stats });
  
  // Predict future CO₂ based on ML model predictions
  const futureCO2 = predictFutureCO2(predictedProduction, { realtime, stats });

  // Show loading while checking auth
  if (authLoading || !user) {
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

  // Prepare energy data for chatbot with comprehensive information
  const chatbotEnergyData = {
    // Current real-time data
    solar: realtime?.pv_production_kw || 0,
    grid_import: realtime?.grid_import_kw || 0,
    home_consumption: realtime?.consumption_kw || 0,
    grid_export: realtime?.grid_export_kw || 0,
    battery_soc: realtime?.battery_soc_percent || 0,
    
    // Appliance breakdown (calculated from consumption)
    appliances: {
      electric_car: (realtime?.consumption_kw || 0) * 0.18,
      air_conditioning: (realtime?.consumption_kw || 0) * 0.15,
      washing_machine: (realtime?.consumption_kw || 0) * 0.10,
      dryer: (realtime?.consumption_kw || 0) * 0.12,
      heat_pump: (realtime?.consumption_kw || 0) * 0.18,
      boiler: (realtime?.consumption_kw || 0) * 0.12
    },
    
    // Summary statistics for context
    stats: {
      today: {
        production: stats?.today?.production || 0,
        consumption: stats?.today?.consumption || 0,
        self_consumption: stats?.today?.selfConsumption || 0,
        savings: stats?.today?.savings || 0
      },
      month: {
        production: stats?.month?.production || 0,
        consumption: stats?.month?.consumption || 0,
        self_consumption: stats?.month?.selfConsumption || 0,
        savings: stats?.month?.savings || 0
      },
      year: {
        production: stats?.year?.production || 0,
        consumption: stats?.year?.consumption || 0,
        self_consumption: stats?.year?.selfConsumption || 0,
        savings: stats?.year?.savings || 0
      }
    },
    
    // Additional context
    timestamp: lastUpdated || new Date().toISOString(),
    grid_status: realtime?.grid_export_kw > 0 ? 'exporting' : 'importing'
  };

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
                <span className={styles.metricTrend}>
                  {realtime?.pv_trend_pct >= 0 ? '↑' : '↓'} {Math.abs(realtime?.pv_trend_pct || 0).toFixed(0)}%
                </span>
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
                <span className={styles.metricTrend}>
                  {realtime?.consumption_trend_pct >= 0 ? '↑' : '↓'} {Math.abs(realtime?.consumption_trend_pct || 0).toFixed(0)}%
                </span>
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
            <button className={styles.helpButton} onClick={() => setShow24hHelp(true)}><LucideIcons.HelpCircle size={20} /></button>
          </div>
          <p className={styles.sectionDescription}>
            Hourly breakdown of energy import, export, and solar production
          </p>
          <div className={styles.chartContainer}>
            <ElectricityUsage 
              card={false}
              gridImportData={forecast?.raw?.slice(0, 24).map(f => Number(f.grid_import_kwh) || 0) || []}
              solarData={forecast?.raw?.slice(0, 24).map(f => Number(f.pv_generation_kwh) || 0) || []}
              gridExportData={forecast?.raw?.slice(0, 24).map(f => -(Number(f.grid_export_kwh) || 0)) || []}
              categories={forecast?.raw?.slice(0, 24).map(f => {
                const d = new Date(f.datetime);
                return d.getHours() + ':00';
              }) || ['0:00', '4:00', '8:00', '12:00', '16:00', '20:00']}
            />
          </div>
        </section>

        {/* Energy Flow Diagram */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Activity className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>Energy Flow</h2>
            <button className={styles.helpButton} onClick={() => setShowFlowHelp(true)}><LucideIcons.HelpCircle size={20} /></button>
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
                  electric_car: (realtime?.consumption_kw || 0) * 0.18,
                  air_conditioning: (realtime?.consumption_kw || 0) * 0.15,
                  washing_machine: (realtime?.consumption_kw || 0) * 0.10,
                  dryer: (realtime?.consumption_kw || 0) * 0.12,
                  heat_pump: (realtime?.consumption_kw || 0) * 0.18,
                  boiler: (realtime?.consumption_kw || 0) * 0.12
                }
              }}
            />
          </div>
        </section>

        {/* CO₂ Emissions Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <LucideIcons.Leaf className={styles.sectionIcon} />
            <h2 className={styles.sectionTitle}>CO₂ Emissions Impact</h2>
            <button className={styles.helpButton} onClick={() => setShowCO2Help(true)}><LucideIcons.HelpCircle size={20} /></button>
          </div>
          <p className={styles.sectionDescription}>
            Track your carbon footprint and environmental impact in real-time
          </p>
          
          <div className={styles.co2Section}>
            <div className={styles.co2Grid}>
              {/* Avoided CO₂ */}
              <div className={`${styles.co2Card} ${styles.avoided}`}>
                <div className={styles.co2CardHeader}>
                  <LucideIcons.TreePine className={styles.co2Icon} />
                  <h3 className={styles.co2Title}>CO₂ Avoided</h3>
                </div>
                <p className={styles.co2Subtitle}>From solar production today</p>
                <div className={styles.co2Value}>
                  {co2Data.daily.co2Avoided}
                  <span className={styles.co2Unit}>kg</span>
                </div>
                <div className={styles.co2Details}>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Equivalent to planting</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.daily.equivalents.trees} trees
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Car kilometers offset</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.daily.equivalents.carKm} km
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Smartphones charged</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.daily.equivalents.smartphones}
                    </span>
                  </div>
                </div>
                <div className={styles.co2Progress}>
                  <div 
                    className={`${styles.co2ProgressFill} ${styles.green}`}
                    style={{ 
                      width: `${Math.min(100, (parseFloat(co2Data.daily.co2Avoided) / 20) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* CO₂ Produced */}
              <div className={`${styles.co2Card} ${styles.produced}`}>
                <div className={styles.co2CardHeader}>
                  <LucideIcons.Factory className={styles.co2Icon} />
                  <h3 className={styles.co2Title}>CO₂ Produced</h3>
                </div>
                <p className={styles.co2Subtitle}>From grid consumption today</p>
                <div className={styles.co2Value}>
                  {co2Data.daily.co2Produced}
                  <span className={styles.co2Unit}>kg</span>
                </div>
                <div className={styles.co2Details}>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>From grid import</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.realtime.gridImportCO2} kg/h
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Current rate</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.realtime.consumptionCO2} kg/h
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Status</span>
                    <span className={styles.co2DetailValue} style={{ 
                      color: co2Data.status.daily === 'good' ? '#00A86B' : 
                             co2Data.status.daily === 'moderate' ? '#FF9800' : '#F44336'
                    }}>
                      {co2Data.status.daily.charAt(0).toUpperCase() + co2Data.status.daily.slice(1)}
                    </span>
                  </div>
                </div>
                <div className={styles.co2Progress}>
                  <div 
                    className={`${styles.co2ProgressFill} ${
                      co2Data.status.daily === 'good' ? styles.green : 
                      co2Data.status.daily === 'moderate' ? styles.yellow : styles.red
                    }`}
                    style={{ 
                      width: `${Math.min(100, (parseFloat(co2Data.daily.co2Produced) / 10) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Net CO₂ */}
              <div className={`${styles.co2Card} ${styles.net}`}>
                <div className={styles.co2CardHeader}>
                  <LucideIcons.Scale className={styles.co2Icon} />
                  <h3 className={styles.co2Title}>Net CO₂ Balance</h3>
                </div>
                <p className={styles.co2Subtitle}>Today's net emissions</p>
                <div className={styles.co2Value}>
                  {Math.abs(parseFloat(co2Data.daily.netCO2))}
                  <span className={styles.co2Unit}>kg</span>
                  <span style={{ 
                    color: parseFloat(co2Data.daily.netCO2) < 0 ? '#F44336' : '#00A86B',
                    fontSize: '14px',
                    marginLeft: '8px',
                    fontWeight: 600
                  }}>
                    {parseFloat(co2Data.daily.netCO2) >= 0 ? '↑' : '↓'}
                  </span>
                </div>
                <div className={styles.co2Comparison}>
                  <span className={`${styles.co2Trend} ${
                    co2Data.trends.yesterday.trend < 0 ? styles.positive : styles.negative
                  }`}>
                    {co2Data.trends.yesterday.trend > 0 ? '+' : ''}{co2Data.trends.yesterday.trend}%
                  </span>
                  <span className={styles.co2DetailLabel}>
                    vs yesterday ({co2Data.trends.yesterday.netCO2} kg)
                  </span>
                </div>
                <div className={styles.co2Details}>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>This month</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.monthly.netCO2} kg
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>This year</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.yearly.netCO2} kg
                    </span>
                  </div>
                  <div className={styles.co2DetailItem}>
                    <span className={styles.co2DetailLabel}>Self-sufficiency</span>
                    <span className={styles.co2DetailValue}>
                      {co2Data.daily.selfSufficiency}%
                    </span>
                  </div>
                </div>
                <div className={styles.co2Progress}>
                  <div 
                    className={`${styles.co2ProgressFill} ${styles.blue}`}
                    style={{ 
                      width: `${Math.min(100, Math.max(0, 50 + (parseFloat(co2Data.daily.netCO2) / 20) * 50))}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Statistics */}
        <section className={styles.summarySection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Energy Summary</h2>
            <button className={styles.helpButton} onClick={() => setShowSummaryHelp(true)}><LucideIcons.HelpCircle size={20} /></button>
          </div>
          <div className={styles.summaryGrid}>
            {/* Today */}
            <div className={styles.summaryCard}>
              <div className={styles.summaryPeriod}>Today</div>
              <div className={styles.summaryStats}>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Production</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.production?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.consumption?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.today?.selfConsumption || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.today?.savings?.toFixed(2) || '0.00'}
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
                    {stats?.month?.production?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.month?.consumption?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.month?.selfConsumption || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.month?.savings?.toFixed(2) || '0.00'}
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
                    {stats?.year?.production?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.year?.consumption?.toFixed(1) || '0.0'} kWh
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Self-Consumption</span>
                  <span className={styles.summaryStatValue}>
                    {stats?.year?.selfConsumption || '0'}%
                  </span>
                </div>
                <div className={styles.summaryStatItem}>
                  <span className={styles.summaryStatLabel}>Savings</span>
                  <span className={styles.summaryStatValue}>
                    €{stats?.year?.savings?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      
      {/* Solar AI Chatbot - Now with comprehensive energy data */}
      <SolarChatbot 
        energyData={chatbotEnergyData}
        userId={user?.id || user?.email || 'guest_user'}
      />

      {/* Help Modals */}
      <HelpModal show={showSolarHelp} onClose={() => setShowSolarHelp(false)} title="Solar Production">
        <p className={styles.modalText}>Real-time power being generated by your solar panels.</p>
        <ul className={styles.modalList}>
          <li><strong>kW:</strong> Kilowatts of power currently being produced.</li>
          <li><strong>Trend:</strong> Percentage change compared to the same time yesterday.</li>
        </ul>
      </HelpModal>

      <HelpModal show={showConsumptionHelp} onClose={() => setShowConsumptionHelp(false)} title="Consumption">
        <p className={styles.modalText}>Total power currently being used by your home.</p>
        <ul className={styles.modalList}>
          <li>Includes all appliances, lights, and devices.</li>
          <li>High consumption reduces the amount of solar energy available for export or battery charging.</li>
        </ul>
      </HelpModal>

      <HelpModal show={showGridHelp} onClose={() => setShowGridHelp(false)} title="Grid Flow">
        <p className={styles.modalText}>Power exchange with the utility grid.</p>
        <ul className={styles.modalList}>
          <li><strong>Exporting (+):</strong> Sending excess solar energy to the grid (earning credits).</li>
          <li><strong>Importing (-):</strong> Drawing power from the grid because solar/battery isn't enough.</li>
        </ul>
      </HelpModal>

      <HelpModal show={showBatteryHelp} onClose={() => setShowBatteryHelp(false)} title="Battery Status">
        <p className={styles.modalText}>Current charge level of your home battery.</p>
        <ul className={styles.modalList}>
          <li><strong>%:</strong> State of Charge (SoC).</li>
          <li>Batteries charge when solar production exceeds consumption.</li>
          <li>Batteries discharge to power your home when solar is low (e.g., at night).</li>
        </ul>
      </HelpModal>

      <HelpModal show={show24hHelp} onClose={() => setShow24hHelp(false)} title="24-Hour Overview">
        <p className={styles.modalText}>A forecast of your energy balance for the next 24 hours.</p>
        <ul className={styles.modalList}>
          <li><strong>Solar (Yellow):</strong> Predicted generation.</li>
          <li><strong>Consumption (Blue):</strong> Predicted usage.</li>
          <li><strong>Grid (Grey):</strong> Expected import/export.</li>
        </ul>
      </HelpModal>

      <HelpModal show={showFlowHelp} onClose={() => setShowFlowHelp(false)} title="Energy Flow">
        <p className={styles.modalText}>Visualizes where your energy is coming from and where it's going.</p>
        <p className={styles.modalText}>The "Other" category represents consumption not accounted for by major appliances (lights, small electronics, phantom load).</p>
      </HelpModal>

      <HelpModal show={showCO2Help} onClose={() => setShowCO2Help(false)} title="CO₂ Emissions">
        <p className={styles.modalText}>Your environmental impact.</p>
        <ul className={styles.modalList}>
          <li><strong>Avoided:</strong> Emissions saved by using solar instead of grid power.</li>
          <li><strong>Produced:</strong> Emissions from grid power you imported.</li>
          <li><strong>Net Balance:</strong> The overall impact (negative is good!).</li>
        </ul>
      </HelpModal>

      <HelpModal show={showSummaryHelp} onClose={() => setShowSummaryHelp(false)} title="Energy Summary">
        <p className={styles.modalText}>Aggregated statistics for different time periods.</p>
        <ul className={styles.modalList}>
          <li><strong>Self-Consumption:</strong> Percentage of solar energy used directly by your home.</li>
          <li><strong>Savings:</strong> Estimated money saved on electricity bills.</li>
        </ul>
      </HelpModal>

    </Layout>
  );
};

const HelpModal = ({ show, onClose, title, children }) => {
  if (!show) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose}>
          <LucideIcons.X size={24} />
        </button>
        <h3 className={styles.modalTitle}>{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default Dashboard;