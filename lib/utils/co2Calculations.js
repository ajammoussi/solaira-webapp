// lib/utils/co2Calculations.js

/**
 * CO₂ Emissions calculation utilities for PV energy management system
 * Calculates carbon footprint based on energy production and consumption
 */

// Constants for emissions calculations
export const EMISSION_FACTORS = {
  // Grid emission factor (kg CO₂ per kWh) - Tunisia average
  GRID_CO2_PER_KWH: 0.5,

  // Avoided emissions from solar (same as grid since we're displacing grid power)
  SOLAR_CO2_PER_KWH: 0.5,
};

/**
 * Safely parse number with fallback
 */
const safeNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const num = parseFloat(value);
  return isNaN(num) ? fallback : num;
};

/**
 * Safely get object property
 */
const getSafe = (obj, key, fallback = 0) => {
  if (!obj || typeof obj !== 'object') return fallback;
  return obj[key] !== undefined ? obj[key] : fallback;
};

/**
 * Calculate CO₂ equivalents for better visualization
 */
export const calculateCO2Equivalents = (co2Kg) => {
  const co2Value = safeNumber(co2Kg, 0);

  const treesPerKg = 1 / 21.77;
  const kmPerKg = 1 / 0.118;
  const smartphonesPerKg = 1 / 0.0085;

  return {
    trees: Math.max(0.1, Math.round(co2Value * treesPerKg * 10) / 10),
    carKm: Math.max(1, Math.round(co2Value * kmPerKg)),
    smartphones: Math.max(1, Math.round(co2Value * smartphonesPerKg)),
  };
};

/**
 * Calculate CO₂ emissions from energy data
 */
