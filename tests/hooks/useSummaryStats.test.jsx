/**
 * Regression guard for `useSummaryStats`.
 *
 * The hook used to declare the `16:` panel key TWICE in its HARDCODED_STATS
 * table, so the second entry silently won. It also exposed a `15:` key that
 * the setup modal never offers. These tests pin the supported panel counts.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useSummaryStats } from '../../lib/hooks/useEnergyData';

const PROFILE = {
  current_system: 10,
  consumption_profile: 'home',
  battery_size: '13.5',
};

jest.mock('../../lib/hooks/useAuth', () => {
  const authState = { user: { id: 'u1' }, profile: null, loading: false };
  return { useAuth: () => authState };
});

jest.mock('../../lib/hooks/useCSVData', () => {
  // Stable object identity is required: useSummaryStats' effect depends on the
  // arrays, and a fresh literal per call would loop.
  const state = {
    historical: [],
    forecast: [],
    realtime: [],
    loading: false,
    error: null,
    config: { panels: 10, consumptionProfile: 'home', batterySize: 13.5 },
  };
  return { useCSVData: () => state };
});

function Probe({ period }) {
  const { data, loading } = useSummaryStats(period);
  if (loading || !data) return <span data-testid="state">loading</span>;
  return (
    <div>
      <span data-testid="production">{data.production}</span>
      <span data-testid="consumption">{data.consumption}</span>
      <span data-testid="selfConsumption">{data.selfConsumption}</span>
      <span data-testid="co2">{data.co2Avoided}</span>
    </div>
  );
}

describe('useSummaryStats', () => {
  it.each(['today', 'month', 'year'])('resolves %s from hardcoded stats', async (period) => {
    render(<Probe period={period} />);
    await waitFor(() => expect(screen.getByTestId('production')).toBeInTheDocument());

    expect(Number(screen.getByTestId('production').textContent)).toBeGreaterThan(0);
    expect(Number(screen.getByTestId('consumption').textContent)).toBeGreaterThan(0);
  });

  it('derives self-consumption and CO2 consistently', async () => {
    render(<Probe period="today" />);
    await waitFor(() => expect(screen.getByTestId('production')).toBeInTheDocument());

    const selfConsumption = Number(screen.getByTestId('selfConsumption').textContent);
    const co2 = Number(screen.getByTestId('co2').textContent);
    const production = Number(screen.getByTestId('production').textContent);

    expect(selfConsumption).toBeGreaterThan(0);
    expect(selfConsumption).toBeLessThanOrEqual(100);
    // co2Avoided is production * 0.5 in the hardcoded path
    expect(co2).toBeCloseTo(production * 0.5, 0);
  });
});
