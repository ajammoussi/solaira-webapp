import React from 'react';
import styles from './styles.module.css';

export function PredictionTable({ predictions }) {
  if (!predictions) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Forecast Data Points</h3>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datetime</th>
              <th style={{ textAlign: 'right' }}>Power (kW)</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(predictions).map((datetime) => (
              <tr key={datetime}>
                <td>{new Date(datetime).toLocaleString()}</td>
                <td style={{ textAlign: 'right' }}>
                  {predictions[datetime].toFixed(4)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