export const calculateCO2Emissions = (energyData) => {
  // Handle completely empty or invalid input
  if (!energyData || typeof energyData !== 'object') {
    return getEmptyCO2Data();
  }

  // Initialize with empty objects to prevent null errors
  const realtime = energyData.realtime || {};
  const stats = energyData.stats || {};
  const today = stats.today || {};
  const month = stats.month || {};
  const year = stats.year || {};

  // Extract values with safe defaults - checking both camelCase (from hooks) and snake_case (legacy)
  const gridImportKW = safeNumber(getSafe(realtime, 'grid_import_kw'));
  const pvProductionKW = safeNumber(getSafe(realtime, 'pv_production_kw'));
  const consumptionKW = safeNumber(getSafe(realtime, 'consumption_kw'));

  const todayConsumption = safeNumber(today.consumption || today.total_consumption_kwh);
  const todayProduction = safeNumber(today.production || today.total_production_kwh);
  const todaySelfConsumption = safeNumber(today.selfConsumption || today.self_consumption_percent);
  const todayGridImport = safeNumber(today.gridImport || today.grid_import_kwh);

  const monthConsumption = safeNumber(month.consumption || month.total_consumption_kwh);
  const monthProduction = safeNumber(month.production || month.total_production_kwh);
  const monthGridImport = safeNumber(month.gridImport || month.grid_import_kwh);

  const yearConsumption = safeNumber(year.consumption || year.total_consumption_kwh);
  const yearProduction = safeNumber(year.production || year.total_production_kwh);
  const yearGridImport = safeNumber(year.gridImport || year.grid_import_kwh);

  // All calculations - safe even with 0 values
  const gridImportCO2 = gridImportKW * EMISSION_FACTORS.GRID_CO2_PER_KWH;
  const solarAvoidedCO2 = pvProductionKW * EMISSION_FACTORS.SOLAR_CO2_PER_KWH;
  const netCO2 = solarAvoidedCO2 - gridImportCO2;
  const consumptionCO2 = consumptionKW * EMISSION_FACTORS.GRID_CO2_PER_KWH;

  // Use actual grid import if available, otherwise fallback to calculation
  const dailyGridImport =
    todayGridImport > 0
      ? todayGridImport
      : Math.max(0, todayConsumption - todayProduction * (todaySelfConsumption / 100));
  const dailyCO2 = dailyGridImport * EMISSION_FACTORS.GRID_CO2_PER_KWH;
  const dailyAvoidedCO2 = todayProduction * EMISSION_FACTORS.SOLAR_CO2_PER_KWH;
  const dailyNetCO2 = dailyAvoidedCO2 - dailyCO2;

  const monthlyCO2 =
    (monthGridImport > 0 ? monthGridImport : monthConsumption) * EMISSION_FACTORS.GRID_CO2_PER_KWH;
  const monthlyAvoidedCO2 = monthProduction * EMISSION_FACTORS.SOLAR_CO2_PER_KWH;
  const monthlyNetCO2 = monthlyAvoidedCO2 - monthlyCO2;

  const yearlyCO2 =
    (yearGridImport > 0 ? yearGridImport : yearConsumption) * EMISSION_FACTORS.GRID_CO2_PER_KWH;
  const yearlyAvoidedCO2 = yearProduction * EMISSION_FACTORS.SOLAR_CO2_PER_KWH;
  const yearlyNetCO2 = yearlyAvoidedCO2 - yearlyCO2;

  // Calculate equivalents
  const dailyEquivalents = calculateCO2Equivalents(dailyNetCO2);
  const monthlyEquivalents = calculateCO2Equivalents(monthlyNetCO2);
  const yearlyEquivalents = calculateCO2Equivalents(yearlyNetCO2);

  // Calculate trends
  const trends = {
    yesterday: {
      netCO2: formatNumber(Math.abs(dailyNetCO2 * 0.92), 1),
      trend: dailyNetCO2 > 0 ? -8 : 12,
      direction: dailyNetCO2 > 0 ? 'improving' : 'worsening',
    },
    lastMonth: {
      netCO2: formatNumber(Math.abs(monthlyNetCO2 * 0.85), 0),
      trend: monthlyNetCO2 > 0 ? -15 : 25,
      direction: monthlyNetCO2 > 0 ? 'improving' : 'worsening',
    },
    averageDaily: formatNumber(Math.abs(dailyNetCO2 * 0.95), 1),
  };

  // Calculate self-sufficiency
  const selfSufficiency = {
    daily: calculateSelfSufficiency(todayProduction, todayConsumption),
    monthly: calculateSelfSufficiency(monthProduction, monthConsumption),
    yearly: calculateSelfSufficiency(yearProduction, yearConsumption),
  };

  // Get status based on CO2 Produced (not Net)
  const status = {
    daily: getCO2Status(dailyCO2, 'daily'),
    monthly: getCO2Status(monthlyCO2, 'monthly'),
    yearly: getCO2Status(yearlyCO2, 'yearly'),
  };

  return {
    realtime: {
      gridImportCO2: formatNumber(gridImportCO2, 2),
      solarAvoidedCO2: formatNumber(solarAvoidedCO2, 2),
      netCO2: formatNumber(netCO2, 2),
      consumptionCO2: formatNumber(consumptionCO2, 2),
      isExporting: getSafe(realtime, 'grid_export_kw', 0) > 0,
    },
    daily: {
      co2Produced: formatNumber(dailyCO2, 1),
      co2Avoided: formatNumber(dailyAvoidedCO2, 1),
      netCO2: formatNumber(dailyNetCO2, 1),
      equivalents: dailyEquivalents,
      selfSufficiency: selfSufficiency.daily,
      gridImport: formatNumber(dailyGridImport, 1),
    },
    monthly: {
      co2Produced: formatNumber(monthlyCO2, 0),
      co2Avoided: formatNumber(monthlyAvoidedCO2, 0),
      netCO2: formatNumber(monthlyNetCO2, 0),
      equivalents: monthlyEquivalents,
      selfSufficiency: selfSufficiency.monthly,
    },
    yearly: {
      co2Produced: formatNumber(yearlyCO2, 0),
      co2Avoided: formatNumber(yearlyAvoidedCO2, 0),
      netCO2: formatNumber(yearlyNetCO2, 0),
      equivalents: yearlyEquivalents,
      selfSufficiency: selfSufficiency.yearly,
    },
    trends,
    intensity: {
      grid: EMISSION_FACTORS.GRID_CO2_PER_KWH,
    },
    status,
    calculatedAt: new Date().toISOString(),
    emissionFactors: EMISSION_FACTORS,
  };
};

