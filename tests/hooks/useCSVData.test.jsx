/**
 * useCSVData is the effective data source for the dashboard, energy and
 * predictions pages: it fetches three CSVs per panel configuration and caches
 * them in a module-level object.
 *
 * These tests pin the request contract and the cache behaviour, so a refactor
 * cannot silently change which files are requested.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useCSVData } from '../../lib/hooks/useCSVData';

// Stable references matter: useCSVData effects on `profile` identity.
jest.mock('../../lib/hooks/useAuth', () => {
  const profile = {
    current_system: 8,
    consumption_profile: 'home',
    battery_size: '13.5',
  };
  const authState = { user: { id: 'user-1' }, profile, loading: false };
  return { useAuth: () => authState };
});

const HISTORICAL = 'date,actual_pv_kwh,consumption_kwh\n2025-06-01,10,20\n';
const FORECAST = 'datetime,pv_generation_kwh,consumption_kwh\n2025-06-01T00:00:00,1,2\n';
const REALTIME = 'timestamp,pv_production_kw,consumption_kw\n2025-06-01T00:00:00,1,2\n';

function Probe() {
  const { historical, forecast, realtime, loading, error, config } = useCSVData();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error || 'none'}</span>
      <span data-testid="historical">{historical.length}</span>
      <span data-testid="forecast">{forecast.length}</span>
      <span data-testid="realtime">{realtime.length}</span>
      <span data-testid="panels">{config ? config.panels : 'none'}</span>
    </div>
  );
}

function mockFetchOk() {
  global.fetch = jest.fn().mockImplementation((url) => {
    const text = url.includes('historical')
      ? HISTORICAL
      : url.includes('hourly_forecast')
        ? FORECAST
        : REALTIME;
    return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
  });
}

describe('useCSVData', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('requests the three CSVs for the profile panel count', async () => {
    mockFetchOk();
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    const urls = global.fetch.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      '/api/csv/historical_energy_data_8_panels.csv',
      '/api/csv/hourly_forecast_8_panels.csv',
      '/api/csv/realtime_snapshots_8_panels.csv',
    ]);
  });

  it('parses each CSV into rows', async () => {
    mockFetchOk();
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(screen.getByTestId('historical')).toHaveTextContent('1');
    expect(screen.getByTestId('forecast')).toHaveTextContent('1');
    expect(screen.getByTestId('realtime')).toHaveTextContent('1');
  });

  it('exposes the active configuration', async () => {
    mockFetchOk();
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('panels')).toHaveTextContent('8'));
  });

  it('reports an error when a request fails', async () => {
    // Fresh panel count so the module-level cache does not short-circuit the fetch.
    const { useAuth } = require('../../lib/hooks/useAuth');
    useAuth().profile.current_system = 12;

    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') });
    render(<Probe />);

    await waitFor(() => expect(screen.getByTestId('error')).not.toHaveTextContent('none'));
    expect(screen.getByTestId('historical')).toHaveTextContent('0');
  });

  it('does not refetch for the same panel count (module cache)', async () => {
    mockFetchOk();
    const first = render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    const callsAfterFirst = global.fetch.mock.calls.length;

    first.unmount();
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    expect(global.fetch.mock.calls.length).toBe(callsAfterFirst);
    expect(screen.getByTestId('historical')).toHaveTextContent('1');
  });
});
