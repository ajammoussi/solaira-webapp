import React, { useState } from 'react';

const CIRCLE_CIRCUMFERENCE = 238.76104;

// SVG Icon paths from @mdi/js
const mdiHome = 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z';
const mdiSolarPower =
  'M12,6A6,6 0 0,0 6,12C6,14.22 7.21,16.16 9,17.2V15H11V18.5L9.5,20L11,21.5L12,20.5L13,21.5L14.5,20L13,18.5V15H15V17.2C16.79,16.16 18,14.22 18,12A6,6 0 0,0 12,6M12,2A1,1 0 0,0 11,3V5A1,1 0 0,0 12,6A1,1 0 0,0 13,5V3A1,1 0 0,0 12,2M2,11A1,1 0 0,0 1,12A1,1 0 0,0 2,13H4A1,1 0 0,0 5,12A1,1 0 0,0 4,11H2M20,11A1,1 0 0,0 19,12A1,1 0 0,0 20,13H22A1,1 0 0,0 23,12A1,1 0 0,0 22,11H20M15.88,3.29L17.29,4.7L18.71,3.29C19.1,2.9 19.1,2.27 18.71,1.88C18.32,1.5 17.69,1.5 17.3,1.88L15.89,3.29C15.5,3.68 15.5,4.31 15.88,4.7M4.71,3.29C5.1,3.68 5.73,3.68 6.12,3.29L7.54,1.88C7.93,1.5 7.93,0.87 7.54,0.48C7.15,0.09 6.52,0.09 6.13,0.48L4.72,1.89C4.33,2.28 4.33,2.91 4.72,3.3';
const mdiTransmissionTower =
  'M8.28,5.45L6.5,4.55L7.76,2H16.23L17.5,4.55L15.72,5.44L15,4H9L8.28,5.45M18.62,8.63L16.5,7.55L18.3,4H19.76L21,8.63L19.04,10.38L18.62,8.63M5.37,8.63L4.96,10.38L3,8.63L4.24,4H5.7L7.5,7.55L5.37,8.63M11,11H13V15H14L12,22L10,15H11V11Z';
const mdiBatteryHigh =
  'M16,18H8V6H16M16.67,4H15V2H9V4H7.33A1.33,1.33 0 0,0 6,5.33V20.67C6,21.4 6.6,22 7.33,22H16.67A1.33,1.33 0 0,0 18,20.67V5.33C18,4.6 17.4,4 16.67,4Z';
const mdiArrowRight = 'M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z';
const mdiArrowLeft = 'M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z';
const mdiArrowUp = 'M13,20H11V8L5.5,13.5L4.08,12.08L12,4.16L19.92,12.08L18.5,13.5L13,8V20Z';
const mdiArrowDown = 'M11,4H13V16L18.5,10.5L19.92,11.92L12,19.84L4.08,11.92L5.5,10.5L11,16V4Z';

