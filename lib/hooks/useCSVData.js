import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { parseCSV } from '../utils/csvParser';

const cache = {};

export const useCSVData = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [data, setData] = useState({
    historical: [],
    forecast: [],
    realtime: [],
    loading: true,
    error: null,
    config: null
  });

  useEffect(() => {
    const fetchData = async () => {
      // Wait for auth to load
      if (authLoading) return;

      const panels = profile?.current_system ? Number(profile.current_system) : 10;
      const consumptionProfile = profile?.consumption_profile || 'home';
      const batterySize = profile?.battery_size ? Number(profile.battery_size) : 13.5;

      const config = { panels, consumptionProfile, batterySize };
      const cacheKey = `${panels}`;

      if (cache[cacheKey]) {
        setData({ ...cache[cacheKey], loading: false, error: null, config });
        return;
      }

      // Construct filenames - use API route to serve from backend/data/csv_gen
      const historicalFile = `/api/csv/historical_energy_data_${panels}_panels.csv`;
      const forecastFile = `/api/csv/hourly_forecast_${panels}_panels.csv`;
      const realtimeFile = `/api/csv/realtime_snapshots_${panels}_panels.csv`;

      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        const [histRes, foreRes, realRes] = await Promise.all([
            fetch(historicalFile),
            fetch(forecastFile),
            fetch(realtimeFile)
        ]);

        if (!histRes.ok) throw new Error(`Failed to load CSV data for ${panels} panels. Please check if files exist.`);
        if (!foreRes.ok) throw new Error(`Failed to load forecast data for ${panels} panels.`);
        if (!realRes.ok) throw new Error(`Failed to load realtime data for ${panels} panels.`);

        const histText = await histRes.text();
        const foreText = await foreRes.text();
        const realText = await realRes.text();

        const parsedData = {
            historical: parseCSV(histText),
            forecast: parseCSV(foreText),
            realtime: parseCSV(realText),
        };

        cache[cacheKey] = parsedData;

        setData({
            ...parsedData,
            loading: false,
            error: null,
            config
        });

      } catch (err) {
        console.error("Error fetching CSVs:", err);
        setData(prev => ({ ...prev, loading: false, error: err.message, config }));
      }
    };

    fetchData();
  }, [profile, authLoading]);

  return data;
};
