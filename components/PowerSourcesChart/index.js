// PowerSourcesChart/index.js
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';

const DEFAULT_SOLAR_DATA = [
  0, 0, 5, 15, 25, 28, 25, 18, 12, 8, 3, 0, 0, 0, 5, 15, 22, 25, 20, 10, 5, 0, 0, 0,
];
const DEFAULT_GRID_DATA = [
  12, 10, 8, 7, 5, 3, 2, 4, 6, 8, 10, 14, 16, 15, 10, 7, 5, 4, 6, 10, 14, 16, 14, 13,
];
const DEFAULT_LABELS = [
  '12AM',
  '1AM',
  '2AM',
  '3AM',
  '4AM',
  '5AM',
  '6AM',
  '7AM',
  '8AM',
  '9AM',
  '10AM',
  '11AM',
  '12PM',
  '1PM',
  '2PM',
  '3PM',
  '4PM',
  '5PM',
  '6PM',
  '7PM',
  '8PM',
  '9PM',
  '10PM',
  '11PM',
];

const PowerSourcesChart = ({
  title = '',
  subtitle = '',
  solarData = DEFAULT_SOLAR_DATA,
  gridData = DEFAULT_GRID_DATA,
  labels = DEFAULT_LABELS,
  seriesNames = { solar: 'Solar Generation', grid: 'Grid Consumption' },
  card = true,
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically load ApexCharts
    const loadApexCharts = async () => {
      if (typeof window !== 'undefined') {
        // Ensure ref exists before loading
        if (!chartRef.current) {
          console.warn('PowerSourcesChart: chartRef not ready');
          return;
        }

        const ApexCharts = (await import('apexcharts')).default;

        if (!isMounted) return;

        const options = {
          series: [
            {
              name: seriesNames.solar,
              type: 'area',
              data: solarData,
            },
            {
              name: seriesNames.grid,
              type: 'line',
              data: gridData,
            },
          ],
          chart: {
            height: 350,
            type: 'line',
            stacked: false,
            animations: {
              enabled: false,
            },
            toolbar: {
              show: true,
              tools: {
                download: false,
                zoom: true,
                pan: true,
              },
            },
          },
          stroke: {
            width: [0, 3],
            curve: 'smooth',
            dashArray: [0, 5],
          },
          fill: {
            opacity: [0.35, 1],
            type: 'solid',
            gradient: {
              shade: 'light',
              type: 'vertical',
              opacityFrom: 0.5,
              opacityTo: 0.1,
            },
          },
          colors: ['#FFA500', '#666'],
          labels: labels,
          markers: {
            size: 0,
          },
          xaxis: {
            title: {
              text: 'Time of Day',
            },
          },
          yaxis: {
            title: {
              text: 'kWh',
            },
          },
          tooltip: {
            shared: true,
            intersect: false,
            fixed: {
              enabled: false,
            },
            offsetY: -80,
            offsetX: 40,
          },
          legend: {
            position: 'top',
            horizontalAlign: 'left',
          },
          grid: {
            borderColor: '#e0e0e0',
            strokeDashArray: 3,
          },
        };

        if (chartRef.current) {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }
          chartInstanceRef.current = new ApexCharts(chartRef.current, options);
          chartInstanceRef.current.render();
        }
      }
    };

    loadApexCharts();

    return () => {
      isMounted = false;
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [solarData, gridData, labels]);

  return (
    <div className={card ? styles.chartCard : ''}>
      {title && <div className={styles.chartTitle}>{title}</div>}
      {subtitle && <div className={styles.chartSubtitle}>{subtitle}</div>}
      <div ref={chartRef}></div>
    </div>
  );
};

export default PowerSourcesChart;
