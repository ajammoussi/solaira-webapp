/**
 * Code invariants — timers, thresholds and limits.
 *
 * These are deliberately NOT environment variables: they are implementation
 * details of the hooks, not deployment configuration.
 */

// Polling intervals (ms)
export const REALTIME_POLL_MS = 15000;
export const SYSTEMS_POLL_MS = 60000;
export const FORECAST_REFRESH_MS = 30 * 60 * 1000;
export const RECOMMENDATIONS_REFRESH_MS = 5 * 60 * 1000;
export const ALERTS_REFRESH_MS = 10 * 60 * 1000;

// Auth race timeouts (ms)
export const AUTH_INIT_TIMEOUT_MS = 5000;
export const PROFILE_FETCH_TIMEOUT_MS = 3000;

// Hook cache limits
export const MAX_CACHE_ENTRIES = 20;

// Energy assumptions used in estimates
export const CO2_KG_PER_KWH = 0.4;
export const DEFAULT_SNAPSHOT_INTERVAL_HOURS = 5 / 60;
