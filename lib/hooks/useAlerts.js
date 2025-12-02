/**
 * useAlerts Hook
 * Manages alerts and notifications
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { alertsService } from '../services/alerts';

export function useAlerts(options = {}) {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsData, count] = await Promise.all([
        alertsService.getAll(options),
        alertsService.getUnreadCount()
      ]);
      setAlerts(alertsData || []);
      setUnreadCount(count);
    } catch (err) {
      setError(err.message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Subscribe to new alerts
  useEffect(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = alertsService.subscribeToAlerts((newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (id) => {
    try {
      await alertsService.markAsRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await alertsService.markAllAsRead();
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Dismiss alert
  const dismiss = useCallback(async (id) => {
    try {
      await alertsService.dismiss(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      const alert = alerts.find(a => a.id === id);
      if (alert && !alert.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [alerts]);

  // Delete alert
  const deleteAlert = useCallback(async (id) => {
    try {
      await alertsService.delete(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      const alert = alerts.find(a => a.id === id);
      if (alert && !alert.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [alerts]);

  // Create alert
  const createAlert = useCallback(async (alert) => {
    try {
      const data = await alertsService.create(alert);
      setAlerts(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    alerts,
    unreadCount,
    loading,
    error,
    refresh: fetchAlerts,
    markAsRead,
    markAllAsRead,
    dismiss,
    deleteAlert,
    createAlert
  };
}

export default useAlerts;
