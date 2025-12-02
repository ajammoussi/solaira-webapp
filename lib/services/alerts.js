/**
 * Alerts API Service
 * Handles alert management and notifications
 */

import { supabase } from '../supabase';

export const alertsService = {
  /**
   * Get all alerts for current user
   */
  async getAll(filters = {}) {
    let query = supabase
      .from('alerts')
      .select(`
        *,
        pv_system:pv_systems(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (filters.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters.type) {
      query = query.eq('alert_type', filters.type);
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  /**
   * Get a single alert by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        pv_system:pv_systems(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new alert
   */
  async create(alert) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        pv_system_id: alert.pv_system_id,
        alert_type: alert.alert_type,
        severity: alert.severity || 'info',
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata || {}
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark an alert as read
   */
  async markAsRead(id) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark all alerts as read
   */
  async markAllAsRead() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  },

  /**
   * Dismiss (soft delete) an alert
   */
  async dismiss(id) {
    const { data, error } = await supabase
      .from('alerts')
      .update({ is_dismissed: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete an alert permanently
   */
  async delete(id) {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Get unread alert count
   */
  async getUnreadCount() {
    const { count, error } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .eq('is_dismissed', false);

    if (error) throw error;
    return count || 0;
  },

  /**
   * Subscribe to new alerts in real-time
   */
  subscribeToAlerts(callback) {
    return supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  },

  /**
   * Create system-generated alerts based on thresholds
   */
  async checkThresholds(pvSystemId, snapshot) {
    const alerts = [];

    // Low production alert (< 10% of expected during daylight)
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 18 && snapshot.production_kw < 0.5) {
      alerts.push({
        pv_system_id: pvSystemId,
        alert_type: 'low_production',
        severity: 'warning',
        title: 'Low Production Detected',
        message: `Production is only ${snapshot.production_kw.toFixed(2)} kW during daylight hours.`,
        metadata: { production_kw: snapshot.production_kw, hour }
      });
    }

    // High consumption alert
    if (snapshot.consumption_kw > 10) {
      alerts.push({
        pv_system_id: pvSystemId,
        alert_type: 'high_consumption',
        severity: 'info',
        title: 'High Consumption Alert',
        message: `Current consumption is ${snapshot.consumption_kw.toFixed(2)} kW.`,
        metadata: { consumption_kw: snapshot.consumption_kw }
      });
    }

    // Grid dependency alert
    if (snapshot.grid_import_kw > snapshot.consumption_kw * 0.8) {
      alerts.push({
        pv_system_id: pvSystemId,
        alert_type: 'grid_dependency',
        severity: 'info',
        title: 'High Grid Dependency',
        message: `${Math.round((snapshot.grid_import_kw / snapshot.consumption_kw) * 100)}% of consumption is from grid.`,
        metadata: { grid_ratio: snapshot.grid_import_kw / snapshot.consumption_kw }
      });
    }

    // Create all alerts
    for (const alert of alerts) {
      await this.create(alert);
    }

    return alerts;
  }
};

export default alertsService;
