/**
 * useEnergy Hook
 * Manages energy snapshots and real-time data
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { energyService } from '../services/energy';

export function useEnergy(pvSystemId) {
  const [latestSnapshot, setLatestSnapshot] = useState(null);
  const [todaySummary, setTodaySummary] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // Fetch all energy data
  const fetchEnergyData = useCallback(async () => {
    if (!pvSystemId) {
      setLatestSnapshot(null);
      setTodaySummary(null);
      setDailyStats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [latest, summary, stats] = await Promise.all([
        energyService.getLatest(pvSystemId),
        energyService.getTodaySummary(pvSystemId),
        energyService.getDailyStats(pvSystemId, 7)
      ]);
      setLatestSnapshot(latest);
      setTodaySummary(summary);
      setDailyStats(stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pvSystemId]);

  // Initial fetch
  useEffect(() => {
    fetchEnergyData();
  }, [fetchEnergyData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!pvSystemId) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // Subscribe to new snapshots
    subscriptionRef.current = energyService.subscribeToUpdates(pvSystemId, (newSnapshot) => {
      setLatestSnapshot(newSnapshot);
      // Refresh summary when new snapshot arrives
      energyService.getTodaySummary(pvSystemId).then(setTodaySummary);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [pvSystemId]);

  // Record a new snapshot
  const recordSnapshot = useCallback(async (snapshot) => {
    try {
      const data = await energyService.recordSnapshot({
        ...snapshot,
        pv_system_id: pvSystemId
      });
      setLatestSnapshot(data);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [pvSystemId]);

  // Get history for a date range
  const getHistory = useCallback(async (startDate, endDate) => {
    if (!pvSystemId) return [];
    try {
      return await energyService.getHistory(pvSystemId, startDate, endDate);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [pvSystemId]);

  return {
    latestSnapshot,
    todaySummary,
    dailyStats,
    loading,
    error,
    refresh: fetchEnergyData,
    recordSnapshot,
    getHistory
  };
}

/**
 * useEnergyHistory Hook
 * Fetches energy history for a specific date range
 */
export function useEnergyHistory(pvSystemId, startDate, endDate) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!pvSystemId || !startDate || !endDate) {
      setHistory([]);
      setLoading(false);
      return;
    }

    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await energyService.getHistory(pvSystemId, startDate, endDate);
        setHistory(data);
      } catch (err) {
        setError(err.message);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [pvSystemId, startDate, endDate]);

  return { history, loading, error };
}

export default useEnergy;
