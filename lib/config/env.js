/**
 * Central environment access.
 *
 * Goals:
 *  - every variable the app reads is declared here, once
 *  - hard-coded fallbacks live here instead of being scattered across pages
 *  - CI can run the build/tests without real credentials
 *
 * See `.env.example` for the documented template.
 */

/** Read a required variable; throws a single clear error instead of a white screen. */
export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing required variable: ${name}. See .env.example`);
  }
  return value;
}

/** Read a variable with a default. */
export function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** Numeric variant of `env`. */
export function envNumber(name, fallback) {
  const parsed = Number(env(name, fallback));
  return Number.isFinite(parsed) ? parsed : fallback;
}

// ── Service URLs ───────────────────────────────────────────────────────────
export const PYTHON_API_URL = env('NEXT_PUBLIC_PYTHON_API_URL', 'http://localhost:8001');
export const SOLAR_FORECAST_SERVICE_URL = env(
  'SOLAR_FORECAST_SERVICE_URL',
  'http://localhost:8002'
);

// ── Branding / site ────────────────────────────────────────────────────────
export const SITE_URL = env('NEXT_PUBLIC_SITE_URL', 'http://localhost:3000');
export const CONTACT_EMAIL = env('NEXT_PUBLIC_CONTACT_EMAIL', 'info@solaira.tn');
export const CONTACT_PHONE = env('NEXT_PUBLIC_CONTACT_PHONE', '(+216) 99-999-999');

// ── Solar system defaults ──────────────────────────────────────────────────
export const DEFAULT_PANELS = envNumber('NEXT_PUBLIC_DEFAULT_PANELS', 10);
export const DEFAULT_BATTERY_KWH = envNumber('NEXT_PUBLIC_DEFAULT_BATTERY_KWH', 13.5);

// ── Tariffs (currency per kWh) ────────────────────────────────────────────
export const GRID_PRICE_KWH = envNumber('NEXT_PUBLIC_GRID_PRICE_KWH', 0.2);
export const EXPORT_PRICE_KWH = envNumber('NEXT_PUBLIC_EXPORT_PRICE_KWH', 0.12);
