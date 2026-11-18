/**
 * Jest global setup.
 *
 * - registers @testing-library/jest-dom matchers
 * - provides the env vars the app reads at import time
 * - silences expected console noise during tests
 */

import '@testing-library/jest-dom';

process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';
process.env.NEXT_PUBLIC_PYTHON_API_URL =
  process.env.NEXT_PUBLIC_PYTHON_API_URL || 'http://localhost:8001';

// The app logs aggressively; keep test output readable.
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
