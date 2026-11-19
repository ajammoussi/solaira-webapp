/**
 * useEnergySimulation Hook
 *
 * Custom React hook for fetching and managing comprehensive energy simulation data
 * Includes PV energy, Wind energy, Consumption, and Battery SOC
 */

import { useState, useEffect, useCallback } from 'react';
import pythonApi from '../api/pythonApi';

// Simple in-memory cache
const SIMULATION_CACHE = new Map();

/**
 * Hook for comprehensive energy simulation
 *
 * @param {Object} config - Simulation configuration
 * @param {string} config.startTime - ISO timestamp (optional, defaults to now)
 * @param {number} config.hours - Number of hours to simulate (default 24)
 * @param {number} config.initialSoc - Initial battery SOC % (default 50)
 * @param {Array} config.consumptionProfile - Hourly consumption values (optional)
 * @param {boolean} config.autoFetch - Whether to fetch on mount (default true)
 *
 * @returns {Object} { data, loading, error, refetch }
 */
export const useEnergySimulation = ({
  startTime = null,
  hours = 24,
  initialSoc = 50,
  consumptionProfile = null,
  autoFetch = true,
} = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSimulation = useCallback(
    async (forceRefresh = false) => {
      const cacheKey = JSON.stringify({ startTime, hours, initialSoc, consumptionProfile });

      // Check cache first
      if (!forceRefresh && SIMULATION_CACHE.has(cacheKey)) {
        setData(SIMULATION_CACHE.get(cacheKey));
        return;
      }

      // Prevent cache from growing too large
      if (SIMULATION_CACHE.size > 20) {
        SIMULATION_CACHE.clear();
      }

      setLoading(true);
      setError(null);

      try {
        const response = await pythonApi.runEnergySimulation(
          startTime,
          hours,
          initialSoc,
          consumptionProfile
        );

        if (response.status === 'success' && response.simulation_data) {
          setData(response.simulation_data);
          // Update cache
          SIMULATION_CACHE.set(cacheKey, response.simulation_data);
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        console.error('Energy simulation fetch error:', err);
        setError(err.message || 'Failed to fetch energy simulation data');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [startTime, hours, initialSoc, consumptionProfile]
  );

  useEffect(() => {
    if (autoFetch) {
      fetchSimulation();
    }
  }, [autoFetch, fetchSimulation]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchSimulation(true),
  };
};

/**
 * Hook for running multiple simulation scenarios
 * Useful for comparing different configurations
 *
 * @returns {Object} { runScenario, scenarios, loading, error, clearScenarios }
 */
export const useSimulationScenarios = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runScenario = useCallback(
    async (scenarioConfig) => {
      setLoading(true);
      setError(null);

      try {
        const response = await pythonApi.runEnergySimulation(
          scenarioConfig.startTime,
          scenarioConfig.hours,
          scenarioConfig.initialSoc,
          scenarioConfig.consumptionProfile
        );

        if (response.status === 'success' && response.simulation_data) {
          const newScenario = {
            id: Date.now(),
            name: scenarioConfig.name || `Scenario ${scenarios.length + 1}`,
            config: scenarioConfig,
            data: response.simulation_data,
            timestamp: new Date().toISOString(),
          };

          setScenarios((prev) => [...prev, newScenario]);
          return newScenario;
        } else {
          throw new Error('Invalid response format from API');
        }
      } catch (err) {
        console.error('Scenario simulation error:', err);
        setError(err.message || 'Failed to run simulation scenario');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [scenarios.length]
  );

  const clearScenarios = useCallback(() => {
    setScenarios([]);
    setError(null);
  }, []);

  const removeScenario = useCallback((scenarioId) => {
    setScenarios((prev) => prev.filter((s) => s.id !== scenarioId));
  }, []);

  return {
    scenarios,
    loading,
    error,
    runScenario,
    clearScenarios,
    removeScenario,
  };
};

export default useEnergySimulation;
