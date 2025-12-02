/**
 * useBatteries Hook
 * Manages battery data fetching and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { batteriesService } from '../services/batteries';

export function useBatteries() {
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all batteries
  const fetchBatteries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await batteriesService.getAll();
      setBatteries(data || []);
    } catch (err) {
      setError(err.message);
      setBatteries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchBatteries();
  }, [fetchBatteries]);

  // Create battery
  const createBattery = useCallback(async (battery) => {
    try {
      const data = await batteriesService.create(battery);
      setBatteries(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update battery
  const updateBattery = useCallback(async (id, updates) => {
    try {
      const data = await batteriesService.update(id, updates);
      setBatteries(prev => prev.map(b => b.id === id ? data : b));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete battery
  const deleteBattery = useCallback(async (id) => {
    try {
      await batteriesService.delete(id);
      setBatteries(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    batteries,
    loading,
    error,
    refresh: fetchBatteries,
    createBattery,
    updateBattery,
    deleteBattery
  };
}

/**
 * useBattery Hook
 * Manages a single battery with SOC tracking
 */
export function useBattery(id) {
  const [battery, setBattery] = useState(null);
  const [soc, setSoc] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch battery
  const fetchBattery = useCallback(async () => {
    if (!id) {
      setBattery(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [batteryData, socData, forecastData] = await Promise.all([
        batteriesService.getById(id),
        batteriesService.getSOC(id),
        batteriesService.getForecasts(id, 24)
      ]);
      setBattery(batteryData);
      setSoc(socData);
      setForecasts(forecastData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchBattery();
  }, [fetchBattery]);

  // Charge battery
  const charge = useCallback(async (amountKwh) => {
    if (!id) return;
    try {
      const data = await batteriesService.charge(id, amountKwh);
      setBattery(prev => ({ ...prev, current_charge_kwh: data.current_charge_kwh }));
      setSoc(prev => ({ ...prev, soc_percent: data.soc_percent, current_charge_kwh: data.current_charge_kwh }));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [id]);

  // Discharge battery
  const discharge = useCallback(async (amountKwh) => {
    if (!id) return;
    try {
      const data = await batteriesService.discharge(id, amountKwh);
      setBattery(prev => ({ ...prev, current_charge_kwh: data.current_charge_kwh }));
      setSoc(prev => ({ ...prev, soc_percent: data.soc_percent, current_charge_kwh: data.current_charge_kwh }));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [id]);

  // Refresh SOC
  const refreshSOC = useCallback(async () => {
    if (!id) return;
    try {
      const socData = await batteriesService.getSOC(id);
      setSoc(socData);
    } catch (err) {
      console.error('Error refreshing SOC:', err);
    }
  }, [id]);

  // Auto-refresh SOC every 30 seconds
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(refreshSOC, 30000);
    return () => clearInterval(interval);
  }, [id, refreshSOC]);

  return {
    battery,
    soc,
    forecasts,
    loading,
    error,
    refresh: fetchBattery,
    refreshSOC,
    charge,
    discharge
  };
}

export default useBatteries;