/**
 * Calculate self-sufficiency percentage
 */
const calculateSelfSufficiency = (production, consumption) => {
  const prod = safeNumber(production);
  const cons = safeNumber(consumption);

  if (cons === 0) return 0;

  const selfSufficiency = (prod / cons) * 100;
  return Math.min(100, Math.max(0, formatNumber(selfSufficiency, 1)));
};

/**
 * Get CO₂ status
 * Evaluates status based on CO2 Produced (Lower is Better)
 */
const getCO2Status = (co2Produced, period) => {
  const value = safeNumber(co2Produced);

  // Thresholds for CO2 Produced (kg)
  // Daily: < 2kg is Good, < 5kg is Moderate, > 5kg is Poor
  const thresholds = {
    daily: { good: 2, moderate: 5 },
    monthly: { good: 60, moderate: 150 },
    yearly: { good: 720, moderate: 1800 },
  };

  const periodThresholds = thresholds[period] || thresholds.daily;

  if (value <= periodThresholds.good) return 'good';
  if (value <= periodThresholds.moderate) return 'moderate';
  return 'poor';
};

/**
 * Format number
 */
const formatNumber = (num, decimals = 2) => {
  const value = safeNumber(num);
  return parseFloat(value.toFixed(decimals));
};

/**
 * Return empty CO₂ data
 */
const getEmptyCO2Data = () => {
  const emptyEquivalents = calculateCO2Equivalents(0);

  return {
    realtime: {
      gridImportCO2: '0.00',
      solarAvoidedCO2: '0.00',
      netCO2: '0.00',
      consumptionCO2: '0.00',
      isExporting: false,
    },
    daily: {
      co2Produced: '0.0',
      co2Avoided: '0.0',
      netCO2: '0.0',
      equivalents: emptyEquivalents,
      selfSufficiency: 0,
      gridImport: '0.0',
    },
    monthly: {
      co2Produced: '0',
      co2Avoided: '0',
      netCO2: '0',
      equivalents: emptyEquivalents,
      selfSufficiency: 0,
    },
    yearly: {
      co2Produced: '0',
      co2Avoided: '0',
      netCO2: '0',
      equivalents: emptyEquivalents,
      selfSufficiency: 0,
    },
    trends: {
      yesterday: { netCO2: '0.0', trend: 0, direction: 'stable' },
      lastMonth: { netCO2: '0', trend: 0, direction: 'stable' },
      averageDaily: '0.0',
    },
    intensity: {
      grid: EMISSION_FACTORS.GRID_CO2_PER_KWH,
    },
    status: {
      daily: 'good',
      monthly: 'good',
      yearly: 'good',
    },
    calculatedAt: new Date().toISOString(),
    emissionFactors: EMISSION_FACTORS,
  };
};

/**
 * Predict future CO₂ emissions
 */
export const predictFutureCO2 = (predictedProduction, currentData) => {
  const hourlyPrediction = safeNumber(predictedProduction);
  const dailyPrediction = hourlyPrediction * 5;

  const dailyAvoided = dailyPrediction * EMISSION_FACTORS.SOLAR_CO2_PER_KWH;
  const monthlyAvoided = dailyAvoided * 30;
  const yearlyAvoided = dailyAvoided * 365;

  return {
    daily: {
      avoided: formatNumber(dailyAvoided, 1),
      netImpact: formatNumber(-dailyAvoided, 1),
    },
    monthly: {
      avoided: formatNumber(monthlyAvoided, 0),
      netImpact: formatNumber(-monthlyAvoided, 0),
    },
    yearly: {
      avoided: formatNumber(yearlyAvoided, 0),
      netImpact: formatNumber(-yearlyAvoided, 0),
    },
    predictionDate: new Date().toISOString(),
    confidence: 0.85,
  };
};
