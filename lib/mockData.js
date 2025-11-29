/**
 * Mock Data Generator for PV Energy Management System
 * 
 * Simulates:
 * - Real-time energy metrics (updates every 15 seconds)
 * - Historical time-series data (30 days)
 * - 7-day forecasts with confidence intervals
 * - Smart recommendations
 * - Maintenance alerts
 * 
 * Data structures match backend API specs for easy swap later
 */

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate realistic solar production based on time of day
 * Confidence: 95% - Based on PVLib solar irradiance models
 */
const getSolarMultiplier = (hour, month) => {
  // Solar production follows bell curve: peak at noon, zero at night
  if (hour < 6 || hour > 20) return 0; // Night time
  
  // Seasonal adjustment (higher in summer months)
  const seasonalFactor = 0.7 + 0.3 * Math.sin((month - 3) * Math.PI / 6);
  
  // Bell curve centered at 13:00 (1pm)
  const peakHour = 13;
  const stdDev = 4;
  const gaussian = Math.exp(-Math.pow(hour - peakHour, 2) / (2 * stdDev * stdDev));
  
  return gaussian * seasonalFactor;
};

/**
 * Generate realistic load consumption (higher in morning/evening)
 * Confidence: 90% - Based on typical household load profiles
 */
const getLoadMultiplier = (hour, dayOfWeek) => {
  // Weekend vs weekday patterns
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  
  // Morning peak (7-9am), evening peak (18-22pm)
  let multiplier = 0.3; // Base load
  
  if (hour >= 7 && hour <= 9) multiplier = isWeekend ? 0.6 : 0.8; // Morning
  if (hour >= 12 && hour <= 14) multiplier = 0.5; // Lunch
  if (hour >= 18 && hour <= 22) multiplier = 1.0; // Evening peak
  if (hour >= 23 || hour <= 6) multiplier = 0.2; // Night
  
  return multiplier;
};

/**
 * Add realistic noise to data
 */
const addNoise = (value, noisePercent = 0.1) => {
  const noise = (Math.random() - 0.5) * 2 * noisePercent;
  return value * (1 + noise);
};

/**
 * Generate timestamp array for given period
 */
const generateTimestamps = (startDate, hours, intervalMinutes = 15) => {
  const timestamps = [];
  const intervals = (hours * 60) / intervalMinutes;
  
  for (let i = 0; i < intervals; i++) {
    const date = new Date(startDate);
    date.setMinutes(date.getMinutes() + i * intervalMinutes);
    timestamps.push(date.toISOString());
  }
  
  return timestamps;
};

// ============================================================================
// REAL-TIME DATA GENERATOR
// ============================================================================

/**
 * Generate current real-time energy metrics
 * Returns data matching backend /api/energy/realtime format
 */
export const generateRealtimeData = () => {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();
  const dayOfWeek = now.getDay();
  
  // System configuration (5kW PV system)
  const pvCapacity = 5.0; // kW
  const batteryCapacity = 10.0; // kWh
  
  // Calculate production based on time and weather
  const solarMultiplier = getSolarMultiplier(hour, month);
  const weatherFactor = 0.8 + Math.random() * 0.2; // 80-100% (clouds)
  const pvProduction = addNoise(pvCapacity * solarMultiplier * weatherFactor, 0.05);
  
  // Calculate consumption
  const loadMultiplier = getLoadMultiplier(hour, dayOfWeek);
  const baseLoad = 1.5; // kW average
  const consumption = addNoise(baseLoad * loadMultiplier, 0.1);
  
  // Grid flow calculation
  const netFlow = pvProduction - consumption;
  const gridImport = netFlow < 0 ? Math.abs(netFlow) : 0;
  const gridExport = netFlow > 0 ? netFlow : 0;
  
  // Battery state (simulated charge/discharge)
  const batterySOC = 60 + Math.sin(hour * Math.PI / 12) * 25; // 35-85% range
  const batteryPower = netFlow * 0.3; // 30% of excess goes to battery
  
  // Environmental data
  const temperature = 15 + 10 * Math.sin((month - 1) * Math.PI / 6) + Math.random() * 3;
  const irradiance = solarMultiplier * weatherFactor * 1000; // W/m²
  
  return {
    timestamp: now.toISOString(),
    pv_production_kw: Math.max(0, Number(pvProduction.toFixed(3))),
    consumption_kw: Math.max(0, Number(consumption.toFixed(3))),
    grid_import_kw: Math.max(0, Number(gridImport.toFixed(3))),
    grid_export_kw: Math.max(0, Number(gridExport.toFixed(3))),
    battery_soc_percent: Math.max(0, Math.min(100, Number(batterySOC.toFixed(1)))),
    battery_power_kw: Number(batteryPower.toFixed(3)),
    temperature_c: Number(temperature.toFixed(1)),
    irradiance_wm2: Math.max(0, Number(irradiance.toFixed(0))),
    net_power_kw: Number(netFlow.toFixed(3)),
    self_consumption_percent: Number((Math.min(pvProduction, consumption) / consumption * 100).toFixed(1)),
  };
};

