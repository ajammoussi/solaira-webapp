import React, { useState } from 'react';
import styles from './styles.module.css';

export function PVForecastForm({ updatePredictions }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(2); // Default 48h
  const [formData, setFormData] = useState({
    latitude: 51.75,
    longitude: -1.25,
    capacity_kwp: 1.25,
    tilt: 35,
    orientation: 180,
    inverter_efficiency: 1.0,
    temperature_coefficient: -0.004,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare payload
      let payload = { ...formData };
      if (!showAdvanced) {
        const { inverter_efficiency, temperature_coefficient, ...basicValues } = formData;
        payload = basicValues;
      }

      // Call Next.js API route which proxies to Python backend
      const response = await fetch('/api/solar-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: payload, days: days }),
      });

      if (!response.ok) throw new Error('Forecast failed');

      const data = await response.json();
      updatePredictions(data.predictions.power_kw);
    } catch (error) {
      console.error('Error fetching forecast:', error);
      alert('Failed to fetch forecast. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Solar Forecast Parameters</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup} style={{ marginBottom: '16px' }}>
          <label className={styles.label}>Forecast Duration</label>
          <div className={styles.durationGroup}>
            <button
              type="button"
              className={`${styles.durationButton} ${days === 2 ? styles.durationButtonActive : ''}`}
              onClick={() => setDays(2)}
            >
              48 Hours
            </button>
            <button
              type="button"
              className={`${styles.durationButton} ${days === 7 ? styles.durationButtonActive : ''}`}
              onClick={() => setDays(7)}
            >
              7 Days
            </button>
            <button
              type="button"
              className={`${styles.durationButton} ${days === 14 ? styles.durationButtonActive : ''}`}
              onClick={() => setDays(14)}
            >
              14 Days
            </button>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Latitude</label>
            <input
              type="number"
              step="any"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Longitude</label>
            <input
              type="number"
              step="any"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Capacity (kWp)</label>
            <input
              type="number"
              step="any"
              name="capacity_kwp"
              value={formData.capacity_kwp}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Tilt (°)</label>
            <input
              type="number"
              step="any"
              name="tilt"
              value={formData.tilt}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Orientation (°)</label>
            <input
              type="number"
              step="any"
              name="orientation"
              value={formData.orientation}
              onChange={handleChange}
              className={styles.input}
              required
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={styles.toggleButton}
        >
          {showAdvanced ? 'Hide Advanced Parameters' : 'Show Advanced Parameters'}
        </button>

        {showAdvanced && (
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Inverter Efficiency (0-1)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                name="inverter_efficiency"
                value={formData.inverter_efficiency}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Temp Coefficient</label>
              <input
                type="number"
                step="0.001"
                name="temperature_coefficient"
                value={formData.temperature_coefficient}
                onChange={handleChange}
                className={styles.input}
              />
            </div>
          </div>
        )}

        <div style={{ marginTop: '16px' }}>
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Generating Forecast...' : 'Generate Forecast'}
          </button>
        </div>
      </form>
    </div>
  );
}
