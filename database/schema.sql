-- ============================================================
-- SOLAIRA ENERGY MANAGEMENT SYSTEM - SUPABASE SCHEMA
-- ============================================================
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE alert_type AS ENUM (
  'BATTERY_FULL',
  'BATTERY_LOW', 
  'EXCESS_PRODUCTION',
  'HIGH_CONSUMPTION',
  'LOW_CONSUMPTION',
  'FORECAST_DEPLETION'
);

CREATE TYPE alert_severity AS ENUM (
  'info',
  'warning',
  'critical'
);

CREATE TYPE tilt_strategy AS ENUM (
  'fixed',
  'monthly_optimized',
  'tracking'
);

-- ============================================================
-- PROFILES (extends Supabase Auth)
-- ============================================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  email TEXT,
  phone_number TEXT,
  timezone TEXT DEFAULT 'UTC+01:00',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOCATIONS
-- ============================================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  elevation_m NUMERIC(8, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PV SYSTEMS (Energy Production)
-- ============================================================

CREATE TABLE pv_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  capacity_kw NUMERIC(10, 3) NOT NULL CHECK (capacity_kw > 0),
  azimuth NUMERIC(5, 2) DEFAULT 180 CHECK (azimuth BETWEEN 0 AND 360),
  tilt_strategy tilt_strategy DEFAULT 'fixed',
  fixed_tilt NUMERIC(5, 2) DEFAULT 30 CHECK (fixed_tilt BETWEEN 0 AND 90),
  inverter_efficiency NUMERIC(4, 3) DEFAULT 0.96 CHECK (inverter_efficiency BETWEEN 0 AND 1),
  panel_count INTEGER NOT NULL CHECK (panel_count > 0),
  panel_wattage NUMERIC(8, 2) DEFAULT 400,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BATTERIES (Energy Storage)
-- ============================================================

CREATE TABLE batteries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  capacity_kwh NUMERIC(10, 3) NOT NULL CHECK (capacity_kwh > 0),
  max_charge_kw NUMERIC(10, 3) NOT NULL CHECK (max_charge_kw > 0),
  max_discharge_kw NUMERIC(10, 3) NOT NULL CHECK (max_discharge_kw > 0),
  current_soc_percent NUMERIC(5, 2) DEFAULT 50 CHECK (current_soc_percent BETWEEN 0 AND 100),
  min_soc_percent NUMERIC(5, 2) DEFAULT 20 CHECK (min_soc_percent BETWEEN 0 AND 100),
  max_soc_percent NUMERIC(5, 2) DEFAULT 95 CHECK (max_soc_percent BETWEEN 0 AND 100),
  charge_efficiency NUMERIC(4, 3) DEFAULT 0.95 CHECK (charge_efficiency BETWEEN 0 AND 1),
  discharge_efficiency NUMERIC(4, 3) DEFAULT 0.95 CHECK (discharge_efficiency BETWEEN 0 AND 1),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOAD PROFILES (Energy Consumption Patterns)
-- ============================================================

CREATE TABLE load_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  base_load_kw NUMERIC(10, 3) NOT NULL CHECK (base_load_kw >= 0),
  peak_load_kw NUMERIC(10, 3) CHECK (peak_load_kw >= 0),
  hourly_multipliers NUMERIC(4, 3)[] DEFAULT ARRAY[
    0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 0.7, 0.8, 0.6, 0.5, 0.5, 0.5,
    0.6, 0.5, 0.5, 0.6, 0.7, 0.9, 1.0, 0.9, 0.8, 0.6, 0.5, 0.4
  ],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WEATHER DATA
-- ============================================================

CREATE TABLE weather_data (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  irradiance_wm2 NUMERIC(8, 2) CHECK (irradiance_wm2 >= 0),
  temperature_c NUMERIC(5, 2),
  cloud_cover_percent NUMERIC(5, 2) CHECK (cloud_cover_percent BETWEEN 0 AND 100),
  wind_speed_ms NUMERIC(6, 2) CHECK (wind_speed_ms >= 0),
  humidity_percent NUMERIC(5, 2) CHECK (humidity_percent BETWEEN 0 AND 100),
  source TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(location_id, timestamp)
);

-- ============================================================
-- ENERGY SNAPSHOTS (Real-time Tracking)
-- ============================================================

CREATE TABLE energy_snapshots (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pv_system_id UUID REFERENCES pv_systems(id) ON DELETE SET NULL,
  battery_id UUID REFERENCES batteries(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  production_kw NUMERIC(10, 3) DEFAULT 0 CHECK (production_kw >= 0),
  consumption_kw NUMERIC(10, 3) DEFAULT 0 CHECK (consumption_kw >= 0),
  battery_soc_percent NUMERIC(5, 2) CHECK (battery_soc_percent BETWEEN 0 AND 100),
  battery_charge_kw NUMERIC(10, 3) DEFAULT 0,
  surplus_energy_kw NUMERIC(10, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_energy_snapshots_user_time ON energy_snapshots(user_id, timestamp DESC);
CREATE INDEX idx_energy_snapshots_timestamp ON energy_snapshots(timestamp DESC);

-- ============================================================
-- CONSUMPTION RECORDS
-- ============================================================

CREATE TABLE consumption_records (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  battery_id UUID REFERENCES batteries(id) ON DELETE SET NULL,
  load_profile_id UUID REFERENCES load_profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  load_kw NUMERIC(10, 3) NOT NULL CHECK (load_kw >= 0),
  battery_soc_before NUMERIC(5, 2) CHECK (battery_soc_before BETWEEN 0 AND 100),
  battery_soc_after NUMERIC(5, 2) CHECK (battery_soc_after BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_consumption_records_user_time ON consumption_records(user_id, timestamp DESC);

-- ============================================================
-- FORECASTS - Production
-- ============================================================

CREATE TABLE production_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pv_system_id UUID REFERENCES pv_systems(id) ON DELETE SET NULL,
  target_date DATE NOT NULL,
  predicted_production_kwh NUMERIC(10, 3) NOT NULL CHECK (predicted_production_kwh >= 0),
  confidence_lower NUMERIC(10, 3),
  confidence_upper NUMERIC(10, 3),
  model_type TEXT DEFAULT 'xgboost',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, pv_system_id, target_date, model_type)
);

-- ============================================================
-- FORECASTS - Consumption
-- ============================================================

CREATE TABLE consumption_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  target_date DATE NOT NULL,
  predicted_consumption_kwh NUMERIC(10, 3) NOT NULL CHECK (predicted_consumption_kwh >= 0),
  confidence_lower NUMERIC(10, 3),
  confidence_upper NUMERIC(10, 3),
  model_type TEXT DEFAULT 'xgboost',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, target_date, model_type)
);

-- ============================================================
-- FORECASTS - Battery Level
-- ============================================================

CREATE TABLE battery_level_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  battery_id UUID REFERENCES batteries(id) ON DELETE SET NULL,
  target_date DATE NOT NULL,
  predicted_soc_percent NUMERIC(5, 2) NOT NULL CHECK (predicted_soc_percent BETWEEN 0 AND 100),
  will_deplete BOOLEAN DEFAULT FALSE,
  days_until_depletion INTEGER CHECK (days_until_depletion >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, battery_id, target_date)
);

-- ============================================================
-- ALERTS
-- ============================================================

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type alert_type NOT NULL,
  severity alert_severity DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_user_unread ON alerts(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_user_time ON alerts(user_id, created_at DESC);

-- ============================================================
-- ENERGY RECOMMENDATIONS
-- ============================================================

CREATE TABLE energy_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recommendation_text TEXT NOT NULL,
  alternative_uses TEXT[] DEFAULT '{}',
  is_applied BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pv_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE batteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE load_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE battery_level_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_recommendations ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- All other tables: users can only access their own data
CREATE POLICY "Users own their locations" ON locations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their pv_systems" ON pv_systems FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their batteries" ON batteries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their load_profiles" ON load_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their energy_snapshots" ON energy_snapshots FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their consumption_records" ON consumption_records FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their production_forecasts" ON production_forecasts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their consumption_forecasts" ON consumption_forecasts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their battery_level_forecasts" ON battery_level_forecasts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their alerts" ON alerts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their energy_recommendations" ON energy_recommendations FOR ALL USING (auth.uid() = user_id);

-- Weather data: accessible by location owners
CREATE POLICY "Users access weather for their locations" ON weather_data FOR ALL 
  USING (location_id IN (SELECT id FROM locations WHERE user_id = auth.uid()));

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pv_systems_updated_at BEFORE UPDATE ON pv_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_batteries_updated_at BEFORE UPDATE ON batteries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_load_profiles_updated_at BEFORE UPDATE ON load_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, email, phone_number)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'display_name', 
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      NEW.email
    ),
    NEW.email,
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- REALTIME SUBSCRIPTIONS
-- ============================================================

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE energy_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE batteries;