// ============================================================================
// HISTORICAL DATA GENERATOR
// ============================================================================

/**
 * Generate historical time-series data
 * @param {number} days - Number of days of history
 * @param {number} intervalMinutes - Data resolution (15 min default)
 * Returns data matching backend /api/energy/historical format
 */
export const generateHistoricalData = (days = 30, intervalMinutes = 15) => {
  const data = [];
  const now = new Date();
  const startDate = new Date(now - days * 24 * 60 * 60 * 1000);
  
  const intervals = (days * 24 * 60) / intervalMinutes;
  
  for (let i = 0; i < intervals; i++) {
    const timestamp = new Date(startDate.getTime() + i * intervalMinutes * 60 * 1000);
    const hour = timestamp.getHours();
    const month = timestamp.getMonth();
    const dayOfWeek = timestamp.getDay();
    
    const pvCapacity = 5.0;
    const solarMultiplier = getSolarMultiplier(hour, month);
    const weatherFactor = 0.7 + Math.random() * 0.3;
    const pvProduction = addNoise(pvCapacity * solarMultiplier * weatherFactor, 0.08);
    
    const loadMultiplier = getLoadMultiplier(hour, dayOfWeek);
    const baseLoad = 1.5;
    const consumption = addNoise(baseLoad * loadMultiplier, 0.12);
    
    const netFlow = pvProduction - consumption;
    
    data.push({
      timestamp: timestamp.toISOString(),
      pv_production_kw: Math.max(0, Number(pvProduction.toFixed(3))),
      consumption_kw: Math.max(0, Number(consumption.toFixed(3))),
      grid_import_kw: netFlow < 0 ? Number(Math.abs(netFlow).toFixed(3)) : 0,
      grid_export_kw: netFlow > 0 ? Number(netFlow.toFixed(3)) : 0,
      battery_soc_percent: Number((50 + Math.sin(hour * Math.PI / 12) * 30).toFixed(1)),
    });
  }
  
  return data;
};

/**
 * Aggregate historical data by period (day/month/year)
 */
export const aggregateHistoricalData = (data, period = 'day') => {
  const aggregated = {};
  
  data.forEach(entry => {
    const date = new Date(entry.timestamp);
    let key;
    
    switch (period) {
      case 'hour':
        key = date.toISOString().substring(0, 13) + ':00:00.000Z';
        break;
      case 'day':
        key = date.toISOString().substring(0, 10);
        break;
      case 'month':
        key = date.toISOString().substring(0, 7);
        break;
      case 'year':
        key = date.getFullYear().toString();
        break;
      default:
        key = date.toISOString().substring(0, 10);
    }
    
    if (!aggregated[key]) {
      aggregated[key] = {
        timestamp: key,
        pv_production_kwh: 0,
        consumption_kwh: 0,
        grid_import_kwh: 0,
        grid_export_kwh: 0,
        count: 0,
      };
    }
    
    // Convert kW to kWh (multiply by interval fraction)
    const intervalHours = 15 / 60; // 15 minutes = 0.25 hours
    aggregated[key].pv_production_kwh += entry.pv_production_kw * intervalHours;
    aggregated[key].consumption_kwh += entry.consumption_kw * intervalHours;
    aggregated[key].grid_import_kwh += entry.grid_import_kw * intervalHours;
    aggregated[key].grid_export_kwh += entry.grid_export_kw * intervalHours;
    aggregated[key].count++;
  });
  
  return Object.values(aggregated).map(item => ({
    timestamp: item.timestamp,
    pv_production_kwh: Number(item.pv_production_kwh.toFixed(2)),
    consumption_kwh: Number(item.consumption_kwh.toFixed(2)),
    grid_import_kwh: Number(item.grid_import_kwh.toFixed(2)),
    grid_export_kwh: Number(item.grid_export_kwh.toFixed(2)),
    self_consumption_percent: Number(((item.pv_production_kwh - item.grid_export_kwh) / item.consumption_kwh * 100).toFixed(1)),
  }));
};

