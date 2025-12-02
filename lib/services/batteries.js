/**
 * Batteries API Service
 * Handles all battery CRUD operations and state management
 */

import { supabase } from '../supabase';

export const batteriesService = {
  /**
   * Get all batteries for current user
   */
  async getAll() {
    const { data, error } = await supabase
      .from('batteries')
      .select(`
        *,
        pv_system:pv_systems(id, name, capacity_kw)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  /**
   * Get a single battery by ID
   */
  async getById(id) {
    const { data, error } = await supabase
      .from('batteries')
      .select(`
        *,
        pv_system:pv_systems(id, name, capacity_kw)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Create a new battery
   */
  async create(battery) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('batteries')
      .insert({
        ...battery,
        user_id: user.id,
        current_charge_kwh: battery.current_charge_kwh || 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a battery
   */
  async update(id, updates) {
    const { data, error } = await supabase
      .from('batteries')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete a battery
   */
  async delete(id) {
    const { error } = await supabase
      .from('batteries')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  /**
   * Get current state of charge (SOC) percentage
   */
  async getSOC(id) {
    const battery = await this.getById(id);
    if (!battery) throw new Error('Battery not found');

    const soc = (battery.current_charge_kwh / battery.capacity_kwh) * 100;
    return {
      battery_id: id,
      current_charge_kwh: battery.current_charge_kwh,
      capacity_kwh: battery.capacity_kwh,
      soc_percent: Math.round(soc * 10) / 10,
      timestamp: new Date().toISOString()
    };
  },

  /**
   * Charge the battery (add energy)
   * @param {string} id - Battery ID
   * @param {number} amountKwh - Amount to charge in kWh
   */
  async charge(id, amountKwh) {
    const battery = await this.getById(id);
    if (!battery) throw new Error('Battery not found');

    // Apply charging efficiency
    const effectiveCharge = amountKwh * battery.round_trip_efficiency;
    const newCharge = Math.min(
      battery.current_charge_kwh + effectiveCharge,
      battery.capacity_kwh
    );

    const { data, error } = await supabase
      .from('batteries')
      .update({ current_charge_kwh: newCharge })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      charged_kwh: newCharge - battery.current_charge_kwh,
      soc_percent: (newCharge / battery.capacity_kwh) * 100
    };
  },

  /**
   * Discharge the battery (remove energy)
   * @param {string} id - Battery ID
   * @param {number} amountKwh - Amount to discharge in kWh
   */
  async discharge(id, amountKwh) {
    const battery = await this.getById(id);
    if (!battery) throw new Error('Battery not found');

    const newCharge = Math.max(
      battery.current_charge_kwh - amountKwh,
      0
    );

    const { data, error } = await supabase
      .from('batteries')
      .update({ current_charge_kwh: newCharge })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      discharged_kwh: battery.current_charge_kwh - newCharge,
      soc_percent: (newCharge / battery.capacity_kwh) * 100
    };
  },

  /**
   * Get battery level forecasts
   */
  async getForecasts(id, hours = 24) {
    const { data, error } = await supabase
      .from('battery_level_forecasts')
      .select('*')
      .eq('battery_id', id)
      .gte('forecast_time', new Date().toISOString())
      .order('forecast_time', { ascending: true })
      .limit(hours);

    if (error) throw error;
    return data;
  }
};

export default batteriesService;
