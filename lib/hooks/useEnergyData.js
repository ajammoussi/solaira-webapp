/**
 * React Hooks for PV Energy Data
 * 
 * Provides easy-to-use hooks for consuming energy data in components.
 * Currently uses mock data - will be swapped with real API/WebSocket later.
 * 
 * Hooks:
 * - useRealtimeEnergy() - Real-time metrics (updates every 15s)
 * - useHistoricalData(days, interval) - Historical time-series
 * - useForecast(days) - Future predictions
 * - useRecommendations() - Smart suggestions
 * - useMaintenanceAlerts() - System health & alerts
 * - useSystemConfig() - System configuration
 * - useSummaryStats(period) - Aggregated statistics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateRealtimeData,
  generateHistoricalData,
  aggregateHistoricalData,
  generateForecastData,
  generateRecommendations,
  generateMaintenanceAlerts,
  calculateSummaryStats,
  defaultSystemConfig,
} from '../mockData';

// ============================================================================
// REALTIME ENERGY HOOK
// ============================================================================

/**
 * Hook for real-time energy metrics
 * Updates every 15 seconds to simulate live data
 * 
 * @param {number} updateInterval - Update frequency in milliseconds (default: 15000)
 * @returns {Object} { data, loading, error, lastUpdated }
 * 
 * Confidence: 100% - Mock data guaranteed to work
 */
