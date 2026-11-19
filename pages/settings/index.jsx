/**
 * Settings Page - PV Energy Management System
 *
 * System configuration forms:
 * - PV system specifications
 * - Location settings
 * - Tariff configuration
 * - Notification preferences
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/hooks/useAuth';
import { useSystemConfig } from '../../lib/hooks/useEnergyData';
import { supabase } from '../../lib/supabase';
import { ErrorMessage, SuccessMessage } from '../../components/Auth';
import styles from '../energy/styles.module.css';
import authStyles from '../../components/Auth/styles.module.css';

const CONSUMPTION_PROFILES = [
  { value: 'home', label: 'Home PV System - 20.1 kWh avg consumption' },
  { value: 'raspberry_pi', label: '+ Add via Raspberry Pi' },
];

const SOLAR_SYSTEMS = [
  {
    value: '2',
    panelCount: 2,
    capacity: '~0.9 kWp',
    capacity_kw: 0.9,
    avgDailyYield: '5.5 kWh',
    pctCovered: '27%',
    verdict: 'Too Small. Minimal impact on bills.',
  },
  {
    value: '4',
    panelCount: 4,
    capacity: '~1.8 kWp',
    capacity_kw: 1.8,
    avgDailyYield: '11.1 kWh',
    pctCovered: '55%',
    verdict: 'Entry Level. Good for day usage.',
  },
  {
    value: '8',
    panelCount: 8,
    capacity: '~3.5 kWp',
    capacity_kw: 3.5,
    avgDailyYield: '22.1 kWh',
    pctCovered: '110%',
    verdict: 'Economic. Neutral over a year, but winter-dependent.',
  },
  {
    value: '10',
    panelCount: 10,
    capacity: '~4.4 kWp',
    capacity_kw: 4.4,
    avgDailyYield: '27.7 kWh',
    pctCovered: '138%',
    verdict: 'High Performance. Great for large families.',
  },
  {
    value: '12',
    panelCount: 12,
    capacity: '~5.3 kWp',
    capacity_kw: 5.3,
    avgDailyYield: '33.2 kWh',
    pctCovered: '165%',
    verdict: 'Off-Grid Choice. Recommended for 90%+ independence.',
  },
  {
    value: '16',
    panelCount: 16,
    capacity: '~7.0 kWp',
    capacity_kw: 7.0,
    avgDailyYield: '44.2 kWh',
    pctCovered: '220%',
    verdict: 'EV Ready. Best for those with electric vehicles.',
  },
];

const Settings = () => {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const { config, loading } = useSystemConfig();

  // Solar Config State
  const [solarConfig, setSolarConfig] = useState({
    consumption_profile: 'home',
    current_system: '10',
    battery_size: '13.5',
  });
  const [solarLoading, setSolarLoading] = useState(false);
  const [solarError, setSolarError] = useState('');
  const [solarSuccess, setSolarSuccess] = useState('');

  // Link device modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkModalType, setLinkModalType] = useState('system');
  const [linkModalDeviceId, setLinkModalDeviceId] = useState('');
  const [linkModalError, setLinkModalError] = useState('');

  // Dynamic lists
  const [solarSystems, setSolarSystems] = useState(SOLAR_SYSTEMS);
  const [batteryOptions, setBatteryOptions] = useState([
    { value: '13.5', label: '13.5 kWh (Home battery)', size: 13.5 },
  ]);

  // Protect this page
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/signin');
    }
  }, [user, authLoading, router]);

  // Populate solar config from profile
  useEffect(() => {
    if (profile) {
      setSolarConfig({
        consumption_profile: profile.consumption_profile || 'home',
        current_system: profile.current_system ? String(profile.current_system) : '10',
        battery_size: profile.battery_size ? String(profile.battery_size) : '13.5',
      });
    }
  }, [profile]);

  const handleSolarChange = (e) => {
    const { name, value } = e.target;

    if (name === 'current_system' && value === 'link-new') {
      setLinkModalType('system');
      setLinkModalDeviceId('');
      setLinkModalError('');
      setShowLinkModal(true);
      return;
    }

    if (name === 'battery' && value === 'link-battery') {
      setLinkModalType('battery');
      setLinkModalDeviceId('');
      setLinkModalError('');
      setShowLinkModal(true);
      return;
    }

    if (name === 'consumption_profile' && value === 'raspberry_pi') {
      setLinkModalType('consumption');
      setLinkModalDeviceId('');
      setLinkModalError('');
      setShowLinkModal(true);
      return;
    }

    if (name === 'battery') {
      setSolarConfig((prev) => ({ ...prev, battery_size: value }));
    } else {
      setSolarConfig((prev) => ({ ...prev, [name]: value }));
    }

    setSolarError('');
    setSolarSuccess('');
  };

  const handleSolarSubmit = async (e) => {
    e.preventDefault();
    setSolarLoading(true);
    setSolarError('');
    setSolarSuccess('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          consumption_profile: solarConfig.consumption_profile,
          current_system: solarConfig.current_system,
          battery_size: solarConfig.battery_size,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update solar configuration');
      }

      setSolarSuccess('Solar configuration updated successfully!');
    } catch (error) {
      console.error('Solar config update error:', error);
      setSolarError(error.message || 'Failed to update solar configuration');
    } finally {
      setSolarLoading(false);
    }
  };

  const handleLinkDevice = () => {
    if (!linkModalDeviceId.trim()) {
      setLinkModalError('Please enter a device ID');
      return;
    }
    setLinkModalError('Unrecognized device ID. Please check your device and try again.');
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setLinkModalDeviceId('');
    setLinkModalError('');
  };

  if (authLoading || !user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f5f5f5',
        }}
      >
        <div className="spinner" />
        <style jsx>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e2e2;
            border-top-color: #00d9a3;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  // Derived state for display
  // Use profile.current_system to show the SAVED capacity, not the form state
  const savedSystemId = profile?.current_system ? String(profile.current_system) : null;
  const savedSystem = solarSystems.find((s) => s.value === savedSystemId);
  const currentCapacity = savedSystem ? savedSystem.capacity_kw : config?.pv_capacity_kw || 0;

  return (
    <Layout>
      <div className={styles.pageContainer}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>System Settings</h1>
          <p className={styles.pageSubtitle}>Configure your PV system parameters and preferences</p>
        </div>

        {/* Quick Config Preview */}
        {!loading && config && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#333', marginBottom: '16px' }}>
              Current Configuration
            </h3>
            <div
              style={{
                backgroundColor: '#FFF',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '20px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 600,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    PV Capacity
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {currentCapacity} kW
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 600,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Panel Tilt
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.panel_tilt}°
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 600,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Panel Azimuth
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.panel_azimuth}° (South)
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 600,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Battery Capacity
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {profile?.battery_size || 0} kWh
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: 600,
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Location
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>
                    {config.location?.address || 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Solar Configuration Form */}
        <div
          style={{
            backgroundColor: '#FFF',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            marginBottom: '24px',
          }}
        >
          <h2 className={authStyles.sectionTitle}>Solar System Configuration</h2>
          <p style={{ color: '#696e78', marginBottom: '24px', fontSize: '14px' }}>
            Configure your energy consumption profile and current solar panel setup for accurate
            analytics and predictions.
          </p>

          <form onSubmit={handleSolarSubmit}>
            <ErrorMessage message={solarError} />
            <SuccessMessage message={solarSuccess} />

            <div className={authStyles.formGrid}>
              <div className={authStyles.inputGroup}>
                <label className={authStyles.label}>
                  Consumption Profile
                  <span
                    style={{
                      color: '#696e78',
                      fontWeight: '400',
                      fontSize: '13px',
                      marginLeft: '8px',
                    }}
                  >
                    (Your typical energy usage)
                  </span>
                </label>
                <select
                  name="consumption_profile"
                  value={solarConfig.consumption_profile}
                  onChange={handleSolarChange}
                  disabled={solarLoading}
                  className={authStyles.input}
                  style={{ height: '42px', backgroundColor: '#F9FAFB', width: '100%' }}
                >
                  {CONSUMPTION_PROFILES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={authStyles.inputGroup}>
                <label className={authStyles.label}>
                  Current Solar System
                  <span
                    style={{
                      color: '#696e78',
                      fontWeight: '400',
                      fontSize: '13px',
                      marginLeft: '8px',
                    }}
                  >
                    (Installed panels)
                  </span>
                </label>
                <select
                  name="current_system"
                  value={solarConfig.current_system}
                  onChange={handleSolarChange}
                  disabled={solarLoading}
                  className={authStyles.input}
                  style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                >
                  {solarSystems.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      title={`${option.panelCount} panels — ${option.capacity} — ${option.avgDailyYield} • ${option.pctCovered} — ${option.verdict}`}
                    >
                      {option.panelCount} panels — {option.capacity} — {option.verdict}
                    </option>
                  ))}
                  <option value="link-new">+ Add another system (Link Raspberry Pi)</option>
                </select>
              </div>

              <div className={authStyles.inputGroup}>
                <label className={authStyles.label}>Battery Size (kWh)</label>
                <select
                  name="battery"
                  value={solarConfig.battery_size}
                  onChange={handleSolarChange}
                  disabled={solarLoading}
                  className={authStyles.input}
                  style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                >
                  {batteryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                  <option value="link-battery">+ Link battery via Raspberry Pi</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="submit" disabled={solarLoading} className={authStyles.primaryButton}>
                {solarLoading ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>

        {showLinkModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.6)',
              zIndex: 1100,
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
                onClick={closeLinkModal}
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
                {linkModalType === 'battery'
                  ? 'Link Battery via Raspberry Pi'
                  : linkModalType === 'consumption'
                    ? 'Add Consumption Profile'
                    : 'Link Another System'}
              </h3>

              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Enter the Device ID found on your Raspberry Pi or Solaira Hub to link it to your
                account.
              </p>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Device ID
                </label>
                <input
                  type="text"
                  value={linkModalDeviceId}
                  onChange={(e) => setLinkModalDeviceId(e.target.value)}
                  placeholder="e.g. SOL-8829-XJ"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    fontSize: '16px',
                  }}
                />
                {linkModalError && (
                  <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '6px' }}>
                    {linkModalError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={closeLinkModal}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkDevice}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#00D9A3',
                    color: 'white',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Link Device
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.placeholder}>
          <div className={styles.placeholderIcon}>
            <LucideIcons.Settings size={64} strokeWidth={1.5} />
          </div>
          <h2 className={styles.placeholderTitle}>More Settings Coming Soon</h2>
          <p className={styles.placeholderText}>Advanced configuration options</p>
          <ul className={styles.featureList}>
            <li>Configure location settings with map picker</li>
            <li>Set electricity tariffs and feed-in rates</li>
            <li>Manage notification preferences</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
