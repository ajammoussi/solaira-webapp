import { useState, useEffect, useCallback } from 'react';
import pythonApi from '../services/pythonApi';

// Simple in-memory cache for daily predictions
const PREDICTION_CACHE = new Map();

/**
 * Hook for daily energy prediction and advice
 * Caches results to prevent reloading on navigation
 * 
 * @param {Object} config
 * @param {number} config.initialSoc - Initial battery SOC % (default 50)
 * @param {boolean} config.autoFetch - Whether to fetch on mount (default true)
 * 
 * @returns {Object} { data, loading, error, refetch }
 */
export const useDailyPrediction = ({
  initialSoc = 50.0,
  autoFetch = true
} = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPrediction = useCallback(async (forceRefresh = false) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const cacheKey = JSON.stringify({ dateStr, initialSoc });

    // Check cache first
    if (!forceRefresh && PREDICTION_CACHE.has(cacheKey)) {
      setData(PREDICTION_CACHE.get(cacheKey));
      return;
    }

    // Prevent cache from growing too large
    if (PREDICTION_CACHE.size > 20) {
      PREDICTION_CACHE.clear();
    }

    setLoading(true);
    setError(null);

    try {
      // Pass null for weather and consumption to trigger backend historical lookup
      const results = await pythonApi.runSimulation(null, initialSoc, null, dateStr);
      
      console.log("Simulation results: ", results);
      
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

      setData(transformedResults);
      // Update cache
      PREDICTION_CACHE.set(cacheKey, transformedResults);
    } catch (err) {
      console.error("Simulation failed:", err);
      setError("Failed to load simulation data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [initialSoc]);

  useEffect(() => {
    if (autoFetch) {
      fetchPrediction();
    }
  }, [autoFetch, fetchPrediction]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchPrediction(true)
  };
};

export default useDailyPrediction;