const EnergyDistributionCard = ({ energyData = null, loading = false }) => {
  const [animate] = useState(true);

  // Default data for when no props are provided
  const defaultData = {
    solar: 0,
    totalFromGrid: 0,
    returnedToGrid: 0,
    totalHomeConsumption: 0,
    batteryIn: 0,
    batteryOut: 0,
    solarConsumption: 0,
    gridConsumption: 0,
    batteryConsumption: 0,
    solarToGrid: 0,
    solarToBattery: 0,
    batteryFromGrid: 0,
    batteryToGrid: 0,
  };

  // Use provided energyData or default
  const data = energyData || defaultData;

  const {
    solar,
    totalFromGrid,
    returnedToGrid,
    totalHomeConsumption,
    batteryIn,
    batteryOut,
    solarConsumption,
    gridConsumption,
    batteryConsumption,
    solarToGrid,
    solarToBattery,
    batteryFromGrid,
    batteryToGrid,
  } = data;

  const hasSolar = true;
  const hasGrid = true;
  const hasBattery = true;
  const hasReturn = true;

  // Calculate circle segments for home consumption
  const homeSolarCircumference = hasSolar
    ? CIRCLE_CIRCUMFERENCE * (solarConsumption / totalHomeConsumption)
    : undefined;

  const homeBatteryCircumference =
    batteryConsumption > 0
      ? CIRCLE_CIRCUMFERENCE * (batteryConsumption / totalHomeConsumption)
      : undefined;

  const homeGridCircumference = hasGrid
    ? CIRCLE_CIRCUMFERENCE - (homeSolarCircumference || 0) - (homeBatteryCircumference || 0)
    : undefined;

  const totalLines =
    gridConsumption +
    (solarConsumption || 0) +
    (solarToGrid || 0) +
    (solarToBattery || 0) +
    (batteryConsumption || 0) +
    (batteryFromGrid || 0) +
    (batteryToGrid || 0);

  const formatValue = (val) => val?.toFixed(2) + ' kWh';

  return (
    <div
      style={{
        backgroundColor: 'var(--card-background-color, #fff)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '16px',
        maxWidth: '600px',
        margin: '0 auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Energy Distribution</h3>

      <div style={{ position: 'relative' }}>
        {/* Top row: Solar */}
        {hasSolar && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '10px',
              transform: 'translateY(-30px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Solar</span>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid #ff9800',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginBottom: '4px' }}>
                  <path fill="#ff9800" d={mdiSolarPower} />
                </svg>
                {formatValue(solar)}
              </div>
            </div>
          </div>
        )}

        {/* Middle row: Grid and Home */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '600px',
            margin: '30px auto 10px',
            alignItems: 'center',
            transform: 'translateY(-20px)',
          }}
        >
          {/* Grid */}
          {hasGrid && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid #488fc2',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  position: 'relative',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginBottom: '4px' }}>
                  <path fill="#488fc2" d={mdiTransmissionTower} />
                </svg>
                {hasReturn && (
                  <div
                    style={{
                      fontSize: '9px',
                      color: '#a280db',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24">
                      <path fill="#a280db" d={mdiArrowLeft} />
                    </svg>
                    {formatValue(returnedToGrid)}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '9px',
                    color: '#488fc2',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="#488fc2" d={mdiArrowRight} />
                  </svg>
                  {formatValue(totalFromGrid)}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Grid</span>
            </div>
          )}

          {/* Home */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                position: 'relative',
              }}
            >
              {(homeSolarCircumference || homeBatteryCircumference || homeGridCircumference) && (
                <svg
                  style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
                >
                  {homeSolarCircumference && (
                    <circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="#ff9800"
                      strokeWidth="4"
                      strokeDasharray={`${homeSolarCircumference} ${CIRCLE_CIRCUMFERENCE - homeSolarCircumference}`}
                      strokeDashoffset={`-${CIRCLE_CIRCUMFERENCE - homeSolarCircumference}`}
                      transform="rotate(-90 40 40)"
                    />
                  )}
                  {homeBatteryCircumference && (
                    <circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="#4db6ac"
                      strokeWidth="4"
                      strokeDasharray={`${homeBatteryCircumference} ${CIRCLE_CIRCUMFERENCE - homeBatteryCircumference}`}
                      strokeDashoffset={`-${CIRCLE_CIRCUMFERENCE - homeBatteryCircumference - (homeSolarCircumference || 0)}`}
                      transform="rotate(-90 40 40)"
                    />
                  )}
                  {homeGridCircumference && (
                    <circle
                      cx="40"
                      cy="40"
                      r="38"
                      fill="none"
                      stroke="#488fc2"
                      strokeWidth="4"
                      strokeDasharray={`${homeGridCircumference} ${CIRCLE_CIRCUMFERENCE - homeGridCircumference}`}
                      strokeDashoffset="0"
                      transform="rotate(-90 40 40)"
                    />
                  )}
                </svg>
              )}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{ marginBottom: '4px', position: 'relative', zIndex: 1 }}
              >
                <path fill="#666" d={mdiHome} />
              </svg>
              <span style={{ position: 'relative', zIndex: 1 }}>
                {formatValue(totalHomeConsumption)}
              </span>
            </div>
            <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Home</span>
          </div>
        </div>

        {/* Bottom row: Battery */}
        {hasBattery && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '10px',
              transform: 'translateY(-10px)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: '2px solid #00acc1',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" style={{ marginBottom: '4px' }}>
                  <path fill="#00acc1" d={mdiBatteryHigh} />
                </svg>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#00acc1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="#00acc1" d={mdiArrowDown} />
                  </svg>
                  {formatValue(batteryIn)}
                </div>
                <div
                  style={{
                    fontSize: '9px',
                    color: '#4db6ac',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24">
                    <path fill="#4db6ac" d={mdiArrowUp} />
                  </svg>
                  {formatValue(batteryOut)}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Battery</span>
            </div>
          </div>
        )}

        {/* Connection lines with animated dots - ORIGINAL SVG PATHS PRESERVED */}
        <div
          style={{
            position: 'absolute',
            bottom: hasBattery ? '100px' : '0',
            left: '0',
            width: '100%',
            height: hasBattery ? '156px' : '146px',
            display: 'flex',
            justifyContent: 'center',
            padding: '0 16px 16px',
            boxSizing: 'border-box',
            pointerEvents: 'none',
          }}
        >
          <svg
            viewBox="0 0 100 100"
            style={{
              width: 'calc(100% - 160px)',
              height: '100%',
              maxWidth: '450px',
            }}
            preserveAspectRatio="xMidYMid slice"
          >
            {/* Solar to grid return */}
            {hasReturn && hasSolar && (
              <path
                id="return"
                d={`M${hasBattery ? 45 : 47},0 v15 c0,${hasBattery ? '35 -10,30 -30,30' : '40 -10,35 -30,35'} h-20`}
                stroke="#a280db"
                strokeWidth="1"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Solar to home */}
            {hasSolar && (
              <path
                id="solar"
                d={`M${hasBattery ? 55 : 53},0 v15 c0,${hasBattery ? '35 10,30 30,30' : '40 10,35 30,35'} h20`}
                stroke="#ff9800"
                strokeWidth="1"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Grid to home */}
            {hasGrid && (
              <path
                id="grid"
                d={`M0,${hasBattery ? 50 : hasSolar ? 56 : 53} H100`}
                stroke="#488fc2"
                strokeWidth="1"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Battery connections */}
            {hasBattery && (
              <>
                <path
                  id="battery-house"
                  d="M55,100 v-15 c0,-35 10,-30 30,-30 h20"
                  stroke="#4db6ac"
                  strokeWidth="1"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                {hasSolar && (
                  <path
                    id="battery-solar"
                    d="M50,0 V100"
                    stroke="#00acc1"
                    strokeWidth="1"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {hasGrid && (
                  <path
                    id="battery-grid"
                    d="M45,100 v-15 c0,-35 -10,-30 -30,-30 h-20"
                    stroke={batteryFromGrid > 0 ? '#488fc2' : '#a280db'}
                    strokeWidth="1"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </>
            )}

            {/* Animated dots - ONLY show when flow > 0.01 */}
            {animate && solarToGrid > 0.01 && (
              <circle r="1" fill="#a280db" strokeWidth="4">
                <animateMotion
                  dur={`${6 - (solarToGrid / totalLines) * 6}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath href="#return" />
                </animateMotion>
              </circle>
            )}

            {animate && solarConsumption > 0.01 && (
              <circle r="1" fill="#ff9800" strokeWidth="4">
                <animateMotion
                  dur={`${6 - (solarConsumption / totalLines) * 5}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath href="#solar" />
                </animateMotion>
              </circle>
            )}

            {animate && gridConsumption > 0.01 && (
              <circle r="1" fill="#488fc2" strokeWidth="4">
                <animateMotion
                  dur={`${6 - (gridConsumption / totalLines) * 5}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath href="#grid" />
                </animateMotion>
              </circle>
            )}

            {animate && hasBattery && solarToBattery > 0.01 && (
              <circle r="1" fill="#00acc1" strokeWidth="4">
                <animateMotion
                  dur={`${6 - (solarToBattery / totalLines) * 5}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath href="#battery-solar" />
                </animateMotion>
              </circle>
            )}

            {animate && hasBattery && batteryConsumption > 0.01 && (
              <circle r="1" fill="#4db6ac" strokeWidth="4">
                <animateMotion
                  dur={`${6 - (batteryConsumption / totalLines) * 5}s`}
                  repeatCount="indefinite"
                  calcMode="linear"
                >
                  <mpath href="#battery-house" />
                </animateMotion>
              </circle>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default EnergyDistributionCard;
