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
import { useCSVData } from './useCSVData';
import { GRID_PRICE_KWH } from '../config/env';
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
  const { realtime, loading: csvLoading, error: csvError } = useCSVData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  const updateData = useCallback(() => {
    if (csvLoading) return;
    
    if (csvError) {
      setError(csvError);
      setLoading(false);
      return;
    }

    if (!realtime || realtime.length === 0) {
      // Fallback to mock if no CSV data
      try {
        setData(generateRealtimeData());
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
      return;
    }

    // Find relevant data point based on current time (simulated)
    const now = new Date();
    const dataYear = 2023; // Data is from 2023
    
    // Find matching row in CSV
    // We look for same month, day, hour in the data year
    const match = realtime.find(r => {
      const d = new Date(r.timestamp);
      return d.getFullYear() === dataYear && 
             d.getMonth() === now.getMonth() && 
             d.getDate() === now.getDate() && 
             d.getHours() === now.getHours();
    });
    
    const point = match || realtime[realtime.length - 1];

    if (point) {
      setData({
        timestamp: now.toISOString(),
        pv_production_kw: Number(point.pv_production_kw),
        consumption_kw: Number(point.consumption_kw),
        grid_import_kw: Number(point.grid_import_kw),
        grid_export_kw: Number(point.grid_export_kw),
        battery_soc_percent: Number(point.battery_soc_percent),
        battery_kwh_stored: Number(point.battery_kwh_stored),
        battery_charge_kw: Number(point.battery_charge_kw),
        battery: {
          soc: Number(point.battery_soc_percent),
          flow_kw: Number(point.battery_charge_kw),
          status: Number(point.battery_charge_kw) > 0 ? 'charging' : Number(point.battery_charge_kw) < 0 ? 'discharging' : 'idle'
        },
        grid_status: Number(point.grid_import_kw) > 0 ? 'importing' : Number(point.grid_export_kw) > 0 ? 'exporting' : 'idle',
        // Trend data from CSV
        pv_trend_pct: Number(point.pv_trend_pct) || 0,
        consumption_trend_pct: Number(point.consumption_trend_pct) || 0,
        grid_import_trend_pct: Number(point.grid_import_trend_pct) || 0,
        grid_export_trend_pct: Number(point.grid_export_trend_pct) || 0
      });
      setLastUpdated(new Date());
      setLoading(false);
      setError(null);
    }
  }, [realtime, csvLoading, csvError]);

  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, updateInterval);
    return () => clearInterval(interval);
  }, [updateData, updateInterval]);
  
  return { data, loading, error, lastUpdated, refresh: updateData };
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
  const { historical, realtime, loading: csvLoading, error: csvError } = useCSVData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cache parameters to detect changes
  const paramsRef = useRef({ days, intervalMinutes, aggregation });
  
  const fetchData = useCallback(() => {
    if (csvLoading) return;
    
    if (csvError) {
      setError(csvError);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Determine which dataset to use
      let processedData = [];
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      if (aggregation === 'day' || aggregation === 'month') {
        if (!historical || historical.length === 0) {
           // Fallback to mock if no CSV data
           try {
             let mockData = generateHistoricalData(days, intervalMinutes);
             if (aggregation !== 'raw') mockData = aggregateHistoricalData(mockData, aggregation);
             setData(mockData);
             setLoading(false);
           } catch (e) { setError(e.message); setLoading(false); }
           return;
        }
        
        // Filter historical (daily) data
        processedData = historical.filter(d => {
            const date = new Date(d.date);
            return date >= startDate && date <= endDate;
        }).map(d => ({
            timestamp: d.date,
            production: Number(d.actual_pv_kwh),
            consumption: Number(d.consumption_kwh),
            gridImport: Number(d.grid_import_kwh),
            gridExport: Number(d.grid_export_kwh),
            batteryLevel: Number(d.battery_soc_avg)
        }));

      } else {
        // Use realtime snapshots for hourly/raw data
        if (!realtime || realtime.length === 0) {
           // Fallback
           try {
             let mockData = generateHistoricalData(days, intervalMinutes);
             if (aggregation !== 'raw') mockData = aggregateHistoricalData(mockData, aggregation);
             setData(mockData);
             setLoading(false);
           } catch (e) { setError(e.message); setLoading(false); }
           return;
        }

        // Find the latest date in data to shift relative to now
        const lastDate = new Date(realtime[realtime.length - 1].timestamp);
        const timeDiff = new Date().getTime() - lastDate.getTime(); 
        
        processedData = realtime.map(d => {
            const date = new Date(d.timestamp);
            const shiftedDate = new Date(date.getTime() + timeDiff);
            return {
                timestamp: shiftedDate.toISOString(),
                production: Number(d.pv_production_kw),
                consumption: Number(d.consumption_kw),
                gridImport: Number(d.grid_import_kw),
                gridExport: Number(d.grid_export_kw),
                batteryLevel: Number(d.battery_soc_percent)
            };
        }).filter(d => {
            const date = new Date(d.timestamp);
            return date >= startDate && date <= endDate;
        });
      }

      setData(processedData);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error processing historical data:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [historical, realtime, csvLoading, csvError, days, intervalMinutes, aggregation]);
  
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
  const { forecast, loading: csvLoading, error: csvError } = useCSVData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(() => {
    if (csvLoading) return;
    
    if (csvError) {
      setError(csvError);
      setLoading(false);
      return;
    }

    if (!forecast || forecast.length === 0) {
      // Fallback to mock
      try {
        setData(generateForecastData(days, intervalHours));
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
      return;
    }

    try {
      // Process forecast CSV data (hourly_forecast file)
      const hours = days * 24;
      
      // Find start index based on current time (simulated)
      const now = new Date();
      const dataYear = 2023; // Assuming mock data is from 2023 like in useRealtimeEnergy
      
      // Find matching row in CSV that corresponds to "now"
      let startIndex = forecast.findIndex(r => {
        const d = new Date(r.datetime || r.hour);
        // Match month, day, hour (ignoring year to allow simulation)
        return d.getMonth() === now.getMonth() && 
               d.getDate() === now.getDate() && 
               d.getHours() === now.getHours();
      });

      // If no exact match found, try to match just the hour (fallback for stale data)
      if (startIndex === -1) {
        startIndex = forecast.findIndex(r => {
          const d = new Date(r.datetime || r.hour);
          return d.getHours() === now.getHours();
        });
      }

      // If still no match found (e.g. end of data), default to 0
      if (startIndex === -1) startIndex = 0;

      const forecastSlice = forecast.slice(startIndex, startIndex + Math.min(hours, forecast.length - startIndex));
      
      const processedForecast = {
        pv_production: {
          timestamps: forecastSlice.map(f => f.datetime || f.hour),
          values: forecastSlice.map(f => Number(f.pv_generation_kwh) || 0),
          confidence_lower: forecastSlice.map(f => (Number(f.pv_generation_kwh) || 0) * 0.85),
          confidence_upper: forecastSlice.map(f => (Number(f.pv_generation_kwh) || 0) * 1.15),
        },
        load_forecast: {
          timestamps: forecastSlice.map(f => f.datetime || f.hour),
          values: forecastSlice.map(f => Number(f.consumption_kwh) || 0),
          confidence_lower: forecastSlice.map(f => (Number(f.consumption_kwh) || 0) * 0.9),
          confidence_upper: forecastSlice.map(f => (Number(f.consumption_kwh) || 0) * 1.1),
        },
        grid_forecast: {
          import: forecastSlice.map(f => Number(f.grid_import_kwh) || 0),
          export: forecastSlice.map(f => Number(f.grid_export_kwh) || 0),
        },
        battery_forecast: {
          soc: forecastSlice.map(f => Number(f.battery_soc_percent) || 0),
          stored: forecastSlice.map(f => Number(f.battery_kwh_stored) || 0),
          flow: forecastSlice.map(f => Number(f.battery_flow_kwh) || 0),
        },
        raw: forecastSlice
      };
      
      setData(processedForecast);
      setLoading(false);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [forecast, csvLoading, csvError, days, intervalHours]);
  
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
export const useSummaryStats = (period = 'today', useHardcoded = true) => {
  const { historical, realtime, loading: csvLoading, error: csvError, config } = useCSVData();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(() => {
    if (csvLoading) return;
    
    if (csvError) {
      setError(csvError);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // HARDCODED STATS OVERRIDE
      // Based on user provided values for specific panel counts
      const HARDCODED_STATS = {
        2: {
          today: { production: 4.6, consumption: 20.1, selfConsumption: 100, savings: 1.61 },
          month: { production: 138.0, consumption: 603.0, selfConsumption: 100, savings: 48.30 },
          year: { production: 1642.5, consumption: 7336.5, selfConsumption: 100, savings: 574.88 }
        },
        4: {
          today: { production: 9.2, consumption: 20.1, selfConsumption: 100, savings: 3.22 },
          month: { production: 276.5, consumption: 603.0, selfConsumption: 100, savings: 96.77 },
          year: { production: 3285.0, consumption: 7336.5, selfConsumption: 100, savings: 1149.75 }
        },
        8: {
          today: { production: 18.5, consumption: 20.1, selfConsumption: 98, savings: 6.10 },
          month: { production: 555.0, consumption: 603.0, selfConsumption: 97, savings: 188.50 },
          year: { production: 6387.5, consumption: 7336.5, selfConsumption: 95, savings: 2150.20 }
        },
        10: {
          today: { production: 23.1, consumption: 20.1, selfConsumption: 85, savings: 6.90 },
          month: { production: 693.0, consumption: 603.0, selfConsumption: 85, savings: 207.00 },
          year: { production: 8037.5, consumption: 7336.5, selfConsumption: 82, savings: 2450.00 }
        },
        12: {
          today: { production: 27.8, consumption: 20.1, selfConsumption: 72, savings: 7.85 },
          month: { production: 834.0, consumption: 603.0, selfConsumption: 72, savings: 245.10 },
          year: { production: 9672.5, consumption: 7336.5, selfConsumption: 70, savings: 2950.40 }
        },
        15: {
          today: { production: 34.2, consumption: 20.1, selfConsumption: 60, savings: 8.50 },
          month: { production: 1026.0, consumption: 603.0, selfConsumption: 60, savings: 280.00 },
          year: { production: 11900.0, consumption: 7336.5, selfConsumption: 58, savings: 3500.00 }
        },
        16: {
          today: { production: 36.5, consumption: 20.1, selfConsumption: 55, savings: 9.40 },
          month: { production: 1095.0, consumption: 603.0, selfConsumption: 55, savings: 310.55 },
          year: { production: 12775.0, consumption: 7336.5, selfConsumption: 52, savings: 3840.80 }
        }
      };

      const panelCount = config?.panels;
      
      // Only use hardcoded stats if explicitly requested (default true)
      if (useHardcoded && panelCount && HARDCODED_STATS[panelCount] && HARDCODED_STATS[panelCount][period]) {
        const hardcoded = HARDCODED_STATS[panelCount][period];
        
        // Calculate derived values to ensure consistency
        const selfConsumedKWh = hardcoded.production * (hardcoded.selfConsumption / 100);
        const gridExport = Math.max(0, hardcoded.production - selfConsumedKWh);
        const gridImport = Math.max(0, hardcoded.consumption - selfConsumedKWh);
        const co2Avoided = hardcoded.production * 0.5; // Using 0.5 factor as per previous request

        const stats = {
          production: hardcoded.production,
          consumption: hardcoded.consumption,
          selfConsumption: hardcoded.selfConsumption,
          gridImport: gridImport,
          gridExport: gridExport,
          savings: hardcoded.savings,
          co2Avoided: co2Avoided
        };

        setData(stats);
        setLoading(false);
        setError(null);
        return;
      }
      
      // Determine date range based on period
      const now = new Date();
      const dataYear = 2023; // Data is from 2023
      let startDate = new Date();
      
      switch (period) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'month':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'year':
          startDate.setMonth(0, 1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          startDate.setHours(0, 0, 0, 0);
      }

      let stats = {
        production: 0,
        consumption: 0,
        selfConsumption: 0,
        gridImport: 0,
        gridExport: 0,
        savings: 0,
        co2Avoided: 0,
      };

      // Use historical data for ALL summaries if available (more accurate)
      if (historical && historical.length > 0) {
        // For 'today', we look for the specific date in historical data
        if (period === 'today') {
          const todayStr = `${dataYear}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
          const todayRow = historical.find(d => d.date === todayStr);
          
          if (todayRow) {
            stats.production = Number(todayRow.actual_pv_kwh) || 0;
            stats.consumption = Number(todayRow.consumption_kwh) || 0;
            stats.gridImport = Number(todayRow.grid_import_kwh) || 0;
            stats.gridExport = Number(todayRow.grid_export_kwh) || 0;
            stats.savings = Number(todayRow.cost_savings_eur) || 0;
          }
        } else {
          // For month/year, filter by range, mapping data dates to current year
          const filteredData = historical.filter(d => {
            const rowDate = new Date(d.date);
            // Map row date to current year for comparison
            const mappedDate = new Date(rowDate);
            mappedDate.setFullYear(now.getFullYear());
            
            return mappedDate >= startDate && mappedDate <= now;
          });

          if (filteredData.length > 0) {
            stats.production = filteredData.reduce((sum, d) => sum + (Number(d.actual_pv_kwh) || 0), 0);
            stats.consumption = filteredData.reduce((sum, d) => sum + (Number(d.consumption_kwh) || 0), 0);
            stats.gridImport = filteredData.reduce((sum, d) => sum + (Number(d.grid_import_kwh) || 0), 0);
            stats.gridExport = filteredData.reduce((sum, d) => sum + (Number(d.grid_export_kwh) || 0), 0);
            stats.savings = filteredData.reduce((sum, d) => sum + (Number(d.cost_savings_eur) || 0), 0);
          }
        }
      } else if (period === 'today' && realtime && realtime.length > 0) {
        // Fallback to realtime aggregation if historical not available
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        // Find today's data by matching month and day
        const month = now.getMonth();
        const day = now.getDate();
        
        const todayData = realtime.filter(d => {
          const date = new Date(d.timestamp);
          return date.getFullYear() === dataYear && date.getMonth() === month && date.getDate() === day;
        });

        if (todayData.length > 0) {
          // Sum hourly kW values (assuming hourly data, so kW ≈ kWh per hour)
          stats.production = todayData.reduce((sum, d) => sum + (Number(d.pv_production_kw) || 0), 0);
          stats.consumption = todayData.reduce((sum, d) => sum + (Number(d.consumption_kw) || 0), 0);
          stats.gridImport = todayData.reduce((sum, d) => sum + (Number(d.grid_import_kw) || 0), 0);
          stats.gridExport = todayData.reduce((sum, d) => sum + (Number(d.grid_export_kw) || 0), 0);
        }
      }

      // Calculate self-consumption percentage
      if (stats.production > 0) {
        const selfConsumed = Math.max(0, stats.production - stats.gridExport);
        stats.selfConsumption = Math.round((selfConsumed / stats.production) * 100);
      }

      // Estimate savings (default €0.20 per kWh saved, see NEXT_PUBLIC_GRID_PRICE_KWH)
      if (stats.savings === 0 && stats.production > 0) {
        const selfConsumed = Math.max(0, stats.production - stats.gridExport);
        stats.savings = selfConsumed * GRID_PRICE_KWH;
      }

      // CO2 avoided (0.4 kg CO2 per kWh solar)
      stats.co2Avoided = stats.production * 0.4;

      // Round values
      stats.production = Math.round(stats.production * 10) / 10;
      stats.consumption = Math.round(stats.consumption * 10) / 10;
      stats.gridImport = Math.round(stats.gridImport * 10) / 10;
      stats.gridExport = Math.round(stats.gridExport * 10) / 10;
      stats.savings = Math.round(stats.savings * 100) / 100;
      stats.co2Avoided = Math.round(stats.co2Avoided * 10) / 10;
      
      setData(stats);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error calculating summary stats:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [historical, realtime, csvLoading, csvError, period]);
  
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
export const useAllEnergyData = (useHardcoded = true) => {
  const realtime = useRealtimeEnergy();
  const todayStats = useSummaryStats('today', useHardcoded);
  const monthStats = useSummaryStats('month', useHardcoded);
  const yearStats = useSummaryStats('year', useHardcoded);
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
