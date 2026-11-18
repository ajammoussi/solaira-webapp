/**
 * Supabase Client Configuration
 *
 * This file initializes the Supabase client for use throughout the app.
 * Uses environment variables for configuration.
 *
 * The client is created lazily instead of throwing at import time, so that
 * `next build` and the test suite can run without real credentials.
 * Consumers should check `isSupabaseConfigured` and degrade gracefully.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[supabase] Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Auth and data features are disabled. See .env.example'
  );
}

// Client-side Supabase client (uses anon key, respects RLS)
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

// Server-side Supabase client (for API routes)
export const createServerClient = () => {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isSupabaseConfigured) {
    return null;
  }

  if (!supabaseServiceKey) {
    // Fall back to anon key if service key not available
    return supabase;
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export default supabase;
