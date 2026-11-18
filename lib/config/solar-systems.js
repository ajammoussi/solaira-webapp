/**
 * Solar system catalogue — single source of truth for panel configurations.
 *
 * Previously duplicated in `components/SolarSetupModal.jsx`,
 * `pages/maintenance/index.jsx`, `lib/hooks/useEnergyData.js` and the CSV API
 * route regex.
 */

export const SOLAR_SYSTEMS = [
  {
    value: '2',
    panelCount: 2,
    capacity: '~0.9 kWp',
    capacity_kw: 0.9,
    avgDailyYield: '5.5 kWh',
    pctCovered: '27%',
    verdict: 'Too Small',
    description: 'Minimal impact on bills',
  },
  {
    value: '4',
    panelCount: 4,
    capacity: '~1.8 kWp',
    capacity_kw: 1.8,
    avgDailyYield: '11.1 kWh',
    pctCovered: '55%',
    verdict: 'Entry Level',
    description: 'Good for day usage',
  },
  {
    value: '8',
    panelCount: 8,
    capacity: '~3.5 kWp',
    capacity_kw: 3.5,
    avgDailyYield: '22.1 kWh',
    pctCovered: '110%',
    verdict: 'Economic',
    description: 'Neutral over a year',
  },
  {
    value: '10',
    panelCount: 10,
    capacity: '~4.4 kWp',
    capacity_kw: 4.4,
    avgDailyYield: '27.7 kWh',
    pctCovered: '138%',
    verdict: 'High Performance',
    description: 'Great for large families',
    recommended: true,
  },
  {
    value: '12',
    panelCount: 12,
    capacity: '~5.3 kWp',
    capacity_kw: 5.3,
    avgDailyYield: '33.2 kWh',
    pctCovered: '165%',
    verdict: 'Off-Grid Choice',
    description: '90%+ independence',
  },
  {
    value: '16',
    panelCount: 16,
    capacity: '~7.0 kWp',
    capacity_kw: 7.0,
    avgDailyYield: '44.2 kWh',
    pctCovered: '220%',
    verdict: 'EV Ready',
    description: 'Best for electric vehicles',
  },
];

export const BATTERY_OPTIONS = [
  { value: '13.5', label: '13.5 kWh', size: 13.5, description: 'Home battery storage' },
];

/** Panel count → entry, or null when unsupported. */
export function findSolarSystem(panelCount) {
  return SOLAR_SYSTEMS.find((system) => system.panelCount === Number(panelCount)) || null;
}

/** Panel counts the backend CSV generator has data for. */
export const SUPPORTED_PANEL_COUNTS = SOLAR_SYSTEMS.map((system) => system.panelCount);
