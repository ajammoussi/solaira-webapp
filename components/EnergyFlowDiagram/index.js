/**
 * EnergyFlowDiagram Component
 * Sankey-style diagram showing energy flow from sources (Solar, Grid) 
 * through Home to various appliances
 * 
 * Save this as: components/EnergyFlowDiagram.jsx
 */

import React, { useMemo, useState } from 'react';

const EnergyFlowDiagram = ({ data }) => {
  const [hoveredFlow, setHoveredFlow] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  
  // Default data structure if none provided
  const defaultData = {
    solar: 100,
    grid_import: 50,
    home_consumption: 120,
    grid_export: 30,
    appliances: {
      electric_car: 25,
      air_conditioning: 20,
      washing_machine: 15,
      dryer: 20,
      heat_pump: 25,
      boiler: 15
    }
  };

  const energyData = data || defaultData;

  // Calculate flows
  const flows = useMemo(() => {
    const solar = energyData.solar || 0;
    const gridImport = energyData.grid_import || 0;
    const homeConsumption = energyData.home_consumption || 0;
    const gridExport = energyData.grid_export || 0;
    
    // Solar can go to home or grid
    const solarToHome = Math.min(solar, homeConsumption);
    const solarToGrid = Math.max(0, solar - solarToHome);
    
    // Grid fills the rest of home consumption
    const gridToHome = Math.max(0, homeConsumption - solarToHome);
    
    return {
      solarToHome,
      solarToGrid,
      gridToHome,
      gridImport,
      totalToHome: homeConsumption,
      appliances: energyData.appliances || defaultData.appliances
    };
  }, [energyData]);

  // SVG dimensions
  const width = 1100;
  const height = 400;
  const padding = 30;

  // Node positions - matching reference layout
  const nodeSize = 80;
  const nodes = {
    solar: { x: padding + 10, y: height * 0.70, width: nodeSize, height: nodeSize, label: 'Solar' },
    grid: { x: padding + 10, y: height * 0.30, width: nodeSize, height: 110, label: 'Grid' },
    home: { x: width * 0.44, y: height * 0.5, width: 100, height: 100, label: 'Home' },
    // Appliances on the right - color blocks with labels
    electric_car: { x: width - 190, y: height * 0.14, width: 32, height: 32, label: 'Electric car' },
    air_conditioning: { x: width - 190, y: height * 0.28, width: 32, height: 32, label: 'Air conditioning' },
    washing_machine: { x: width - 190, y: height * 0.42, width: 32, height: 32, label: 'Washing machine' },
    dryer: { x: width - 190, y: height * 0.56, width: 32, height: 32, label: 'Dryer' },
    heat_pump: { x: width - 190, y: height * 0.70, width: 32, height: 32, label: 'Heat pump' },
    boiler: { x: width - 190, y: height * 0.84, width: 32, height: 32, label: 'Boiler' }
  };

  // Colors for appliances (matching reference image)
  const applianceColors = {
    electric_car: '#6B9BD1',
    air_conditioning: '#E6B84D',
    washing_machine: '#E88B8B',
    dryer: '#7ECBCB',
    heat_pump: '#B47EC6',
    boiler: '#F28DB8'
  };

  // Generate Sankey path (curved flow) with smoother curves
  const generatePath = (startX, startY, startWidth, endX, endY, endWidth, controlOffset = 0.6) => {
    const deltaX = endX - startX;
    const control1X = startX + deltaX * controlOffset;
    const control2X = endX - deltaX * (1 - controlOffset);
    
    return `
      M ${startX} ${startY - startWidth / 2}
      C ${control1X} ${startY - startWidth / 2},
        ${control2X} ${endY - endWidth / 2},
        ${endX} ${endY - endWidth / 2}
      L ${endX} ${endY + endWidth / 2}
      C ${control2X} ${endY + endWidth / 2},
        ${control1X} ${startY + startWidth / 2},
        ${startX} ${startY + startWidth / 2}
      Z
    `;
  };

  // Calculate flow widths (scale factor)
  const maxFlow = Math.max(flows.totalToHome, flows.solarToHome + flows.solarToGrid, 1);
  const widthScale = 60 / maxFlow; // Max width of 60px for flows

  // Calculate appliance flow widths
  const totalAppliances = Object.values(flows.appliances).reduce((a, b) => a + b, 0);
  const applianceScale = totalAppliances > 0 ? flows.totalToHome / totalAppliances : 1;

  // Handle mouse events for tooltips
  const handleFlowHover = (flowInfo, event) => {
    const svgRect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTooltipPos({
      x: event.clientX - svgRect.left,
      y: event.clientY - svgRect.top
    });
    setHoveredFlow(flowInfo);
  };

  const handleFlowLeave = () => {
    setHoveredFlow(null);
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '400px', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#FFFFFF',
      borderRadius: '12px',
      padding: '20px',
      overflow: 'hidden'
    }}>
      <svg 
        width={width} 
        height={height} 
        style={{ maxWidth: '100%', height: 'auto' }}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Define gradients for nodes */}
        <defs>
          <linearGradient id="solarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#F39C12" />
          </linearGradient>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5DADE2" />
            <stop offset="100%" stopColor="#3498DB" />
          </linearGradient>
          <linearGradient id="homeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#16A085" />
            <stop offset="100%" stopColor="#1ABC9C" />
          </linearGradient>
        </defs>

        {/* Grid to Home flow - always show at least a minimum flow */}
        <path
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
          d={generatePath(
            nodes.grid.x + nodes.grid.width,
            nodes.grid.y + nodes.grid.height / 2,
            Math.max(flows.gridToHome * widthScale, 12),
            nodes.home.x,
            nodes.home.y,
            Math.max(flows.gridToHome * widthScale, 12)
          )}
          fill="#89CFF0"
          fillOpacity="0.7"
          onMouseEnter={(e) => handleFlowHover({
            from: 'Grid',
            to: 'Home',
            value: flows.gridToHome,
            unit: 'kW'
          }, e)}
          onMouseMove={(e) => {
            const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
            setTooltipPos({
              x: e.clientX - svgRect.left,
              y: e.clientY - svgRect.top
            });
          }}
          onMouseLeave={handleFlowLeave}
        />

        {/* Solar to Home flow */}
        {flows.solarToHome > 0 && (
          <path
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            d={generatePath(
              nodes.solar.x + nodes.solar.width,
              nodes.solar.y + nodes.solar.height / 2,
              Math.max(flows.solarToHome * widthScale, 8),
              nodes.home.x,
              nodes.home.y,
              Math.max(flows.solarToHome * widthScale, 8)
            )}
            fill="#E6D8A8"
            fillOpacity="0.7"
            onMouseEnter={(e) => handleFlowHover({
              from: 'Solar',
              to: 'Home',
              value: flows.solarToHome,
              unit: 'kW'
            }, e)}
            onMouseMove={(e) => {
              const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTooltipPos({
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top
              });
            }}
            onMouseLeave={handleFlowLeave}
          />
        )}

        {/* Solar to Grid flow (export) */}
        {flows.solarToGrid > 0 && (
          <path
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
            d={generatePath(
              nodes.solar.x + nodes.solar.width / 2,
              nodes.solar.y,
              Math.max(flows.solarToGrid * widthScale * 0.3, 3),
              nodes.grid.x + nodes.grid.width / 2,
              nodes.grid.y + nodes.grid.height,
              Math.max(flows.solarToGrid * widthScale * 0.3, 3),
              0.3
            )}
            fill="#B19CD9"
            fillOpacity="0.6"
            onMouseEnter={(e) => handleFlowHover({
              from: 'Solar',
              to: 'Grid',
              value: flows.solarToGrid,
              unit: 'kW'
            }, e)}
            onMouseMove={(e) => {
              const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
              setTooltipPos({
                x: e.clientX - svgRect.left,
                y: e.clientY - svgRect.top
              });
            }}
            onMouseLeave={handleFlowLeave}
          />
        )}

        {/* Home to Appliances flows */}
        {Object.entries(flows.appliances).map(([appliance, value]) => {
          if (value <= 0) return null;
          
          const flowWidth = Math.max((value * applianceScale) * widthScale, 4);
          const node = nodes[appliance];
          
          return (
            <path
              key={appliance}
              style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
              d={generatePath(
                nodes.home.x + nodes.home.width,
                nodes.home.y,
                flowWidth,
                node.x,
                node.y + node.height / 2,
                flowWidth
              )}
              fill={applianceColors[appliance]}
              fillOpacity="0.6"
              onMouseEnter={(e) => handleFlowHover({
                from: 'Home',
                to: node.label,
                value: value,
                unit: 'kW'
              }, e)}
              onMouseMove={(e) => {
                const svgRect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                setTooltipPos({
                  x: e.clientX - svgRect.left,
                  y: e.clientY - svgRect.top
                });
              }}
              onMouseLeave={handleFlowLeave}
            />
          );
        })}

        {/* Grid Node */}
        <g>
          <rect
            x={nodes.grid.x}
            y={nodes.grid.y}
            width={nodes.grid.width}
            height={nodes.grid.height}
            fill="url(#gridGradient)"
            rx="6"
          />
          <text
            x={nodes.grid.x + nodes.grid.width / 2}
            y={nodes.grid.y + nodes.grid.height / 2 + 5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
            fill="white"
          >
            Grid
          </text>
          <text
            x={nodes.grid.x + nodes.grid.width / 2}
            y={nodes.grid.y - 8}
            textAnchor="middle"
            fontSize="11"
            fontWeight="500"
            fill="#666"
          >
            {flows.gridToHome?.toFixed(1) || '0.0'} kW
          </text>
        </g>

        {/* Solar Node */}
        <g>
          <rect
            x={nodes.solar.x}
            y={nodes.solar.y}
            width={nodes.solar.width}
            height={nodes.solar.height}
            fill="url(#solarGradient)"
            rx="6"
          />
          <text
            x={nodes.solar.x + nodes.solar.width / 2}
            y={nodes.solar.y + nodes.solar.height / 2 + 5}
            textAnchor="middle"
            fontSize="16"
            fontWeight="600"
            fill="white"
          >
            Solar
          </text>
          <text
            x={nodes.solar.x + nodes.solar.width / 2}
            y={nodes.solar.y + nodes.solar.height + 18}
            textAnchor="middle"
            fontSize="11"
            fontWeight="500"
            fill="#666"
          >
            {energyData.solar?.toFixed(1) || '0.0'} kW
          </text>
          {/* Grid label below solar when exporting */}
          {flows.solarToGrid > 0 && (
            <text
              x={nodes.solar.x + nodes.solar.width + 15}
              y={nodes.solar.y - 10}
              fontSize="11"
              fontWeight="500"
              fill="#666"
            >
              Grid
            </text>
          )}
        </g>

        {/* Home Node */}
        <g>
          <rect
            x={nodes.home.x}
            y={nodes.home.y - nodes.home.height / 2}
            width={nodes.home.width}
            height={nodes.home.height}
            fill="url(#homeGradient)"
            rx="8"
          />
          <text
            x={nodes.home.x + nodes.home.width / 2}
            y={nodes.home.y + 6}
            textAnchor="middle"
            fontSize="18"
            fontWeight="700"
            fill="white"
          >
            Home
          </text>
        </g>

        {/* Appliance Nodes with labels on the right */}
        {Object.entries(flows.appliances).map(([appliance]) => {
          const node = nodes[appliance];
          const color = applianceColors[appliance];
          
          return (
            <g key={appliance}>
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={color}
                rx="4"
              />
              <text
                x={node.x + node.width + 10}
                y={node.y + node.height / 2 + 5}
                fontSize="14"
                fontWeight="500"
                fill="#333"
              >
                {node.label}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {hoveredFlow && (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tooltipPos.x - 80}
              y={tooltipPos.y - 50}
              width="160"
              height="50"
              fill="rgba(0, 0, 0, 0.85)"
              rx="6"
            />
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 30}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              fill="white"
            >
              {hoveredFlow.from} → {hoveredFlow.to}
            </text>
            <text
              x={tooltipPos.x}
              y={tooltipPos.y - 12}
              textAnchor="middle"
              fontSize="15"
              fontWeight="700"
              fill="#00D9A3"
            >
              {hoveredFlow.value.toFixed(2)} {hoveredFlow.unit}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default EnergyFlowDiagram;