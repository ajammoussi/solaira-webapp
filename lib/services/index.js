/**
 * Services Index
 * Central export for all API services
 */

export { authService } from './auth';
export { pvSystemsService } from './pvSystems';
export { batteriesService } from './batteries';
export { energyService } from './energy';
export { alertsService } from './alerts';
export { forecastsService } from './forecasts';

// Re-export supabase client for direct access if needed
export { supabase, createServerClient } from '../supabase';
