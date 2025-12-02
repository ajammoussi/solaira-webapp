/**
 * Supabase Database Types
 * Auto-generated types for TypeScript (can be generated via Supabase CLI)
 */

// ============================================================
// ENUMS
// ============================================================

export type AlertType = 
  | 'BATTERY_FULL'
  | 'BATTERY_LOW'
  | 'EXCESS_PRODUCTION'
  | 'HIGH_CONSUMPTION'
  | 'LOW_CONSUMPTION'
  | 'FORECAST_DEPLETION';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type TiltStrategy = 'fixed' | 'monthly_optimized' | 'tracking';

// ============================================================
// DATABASE TABLES
// ============================================================

export interface Profile {
  id: string;
  display_name: string | null;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  elevation_m: number;
  created_at: string;
  updated_at: string;
}

export interface PVSystem {
  id: string;
  user_id: string;
  location_id: string | null;
  name: string;
  capacity_kw: number;
  azimuth: number;
  tilt_strategy: TiltStrategy;
  fixed_tilt: number;
  inverter_efficiency: number;
  panel_count: number;
  panel_wattage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Battery {
  id: string;
  user_id: string;
  name: string;
  capacity_kwh: number;
  max_charge_kw: number;
  max_discharge_kw: number;
  current_soc_percent: number;
  min_soc_percent: number;
  max_soc_percent: number;
  charge_efficiency: number;
  discharge_efficiency: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoadProfile {
  id: string;
  user_id: string;
  name: string;
  base_load_kw: number;
  peak_load_kw: number | null;
  hourly_multipliers: number[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherData {
  id: number;
  location_id: string;
  timestamp: string;
  irradiance_wm2: number | null;
  temperature_c: number | null;
  cloud_cover_percent: number | null;
  wind_speed_ms: number | null;
  humidity_percent: number | null;
  source: string;
  created_at: string;
}

export interface EnergySnapshot {
  id: number;
  user_id: string;
  pv_system_id: string | null;
  battery_id: string | null;
  timestamp: string;
  production_kw: number;
  consumption_kw: number;
  battery_soc_percent: number | null;
  battery_charge_kw: number;
  surplus_energy_kw: number;
  created_at: string;
}

export interface ConsumptionRecord {
  id: number;
  user_id: string;
  battery_id: string | null;
  load_profile_id: string | null;
  timestamp: string;
  load_kw: number;
  battery_soc_before: number | null;
  battery_soc_after: number | null;
  created_at: string;
}

export interface ProductionForecast {
  id: string;
  user_id: string;
  pv_system_id: string | null;
  target_date: string;
  predicted_production_kwh: number;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_type: string;
  created_at: string;
}

export interface ConsumptionForecast {
  id: string;
  user_id: string;
  target_date: string;
  predicted_consumption_kwh: number;
  confidence_lower: number | null;
  confidence_upper: number | null;
  model_type: string;
  created_at: string;
}

export interface BatteryLevelForecast {
  id: string;
  user_id: string;
  battery_id: string | null;
  target_date: string;
  predicted_soc_percent: number;
  will_deplete: boolean;
  days_until_depletion: number | null;
  created_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
}

export interface EnergyRecommendation {
  id: string;
  alert_id: string | null;
  user_id: string;
  recommendation_text: string;
  alternative_uses: string[];
  is_applied: boolean;
  created_at: string;
}

// ============================================================
// INSERT TYPES (for creating new records)
// ============================================================

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'>;
export type LocationInsert = Omit<Location, 'id' | 'created_at' | 'updated_at'>;
export type PVSystemInsert = Omit<PVSystem, 'id' | 'created_at' | 'updated_at'>;
export type BatteryInsert = Omit<Battery, 'id' | 'created_at' | 'updated_at'>;
export type LoadProfileInsert = Omit<LoadProfile, 'id' | 'created_at' | 'updated_at'>;
export type WeatherDataInsert = Omit<WeatherData, 'id' | 'created_at'>;
export type EnergySnapshotInsert = Omit<EnergySnapshot, 'id' | 'created_at'>;
export type ConsumptionRecordInsert = Omit<ConsumptionRecord, 'id' | 'created_at'>;
export type ProductionForecastInsert = Omit<ProductionForecast, 'id' | 'created_at'>;
export type ConsumptionForecastInsert = Omit<ConsumptionForecast, 'id' | 'created_at'>;
export type BatteryLevelForecastInsert = Omit<BatteryLevelForecast, 'id' | 'created_at'>;
export type AlertInsert = Omit<Alert, 'id' | 'created_at' | 'read_at'>;
export type EnergyRecommendationInsert = Omit<EnergyRecommendation, 'id' | 'created_at'>;

// ============================================================
// UPDATE TYPES (for partial updates)
// ============================================================

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;
export type LocationUpdate = Partial<Omit<Location, 'id' | 'user_id' | 'created_at'>>;
export type PVSystemUpdate = Partial<Omit<PVSystem, 'id' | 'user_id' | 'created_at'>>;
export type BatteryUpdate = Partial<Omit<Battery, 'id' | 'user_id' | 'created_at'>>;
export type LoadProfileUpdate = Partial<Omit<LoadProfile, 'id' | 'user_id' | 'created_at'>>;
export type AlertUpdate = Partial<Pick<Alert, 'is_read' | 'is_dismissed' | 'read_at'>>;