export const useRealtimeEnergy = (updateInterval = 15000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const fetchData = useCallback(() => {
    try {
      const realtimeData = generateRealtimeData();
      setData(realtimeData);
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Initial fetch
    fetchData();
    
    // Set up interval for updates
    const interval = setInterval(fetchData, updateInterval);
    
    // Cleanup
    return () => clearInterval(interval);
  }, [fetchData, updateInterval]);
  
  return { data, loading, error, lastUpdated, refresh: fetchData };
};

// ============================================================================
// HISTORICAL DATA HOOK
// ============================================================================

/**
 * Hook for historical time-series data
 * 
 * @param {number} days - Number of days of history (default: 30)
 * @param {number} intervalMinutes - Data resolution (default: 15)
 * @param {string} aggregation - Aggregation period: 'raw', 'hour', 'day', 'month' (default: 'raw')
 * @returns {Object} { data, loading, error, refresh }
 * 
 * Example:
 * const { data } = useHistoricalData(7, 15, 'day'); // Last 7 days, aggregated by day
 */
export const useHistoricalData = (days = 30, intervalMinutes = 15, aggregation = 'raw') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cache parameters to detect changes
  const paramsRef = useRef({ days, intervalMinutes, aggregation });
  
  const fetchData = useCallback(() => {
    setLoading(true);
    try {
      let historicalData = generateHistoricalData(days, intervalMinutes);
      
      if (aggregation !== 'raw') {
        historicalData = aggregateHistoricalData(historicalData, aggregation);
      }
      
      setData(historicalData);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [days, intervalMinutes, aggregation]);
  
  useEffect(() => {
    // Only refetch if parameters changed
    const paramsChanged = 
      paramsRef.current.days !== days ||
      paramsRef.current.intervalMinutes !== intervalMinutes ||
      paramsRef.current.aggregation !== aggregation;
    
    if (paramsChanged) {
      paramsRef.current = { days, intervalMinutes, aggregation };
      fetchData();
    }
  }, [days, intervalMinutes, aggregation, fetchData]);
  
  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refresh: fetchData };
};

// ============================================================================
// FORECAST HOOK
// ============================================================================

/**
 * Hook for forecast data (production, load, cost predictions)
 * 
 * @param {number} days - Forecast horizon in days (default: 7)
 * @param {number} intervalHours - Forecast resolution (default: 1)
 * @returns {Object} { data, loading, error, refresh }
 * 
 * Data structure:
 * {
 *   pv_production: { timestamps, values, confidence_lower, confidence_upper, weather_conditions },
 *   load_forecast: { timestamps, values, confidence_lower, confidence_upper },
 *   cost_forecast: { timestamps, values, peak_hours }
 * }
 */
export const useForecast = (days = 7, intervalHours = 1) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(() => {
    setLoading(true);
    try {
      const forecastData = generateForecastData(days, intervalHours);
      setData(forecastData);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [days, intervalHours]);
  
  useEffect(() => {
    fetchData();
    
    // Refresh forecast every 30 minutes
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchData]);
  
  return { data, loading, error, refresh: fetchData };
};

// ============================================================================
// RECOMMENDATIONS HOOK
// ============================================================================

/**
 * Hook for smart recommendations
 * Updates every 5 minutes to get fresh recommendations
 * 
 * @returns {Object} { data, loading, error, dismissRecommendation, refresh }
 */
export const useRecommendations = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  
  const fetchData = useCallback(() => {
    try {
      const recommendations = generateRecommendations();
      // Filter out dismissed recommendations
      const filteredRecs = recommendations.filter(rec => !dismissedIds.has(rec.id));
      setData(filteredRecs);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [dismissedIds]);
  
  const dismissRecommendation = useCallback((id) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setData(prev => prev.filter(rec => rec.id !== id));
  }, []);
  
  useEffect(() => {
    fetchData();
    
    // Refresh recommendations every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchData]);
  
  return { 
    data, 
    loading, 
    error, 
    dismissRecommendation,
    refresh: fetchData 
  };
};

// ============================================================================
// MAINTENANCE ALERTS HOOK
// ============================================================================

/**
 * Hook for maintenance alerts and system health
 * 
 * @returns {Object} { alerts, systemHealth, loading, error, resolveAlert, refresh }
 */
export const useMaintenanceAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(() => {
    try {
      const { alerts: alertsData, systemHealth: healthData } = generateMaintenanceAlerts();
      setAlerts(alertsData);
      setSystemHealth(healthData);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, []);
  
  const resolveAlert = useCallback((alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: 'resolved', resolved_at: new Date().toISOString() }
        : alert
    ));
  }, []);
  
  useEffect(() => {
    fetchData();
    
    // Refresh alerts every 10 minutes
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchData]);
  
  return { 
    alerts, 
    systemHealth, 
    loading, 
    error, 
    resolveAlert,
    refresh: fetchData 
  };
};

// ============================================================================
// SYSTEM CONFIGURATION HOOK
// ============================================================================

/**
 * Hook for system configuration
 * Manages system settings with localStorage persistence
 * 
 * @returns {Object} { config, loading, error, updateConfig, resetConfig }
 */
export const useSystemConfig = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('pv_system_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      } else {
        setConfig(defaultSystemConfig);
      }
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setConfig(defaultSystemConfig);
      setLoading(false);
    }
  }, []);
  
  const updateConfig = useCallback((newConfig) => {
    try {
      const updatedConfig = { ...config, ...newConfig };
      setConfig(updatedConfig);
      localStorage.setItem('pv_system_config', JSON.stringify(updatedConfig));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [config]);
  
  const resetConfig = useCallback(() => {
    setConfig(defaultSystemConfig);
    localStorage.setItem('pv_system_config', JSON.stringify(defaultSystemConfig));
  }, []);
  
  return { config, loading, error, updateConfig, resetConfig };
};

// ============================================================================
// SUMMARY STATISTICS HOOK
// ============================================================================

/**
 * Hook for summary statistics (daily, monthly, yearly)
 * 
 * @param {string} period - 'today', 'month', or 'year'
 * @returns {Object} { data, loading, error, refresh }
 * 
 * Returns aggregated stats: production, consumption, self-consumption %, savings, etc.
 */
export const useSummaryStats = (period = 'today') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(() => {
    setLoading(true);
    try {
      // Generate historical data based on period
      let days;
      switch (period) {
        case 'today':
          days = 1;
          break;
        case 'month':
          days = 30;
          break;
        case 'year':
          days = 365;
          break;
        default:
          days = 1;
      }
      
      const historicalData = generateHistoricalData(days, 15);
      const stats = calculateSummaryStats(historicalData, period);
      
      setData(stats);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [period]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refresh: fetchData };
};

// ============================================================================
// COMPOSITE HOOK - ALL DATA
// ============================================================================

/**
 * Convenience hook that provides all energy data at once
 * Useful for dashboard overview page
 * 
 * @returns {Object} All data sources combined
 */
export const useAllEnergyData = () => {
  const realtime = useRealtimeEnergy();
  const todayStats = useSummaryStats('today');
  const monthStats = useSummaryStats('month');
  const yearStats = useSummaryStats('year');
  const forecast = useForecast(7);
  const recommendations = useRecommendations();
  const maintenance = useMaintenanceAlerts();
  const systemConfig = useSystemConfig();
  
  const loading = 
    realtime.loading ||
    todayStats.loading ||
    monthStats.loading ||
    yearStats.loading ||
    forecast.loading ||
    recommendations.loading ||
    maintenance.loading ||
    systemConfig.loading;
  
  const error = 
    realtime.error ||
    todayStats.error ||
    monthStats.error ||
    yearStats.error ||
    forecast.error ||
    recommendations.error ||
    maintenance.error ||
    systemConfig.error;
  
  return {
    realtime: realtime.data,
    stats: {
      today: todayStats.data,
      month: monthStats.data,
      year: yearStats.data,
    },
    forecast: forecast.data,
    recommendations: recommendations.data,
    alerts: maintenance.alerts,
    systemHealth: maintenance.systemHealth,
    config: systemConfig.config,
    loading,
    error,
    lastUpdated: realtime.lastUpdated,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  useRealtimeEnergy,
  useHistoricalData,
  useForecast,
  useRecommendations,
  useMaintenanceAlerts,
  useSystemConfig,
  useSummaryStats,
  useAllEnergyData,
};
