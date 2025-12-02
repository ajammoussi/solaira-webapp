/**
 * PV Systems API Service
 * Handles all PV system CRUD operations
 */

import { supabase } from '../supabase';

export const pvSystemsService = {
  /**
   * Get all PV systems for current user
   */
  async getAll() {
    const { data, error } = await supabase
      .from('pv_systems')
      .select(`
        *,
        location:locations(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get a single PV system by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('pv_systems')
      .select(`
        *,
        location:locations(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new PV system
   */
  async create(pvSystem) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('pv_systems')
      .insert({ ...pvSystem, user_id: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a PV system
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('pv_systems')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a PV system
   */
  async delete(id) {
    const { error } = await supabase
      .from('pv_systems')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Get current output (estimated based on time and weather)
   */
  async getCurrentOutput(id) {
    const pvSystem = await this.getById(id);
    if (!pvSystem) throw new Error('PV system not found');

    // Get latest weather data if available
    let irradiance = 500; // Default W/m²
    if (pvSystem.location_id) {
      const { data: weather } = await supabase
        .from('weather_data')
        .select('irradiance_wm2')
        .eq('location_id', pvSystem.location_id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (weather?.irradiance_wm2) {
        irradiance = weather.irradiance_wm2;
      }
    }

    // Simple production estimate: capacity * irradiance_ratio * efficiency
    const maxIrradiance = 1000; // W/m² at peak sun
    const irradianceRatio = Math.min(irradiance / maxIrradiance, 1);
    const currentOutput = pvSystem.capacity_kw * irradianceRatio * pvSystem.inverter_efficiency;

    return {
      pv_system_id: id,
      current_output_kw: Math.round(currentOutput * 1000) / 1000,
      capacity_kw: pvSystem.capacity_kw,
      irradiance_wm2: irradiance,
      efficiency: pvSystem.inverter_efficiency,
      timestamp: new Date().toISOString()
    };
  }
};

export default pvSystemsService;
