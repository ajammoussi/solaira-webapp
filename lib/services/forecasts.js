/**
 * Forecasts API Service
 * Handles production, consumption, and battery forecasts
 */

import { supabase } from '../supabase';

export const forecastsService = {
  /**
   * Get production forecasts for a PV system
   */
  async getProductionForecasts(pvSystemId, hours = 48) {
    const { data, error } = await supabase
      .from('production_forecasts')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .gte('forecast_time', new Date().toISOString())
      .order('forecast_time', { ascending: true })
      .limit(hours);

    if (error) throw error;
    return data;
  },

  /**
   * Get consumption forecasts for a PV system
   */
  async getConsumptionForecasts(pvSystemId, hours = 48) {
    const { data, error } = await supabase
      .from('consumption_forecasts')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .gte('forecast_time', new Date().toISOString())
      .order('forecast_time', { ascending: true })
      .limit(hours);

    if (error) throw error;
    return data;
  },

  /**
   * Get battery level forecasts
   */
  async getBatteryForecasts(batteryId, hours = 48) {
    const { data, error } = await supabase
      .from('battery_level_forecasts')
      .select('*')
      .eq('battery_id', batteryId)
      .gte('forecast_time', new Date().toISOString())
      .order('forecast_time', { ascending: true })
      .limit(hours);

    if (error) throw error;
    return data;
  },

  /**
   * Get combined energy forecast (production + consumption + battery)
   */
  async getCombinedForecast(pvSystemId, batteryId, hours = 48) {
    const [production, consumption, battery] = await Promise.all([
      this.getProductionForecasts(pvSystemId, hours),
      this.getConsumptionForecasts(pvSystemId, hours),
      batteryId ? this.getBatteryForecasts(batteryId, hours) : Promise.resolve([])
    ]);

    // Merge forecasts by hour
    const combined = {};
    
    production.forEach(p => {
      const hour = p.forecast_time.slice(0, 13); // YYYY-MM-DDTHH
      if (!combined[hour]) combined[hour] = { hour };
      combined[hour].production_kw = p.predicted_kw;
      combined[hour].production_confidence = p.confidence;
    });

    consumption.forEach(c => {
      const hour = c.forecast_time.slice(0, 13);
      if (!combined[hour]) combined[hour] = { hour };
      combined[hour].consumption_kw = c.predicted_kw;
      combined[hour].consumption_confidence = c.confidence;
    });

    battery.forEach(b => {
      const hour = b.forecast_time.slice(0, 13);
      if (!combined[hour]) combined[hour] = { hour };
      combined[hour].battery_soc_percent = b.predicted_soc_percent;
    });

    return Object.values(combined).sort((a, b) => a.hour.localeCompare(b.hour));
  },

  /**
   * Generate simple forecasts based on historical data
   * This is a placeholder - real implementation would use ML models
   */
  async generateForecasts(pvSystemId, batteryId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get PV system details
    const { data: pvSystem } = await supabase
      .from('pv_systems')
      .select('*, location:locations(*)')
      .eq('id', pvSystemId)
      .single();

    if (!pvSystem) throw new Error('PV system not found');

    // Generate hourly forecasts for next 48 hours
    const now = new Date();
    const forecasts = {
      production: [],
      consumption: [],
      battery: []
    };

    for (let h = 0; h < 48; h++) {
      const forecastTime = new Date(now.getTime() + h * 60 * 60 * 1000);
      const hour = forecastTime.getHours();

      // Simple sinusoidal production model (peaks at noon)
      let productionKw = 0;
      if (hour >= 6 && hour <= 20) {
        const hourFromNoon = Math.abs(hour - 13);
        const sunFactor = Math.cos((hourFromNoon / 7) * Math.PI / 2);
        productionKw = pvSystem.capacity_kw * sunFactor * 0.8; // 80% efficiency factor
        productionKw = Math.max(0, productionKw);
      }

      // Simple consumption model (higher in morning and evening)
      let consumptionKw = 1.5; // Base load
      if (hour >= 6 && hour <= 9) consumptionKw = 3.5; // Morning peak
      if (hour >= 17 && hour <= 21) consumptionKw = 4.0; // Evening peak
      if (hour >= 22 || hour <= 5) consumptionKw = 1.0; // Night

      forecasts.production.push({
        pv_system_id: pvSystemId,
        forecast_time: forecastTime.toISOString(),
        predicted_kw: Math.round(productionKw * 100) / 100,
        confidence: 0.75 - (h * 0.01) // Confidence decreases over time
      });

      forecasts.consumption.push({
        pv_system_id: pvSystemId,
        forecast_time: forecastTime.toISOString(),
        predicted_kw: Math.round(consumptionKw * 100) / 100,
        confidence: 0.8 - (h * 0.005)
      });
    }

    // Insert production forecasts
    if (forecasts.production.length > 0) {
      await supabase
        .from('production_forecasts')
        .upsert(forecasts.production, { 
          onConflict: 'pv_system_id,forecast_time',
          ignoreDuplicates: false 
        });
    }

    // Insert consumption forecasts
    if (forecasts.consumption.length > 0) {
      await supabase
        .from('consumption_forecasts')
        .upsert(forecasts.consumption, {
          onConflict: 'pv_system_id,forecast_time',
          ignoreDuplicates: false
        });
    }

    // Generate battery forecasts if battery exists
    if (batteryId) {
      const { data: battery } = await supabase
        .from('batteries')
        .select('*')
        .eq('id', batteryId)
        .single();

      if (battery) {
        let currentSoc = (battery.current_charge_kwh / battery.capacity_kwh) * 100;

        for (let h = 0; h < 48; h++) {
          const forecastTime = new Date(now.getTime() + h * 60 * 60 * 1000);
          const netEnergy = forecasts.production[h].predicted_kw - forecasts.consumption[h].predicted_kw;
          
          // Simple battery model
          const chargeChange = (netEnergy / battery.capacity_kwh) * 100;
          currentSoc = Math.max(0, Math.min(100, currentSoc + chargeChange));

          forecasts.battery.push({
            battery_id: batteryId,
            forecast_time: forecastTime.toISOString(),
            predicted_soc_percent: Math.round(currentSoc * 10) / 10,
            confidence: 0.7 - (h * 0.01)
          });
        }

        await supabase
          .from('battery_level_forecasts')
          .upsert(forecasts.battery, {
            onConflict: 'battery_id,forecast_time',
            ignoreDuplicates: false
          });
      }
    }

    return {
      generated: true,
      production_count: forecasts.production.length,
      consumption_count: forecasts.consumption.length,
      battery_count: forecasts.battery.length
    };
  },

  /**
   * Get energy recommendations based on forecasts
   */
  async getRecommendations(pvSystemId) {
    const { data, error } = await supabase
      .from('energy_recommendations')
      .select('*')
      .eq('pv_system_id', pvSystemId)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) throw error;
    return data;
  },

  /**
   * Generate recommendations based on current state and forecasts
   */
  async generateRecommendations(pvSystemId, batteryId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const recommendations = [];
    const now = new Date();

    // Get upcoming forecasts
    const forecast = await this.getCombinedForecast(pvSystemId, batteryId, 24);
    
    if (forecast.length > 0) {
      // Find peak production hours
      const productionPeak = forecast.reduce((max, f) => 
        (f.production_kw || 0) > (max.production_kw || 0) ? f : max, forecast[0]);

      if (productionPeak.production_kw > 2) {
        recommendations.push({
          user_id: user.id,
          pv_system_id: pvSystemId,
          recommendation_type: 'schedule_load',
          title: 'Optimal Time for High-Power Appliances',
          description: `Peak production of ${productionPeak.production_kw.toFixed(1)} kW expected at ${productionPeak.hour.slice(11)}:00. Consider running washing machine, dishwasher, or EV charging.`,
          priority: 1,
          valid_from: now.toISOString(),
          valid_until: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Check for low production periods
      const lowProductionHours = forecast.filter(f => 
        f.production_kw < 1 && f.consumption_kw > 2
      );

      if (lowProductionHours.length > 3) {
        recommendations.push({
          user_id: user.id,
          pv_system_id: pvSystemId,
          recommendation_type: 'reduce_consumption',
          title: 'Grid Dependency Warning',
          description: `Low production expected for ${lowProductionHours.length} hours. Consider reducing consumption or pre-charging battery.`,
          priority: 2,
          valid_from: now.toISOString(),
          valid_until: new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString()
        });
      }

      // Battery optimization recommendation
      if (batteryId) {
        const morningForecast = forecast.filter(f => {
          const hour = parseInt(f.hour.slice(11));
          return hour >= 6 && hour <= 10;
        });

        const avgMorningProduction = morningForecast.reduce((sum, f) => 
          sum + (f.production_kw || 0), 0) / morningForecast.length;

        if (avgMorningProduction > 3) {
          recommendations.push({
            user_id: user.id,
            pv_system_id: pvSystemId,
            recommendation_type: 'battery_strategy',
            title: 'Battery Charging Strategy',
            description: 'High morning production expected. Consider discharging battery overnight to maximize solar charging capacity.',
            priority: 3,
            valid_from: now.toISOString(),
            valid_until: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }

    // Deactivate old recommendations
    await supabase
      .from('energy_recommendations')
      .update({ is_active: false })
      .eq('pv_system_id', pvSystemId)
      .eq('is_active', true)
      .lt('valid_until', now.toISOString());

    // Insert new recommendations
    if (recommendations.length > 0) {
      await supabase
        .from('energy_recommendations')
        .insert(recommendations);
    }

    return recommendations;
  }
};

export default forecastsService;
