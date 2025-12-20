# Solar System Setup Implementation

## Overview
This document describes the implementation of the solar system configuration feature that links users with their unique solar system specifications via Supabase.

## Features Implemented

### 1. User-Specific Solar System Configuration
- Each user has their own unique solar system specs stored in Supabase
- Multiple panel configurations supported (2, 4, 8, 10, 12, 16 panels)
- System data stored in `pv_systems` table with user_id foreign key

### 2. Mandatory First-Time Setup
- On first login, users see a mandatory setup modal
- Modal cannot be skipped - user must complete configuration
- Three-step setup process:
  1. Solar Panel Configuration (number of panels, azimuth, tilt)
  2. Battery Configuration (capacity in kWh)
  3. Consumption Profile (Home PV System - standard profile)

### 3. Consumption Profiles
- Uses a standard Home PV System profile by default (20.1 kWh avg consumption)
- Load profiles are stored in `load_profiles`, and can be set or updated via the `/api/solar-config` endpoint

### 4. Database Schema
All data is stored in Supabase tables:
- `pv_systems` - User's solar panel configurations
- `batteries` - User's battery configurations
- `load_profiles` - User's consumption profiles
- All tables linked via `user_id` foreign key to `profiles` table

## API Endpoints

### POST/PUT `/api/solar-config`
Creates or updates solar system configuration.

**Request Body:**
```json
{
  "pv_system": {
    "name": "My Solar System",
    "capacity_kw": 4.4,
    "panel_count": 10,
    "azimuth": 180,
    "fixed_tilt": 30,
    "tilt_strategy": "fixed",
    "inverter_efficiency": 0.96,
    "panel_wattage": 400
  },
  "battery": {
    "name": "My Battery",
    "capacity_kwh": 13.5,
    "max_charge_kw": 5.0,
    "max_discharge_kw": 5.0,
    "current_soc_percent": 50,
    "min_soc_percent": 20,
    "max_soc_percent": 95,
    "charge_efficiency": 0.95,
    "discharge_efficiency": 0.95
  },
  "load_profile": {
    "name": "My Consumption Profile",
    "base_load_kw": 0.5,
    "peak_load_kw": 3.0,
    "hourly_multipliers": [0.3, 0.2, ...]
  },

}
```

### Setup completion
The setup completion flag is stored in the user's profile preferences (e.g. `preferences.setup_completed`). Frontend code should rely on the profile state to determine whether to show the first-time setup modal (no separate `/api/solar-config/check` endpoint is required).

(Raspberry Pi device ID management sections removed — system no longer validates or requires device IDs. To add device-based ingestion in the future, implement a proper backend device registry with secure device registration.)

## Components

### `SolarSetupModal`
- Mandatory setup modal for first-time users
- Three-step wizard interface
- Cannot be closed without completing setup
- Validates device IDs for Raspberry Pi integration

### Updated `Account` Page
- Checks setup status on mount
- Shows setup modal if not complete
- Updated solar configuration form
- Raspberry Pi integration for consumption profiles
- "Add via Raspberry Pi" button for consumption profiles

## User Flow

1. **First Login:**
   - User logs in
   - System checks if setup is complete
   - If not complete, setup modal appears (cannot be skipped)
   - User completes 3-step setup
   - Configuration saved to Supabase
   - Modal closes, user can access account page

2. **Subsequent Logins:**
   - Setup check passes
   - User sees account page with existing configuration
   - Can update configuration at any time

3. **Adding Raspberry Pi Device:**
   - User clicks "Add via Raspberry Pi" button
   - Modal appears asking for device ID
   - User enters device ID (e.g., RP-001)
   - System validates device ID
   - If valid: Device linked, profile created
   - If invalid: Error shown "Device ID not recognized"

## Database Tables Used

### `pv_systems`
- Stores user's solar panel configurations
- Fields: user_id, name, capacity_kw, panel_count, azimuth, tilt, etc.

### `batteries`
- Stores user's battery configurations
- Fields: user_id, name, capacity_kwh, max_charge_kw, etc.

### `load_profiles`
- Stores user's consumption profiles
- Fields: user_id, name, base_load_kw, peak_load_kw, hourly_multipliers
- Can be created via Raspberry Pi device ID

### `profiles`
- User profile table
- Updated with `preferences.setup_completed: true` after setup

## Security

- All API endpoints protected with `withApiAuth`
- Row Level Security (RLS) policies ensure users can only access their own data
- Device ID validation prevents unauthorized device linking
- All requests require valid authentication token

## Testing

To test the implementation:

1. **First-time user:**
   - Create new account
   - Login should show setup modal
   - Complete setup process
   - Verify data saved in Supabase

2. **Raspberry Pi integration:**
   - Try valid device ID (e.g., RP-001) - should succeed
   - Try invalid device ID (e.g., RP-999) - should show error
   - Verify consumption profile created in database

3. **Update configuration:**
   - Login as existing user
   - Update solar system configuration
   - Verify changes saved correctly

## Future Enhancements

1. Move device IDs to database table for easier management
2. Add device ID registration/admin interface
3. Support multiple PV systems per user
4. Add location configuration (latitude/longitude)
5. Import consumption data from Raspberry Pi devices

