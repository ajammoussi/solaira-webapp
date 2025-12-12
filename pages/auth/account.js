/**
 * Account Page (Protected)
 * User profile and account settings
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

export default function Account() {
  const router = useRouter();
  const { user, profile, isGuest, loading: authLoading, refreshProfile } = useAuth();
  
  const [profileData, setProfileData] = useState({
    display_name: '',
    phone_number: '',
    timezone: 'UTC+01:00',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Redirect logic: guest mode -> dashboard, not logged in -> signin
  useEffect(() => {
    if (!authLoading) {
      if (isGuest) {
        // Guest users can't access account page - redirect to dashboard
        console.log('Account: Guest user detected, redirecting to dashboard');
        router.replace('/dashboard');
      } else if (!user) {
        // Not logged in at all -> signin
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
      // Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { full_name: profileData.display_name },
      });

      if (metaError) throw metaError;

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: profileData.display_name,
          phone_number: profileData.phone_number,
          timezone: profileData.timezone,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      if (refreshProfile) {
        await refreshProfile();
      }
      setProfileSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update error:', error);
      setProfileError(error.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
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
      // Note: Full account deletion requires server-side admin API
      alert('Please contact support to delete your account.');
    } catch (error) {
      console.error('Delete account error:', error);
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
