/**
 * Pins the documented defaults so a config change is always intentional.
 * These values are also what `.env.example` advertises.
 */

describe('lib/config/env', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  function loadFresh() {
    let loaded;
    jest.isolateModules(() => {
      loaded = require('../../lib/config/env');
    });
    return loaded;
  }

  it('applies documented defaults when nothing is set', () => {
    delete process.env.NEXT_PUBLIC_PYTHON_API_URL;
    delete process.env.SOLAR_FORECAST_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_DEFAULT_PANELS;
    delete process.env.NEXT_PUBLIC_GRID_PRICE_KWH;

    const env = loadFresh();

    expect(env.PYTHON_API_URL).toBe('http://localhost:8001');
    expect(env.SOLAR_FORECAST_SERVICE_URL).toBe('http://localhost:8002');
    expect(env.DEFAULT_PANELS).toBe(10);
    expect(env.GRID_PRICE_KWH).toBe(0.2);
    expect(env.EXPORT_PRICE_KWH).toBe(0.12);
  });

  it('override from the environment wins', () => {
    process.env.NEXT_PUBLIC_PYTHON_API_URL = 'https://api.solaira.tn';
    process.env.NEXT_PUBLIC_DEFAULT_PANELS = '16';

    const env = loadFresh();

    expect(env.PYTHON_API_URL).toBe('https://api.solaira.tn');
    expect(env.DEFAULT_PANELS).toBe(16);
  });

  it('falls back for non-numeric values', () => {
    process.env.NEXT_PUBLIC_DEFAULT_PANELS = 'not-a-number';
    expect(loadFresh().DEFAULT_PANELS).toBe(10);
  });

  it('requireEnv names the missing variable', () => {
    const env = loadFresh();
    expect(() => env.requireEnv('DEFINITELY_NOT_SET')).toThrow(/DEFINITELY_NOT_SET/);
  });

  it('requireEnv returns the value when present', () => {
    process.env.SOME_REQUIRED_VALUE = 'ok';
    expect(loadFresh().requireEnv('SOME_REQUIRED_VALUE')).toBe('ok');
  });
});

describe('lib/config/solar-systems', () => {
  const {
    SOLAR_SYSTEMS,
    SUPPORTED_PANEL_COUNTS,
    findSolarSystem,
  } = require('../../lib/config/solar-systems');

  it('exposes exactly one entry per panel count', () => {
    const counts = SOLAR_SYSTEMS.map((s) => s.panelCount);
    expect(counts).toEqual([...new Set(counts)]);
    expect(counts).toEqual([2, 4, 8, 10, 12, 16]);
  });

  it('supports the panel counts the CSV generator produces', () => {
    expect(SUPPORTED_PANEL_COUNTS).toEqual([2, 4, 8, 10, 12, 16]);
  });

  it('resolves counts by number and string', () => {
    expect(findSolarSystem(10).capacity_kw).toBe(4.4);
    expect(findSolarSystem('10').capacity_kw).toBe(4.4);
  });

  it('returns null for unsupported counts', () => {
    expect(findSolarSystem(15)).toBeNull();
  });

  it('marks exactly one recommended option', () => {
    expect(SOLAR_SYSTEMS.filter((s) => s.recommended)).toHaveLength(1);
  });
});
