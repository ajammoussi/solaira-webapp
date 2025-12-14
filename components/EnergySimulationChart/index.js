/**
 * Energy Simulation Chart Component
 * 
 * Displays comprehensive energy flow visualization including:
 * - PV Energy Production
 * - Wind Energy Production
 * - Total Consumption
 * - Battery State of Charge (SOC)
 * 
 * Similar to the Visualization.py output but as an interactive React component
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import styles from './styles.module.css';

const EnergySimulationChart = ({ data, loading, error }) => {
  // Transform API data for Recharts with daily aggregation for weekly/monthly views
  const chartData = useMemo(() => {
    if (!data || !data.timestamps) return [];
    
    const totalHours = data.timestamps.length;
    const shouldAggregate = totalHours > 48; // Aggregate for weekly/monthly views
    
    if (!shouldAggregate) {
      // Hourly data for daily/48h views
      return data.timestamps.map((timestamp, index) => {
        const date = new Date(timestamp);
        const hour = date.getHours();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        
        let timeLabel;
        if (totalHours <= 24) {
          timeLabel = `${hour.toString().padStart(2, '0')}:00`;
        } else {
          timeLabel = `${month}/${day} ${hour.toString().padStart(2, '0')}h`;
        }
        
        return {
          time: timeLabel,
          hour: hour,
          day: day,
          timestamp: timestamp,
          pv_energy: data.pv_energy_kwh[index],
          wind_energy: data.wind_energy_kwh[index],
          consumption: data.consumption_kwh[index],
          battery_soc: data.battery_soc_percent[index],
          wasted: data.wasted_energy_kwh[index],
          deficit: data.deficit_kwh[index],
        };
      });
    }
    
    // Daily aggregation for weekly/monthly views
    const dailyData = {};
    
    data.timestamps.forEach((timestamp, index) => {
      const date = new Date(timestamp);
      const dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: date,
          pv_sum: 0,
          wind_sum: 0,
          consumption_sum: 0,
          wasted_sum: 0,
          deficit_sum: 0,
          soc_values: [],
          count: 0
        };
      }
      
      dailyData[dateKey].pv_sum += data.pv_energy_kwh[index] || 0;
      dailyData[dateKey].wind_sum += data.wind_energy_kwh[index] || 0;
      dailyData[dateKey].consumption_sum += data.consumption_kwh[index] || 0;
      dailyData[dateKey].wasted_sum += data.wasted_energy_kwh[index] || 0;
      dailyData[dateKey].deficit_sum += data.deficit_kwh[index] || 0;
      dailyData[dateKey].soc_values.push(data.battery_soc_percent[index]);
      dailyData[dateKey].count += 1;
    });
    
    // Convert to array and format
    return Object.keys(dailyData).sort().map(dateKey => {
      const dayData = dailyData[dateKey];
      const date = dayData.date;
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      // Calculate average SOC for the day
      const avgSOC = dayData.soc_values.reduce((a, b) => a + b, 0) / dayData.soc_values.length;
      
      return {
        time: `${month}/${day}`,
        timestamp: dateKey,
        pv_energy: dayData.pv_sum,
        wind_energy: dayData.wind_sum,
        consumption: dayData.consumption_sum,
        battery_soc: avgSOC,
        wasted: dayData.wasted_sum,
        deficit: dayData.deficit_sum,
      };
    });
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!data || !data.summary) return null;
    
    // If showing aggregated data, recalculate stats from chart data to match visualization
    const isAggregated = data.timestamps && data.timestamps.length > 48;
    
    if (isAggregated && chartData.length > 0) {
      // Recalculate from aggregated chart data for consistency
      const socs = chartData.map(d => d.battery_soc);
      const minSOC = Math.min(...socs);
      const maxSOC = Math.max(...socs);
      const avgSOC = socs.reduce((a, b) => a + b, 0) / socs.length;
      
      return {
        totalPV: data.summary.total_pv_energy_kwh,
        totalWind: data.summary.total_wind_energy_kwh,
        totalProduction: data.summary.total_production_kwh,
        totalConsumption: data.summary.total_consumption_kwh,
        totalWasted: data.summary.total_wasted_kwh,
        totalDeficit: data.summary.total_deficit_kwh,
        minSOC: minSOC,
        maxSOC: maxSOC,
        avgSOC: avgSOC,
        energyBalance: data.summary.energy_balance_kwh,
      };
    }
    
    // Use raw API summary for hourly data
    return {
      totalPV: data.summary.total_pv_energy_kwh,
      totalWind: data.summary.total_wind_energy_kwh,
      totalProduction: data.summary.total_production_kwh,
      totalConsumption: data.summary.total_consumption_kwh,
      totalWasted: data.summary.total_wasted_kwh,
      totalDeficit: data.summary.total_deficit_kwh,
      minSOC: data.summary.min_soc_percent,
      maxSOC: data.summary.max_soc_percent,
      avgSOC: data.summary.avg_soc_percent,
      energyBalance: data.summary.energy_balance_kwh,
    };
  }, [data, chartData]);

  if (loading) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading simulation data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.errorState}>
          <p className={styles.errorIcon}>⚠️</p>
          <p className={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.emptyState}>
          <p>No simulation data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      {/* Summary Statistics */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total PV Energy</div>
            <div className={styles.statValue}>{stats.totalPV.toFixed(2)} kWh</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Wind Energy</div>
            <div className={styles.statValue}>{stats.totalWind.toFixed(2)} kWh</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Consumption</div>
            <div className={styles.statValue}>{stats.totalConsumption.toFixed(2)} kWh</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Energy Balance</div>
            <div className={`${styles.statValue} ${stats.energyBalance >= 0 ? styles.positive : styles.negative}`}>
              {stats.energyBalance >= 0 ? '+' : ''}{stats.energyBalance.toFixed(2)} kWh
            </div>
          </div>
        </div>
      )}

      {/* Main Chart */}
      <div className={styles.chartWrapper}>
        <h3 className={styles.chartTitle}>
          Energy Production, Consumption & Battery SOC
          {chartData.length > 48 && <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '10px' }}>(Daily Aggregated)</span>}
        </h3>
        
        <ResponsiveContainer width="100%" height={450}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            
            {/* X-Axis: Time */}
            <XAxis 
              dataKey="time" 
              label={{ 
                value: chartData.length > 48 ? 'Date (Daily Totals)' : chartData.length > 24 ? 'Date & Time' : 'Time (Hour)', 
                position: 'insideBottom', 
                offset: -10 
              }}
              tick={{ fontSize: 12 }}
              interval={chartData.length > 60 ? Math.floor(chartData.length / 30) : chartData.length > 30 ? Math.floor(chartData.length / 15) : 0}
              angle={chartData.length > 30 ? -45 : 0}
              textAnchor={chartData.length > 30 ? 'end' : 'middle'}
              height={chartData.length > 30 ? 80 : 60}
            />
            
            {/* Left Y-Axis: Energy (kWh) */}
            <YAxis 
              yAxisId="energy"
              label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            
            {/* Right Y-Axis: Battery SOC (%) */}
            <YAxis 
              yAxisId="soc"
              orientation="right"
              domain={[0, 100]}
              label={{ value: 'Battery SOC (%)', angle: 90, position: 'insideRight' }}
              tick={{ fontSize: 12 }}
            />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #ccc',
                borderRadius: '8px',
                padding: '12px'
              }}
              formatter={(value, name) => {
                if (name === 'Battery SOC') return `${value.toFixed(1)}%`;
                return `${value.toFixed(3)} kWh`;
              }}
            />
            
            <Legend 
              verticalAlign="top" 
              height={36}
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            
            {/* Production Lines */}
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey="pv_energy"
              stroke="#FFD700"
              strokeWidth={2.5}
              name="PV Energy"
              dot={false}
            />
            
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey="wind_energy"
              stroke="#4A90E2"
              strokeWidth={2.5}
              name="Wind Energy"
              dot={false}
            />
            
            {/* Consumption Line */}
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey="consumption"
              stroke="#E74C3C"
              strokeWidth={2.5}
              name="Consumption"
              dot={false}
            />
            
            {/* Battery SOC Line */}
            <Line
              yAxisId="soc"
              type="monotone"
              dataKey="battery_soc"
              stroke="#2ECC71"
              strokeWidth={3}
              name="Battery SOC"
              dot={false}
            />
            
            {/* 50% SOC Reference Line */}
            <Line
              yAxisId="soc"
              type="monotone"
              dataKey={() => 50}
              stroke="#95a5a6"
              strokeWidth={1}
              strokeDasharray="5 5"
              name="50% SOC"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Battery Statistics */}
      {stats && (
        <div className={styles.batteryStats}>
          <h4 className={styles.batteryStatsTitle}>Battery Performance</h4>
          <div className={styles.batteryStatsGrid}>
            <div className={styles.batteryStat}>
              <span className={styles.batteryLabel}>Min SOC:</span>
              <span className={styles.batteryValue}>{stats.minSOC.toFixed(1)}%</span>
            </div>
            <div className={styles.batteryStat}>
              <span className={styles.batteryLabel}>Max SOC:</span>
              <span className={styles.batteryValue}>{stats.maxSOC.toFixed(1)}%</span>
            </div>
            <div className={styles.batteryStat}>
              <span className={styles.batteryLabel}>Avg SOC:</span>
              <span className={styles.batteryValue}>{stats.avgSOC.toFixed(1)}%</span>
            </div>
            <div className={styles.batteryStat}>
              <span className={styles.batteryLabel}>Wasted Energy:</span>
              <span className={styles.batteryValue}>{stats.totalWasted.toFixed(2)} kWh</span>
            </div>
            <div className={styles.batteryStat}>
              <span className={styles.batteryLabel}>Energy Deficit:</span>
              <span className={styles.batteryValue}>{stats.totalDeficit.toFixed(2)} kWh</span>
            </div>
          </div>
        </div>
      )}

      {/* Energy Breakdown Pie Chart (Optional) */}
      {stats && (
        <div className={styles.energyBreakdown}>
          <h4 className={styles.breakdownTitle}>Energy Production Breakdown</h4>
          <div className={styles.breakdownBars}>
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownLabel}>
                <span className={styles.breakdownDot} style={{ backgroundColor: '#FFD700' }}></span>
                PV Energy
              </div>
              <div className={styles.breakdownBar}>
                <div 
                  className={styles.breakdownFill}
                  style={{ 
                    width: `${(stats.totalPV / stats.totalProduction * 100).toFixed(1)}%`,
                    backgroundColor: '#FFD700'
                  }}
                ></div>
              </div>
              <div className={styles.breakdownPercent}>
                {(stats.totalPV / stats.totalProduction * 100).toFixed(1)}%
              </div>
            </div>
            
            <div className={styles.breakdownItem}>
              <div className={styles.breakdownLabel}>
                <span className={styles.breakdownDot} style={{ backgroundColor: '#4A90E2' }}></span>
                Wind Energy
              </div>
              <div className={styles.breakdownBar}>
                <div 
                  className={styles.breakdownFill}
                  style={{ 
                    width: `${(stats.totalWind / stats.totalProduction * 100).toFixed(1)}%`,
                    backgroundColor: '#4A90E2'
                  }}
                ></div>
              </div>
              <div className={styles.breakdownPercent}>
                {(stats.totalWind / stats.totalProduction * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnergySimulationChart;
