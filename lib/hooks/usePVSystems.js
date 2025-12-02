/**
 * usePVSystems Hook
 * Manages PV system data fetching and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { pvSystemsService } from '../services/pvSystems';

export function usePVSystems() {
  const [pvSystems, setPVSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all PV systems
  const fetchPVSystems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pvSystemsService.getAll();
      setPVSystems(data || []);
    } catch (err) {
      setError(err.message);
      setPVSystems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchPVSystems();
  }, [fetchPVSystems]);

  // Create PV system
  const createPVSystem = useCallback(async (pvSystem) => {
    try {
      const data = await pvSystemsService.create(pvSystem);
      setPVSystems(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Update PV system
  const updatePVSystem = useCallback(async (id, updates) => {
    try {
      const data = await pvSystemsService.update(id, updates);
      setPVSystems(prev => prev.map(pv => pv.id === id ? data : pv));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Delete PV system
  const deletePVSystem = useCallback(async (id) => {
    try {
      await pvSystemsService.delete(id);
      setPVSystems(prev => prev.filter(pv => pv.id !== id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    pvSystems,
    loading,
    error,
    refresh: fetchPVSystems,
    createPVSystem,
    updatePVSystem,
    deletePVSystem
  };
}

/**
 * usePVSystem Hook
 * Manages a single PV system with real-time output
 */
export function usePVSystem(id) {
  const [pvSystem, setPVSystem] = useState(null);
  const [currentOutput, setCurrentOutput] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch PV system
  const fetchPVSystem = useCallback(async () => {
    if (!id) {
      setPVSystem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [system, output] = await Promise.all([
        pvSystemsService.getById(id),
        pvSystemsService.getCurrentOutput(id)
      ]);
      setPVSystem(system);
      setCurrentOutput(output);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchPVSystem();
  }, [fetchPVSystem]);

  // Refresh current output (call periodically)
  const refreshOutput = useCallback(async () => {
    if (!id) return;
    try {
      const output = await pvSystemsService.getCurrentOutput(id);
      setCurrentOutput(output);
    } catch (err) {
      console.error('Error refreshing output:', err);
    }
  }, [id]);

  // Auto-refresh output every 30 seconds
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(refreshOutput, 30000);
    return () => clearInterval(interval);
  }, [id, refreshOutput]);

  return {
    pvSystem,
    currentOutput,
    loading,
    error,
    refresh: fetchPVSystem,
    refreshOutput
  };
}

export default usePVSystems;
