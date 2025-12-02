/**
 * useForecasts Hook
 * Manages energy forecasts and recommendations
 */

import { useState, useEffect, useCallback } from 'react';
import { forecastsService } from '../services/forecasts';

export function useForecasts(pvSystemId, batteryId) {
  const [productionForecasts, setProductionForecasts] = useState([]);
  const [consumptionForecasts, setConsumptionForecasts] = useState([]);
  const [batteryForecasts, setBatteryForecasts] = useState([]);
  const [combinedForecast, setCombinedForecast] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all forecast data
  const fetchForecasts = useCallback(async () => {
    if (!pvSystemId) {
      setProductionForecasts([]);
      setConsumptionForecasts([]);
      setBatteryForecasts([]);
      setCombinedForecast([]);
      setRecommendations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [production, consumption, battery, combined, recs] = await Promise.all([
        forecastsService.getProductionForecasts(pvSystemId, 48),
        forecastsService.getConsumptionForecasts(pvSystemId, 48),
        batteryId ? forecastsService.getBatteryForecasts(batteryId, 48) : Promise.resolve([]),
        forecastsService.getCombinedForecast(pvSystemId, batteryId, 48),
        forecastsService.getRecommendations(pvSystemId)
      ]);
      
      setProductionForecasts(production);
      setConsumptionForecasts(consumption);
      setBatteryForecasts(battery);
      setCombinedForecast(combined);
      setRecommendations(recs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pvSystemId, batteryId]);

  // Initial fetch
  useEffect(() => {
    fetchForecasts();
  }, [fetchForecasts]);

  // Generate new forecasts
  const generateForecasts = useCallback(async () => {
    if (!pvSystemId) return;
    
    setLoading(true);
    try {
      await forecastsService.generateForecasts(pvSystemId, batteryId);
      await fetchForecasts(); // Refresh after generating
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [pvSystemId, batteryId, fetchForecasts]);

  // Generate recommendations
  const generateRecommendations = useCallback(async () => {
    if (!pvSystemId) return;
    
    try {
      const recs = await forecastsService.generateRecommendations(pvSystemId, batteryId);
      setRecommendations(prev => [...recs, ...prev.filter(r => !recs.find(nr => nr.id === r.id))]);
      return recs;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [pvSystemId, batteryId]);

  return {
    productionForecasts,
    consumptionForecasts,
    batteryForecasts,
    combinedForecast,
    recommendations,
    loading,
    error,
    refresh: fetchForecasts,
    generateForecasts,
    generateRecommendations
  };
}

/**
 * useCombinedForecast Hook
 * Simplified hook for combined forecast data
 */
export function useCombinedForecast(pvSystemId, batteryId, hours = 24) {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pvSystemId) {
      setForecast([]);
      setLoading(false);
      return;
    }

    const fetchForecast = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await forecastsService.getCombinedForecast(pvSystemId, batteryId, hours);
        setForecast(data);
      } catch (err) {
        setError(err.message);
        setForecast([]);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [pvSystemId, batteryId, hours]);

  return { forecast, loading, error };
}

export default useForecasts;