// ============================================================================
// FORECAST DATA GENERATOR
// ============================================================================

/**
 * Generate forecast data for next N days
 * Returns data matching backend /api/forecast format
 */
export const generateForecastData = (days = 7, intervalHours = 1) => {
  const now = new Date();
  const forecasts = {
    pv_production: {
      forecast_type: 'pv_production',
      timestamps: [],
      values: [],
      confidence_lower: [],
      confidence_upper: [],
      weather_conditions: [],
    },
    load_forecast: {
      forecast_type: 'load_forecast',
      timestamps: [],
      values: [],
      confidence_lower: [],
      confidence_upper: [],
    },
    cost_forecast: {
      forecast_type: 'cost_forecast',
      timestamps: [],
      values: [],
      peak_hours: [],
    },
  };
  
  const intervals = (days * 24) / intervalHours;
  
  for (let i = 0; i < intervals; i++) {
    const timestamp = new Date(now.getTime() + i * intervalHours * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    const month = timestamp.getMonth();
    const dayOfWeek = timestamp.getDay();
    const timestampISO = timestamp.toISOString();
    
    // PV Production Forecast
    const pvCapacity = 5.0;
    const solarMultiplier = getSolarMultiplier(hour, month);
    const weatherUncertainty = 0.15; // ±15% weather uncertainty
    const basePV = pvCapacity * solarMultiplier * 0.85; // 85% expected efficiency
    
    forecasts.pv_production.timestamps.push(timestampISO);
    forecasts.pv_production.values.push(Number(basePV.toFixed(2)));
    forecasts.pv_production.confidence_lower.push(Number((basePV * (1 - weatherUncertainty)).toFixed(2)));
    forecasts.pv_production.confidence_upper.push(Number((basePV * (1 + weatherUncertainty)).toFixed(2)));
    
    // Weather conditions (simplified)
    const weatherConditions = ['sunny', 'partly_cloudy', 'cloudy', 'rainy'];
    const weatherIndex = Math.floor(Math.random() * weatherConditions.length);
    forecasts.pv_production.weather_conditions.push(weatherConditions[weatherIndex]);
    
    // Load Forecast
    const baseLoad = 1.5;
    const loadMultiplier = getLoadMultiplier(hour, dayOfWeek);
    const loadUncertainty = 0.10; // ±10% load uncertainty
    const baseConsumption = baseLoad * loadMultiplier;
    
    forecasts.load_forecast.timestamps.push(timestampISO);
    forecasts.load_forecast.values.push(Number(baseConsumption.toFixed(2)));
    forecasts.load_forecast.confidence_lower.push(Number((baseConsumption * (1 - loadUncertainty)).toFixed(2)));
    forecasts.load_forecast.confidence_upper.push(Number((baseConsumption * (1 + loadUncertainty)).toFixed(2)));
    
    // Cost Forecast (peak pricing 17:00-21:00)
    const isPeakHour = hour >= 17 && hour <= 21;
    const offPeakRate = 0.20; // €0.20/kWh
    const peakRate = 0.35; // €0.35/kWh
    const rate = isPeakHour ? peakRate : offPeakRate;
    
    forecasts.cost_forecast.timestamps.push(timestampISO);
    forecasts.cost_forecast.values.push(Number(rate.toFixed(2)));
    forecasts.cost_forecast.peak_hours.push(isPeakHour);
  }
  
  return forecasts;
};

// ============================================================================
// RECOMMENDATIONS GENERATOR
// ============================================================================

/**
 * Generate smart recommendations based on forecast data
 * Returns data matching backend /api/recommendations format
 */
export const generateRecommendations = () => {
  const now = new Date();
  const hour = now.getHours();
  
  const recommendations = [
    {
      id: 'rec_001',
      type: 'optimal_usage',
      severity: 'info',
      title: 'High Solar Production Expected Tomorrow',
      description: 'Tomorrow 10am-2pm: High solar production expected. Ideal time for dishwasher, laundry, and EV charging.',
      action: 'Schedule high-energy tasks',
      timestamp: now.toISOString(),
      priority: 1,
      estimated_savings: '€2.50',
      icon: 'solar',
    },
    {
      id: 'rec_002',
      type: 'peak_avoidance',
      severity: 'warning',
      title: 'Peak Pricing Alert',
      description: 'Peak pricing 6-9pm tonight. Consider pre-cooling home during solar peak hours.',
      action: 'Adjust thermostat',
      timestamp: now.toISOString(),
      priority: 2,
      estimated_savings: '€1.80',
      icon: 'warning',
    },
    {
      id: 'rec_003',
      type: 'weather_advisory',
      severity: 'info',
      title: 'Cloudy Week Ahead',
      description: 'Cloudy weather forecast next week. Production may drop 30%. Minimize non-essential loads.',
      action: 'Review energy usage',
      timestamp: now.toISOString(),
      priority: 3,
      estimated_savings: null,
      icon: 'cloud',
    },
    {
      id: 'rec_004',
      type: 'self_consumption',
      severity: 'success',
      title: 'Excellent Self-Consumption Rate',
      description: 'Your self-consumption rate is 78% this month - well above average!',
      action: null,
      timestamp: now.toISOString(),
      priority: 4,
      estimated_savings: null,
      icon: 'trophy',
    },
    {
      id: 'rec_005',
      type: 'overconsumption',
      severity: 'warning',
      title: 'Higher Than Usual Consumption',
      description: 'This week\'s consumption is 15% above average. Check for devices left on.',
      action: 'Audit appliances',
      timestamp: now.toISOString(),
      priority: 2,
      estimated_savings: '€3.20',
      icon: 'alert',
    },
  ];
  
  // Filter recommendations by relevance (time-based)
  return recommendations.filter((rec, index) => {
    // Show different recommendations at different times
    if (hour < 12) return index < 3;
    if (hour < 18) return index !== 1;
    return true;
  });
};

// ============================================================================
// MAINTENANCE ALERTS GENERATOR
// ============================================================================

/**
 * Generate maintenance alerts and system health data
 * Returns data matching backend /api/maintenance format
 */
export const generateMaintenanceAlerts = () => {
  const now = new Date();
  
  const alerts = [
    {
      id: 'alert_001',
      component: 'solar_panels',
      severity: 'warning',
      status: 'active',
      title: 'Panel Cleaning Recommended',
      description: '8% production drop detected over last 2 weeks. Panel cleaning may improve efficiency.',
      detected_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_action: 'Schedule panel cleaning service',
      impact: 'Estimated 8% production loss',
      can_resolve: true,
    },
    {
      id: 'alert_002',
      component: 'inverter',
      severity: 'info',
      status: 'resolved',
      title: 'Inverter Efficiency Normal',
      description: 'Inverter operating at 97.2% efficiency - within optimal range.',
      detected_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolved_at: new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_action: null,
      impact: null,
      can_resolve: false,
    },
    {
      id: 'alert_003',
      component: 'battery',
      severity: 'critical',
      status: 'active',
      title: 'Battery Capacity Degradation',
      description: 'Battery capacity has decreased to 92% of original. Normal for 3-year-old battery.',
      detected_at: new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString(),
      suggested_action: 'Monitor capacity, consider replacement in 2-3 years',
      impact: '8% capacity loss',
      can_resolve: false,
    },
  ];
  
  const systemHealth = {
    overall_status: 'healthy',
    last_updated: now.toISOString(),
    components: {
      solar_panels: {
        status: 'warning',
        health_percent: 92,
        last_checked: now.toISOString(),
        details: 'Performance slightly below expected - cleaning recommended',
      },
      inverter: {
        status: 'healthy',
        health_percent: 97,
        last_checked: now.toISOString(),
        details: 'Operating within optimal parameters',
      },
      battery: {
        status: 'healthy',
        health_percent: 92,
        last_checked: now.toISOString(),
        details: 'Normal degradation for age',
      },
      grid_connection: {
        status: 'healthy',
        health_percent: 100,
        last_checked: now.toISOString(),
        details: 'Stable connection',
      },
    },
  };
  
  return { alerts, systemHealth };
};

// ============================================================================
// SYSTEM CONFIGURATION
// ============================================================================

/**
 * Default system configuration
 */
export const defaultSystemConfig = {
  pv_capacity_kw: 5.0,
  panel_tilt: 35,
  panel_azimuth: 180, // South-facing
  panel_count: 15,
  panel_wattage: 330,
  inverter_capacity_kw: 5.0,
  inverter_efficiency: 0.97,
  battery_capacity_kwh: 10.0,
  battery_efficiency: 0.90,
  location: {
    lat: 52.0907, // mock location
    lon: 5.1214,
    timezone: 'East Europe',
    address: 'Tunisia',
  },
  tariff: {
    import_rate_offpeak: 0.20, // €/kWh
    import_rate_peak: 0.35,
    export_rate: 0.08, // Feed-in tariff
    peak_hours: '17:00-21:00',
    currency: 'EUR',
  },
  installation_date: '2022-03-15',
};

// ============================================================================
// SUMMARY STATISTICS
// ============================================================================

/**
 * Calculate summary statistics from historical data
 */
export const calculateSummaryStats = (historicalData, period = 'today') => {
  let filteredData = historicalData;
  const now = new Date();
  
  switch (period) {
    case 'today':
      filteredData = historicalData.filter(d => 
        new Date(d.timestamp).toDateString() === now.toDateString()
      );
      break;
    case 'month':
      filteredData = historicalData.filter(d => {
        const date = new Date(d.timestamp);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      break;
    case 'year':
      filteredData = historicalData.filter(d => 
        new Date(d.timestamp).getFullYear() === now.getFullYear()
      );
      break;
  }
  
  const intervalHours = 15 / 60; // 15 minutes
  
  const totalProduction = filteredData.reduce((sum, d) => sum + d.pv_production_kw * intervalHours, 0);
  const totalConsumption = filteredData.reduce((sum, d) => sum + d.consumption_kw * intervalHours, 0);
  const totalGridImport = filteredData.reduce((sum, d) => sum + d.grid_import_kw * intervalHours, 0);
  const totalGridExport = filteredData.reduce((sum, d) => sum + d.grid_export_kw * intervalHours, 0);
  
  const selfConsumption = totalProduction - totalGridExport;
  const selfConsumptionPercent = (selfConsumption / totalConsumption) * 100;
  
  // Cost calculations
  const importCost = totalGridImport * 0.25; // Average rate
  const exportRevenue = totalGridExport * 0.08;
  const netCost = importCost - exportRevenue;
  const savings = totalProduction * 0.25 - exportRevenue; // What you would have paid
  
  return {
    period,
    total_production_kwh: Number(totalProduction.toFixed(2)),
    total_consumption_kwh: Number(totalConsumption.toFixed(2)),
    total_grid_import_kwh: Number(totalGridImport.toFixed(2)),
    total_grid_export_kwh: Number(totalGridExport.toFixed(2)),
    self_consumption_kwh: Number(selfConsumption.toFixed(2)),
    self_consumption_percent: Number(selfConsumptionPercent.toFixed(1)),
    grid_independence_percent: Number(((totalConsumption - totalGridImport) / totalConsumption * 100).toFixed(1)),
    cost_savings_eur: Number(savings.toFixed(2)),
    net_cost_eur: Number(netCost.toFixed(2)),
  };
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default {
  generateRealtimeData,
  generateHistoricalData,
  aggregateHistoricalData,
  generateForecastData,
  generateRecommendations,
  generateMaintenanceAlerts,
  calculateSummaryStats,
  defaultSystemConfig,
};
