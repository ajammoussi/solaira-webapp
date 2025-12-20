/**
 * Solar System Configuration API
 * Handles creation/update of PV systems, batteries, and load profiles
 * Links to authenticated user via Supabase
 */

import { withApiAuth } from '../../lib/auth/apiMiddleware';

// Valid Raspberry Pi device IDs (capped/managed list)
// In production, this could be stored in a database table
const VALID_DEVICE_IDS = new Set([
  'RP-001', 'RP-002', 'RP-003', 'RP-004', 'RP-005',
  'RP-100', 'RP-101', 'RP-102', 'RP-103', 'RP-104',
  'RP-200', 'RP-201', 'RP-202', 'RP-203', 'RP-204',
  // Add more valid IDs as needed
]);

function validateDeviceId(deviceId) {
  if (!deviceId || typeof deviceId !== 'string') {
    return { valid: false, error: 'Device ID is required' };
  }
  
  const normalizedId = deviceId.trim().toUpperCase();
  
  if (!VALID_DEVICE_IDS.has(normalizedId)) {
    return { valid: false, error: 'Device ID not recognized. Please check your Raspberry Pi device ID.' };
  }
  
  return { valid: true, deviceId: normalizedId };
}

async function handler(req, res) {
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  if (req.method !== 'POST' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = req.user.id;
    const { pv_system, battery, load_profile, device_id } = req.body;

    console.log(`[solar-config][${requestId}] ${req.method} requested`, {
      userId,
      hasPvSystem: !!pv_system,
      hasBattery: !!battery,
      hasLoadProfile: !!load_profile,
      deviceId: device_id,
    });

    const results = {
      pv_system: null,
      battery: null,
      load_profile: null,
      errors: [],
    };

    // Handle PV System creation/update
    if (pv_system) {
      try {
        const pvData = {
          user_id: userId,
          name: pv_system.name || 'My Solar System',
          capacity_kw: parseFloat(pv_system.capacity_kw) || 0,
          azimuth: parseFloat(pv_system.azimuth) || 180,
          tilt_strategy: pv_system.tilt_strategy || 'fixed',
          fixed_tilt: parseFloat(pv_system.fixed_tilt) || 30,
          inverter_efficiency: parseFloat(pv_system.inverter_efficiency) || 0.96,
          panel_count: parseInt(pv_system.panel_count) || 10,
          panel_wattage: parseFloat(pv_system.panel_wattage) || 400,
          is_active: true,
        };

        // Check if user already has a PV system
        const { data: existingPv } = await req.supabase
          .from('pv_systems')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (existingPv && req.method === 'PUT') {
          // Update existing
          const { data, error } = await req.supabase
            .from('pv_systems')
            .update(pvData)
            .eq('id', existingPv.id)
            .select()
            .single();

          if (error) throw error;
          results.pv_system = data;
        } else {
          // Create new
          const { data, error } = await req.supabase
            .from('pv_systems')
            .insert(pvData)
            .select()
            .single();

          if (error) throw error;
          results.pv_system = data;
        }
      } catch (error) {
        console.error(`[solar-config][${requestId}] PV system error`, error);
        results.errors.push(`PV System: ${error.message}`);
      }
    }

    // Handle Battery creation/update
    if (battery) {
      try {
        const batteryData = {
          user_id: userId,
          name: battery.name || 'My Battery',
          capacity_kwh: parseFloat(battery.capacity_kwh) || 13.5,
          max_charge_kw: parseFloat(battery.max_charge_kw) || 5.0,
          max_discharge_kw: parseFloat(battery.max_discharge_kw) || 5.0,
          current_soc_percent: parseFloat(battery.current_soc_percent) || 50,
          min_soc_percent: parseFloat(battery.min_soc_percent) || 20,
          max_soc_percent: parseFloat(battery.max_soc_percent) || 95,
          charge_efficiency: parseFloat(battery.charge_efficiency) || 0.95,
          discharge_efficiency: parseFloat(battery.discharge_efficiency) || 0.95,
          is_active: true,
        };

        // Check if user already has a battery
        const { data: existingBattery } = await req.supabase
          .from('batteries')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (existingBattery && req.method === 'PUT') {
          // Update existing
          const { data, error } = await req.supabase
            .from('batteries')
            .update(batteryData)
            .eq('id', existingBattery.id)
            .select()
            .single();

          if (error) throw error;
          results.battery = data;
        } else {
          // Create new
          const { data, error } = await req.supabase
            .from('batteries')
            .insert(batteryData)
            .select()
            .single();

          if (error) throw error;
          results.battery = data;
        }
      } catch (error) {
        console.error(`[solar-config][${requestId}] Battery error`, error);
        results.errors.push(`Battery: ${error.message}`);
      }
    }

    // Handle Load Profile creation (via Raspberry Pi)
    if (load_profile) {
      try {
        // Validate device ID if provided
        if (device_id) {
          const validation = validateDeviceId(device_id);
          if (!validation.valid) {
            throw new Error(validation.error);
          }
        }

        const loadProfileData = {
          user_id: userId,
          name: load_profile.name || 'My Consumption Profile',
          base_load_kw: parseFloat(load_profile.base_load_kw) || 0.5,
          peak_load_kw: parseFloat(load_profile.peak_load_kw) || 3.0,
          hourly_multipliers: load_profile.hourly_multipliers || [
            0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.7, 0.8, 0.6, 0.5, 0.5, 0.5,
            0.6, 0.5, 0.5, 0.6, 0.7, 0.9, 1.0, 0.9, 0.8, 0.6, 0.5, 0.4
          ],
          is_active: true,
        };

        // Check if user already has an active load profile
        const { data: existingProfile } = await req.supabase
          .from('load_profiles')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (existingProfile && req.method === 'PUT') {
          // Update existing
          const { data, error } = await req.supabase
            .from('load_profiles')
            .update(loadProfileData)
            .eq('id', existingProfile.id)
            .select()
            .single();

          if (error) throw error;
          results.load_profile = data;
        } else {
          // Create new
          const { data, error } = await req.supabase
            .from('load_profiles')
            .insert(loadProfileData)
            .select()
            .single();

          if (error) throw error;
          results.load_profile = data;
        }
      } catch (error) {
        console.error(`[solar-config][${requestId}] Load profile error`, error);
        results.errors.push(`Load Profile: ${error.message}`);
      }
    }

    // Mark setup as complete in profile
    if (results.pv_system || results.battery || results.load_profile) {
      try {
        await req.supabase
          .from('profiles')
          .update({ 
            preferences: { setup_completed: true },
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (error) {
        console.warn(`[solar-config][${requestId}] Failed to update setup flag`, error);
      }
    }

    if (results.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Some configurations failed',
        details: results.errors,
        results 
      });
    }

    console.log(`[solar-config][${requestId}] success`);
    return res.status(200).json({ data: results });
  } catch (error) {
    console.error(`[solar-config][${requestId}] unexpected error`, error);
    return res.status(500).json({ error: 'Internal Server Error', message: error?.message });
  }
}

export default withApiAuth(handler, { allowGuest: false });

