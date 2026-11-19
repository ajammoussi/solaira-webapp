/**
 * Solar System Setup Modal
 * Mandatory popup for first-time users to configure their solar system
 * Cannot be skipped - user must complete setup
 */

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { SOLAR_SYSTEMS, BATTERY_OPTIONS } from '../lib/config/solar-systems';
import styles from '../components/Auth/styles.module.css';

export default function SolarSetupModal({ onComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [pvSystem, setPvSystem] = useState({
    current_system: '10',
  });

  const [battery, setBattery] = useState({
    battery_size: '13.5',
  });

  const [consumptionProfile, setConsumptionProfile] = useState({
    profile: 'home',
    device_id: '',
  });

  // Raspberry Pi modal state
  const [showRaspberryModal, setShowRaspberryModal] = useState(false);
  const [raspberryModalType, setRaspberryModalType] = useState(''); // 'system', 'battery', or 'consumption'
  const [raspberryDeviceId, setRaspberryDeviceId] = useState('');
  const [raspberryError, setRaspberryError] = useState('');

  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleBatteryChange = (value) => {
    if (value === 'link-raspberry') {
      setRaspberryModalType('battery');
      setRaspberryDeviceId('');
      setRaspberryError('');
      setShowRaspberryModal(true);
      return;
    }
    setBattery({ battery_size: value });
    setError('');
  };

  const handleConsumptionChange = (profile) => {
    setConsumptionProfile({ profile, device_id: '' });
    setError('');
  };

  const handleDeviceIdChange = (e) => {
    setConsumptionProfile((prev) => ({ ...prev, device_id: e.target.value }));
  };

  const openRaspberryModal = (type) => {
    setRaspberryModalType(type);
    setRaspberryDeviceId('');
    setRaspberryError('');
    setShowRaspberryModal(true);
  };

  const handleRaspberryLink = () => {
    if (!raspberryDeviceId.trim()) {
      setRaspberryError('Please enter a device ID');
      return;
    }
    // Always show unrecognized ID error
    setRaspberryError('Unrecognized device ID. Please check your device and try again.');
  };

  const closeRaspberryModal = () => {
    setShowRaspberryModal(false);
    setRaspberryDeviceId('');
    setRaspberryError('');
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const body = {
        consumption_profile: consumptionProfile.profile === 'home' ? 'home' : 'raspberry_pi',
        current_system: parseInt(pvSystem.current_system, 10),
        battery_size: parseFloat(battery.battery_size),
        preferences: { setup_completed: true },
      };

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      setShowSuccessModal(true);
    } catch (err) {
      console.error('Setup error:', err);
      setError(err.message || 'Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    if (onComplete) {
      onComplete();
    }
  };

  const selectedSystem = SOLAR_SYSTEMS.find((s) => s.value === pvSystem.current_system);

  return (
    <>
      {!showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.55)',
            zIndex: 10000,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: step === 1 ? '920px' : '520px',
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ marginBottom: '28px' }}>
              <h2
                style={{
                  fontSize: '26px',
                  fontWeight: '600',
                  color: '#191818',
                  marginBottom: '8px',
                }}
              >
                Configure Your Solar System
              </h2>
              <p style={{ color: '#696e78', fontSize: '14px' }}>
                Step {step} of 3:{' '}
                {step === 1 ? 'Solar Panels' : step === 2 ? 'Battery' : 'Consumption Profile'}
              </p>
              <div
                style={{
                  marginTop: '16px',
                  height: '4px',
                  background: '#e2e2e2',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(step / 3) * 100}%`,
                    height: '100%',
                    background: '#00D9A3',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  color: '#DC2626',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            {/* Step 1: PV System - Card Grid */}
            {step === 1 && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  {SOLAR_SYSTEMS.map((system) => (
                    <div
                      key={system.value}
                      onClick={() => setPvSystem({ current_system: system.value })}
                      style={{
                        padding: '18px',
                        border:
                          pvSystem.current_system === system.value
                            ? '2px solid #00D9A3'
                            : '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: pvSystem.current_system === system.value ? '#f0fdf9' : 'white',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (pvSystem.current_system !== system.value) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pvSystem.current_system !== system.value) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      {system.recommended && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: '#00D9A3',
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          RECOMMENDED
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#191818',
                          marginBottom: '4px',
                        }}
                      >
                        {system.panelCount} Panels
                      </div>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                        {system.capacity}
                      </div>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#00D9A3',
                          marginBottom: '8px',
                        }}
                      >
                        {system.verdict}
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '12px' }}>
                        {system.description}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          borderTop: '1px solid #e5e7eb',
                          paddingTop: '10px',
                        }}
                      >
                        <div style={{ marginBottom: '4px' }}>
                          <strong>Daily Yield:</strong> {system.avgDailyYield}
                        </div>
                        <div>
                          <strong>Coverage:</strong> {system.pctCovered}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Link Another Device Option */}
                <div
                  onClick={() => openRaspberryModal('system')}
                  style={{
                    marginTop: '20px',
                    padding: '24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#191818',
                          marginBottom: '6px',
                        }}
                      >
                        Link Raspberry Pi Device
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Connect a monitoring device for real-time data
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563' }}>
                        Track actual system performance from your connected device.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Battery - Card Selection */}
            {step === 2 && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  {BATTERY_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => handleBatteryChange(option.value)}
                      style={{
                        padding: '24px',
                        border:
                          battery.battery_size === option.value
                            ? '2px solid #00D9A3'
                            : '2px solid #e5e7eb',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: battery.battery_size === option.value ? '#f0fdf9' : 'white',
                      }}
                      onMouseEnter={(e) => {
                        if (battery.battery_size !== option.value) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (battery.battery_size !== option.value) {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '22px',
                              fontWeight: '600',
                              color: '#191818',
                              marginBottom: '6px',
                            }}
                          >
                            {option.label}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {option.description}
                          </div>
                        </div>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor:
                              battery.battery_size === option.value ? '#00D9A3' : '#d1d5db',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                          }}
                        >
                          {battery.battery_size === option.value && (
                            <div
                              style={{
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                background: '#00D9A3',
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Link Battery Option */}
                <div
                  onClick={() => openRaspberryModal('battery')}
                  style={{
                    marginTop: '20px',
                    padding: '24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: '#191818',
                          marginBottom: '6px',
                        }}
                      >
                        Link Raspberry Pi Device
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                        Connect a monitoring device for real-time data
                      </div>
                      <div style={{ fontSize: '13px', color: '#4b5563' }}>
                        Monitor battery levels and charging status from your device.
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: '16px',
                    background: '#f0f9ff',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#0369a1',
                    marginTop: '16px',
                  }}
                >
                  <strong>ℹ️ Battery Benefits:</strong> Store excess solar energy for use during
                  nighttime or cloudy days, maximizing self-consumption and reducing grid
                  dependency.
                </div>
              </div>
            )}

            {/* Step 3: Consumption Profile - Card Selection */}
            {step === 3 && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr',
                    gap: '16px',
                    marginBottom: '20px',
                  }}
                >
                  {/* Home Profile Card */}
                  <div
                    onClick={() => handleConsumptionChange('home')}
                    style={{
                      padding: '24px',
                      border:
                        consumptionProfile.profile === 'home'
                          ? '2px solid #00D9A3'
                          : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: consumptionProfile.profile === 'home' ? '#f0fdf9' : 'white',
                    }}
                    onMouseEnter={(e) => {
                      if (consumptionProfile.profile !== 'home') {
                        e.currentTarget.style.borderColor = '#9ca3af';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (consumptionProfile.profile !== 'home') {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#191818',
                            marginBottom: '6px',
                          }}
                        >
                          🏠 Standard Home Profile
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          Average consumption: 20.1 kWh/day
                        </div>
                        <div style={{ fontSize: '13px', color: '#4b5563' }}>
                          Typical household consumption pattern with peak usage during evening
                          hours.
                        </div>
                      </div>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: '2px solid',
                          borderColor:
                            consumptionProfile.profile === 'home' ? '#00D9A3' : '#d1d5db',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                          marginLeft: '12px',
                        }}
                      >
                        {consumptionProfile.profile === 'home' && (
                          <div
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#00D9A3',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Raspberry Pi Card */}
                  <div
                    onClick={() => openRaspberryModal('consumption')}
                    style={{
                      padding: '24px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'start',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            color: '#191818',
                            marginBottom: '6px',
                          }}
                        >
                          🔌 Link Raspberry Pi Device
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                          Connect a monitoring device for real-time data
                        </div>
                        <div style={{ fontSize: '13px', color: '#4b5563' }}>
                          Track actual consumption patterns from your connected device.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '32px',
                gap: '12px',
              }}
            >
              {step > 1 && (
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className={styles.secondaryButton}
                  style={{ flex: '1' }}
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={loading}
                className={styles.primaryButton}
                style={{ flex: '1', marginLeft: step === 1 ? 'auto' : '0' }}
              >
                {loading ? 'Saving...' : step === 3 ? 'Complete Setup' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raspberry Pi Link Modal */}
      {showRaspberryModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10001,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '440px',
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              position: 'relative',
            }}
          >
            <button
              onClick={closeRaspberryModal}
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px',
                border: 'none',
                background: 'transparent',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                lineHeight: 1,
              }}
            >
              ×
            </button>

            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#191818',
                marginBottom: '8px',
                marginTop: 0,
              }}
            >
              {raspberryModalType === 'battery'
                ? 'Link Battery via Raspberry Pi'
                : raspberryModalType === 'consumption'
                  ? 'Add Consumption Profile'
                  : 'Link Another System'}
            </h3>

            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              {raspberryModalType === 'battery'
                ? 'Enter your Raspberry Pi device ID to link a battery for real-time monitoring.'
                : raspberryModalType === 'consumption'
                  ? 'Enter your Raspberry Pi device ID to add a consumption profile for accurate tracking.'
                  : 'Enter your Raspberry Pi device ID to link another solar panel system.'}
            </p>

            {raspberryError && (
              <div
                style={{
                  padding: '12px',
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  color: '#DC2626',
                  fontSize: '13px',
                }}
              >
                {raspberryError}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: '500',
                  marginBottom: '8px',
                  color: '#374151',
                }}
              >
                Device ID
              </label>
              <input
                value={raspberryDeviceId}
                onChange={(e) => setRaspberryDeviceId(e.target.value.toUpperCase())}
                className={styles.input}
                placeholder="RP-001"
                style={{ width: '100%', textTransform: 'uppercase' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={closeRaspberryModal} className={styles.secondaryButton}>
                Cancel
              </button>
              <button onClick={handleRaspberryLink} className={styles.primaryButton}>
                Link Device
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              textAlign: 'center',
              boxShadow:
                '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                background: '#ECFDF5',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px auto',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#059669"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>

            <h3
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#111827',
                marginBottom: '12px',
              }}
            >
              You're all set!
            </h3>

            <p
              style={{ color: '#374151', fontSize: '16px', marginBottom: '8px', lineHeight: '1.5' }}
            >
              Welcome to Solaira.
            </p>

            <p
              style={{
                color: '#059669',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '24px',
                lineHeight: '1.5',
              }}
            >
              The solar panels you are using now are 450W Hi-MO 7 LR7-54HGBB installed by Spectra.
              You can change the number of panels from settings.
            </p>

            <div
              style={{
                background: '#F3F4F6',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                textAlign: 'left',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  minWidth: '24px',
                  height: '24px',
                  background: '#E5E7EB',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#6B7280',
                }}
              >
                ?
              </div>
              <p style={{ fontSize: '14px', color: '#4B5563', margin: 0, lineHeight: '1.5' }}>
                <strong>Tip:</strong> You can always click on the '?' button if a visual or a card
                isn't really obvious for you what it does.
              </p>
            </div>

            <button
              onClick={handleSuccessClose}
              className={styles.primaryButton}
              style={{ width: '100%' }}
            >
              Get Started
            </button>
          </div>
        </div>
      )}
    </>
  );
}
