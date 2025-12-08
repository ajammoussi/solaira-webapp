import React, { useEffect, useRef } from 'react';
import styles from './style.module.css';

const EnergyFlowDiagram = ({ data, card = true }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  // Default data structure if none provided
  const defaultData = {
    solar: 100,
    grid_import: 50,
    home_consumption: 120,
    grid_export: 30,
    battery_charge: 15,    // Added Battery Charge
    battery_discharge: 10, // Added Battery Discharge
    appliances: {
      electric_car: 25,
      air_conditioning: 20,
      washing_machine: 15,
      dryer: 20,
      heat_pump: 25,
      boiler: 15
    }
  };

  const energyData = (data && (data.solar > 0 || data.home_consumption > 0)) ? data : defaultData;

  useEffect(() => {
    let isMounted = true;
    let sankeyChart = null;
    let resizeListener = null;

    const initChart = async () => {
      if (!containerRef.current) return;

      try {
        // Dynamic import to fix SSR/Build error with @svgdotjs/svg.js
        const module = await import('apexsankey');
        const ApexSankey = module.default || module;

        if (!isMounted) return;

        // --- DUMMY DATA CONFIGURATION ---
        // Change these values to adjust the dummy data when real data is missing
        const DUMMY_SOLAR_VALUE = .5; 
        const DUMMY_OTHER_VALUE = 0.2;
        // --------------------------------

        let solar = energyData.solar || 0;
        // If solar is 0, use dummy value to ensure it shows up
        if (solar <= 0) {
            solar = DUMMY_SOLAR_VALUE;
        }

        const homeConsumption = energyData.home_consumption || 0;
        const batteryCharge = energyData.battery_charge || 0;
        const batteryDischarge = energyData.battery_discharge || 0;
        
        // Solar distribution:
        const solarToBattery = batteryCharge;
        const solarAvailableForHome = Math.max(0, solar - solarToBattery);
        
        // Home consumption sources:
        const homeFromBattery = batteryDischarge;
        const homeNeededAfterBattery = Math.max(0, homeConsumption - homeFromBattery);
        
        const solarToHome = Math.min(solarAvailableForHome, homeNeededAfterBattery);
        const solarToGrid = Math.max(0, solarAvailableForHome - solarToHome);
        
        const gridToHome = Math.max(0, homeNeededAfterBattery - solarToHome);

        const appliances = energyData.appliances || defaultData.appliances;

        // Calculate Other Consumption
        const totalAppliances = Object.values(appliances).reduce((a, b) => a + b, 0);
        let otherConsumption = Math.max(0, homeConsumption - totalAppliances);

        // If Other is 0, use dummy value to ensure it shows up
        if (otherConsumption <= 0) {
            otherConsumption = DUMMY_OTHER_VALUE;
        }

        // Prepare Nodes
        const nodes = [
          { id: 'Grid', title: 'Grid', color: '#1fa6cfff' },         // Blue
          { id: 'Solar', title: 'Solar', color: '#FF9800' },       // Orange
          { id: 'Battery', title: 'Battery', color: '#4CAF50' },   // Green
          { id: 'Home', title: 'Home', color: '#00D9A3' },         // Teal (Brand)
          { id: 'Electric Car', title: 'Electric Car', color: '#3F51B5' },
          { id: 'Air Conditioning', title: 'Air Conditioning', color: '#00BCD4' },
          { id: 'Washing Machine', title: 'Washing Machine', color: '#9C27B0' },
          { id: 'Dryer', title: 'Dryer', color: '#E91E63' },
          { id: 'Heat Pump', title: 'Heat Pump', color: '#FF5722' },
          { id: 'Boiler', title: 'Boiler', color: '#795548' },
          { id: 'Other', title: 'Other', color: '#9E9E9E' }        // Grey
        ];

        // Prepare Edges
        const edges = [];

        // Sources to Intermediaries/Home
        if (solarToBattery > 0) {
          edges.push({ source: 'Solar', target: 'Battery', value: parseFloat(solarToBattery.toFixed(2)) });
        }
        if (solarToHome > 0) {
          edges.push({ source: 'Solar', target: 'Home', value: parseFloat(solarToHome.toFixed(2)) });
        }
        if (solarToGrid > 0) {
          edges.push({ source: 'Solar', target: 'Grid', value: parseFloat(solarToGrid.toFixed(2)) });
        }
        
        if (homeFromBattery > 0) {
          edges.push({ source: 'Battery', target: 'Home', value: parseFloat(homeFromBattery.toFixed(2)) });
        }
        
        if (gridToHome > 0) {
          edges.push({ source: 'Grid', target: 'Home', value: parseFloat(gridToHome.toFixed(2)) });
        }

        // Appliance flows
        const applianceMap = {
          electric_car: 'Electric Car',
          air_conditioning: 'Air Conditioning',
          washing_machine: 'Washing Machine',
          dryer: 'Dryer',
          heat_pump: 'Heat Pump',
          boiler: 'Boiler'
        };

        Object.entries(appliances).forEach(([key, value]) => {
          if (value > 0 && applianceMap[key]) {
            edges.push({ source: 'Home', target: applianceMap[key], value: parseFloat(value.toFixed(2)) });
          }
        });

        // Other Consumption
        if (otherConsumption > 0) {
          edges.push({ source: 'Home', target: 'Other', value: parseFloat(otherConsumption.toFixed(2)) });
        }

        // Calculate width based on container
        const updateChartDimensions = () => {
          if (!containerRef.current) return;
          
          const containerWidth = containerRef.current.clientWidth || 800;
          const containerHeight = 600; 

          const options = {
            width: containerWidth,
            height: containerHeight,
            canvasStyle: 'width: 100%; height: 100%;',
            spacing: 100,
            nodeWidth: 30,
            nodeBorderWidth: 0,
            edgeOpacity: 0.6,
            edgeGradientFill: true,
            enableTooltip: true,
            enableToolbar: false,
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            nodeBorderColor: 'transparent',
            tooltipBorderColor: '#E5E7EB',
            tooltipBGColor: '#FFFFFF',
          };

          // Clear previous chart
          containerRef.current.innerHTML = '';

          sankeyChart = new ApexSankey(containerRef.current, options);
          
          const graphData = {
            nodes,
            edges
          };

          sankeyChart.render(graphData);
          chartRef.current = sankeyChart;
        };

        updateChartDimensions();

        resizeListener = () => {
          updateChartDimensions();
        };

        window.addEventListener('resize', resizeListener);

      } catch (error) {
        console.error("Failed to load ApexSankey:", error);
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [energyData]);

  return (
    <div className={card ? styles.energyFlowContainer : styles.energyFlowWrapper}>
      <div ref={containerRef} className={styles.sankeyWrapper}></div>
    </div>
  );
};

export default EnergyFlowDiagram;
