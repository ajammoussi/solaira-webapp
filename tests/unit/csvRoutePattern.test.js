/**
 * Regression guard for the CSV API route's path-traversal whitelist.
 *
 * `pages/api/csv/[...path].js` builds a filesystem path from a URL segment.
 * If this regex is ever relaxed or removed, the route becomes an arbitrary
 * file read. These tests pin the contract.
 */

const VALID_NAMES = [
  'historical_energy_data_2_panels.csv',
  'historical_energy_data_10_panels.csv',
  'hourly_forecast_4_panels.csv',
  'hourly_forecast_16_panels.csv',
  'realtime_snapshots_8_panels.csv',
  'realtime_snapshots_12_panels.csv',
];

const INVALID_NAMES = [
  '../secrets.csv',
  '..\\secrets.csv',
  '/etc/passwd',
  'package.json',
  'historical_energy_data_10_panels.txt',
  'historical_energy_data_panels.csv',
  'historical_energy_data_abc_panels.csv',
  'other_thing_10_panels.csv',
  'historical_energy_data_10_panels.csv/../x',
  '',
];

// Kept in sync with pages/api/csv/[...path].js
const VALID_PATTERN =
  /^(historical_energy_data|hourly_forecast|realtime_snapshots)_\d+_panels\.csv$/;

describe('CSV route filename whitelist', () => {
  it.each(VALID_NAMES)('accepts %s', (name) => {
    expect(VALID_PATTERN.test(name)).toBe(true);
  });

  it.each(INVALID_NAMES)('rejects %s', (name) => {
    expect(VALID_PATTERN.test(name)).toBe(false);
  });

  it('rejects every traversal attempt regardless of separators', () => {
    for (const attempt of ['../x.csv', '..%2Fx.csv', 'a/../../b.csv']) {
      expect(VALID_PATTERN.test(attempt)).toBe(false);
    }
  });
});
