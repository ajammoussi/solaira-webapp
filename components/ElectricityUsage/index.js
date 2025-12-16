// ElectricityUsageChart/index.js
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';

const DEFAULT_GRID_IMPORT = [0.5, 0.7, 0.2, 0.9, 1.2, 0.8];
const DEFAULT_SOLAR = [0, 0, 0.1, 0.5, 0.8, 0.3];
const DEFAULT_GRID_EXPORT = [-0.2, -0.1, -0.1, -0.4, -0.6, -0.2];
const DEFAULT_CATEGORIES = ['12AM', '4AM', '8AM', '12PM', '4PM', '8PM'];

const ElectricityUsage = ({ 
  gridImportData = DEFAULT_GRID_IMPORT,
  solarData = DEFAULT_SOLAR,
  gridExportData = DEFAULT_GRID_EXPORT,
  categories = DEFAULT_CATEGORIES,
  card = true
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    let observer = null;

    const loadApexCharts = async () => {
      if (typeof window !== 'undefined') {
        const ApexCharts = (await import('apexcharts')).default;

        const electricityOptions = {
          series: [
            {
              name: 'Grid Import',
              data: gridImportData
            },
            {
              name: 'Solar',
              data: solarData
            },
            {
              name: 'Grid Export',
              data: gridExportData
            }
          ],
          chart: {
            type: 'bar',
            height: 350,
            stacked: true,
            toolbar: {
              show: false
            },
            animations: {
              enabled: false
            }
          },
          plotOptions: {
            bar: {
              borderRadius: 6,
              columnWidth: '60%'
            }
          },
          colors: ['#4bc0c0', '#ffce56', '#ff6384'],
          dataLabels: {
            enabled: false
          },
          xaxis: {
            categories: categories,
            title: {
              text: 'Time of Day'
            }
          },
          yaxis: {
            title: {
              text: 'kWh'
            },
            labels: {
              formatter: function(val) {
                return val.toFixed(1);
              }
            }
          },
          grid: {
            borderColor: '#e0e0e0',
            strokeDashArray: 3,
            xaxis: {
              lines: {
                show: false
              }
            }
          },
          legend: {
            position: 'top',
            horizontalAlign: 'left',
            onItemClick: {
              toggleDataSeries: true
            },
            onItemHover: {
              highlightDataSeries: true
            }
          },
          states: {
            hover: {
              filter: {
                type: 'none',
                value: 0
              }
            },
            active: {
              allowMultipleDataPointsSelection: false,
              filter: {
                type: 'none',
                value: 0
              }
            }
          },
          tooltip: {
            shared: true,
            intersect: false,
            x: {
              show: true
            },
            y: {
              formatter: function(val) {
                return Math.abs(val).toFixed(2) + ' kWh';
              }
            },
            fixed: {
              enabled: false
            },
            offsetY: -120,
            offsetX: 40
          }
        };

        if (chartRef.current) {
          // Destroy existing instance if any
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }
          
          chartInstanceRef.current = new ApexCharts(chartRef.current, electricityOptions);
          chartInstanceRef.current.render();

          // Add hover effects
          setTimeout(() => {
            attachHoverEffects();
          }, 100);

          // Re-attach on mutations
          observer = new MutationObserver(() => {
            attachHoverEffects();
          });

          observer.observe(chartRef.current, {
            childList: true,
            subtree: true
          });
        }
      }
    };

    const attachHoverEffects = () => {
      if (!chartRef.current) return;
      
      const allSeriesGroups = chartRef.current.querySelectorAll('.apexcharts-series');
      
      allSeriesGroups.forEach((seriesGroup, seriesIndex) => {
        seriesGroup.addEventListener('mouseenter', function() {
          allSeriesGroups.forEach((series, idx) => {
            if (idx !== seriesIndex) {
              series.style.opacity = '0.2';
            } else {
              series.style.opacity = '1';
            }
          });
        });
        
        seriesGroup.addEventListener('mouseleave', function() {
          allSeriesGroups.forEach(series => {
            series.style.opacity = '1';
          });
        });
      });
    };

    loadApexCharts();

    return () => {
      if (observer) {
        observer.disconnect();
      }
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [gridImportData, solarData, gridExportData, categories]);

  return (
    <div className={card ? styles.chartCard : styles.chartWrapper}>
      {card && (
        <>
          <div className={styles.chartTitle}>Electricity Usage</div>
          <div className={styles.chartSubtitle}>Hourly import, solar, and export distribution</div>
        </>
      )}
      <div ref={chartRef} className={styles.chartContainer}></div>
    </div>
  );
};

export default ElectricityUsage;