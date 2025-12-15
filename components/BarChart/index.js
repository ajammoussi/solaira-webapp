// BarChart/index.js
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';

const DEFAULT_DATA = [21, 22, 10, 28, 16, 21, 13, 30, 25, 18, 24, 19, 22, 26];
const DEFAULT_CATEGORIES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const BarChart = ({ 
  title = '',
  subtitle = '',
  data = DEFAULT_DATA,
  categories = DEFAULT_CATEGORIES,
  color = '#00E396',
  unit = 'm³',
  yAxisTitle = 'Usage',
  card = true
}) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    let observer = null;

    const loadApexCharts = async () => {
      if (typeof window !== 'undefined') {
        // Ensure ref exists before loading
        if (!chartRef.current) {
          console.warn('BarChart: chartRef not ready');
          return;
        }
        
        const ApexCharts = (await import('apexcharts')).default;

        if (!isMounted) return;

        const options = {
          series: [{
            name: title,
            data: data
          }],
          states: {
            active: {
              allowMultipleDataPointsSelection: false,
              filter: {
                type: 'none',
                value: 0
              }
            },
            hover: {
              filter: {
                type: 'none',
                value: 0
              }
            }
          },
          plotOptions: {
            bar: {
              borderRadius: 8,
              columnWidth: '70%',
              distributed: false
            }
          },
          chart: {
            type: 'bar',
            height: 300,
            toolbar: {
              show: false
            },
            animations: {
              enabled: false
            },
            selection: {
              enabled: false
            },
            events: {
              click: function(event, chartContext, config) {
                return false;
              }
            }
          },
          colors: [color],
          dataLabels: {
            enabled: false
          },
          xaxis: {
            categories: categories,
            title: {
              text: 'Day'
            }
          },
          yaxis: {
            title: {
              text: yAxisTitle
            }
          },
          grid: {
            borderColor: '#e0e0e0',
            strokeDashArray: 3
          },
          tooltip: {
            y: {
              formatter: function(val) {
                return val + " " + unit;
              }
            },
            fixed: {
              enabled: false
            },
            offsetY: -20,
            offsetX: 20
          }
        };

        if (chartRef.current) {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }
          chartInstanceRef.current = new ApexCharts(chartRef.current, options);
          chartInstanceRef.current.render();

          // Add hover effects
          setTimeout(() => {
            if (isMounted) attachHoverEffects();
          }, 100);

          // Re-attach on mutations
          observer = new MutationObserver(() => {
            if (isMounted) attachHoverEffects();
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
      
      const bars = chartRef.current.querySelectorAll('.apexcharts-bar-area');
      const dayCategories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      bars.forEach((bar, barIndex) => {
        bar.addEventListener('mouseenter', function() {
          const hoveredDay = dayCategories[barIndex % 7];
          
          bars.forEach((b, idx) => {
            const currentDay = dayCategories[idx % 7];
            if (currentDay !== hoveredDay) {
              b.style.opacity = '0.2';
            } else {
              b.style.opacity = '1';
            }
          });
        });
        
        bar.addEventListener('mouseleave', function() {
          bars.forEach(b => {
            b.style.opacity = '1';
          });
        });
      });
    };

    loadApexCharts();

    return () => {
      isMounted = false;
      if (observer) observer.disconnect();
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [data, categories, color, unit, yAxisTitle, title]);

  return (
    <div className={card ? styles.chartCard : ''}>
      {title && <div className={styles.chartTitle}>{title}</div>}
      {subtitle && <div className={styles.chartSubtitle}>{subtitle}</div>}
      <div ref={chartRef}></div>
    </div>
  );
};

export default BarChart;