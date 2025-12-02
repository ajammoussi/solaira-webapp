/**
 * Hooks Index
 * Central export for all React hooks
 */

export { useAuth, AuthProvider } from './useAuth';
export { usePVSystems, usePVSystem } from './usePVSystems';
export { useBatteries, useBattery } from './useBatteries';
export { useEnergy, useEnergyHistory } from './useEnergy';
export { useAlerts } from './useAlerts';
export { useForecasts, useCombinedForecast } from './useForecasts';

// Re-export legacy hook for backward compatibility
export { default as useEnergyData } from './useEnergyData';
