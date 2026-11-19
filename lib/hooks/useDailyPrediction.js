import { useState, useEffect, useCallback } from 'react';
import pythonApi from '../api/pythonApi';

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
  timezone = 'UTC',
  autoFetch = true,
} = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getUtcOffsetMinutes = (tz) => {
    if (!tz || typeof tz !== 'string') return null;
    if (tz === 'UTC' || tz === 'GMT') return 0;

    const match = tz.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) return null;

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number.parseInt(match[2], 10);
    const minutes = Number.parseInt(match[3] || '0', 10);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return sign * (hours * 60 + minutes);
  };

  const formatTimeForTimezone = (date, tz) => {
    const offsetMinutes = getUtcOffsetMinutes(tz);

    // Stored profile timezone options are UTC offsets like 'UTC+01:00'
    if (offsetMinutes !== null) {
      const shifted = new Date(date.getTime() + offsetMinutes * 60 * 1000);
      const hh = String(shifted.getUTCHours()).padStart(2, '0');
      const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
      return { displayTime: `${hh}:${mm}`, hour: shifted.getUTCHours() };
    }

    // If an IANA time zone is provided, format with Intl.
    try {
      const displayTime = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      }).format(date);

      // Derive hour in that timezone by formatting just the hour.
      const hourStr = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone: tz,
      }).format(date);

      return { displayTime, hour: Number.parseInt(hourStr, 10) };
    } catch (e) {
      // Fallback: browser local
      const displayTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return { displayTime, hour: date.getHours() };
    }
  };

  const fetchPrediction = useCallback(
    async (forceRefresh = false) => {
      const now = new Date();
      const startTime = now.toISOString();
      const cacheKey = JSON.stringify({ startTime, initialSoc, timezone });

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
        // Use runEnergySimulation for 24-hour forecast starting from now
        const results = await pythonApi.runEnergySimulation(startTime, 24, initialSoc);

        if (results.status !== 'success' || !results.simulation_data) {
          throw new Error('Invalid simulation data received');
        }

        const simData = results.simulation_data;

        // Transform backend data to match UI expectations
        const transformedResults = {
          summary: {
            total_pv_generation: simData.pv_energy_kwh.reduce((a, b) => a + b, 0),
            total_consumption: simData.consumption_kwh.reduce((a, b) => a + b, 0),
            grid_import: simData.deficit_kwh.reduce((a, b) => a + b, 0),
            grid_export: simData.wasted_energy_kwh.reduce((a, b) => a + b, 0),
          },
          hourly_details: simData.timestamps.map((ts, i) => {
            const date = new Date(ts);
            const { displayTime, hour } = formatTimeForTimezone(date, timezone);

            return {
              hour,
              displayTime: displayTime,
              pv_generation: Number((simData.pv_energy_kwh[i] || 0).toFixed(3)),
              consumption: Number((simData.consumption_kwh[i] || 0).toFixed(3)),
              battery_soc: Number((simData.battery_soc_percent[i] || 0).toFixed(3)),
              grid_import: Number((simData.deficit_kwh[i] || 0).toFixed(3)),
              wasted: Number((simData.wasted_energy_kwh[i] || 0).toFixed(3)),
            };
          }),
          advice: results.advice || [],
        };

        setData(transformedResults);
        // Update cache
        PREDICTION_CACHE.set(cacheKey, transformedResults);
      } catch (err) {
        console.error('Simulation failed:', err);
        setError('Failed to load simulation data. Is the backend running?');
      } finally {
        setLoading(false);
      }
    },
    [initialSoc, timezone]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchPrediction();
    }
  }, [autoFetch, fetchPrediction]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchPrediction(true),
  };
};

export default useDailyPrediction;
