/**
 * Energy Snapshots API Service
 * Handles real-time energy tracking and history
 */

import { supabase } from '../supabase';

export const energyService = {
  /**
   * Record a new energy snapshot
   */
  async recordSnapshot(snapshot) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Calculate grid import/export if not provided
    const netEnergy = snapshot.production_kw - snapshot.consumption_kw;
    const gridExport = netEnergy > 0 ? netEnergy : 0;
    const gridImport = netEnergy < 0 ? Math.abs(netEnergy) : 0;

    const { data, error } = await supabase
      .from('energy_snapshots')
      .insert({
        user_id: user.id,
        pv_system_id: snapshot.pv_system_id,
        production_kw: snapshot.production_kw,
        consumption_kw: snapshot.consumption_kw,
        grid_import_kw: snapshot.grid_import_kw ?? gridImport,
        grid_export_kw: snapshot.grid_export_kw ?? gridExport,
        battery_charge_kw: snapshot.battery_charge_kw || 0,
        battery_discharge_kw: snapshot.battery_discharge_kw || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get latest snapshot for a PV system
   */
  async getLatest(pvSystemId) {
    const { data, error } = await supabase
      .from('energy_snapshots')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data;
  },

  /**
   * Get energy history for a time range
   */
  async getHistory(pvSystemId, startDate, endDate) {
    const { data, error } = await supabase
      .from('energy_snapshots')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Get today's energy summary
   */
  async getTodaySummary(pvSystemId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('energy_snapshots')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return {
        total_production_kwh: 0,
        total_consumption_kwh: 0,
        total_grid_import_kwh: 0,
        total_grid_export_kwh: 0,
        self_consumption_percent: 0,
        peak_production_kw: 0,
        peak_consumption_kw: 0,
        snapshot_count: 0
      };
    }

    // Calculate totals (assuming 5-minute intervals = 12 per hour)
    const intervalHours = 5 / 60; // Convert 5 minutes to hours
    const totalProduction = data.reduce((sum, s) => sum + s.production_kw * intervalHours, 0);
    const totalConsumption = data.reduce((sum, s) => sum + s.consumption_kw * intervalHours, 0);
    const totalGridImport = data.reduce((sum, s) => sum + s.grid_import_kw * intervalHours, 0);
    const totalGridExport = data.reduce((sum, s) => sum + s.grid_export_kw * intervalHours, 0);
    
    const selfConsumed = totalProduction - totalGridExport;
    const selfConsumptionPercent = totalProduction > 0 
      ? (selfConsumed / totalProduction) * 100 
      : 0;

    return {
      total_production_kwh: Math.round(totalProduction * 100) / 100,
      total_consumption_kwh: Math.round(totalConsumption * 100) / 100,
      total_grid_import_kwh: Math.round(totalGridImport * 100) / 100,
      total_grid_export_kwh: Math.round(totalGridExport * 100) / 100,
      self_consumption_percent: Math.round(selfConsumptionPercent * 10) / 10,
      peak_production_kw: Math.max(...data.map(s => s.production_kw)),
      peak_consumption_kw: Math.max(...data.map(s => s.consumption_kw)),
      snapshot_count: data.length
    };
  },

  /**
   * Get aggregated daily statistics for a date range
   */
  async getDailyStats(pvSystemId, days = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('energy_snapshots')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Group by day and calculate totals
    const dailyStats = {};
    const intervalHours = 5 / 60;

    data.forEach(snapshot => {
      const date = snapshot.timestamp.split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          production_kwh: 0,
          consumption_kwh: 0,
          grid_import_kwh: 0,
          grid_export_kwh: 0
        };
      }
      dailyStats[date].production_kwh += snapshot.production_kw * intervalHours;
      dailyStats[date].consumption_kwh += snapshot.consumption_kw * intervalHours;
      dailyStats[date].grid_import_kwh += snapshot.grid_import_kw * intervalHours;
      dailyStats[date].grid_export_kwh += snapshot.grid_export_kw * intervalHours;
    });

    return Object.values(dailyStats).map(day => ({
      ...day,
      production_kwh: Math.round(day.production_kwh * 100) / 100,
      consumption_kwh: Math.round(day.consumption_kwh * 100) / 100,
      grid_import_kwh: Math.round(day.grid_import_kwh * 100) / 100,
      grid_export_kwh: Math.round(day.grid_export_kwh * 100) / 100
    }));
  },

  /**
   * Subscribe to real-time energy updates
   */
  subscribeToUpdates(pvSystemId, callback) {
    return supabase
      .channel(`energy-${pvSystemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'energy_snapshots',
          filter: `pv_system_id=eq.${pvSystemId}`
        },
        (payload) => callback(payload.new)
      )
      .subscribe();
  }
};

export default energyService;
