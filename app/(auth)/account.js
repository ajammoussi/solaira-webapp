/**
 * Account Page (Protected)
 * User profile and account settings
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useAuth } from '../../lib/hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Input, PasswordInput, PrimaryButton, ErrorMessage, SuccessMessage } from '../../components/Auth';
import styles from '../../components/Auth/styles.module.css';

export default function Account() {
  const router = useRouter();
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
    company: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth/signin?redirect=/auth/account');
    }
  }, [user, authLoading, router]);

  // Populate profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        full_name: profile.full_name || user?.user_metadata?.full_name || '',
        phone: profile.phone || '',
        company: profile.company || '',
      });
    } else if (user) {
      setProfileData(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || '',
      }));
    }
  }, [profile, user]);

  const isGuest = user?.is_anonymous;

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
        data: { full_name: profileData.full_name },
      });

      if (metaError) throw metaError;

      // Update profile in database
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profileData.full_name,
          phone: profileData.phone,
          company: profileData.company,
          updated_at: new Date().toISOString(),
        });

      if (profileError) throw profileError;

      await refreshProfile();
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
        currentPassword: '',
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

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setSignOutLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      // Note: Full account deletion requires server-side admin API
      // For now, we just sign out
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Delete account error:', error);
    }
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <div className={styles.accountContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
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
    );
  }

  const displayName = profileData.full_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <Head>
        <title>Account - Solaira</title>
        <meta name="description" content="Manage your Solaira account" />
      </Head>

      <div className={styles.accountContainer}>
        {/* Header */}
        <header className={styles.accountHeader}>
          <Link href="/dashboard" className={styles.accountLogo}>
            Solaira
          </Link>
          <nav className={styles.accountNav}>
            <Link href="/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
            <button 
              className={styles.signOutButton}
              onClick={handleSignOut}
              disabled={signOutLoading}
            >
              {signOutLoading ? 'Signing out...' : 'Sign Out'}
            </button>
          </nav>
        </header>

        {/* Content */}
        <main className={styles.accountContent}>
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
                <p className={styles.profileEmail}>{user.email || 'Guest User'}</p>
                {isGuest && (
                  <span className={`${styles.profileBadge} ${styles.guestBadge}`}>
                    Guest Account
                  </span>
                )}
              </div>
            </div>

            {isGuest ? (
              <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                <p style={{ color: '#f57c00', margin: 0, fontSize: '14px' }}>
                  You're using a guest account with limited features.{' '}
                  <Link href="/auth/signup" style={{ color: '#00D9A3', fontWeight: '500' }}>
                    Create an account
                  </Link>{' '}
                  to save your data.
                </p>
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit}>
                <ErrorMessage message={profileError} />
                <SuccessMessage message={profileSuccess} />
                
                <div className={styles.formGrid}>
                  <Input
                    label="Full Name"
                    name="full_name"
                    value={profileData.full_name}
                    onChange={handleProfileChange}
                    placeholder="John Doe"
                    disabled={profileLoading}
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleProfileChange}
                    placeholder="+1 (555) 123-4567"
                    disabled={profileLoading}
                  />
                  <Input
                    label="Company"
                    name="company"
                    value={profileData.company}
                    onChange={handleProfileChange}
                    placeholder="Your company"
                    disabled={profileLoading}
                  />
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
            )}
          </section>

          {/* Password Section (only for non-guest users) */}
          {!isGuest && (
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
          )}

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
        </main>
      </div>
    </>
  );
}
