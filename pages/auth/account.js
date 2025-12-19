/**
 * Account Page (Protected)
 * User profile and account settings with solar system configuration
 * Uses Layout component for consistent header
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';
import { Input, PasswordInput, PrimaryButton, ErrorMessage, SuccessMessage } from '../../components/Auth';
import styles from '../../components/Auth/styles.module.css';

const TIMEZONE_OPTIONS = [
  { value: 'UTC-12:00', label: 'UTC-12:00 - Baker Island, Howland Island' },
  { value: 'UTC-11:00', label: 'UTC-11:00 - American Samoa, Niue' },
  { value: 'UTC-10:00', label: 'UTC-10:00 - Hawaii-Aleutian Standard Time' },
  { value: 'UTC-09:30', label: 'UTC-09:30 - Marquesas Islands' },
  { value: 'UTC-09:00', label: 'UTC-09:00 - Alaska Standard Time' },
  { value: 'UTC-08:00', label: 'UTC-08:00 - Pacific Standard Time (US & Canada)' },
  { value: 'UTC-07:00', label: 'UTC-07:00 - Mountain Standard Time (US & Canada)' },
  { value: 'UTC-06:00', label: 'UTC-06:00 - Central Standard Time (US & Canada)' },
  { value: 'UTC-05:00', label: 'UTC-05:00 - Eastern Standard Time (US & Canada)' },
  { value: 'UTC-04:00', label: 'UTC-04:00 - Atlantic Standard Time' },
  { value: 'UTC-03:30', label: 'UTC-03:30 - Newfoundland Standard Time' },
  { value: 'UTC-03:00', label: 'UTC-03:00 - Argentina, Brazil (Brasília)' },
  { value: 'UTC-02:00', label: 'UTC-02:00 - South Georgia and the South Sandwich Islands' },
  { value: 'UTC-01:00', label: 'UTC-01:00 - Cape Verde, Azores' },
  { value: 'UTC+00:00', label: 'UTC+00:00 - Greenwich Mean Time, Dublin, Lisbon, London, Morocco' },
  { value: 'UTC+01:00', label: 'UTC+01:00 - Central European Time (Paris, Berlin, Rome), Tunisia, Algeria, Libya, West Africa' },
  { value: 'UTC+02:00', label: 'UTC+02:00 - Eastern European Time (Cairo, Athens, Jerusalem), Egypt, South Africa, Sudan' },
  { value: 'UTC+03:00', label: 'UTC+03:00 - Moscow, Istanbul, Riyadh, Kenya, Ethiopia, Somalia' },
  { value: 'UTC+03:30', label: 'UTC+03:30 - Tehran' },
  { value: 'UTC+04:00', label: 'UTC+04:00 - Dubai, Baku, Mauritius' },
  { value: 'UTC+04:30', label: 'UTC+04:30 - Kabul' },
  { value: 'UTC+05:00', label: 'UTC+05:00 - Pakistan, Maldives' },
  { value: 'UTC+05:30', label: 'UTC+05:30 - India, Sri Lanka' },
  { value: 'UTC+05:45', label: 'UTC+05:45 - Nepal' },
  { value: 'UTC+06:00', label: 'UTC+06:00 - Bangladesh, Dhaka' },
  { value: 'UTC+06:30', label: 'UTC+06:30 - Myanmar, Cocos Islands' },
  { value: 'UTC+07:00', label: 'UTC+07:00 - Bangkok, Jakarta, Hanoi' },
  { value: 'UTC+08:00', label: 'UTC+08:00 - China, Singapore, Hong Kong, Manila' },
  { value: 'UTC+08:45', label: 'UTC+08:45 - Eucla (Australia)' },
  { value: 'UTC+09:00', label: 'UTC+09:00 - Japan, Korea' },
  { value: 'UTC+09:30', label: 'UTC+09:30 - Adelaide, Darwin' },
  { value: 'UTC+10:00', label: 'UTC+10:00 - Sydney, Melbourne, Brisbane' },
  { value: 'UTC+10:30', label: 'UTC+10:30 - Lord Howe Island' },
  { value: 'UTC+11:00', label: 'UTC+11:00 - Solomon Islands, New Caledonia' },
  { value: 'UTC+12:00', label: 'UTC+12:00 - New Zealand, Fiji' },
  { value: 'UTC+12:45', label: 'UTC+12:45 - Chatham Islands' },
  { value: 'UTC+13:00', label: 'UTC+13:00 - Tonga, Samoa' },
  { value: 'UTC+14:00', label: 'UTC+14:00 - Line Islands' },
];

const CONSUMPTION_PROFILES = [
  { value: 'home', label: 'Home PV System - 20.1 kWh avg consumption' },
];

const SOLAR_SYSTEMS = [
  { value: '2', label: '2 Panels - 0.9 kWp (Small Setup)', capacity: 0.9 },
  { value: '4', label: '4 Panels - 1.8 kWp (Compact System)', capacity: 1.8 },
  { value: '8', label: '8 Panels - 3.5 kWp (Medium System)', capacity: 3.5 },
  { value: '10', label: '10 Panels - 4.4 kWp (Standard System)', capacity: 4.4 },
  { value: '12', label: '12 Panels - 5.3 kWp (Reference System)', capacity: 5.3 },
  { value: '16', label: '16 Panels - 7.1 kWp (Extended System)', capacity: 7.1 },
];

const BATTERY_SIZE_KWH = 13.5; // Default battery size (kWh)

export default function Account() {
  const router = useRouter();
  const { user, profile, isGuest, loading: authLoading, refreshProfile } = useAuth();
  
  const [profileData, setProfileData] = useState({
    display_name: '',
    phone_number: '',
    timezone: 'UTC+01:00',
  });
  const [solarConfig, setSolarConfig] = useState({
    consumption_profile: 'home',
    current_system: '10',
    battery_size: '13.5', // stored as a key into batteryOptions
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [solarLoading, setSolarLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [solarError, setSolarError] = useState('');
  const [solarSuccess, setSolarSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Link device modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCardId, setLinkCardId] = useState('');
  const [linkPurpose, setLinkPurpose] = useState('system');

  // Dynamic lists for systems and batteries (so linked devices can add items)
  const [solarSystems, setSolarSystems] = useState(SOLAR_SYSTEMS);
  const [batteryOptions, setBatteryOptions] = useState([{ value: '13.5', label: '13.5 kWh (Home battery)', size: 13.5 }]);

  // Redirect logic: guest mode -> dashboard, not logged in -> signin
  useEffect(() => {
    if (!authLoading) {
      if (isGuest) {
        console.log('Account: Guest user detected, redirecting to dashboard');
        router.replace('/dashboard');
      } else if (!user) {
        console.log('Account: No user, redirecting to signin');
        router.replace('/signin?redirect=/account');
      }
    }
  }, [user, isGuest, authLoading, router]);

  // Populate profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        display_name: profile.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '',
        phone_number: profile.phone_number || '',
        timezone: profile.timezone || 'UTC+01:00',
      });
      
      // Load solar configuration if exists
      if (profile.consumption_profile || profile.current_system) {
        setSolarConfig({
          consumption_profile: profile.consumption_profile || 'default',
          current_system: profile.current_system || '10',
        });
      }
    } else if (user) {
      setProfileData(prev => ({
        ...prev,
        display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        phone_number: user.phone || '',
      }));
    }
  }, [profile, user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    setProfileError('');
    setProfileSuccess('');
  };

  const handleSolarChange = (e) => {
    const { name, value } = e.target;

    // Open modal when user chooses to link a new system or link a battery
    if (name === 'current_system' && value === 'link-new') {
      setLinkCardId('');
      setLinkPurpose('system');
      setShowLinkModal(true);
      return;
    }

    if (name === 'battery' && value === 'link-battery') {
      setLinkCardId('');
      setLinkPurpose('battery');
      setShowLinkModal(true);
      return;
    }

    // For battery select, keep the selected option key (string)
    if (name === 'battery') {
      setSolarConfig(prev => ({ ...prev, battery_size: value }));
    } else {
      setSolarConfig(prev => ({ ...prev, [name]: value }));
    }

    setSolarError('');
    setSolarSuccess('');
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const withTimeout = (promise, ms, label) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
        ]);

      const { data: sessionData, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'Session fetch'
      );

      if (sessionError) throw sessionError;

      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      const response = await withTimeout(
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            display_name: profileData.display_name,
            phone_number: profileData.phone_number,
            timezone: profileData.timezone,
          }),
        }),
        8000,
        'Profile update'
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update profile');
      }

      if (refreshProfile) {
        await withTimeout(Promise.resolve(refreshProfile()), 5000, 'Profile refresh');
      }
      setProfileSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSolarSubmit = async (e) => {
    e.preventDefault();
    setSolarLoading(true);
    setSolarError('');
    setSolarSuccess('');

    try {
      const withTimeout = (promise, ms, label) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
        ]);

      const { data: sessionData, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'Session fetch'
      );

      if (sessionError) throw sessionError;

      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Missing access token');

      // Determine numeric battery size to send (look up selected battery option)
      const batteryOption = batteryOptions.find(b => b.value === solarConfig.battery_size);
      const batterySizeToSend = batteryOption ? batteryOption.size : parseFloat(solarConfig.battery_size) || BATTERY_SIZE_KWH;

      const response = await withTimeout(
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            consumption_profile: solarConfig.consumption_profile,
            current_system: solarConfig.current_system,
            battery_size: batterySizeToSend,
          }),
        }),
        8000,
        'Solar config update'
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to update solar configuration');
      }

      if (refreshProfile) {
        await withTimeout(Promise.resolve(refreshProfile()), 5000, 'Profile refresh');
      }
      setSolarSuccess('Solar configuration updated successfully!');
    } catch (error) {
      console.error('Solar config update error:', error);
      setSolarError(error.message || 'Failed to update solar configuration');
    } finally {
      setSolarLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setPasswordSuccess('Password updated successfully!');
      setPasswordData({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Password update error:', error);
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      alert('Please contact support to delete your account.');
    } catch (error) {
      console.error('Delete account error:', error);
    }
  };

  // Confirm link: used by modal to add a new system or battery option
  const handleConfirmLink = async () => {
    setSolarError('');
    if (!linkCardId) {
      setSolarError('Please enter a device ID or click × to cancel.');
      return;
    }

    try {
      setSolarLoading(true);
      // Simulate linking latency
      await new Promise(res => setTimeout(res, 700));

      if (linkPurpose === 'system') {
        const newVal = `linked-${Date.now()}`;
        const newSystem = { value: newVal, label: `Linked: ${linkCardId} - 5.0 kWp`, capacity: 5.0 };
        setSolarSystems(prev => [...prev, newSystem]);
        setSolarConfig(prev => ({ ...prev, current_system: newVal }));
        setSolarSuccess('System linked successfully!');
      } else {
        // battery
        const newVal = `bat-${Date.now()}`;
        const newBat = { value: newVal, label: `Linked Battery - 13.5 kWh (${linkCardId})`, size: 13.5 };
        setBatteryOptions(prev => [...prev, newBat]);
        setSolarConfig(prev => ({ ...prev, battery_size: newVal }));
        setSolarSuccess('Battery linked successfully!');
      }

      setShowLinkModal(false);
      setLinkCardId('');
      setTimeout(() => setSolarSuccess(''), 3000);
    } catch (err) {
      console.error('Link error', err);
      setSolarError('Failed to link device');
    } finally {
      setSolarLoading(false);
    }
  };

  // Loading state
  if (authLoading || !user || isGuest) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 122px)', background: '#f0f5f5' }}>
          <div className="spinner" />
          <style jsx>{`
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid #e2e2e2;
              border-top-color: #00D9A3;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </Layout>
    );
  }

  const displayName = profileData.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  
  const selectedSystem = solarSystems.find(s => s.value === solarConfig.current_system);
  const selectedBattery = batteryOptions.find(b => b.value === solarConfig.battery_size);


  return (
    <>
      <Head>
        <title>Account - Solaira</title>
        <meta name="description" content="Manage your Solaira account" />
      </Head>

      <Layout>
        <div style={{ maxWidth: '800px', padding: '40px 24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600', color: '#191818', marginBottom: '32px' }}>
            Account Settings
          </h1>

          {/* Profile Section */}
          <section className={styles.accountSection}>
            <h2 className={styles.sectionTitle}>Profile</h2>
            
            <div className={styles.profileInfo}>
              <div className={styles.avatar}>{initials}</div>
              <div className={styles.profileDetails}>
                <h3 className={styles.profileName}>{displayName}</h3>
                <p className={styles.profileEmail}>{user.email || 'User'}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <ErrorMessage message={profileError} />
              <SuccessMessage message={profileSuccess} />
              
              <div className={styles.formGrid}>
                <Input
                  label="Display Name"
                  name="display_name"
                  value={profileData.display_name}
                  onChange={handleProfileChange}
                  placeholder="John Doe"
                  disabled={profileLoading}
                />
                <Input
                  label="Phone"
                  name="phone_number"
                  value={profileData.phone_number}
                  onChange={handleProfileChange}
                  placeholder="+1 (555) 123-4567"
                  disabled={profileLoading}
                />
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Timezone</label>
                  <select
                    name="timezone"
                    value={profileData.timezone}
                    onChange={handleProfileChange}
                    disabled={profileLoading}
                    className={styles.input}
                    style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                  >
                    {TIMEZONE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="Email"
                  type="email"
                  value={user.email || ''}
                  disabled
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <PrimaryButton loading={profileLoading}>
                  Save Changes
                </PrimaryButton>
              </div>
            </form>
          </section>

          {/* Solar Configuration Section */}
          <section className={styles.accountSection}>
            <h2 className={styles.sectionTitle}>Solar System Configuration</h2>
            <p style={{ color: '#696e78', marginBottom: '24px', fontSize: '14px' }}>
              Configure your energy consumption profile and current solar panel setup for accurate analytics and predictions.
            </p>
            
            <form onSubmit={handleSolarSubmit}>
              <ErrorMessage message={solarError} />
              <SuccessMessage message={solarSuccess} />
              
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    Consumption Profile
                    <span style={{ color: '#696e78', fontWeight: '400', fontSize: '13px', marginLeft: '8px' }}>
                      (Your typical energy usage)
                    </span>
                  </label>
                  <select
                    name="consumption_profile"
                    value={solarConfig.consumption_profile}
                    onChange={handleSolarChange}
                    disabled={solarLoading}
                    className={styles.input}
                    style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                  >
                    {CONSUMPTION_PROFILES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>
                    Current Solar System
                    <span style={{ color: '#696e78', fontWeight: '400', fontSize: '13px', marginLeft: '8px' }}>
                      (Installed panels)
                    </span>
                  </label>
                  <select
                    name="current_system"
                    value={solarConfig.current_system}
                    onChange={handleSolarChange}
                    disabled={solarLoading}
                    className={styles.input}
                    style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                  >
                    {solarSystems.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                    <option value="link-new">+ Add another system (Link Raspberry Pi)</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Battery Size (kWh)</label>
                  <select
                    name="battery"
                    value={solarConfig.battery_size}
                    onChange={handleSolarChange}
                    disabled={solarLoading}
                    className={styles.input}
                    style={{ height: '42px', backgroundColor: '#F9FAFB' }}
                  >
                    {batteryOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    <option value="link-battery">+ Link battery via Raspberry Pi</option>
                  </select>
                </div>
              </div>

              {showLinkModal && (
                <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', zIndex:1000 }}>
                  <div style={{ width: '420px', background:'white', padding:'20px', borderRadius:'8px', position:'relative' }}>
                    <button onClick={() => { setShowLinkModal(false); setLinkCardId(''); }} style={{ position:'absolute', right: '12px', top: '12px', border:'none', background:'transparent', fontSize:'20px', cursor:'pointer' }}>×</button>
                    <h3 style={{ marginTop:0 }}>{linkPurpose === 'battery' ? 'Link Battery (Raspberry Pi)' : 'Link Raspberry Pi'}</h3>
                    <p style={{ color:'#666', fontSize:'13px' }}>{linkPurpose === 'battery' ? 'Enter your Raspberry Pi card ID to link a battery. If you do not have an ID, click × to close.' : 'Enter your Raspberry Pi card ID to link another system. If you don\'t have an ID, click × to close.'}</p>
                    <input
                      value={linkCardId}
                      onChange={(e) => setLinkCardId(e.target.value)}
                      className={styles.input}
                      placeholder="Card ID (e.g., RP-123456)"
                      style={{ marginTop:'12px' }}
                    />
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:'8px', marginTop:'16px' }}>
                      <button onClick={() => { setShowLinkModal(false); setLinkCardId(''); }} className={styles.secondaryButton}>Cancel</button>
                      <button onClick={handleConfirmLink} className={styles.primaryButton}>Link Device</button>
                    </div>
                  </div>
                </div>
              )}

              {selectedSystem && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  backgroundColor: '#F0F9FF', 
                  borderRadius: '8px',
                  border: '1px solid #BAE6FD'
                }}>
                  <p style={{ fontSize: '14px', color: '#0369A1', margin: 0 }}>
                    <strong>Selected System:</strong> {selectedSystem.label}
                  </p>
                  <p style={{ fontSize: '13px', color: '#075985', margin: '4px 0 0 0' }}>
                    Estimated daily production: {(selectedSystem.capacity * 4.5).toFixed(1)} - {(selectedSystem.capacity * 6.0).toFixed(1)} kWh
                  </p>
                </div>
              )}

              <div style={{ marginTop: '24px' }}>
                <PrimaryButton loading={solarLoading}>
                  Save Solar Configuration
                </PrimaryButton>
              </div>
            </form>
          </section>

          {/* Password Section */}
          <section className={styles.accountSection}>
            <h2 className={styles.sectionTitle}>Change Password</h2>
            
            <form onSubmit={handlePasswordSubmit}>
              <ErrorMessage message={passwordError} />
              <SuccessMessage message={passwordSuccess} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <PasswordInput
                  label="New Password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  disabled={passwordLoading}
                />
                <PasswordInput
                  label="Confirm New Password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm new password"
                  disabled={passwordLoading}
                />
              </div>

              <div style={{ marginTop: '24px' }}>
                <PrimaryButton loading={passwordLoading}>
                  Update Password
                </PrimaryButton>
              </div>
            </form>
          </section>

          {/* Danger Zone */}
          <section className={`${styles.accountSection} ${styles.dangerZone}`}>
            <h2 className={styles.sectionTitle} style={{ color: '#d20d0d' }}>
              Danger Zone
            </h2>
            <p style={{ color: '#696e78', marginBottom: '16px', fontSize: '14px' }}>
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className={styles.dangerButton} onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </section>
        </div>
      </Layout>
    </>
  );
}