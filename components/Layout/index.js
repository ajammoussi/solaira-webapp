/**
 * Main Layout Component - Sidebar Navigation for Dashboard Pages
 * Minimal header + Vertical sidebar with modern icons + Account section
 */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Button from '../Button';
import { useAuth } from '../../lib/hooks/useAuth';
import { CONTACT_PHONE } from '../../lib/config/env';
import styles from './styles.module.css';

// Key used to signal logout across tabs
const LOGOUT_EVENT_KEY = 'solaira_logout_event';

const Layout = ({ children }) => {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  // Get display name from user/profile
  const displayName =
    profile?.display_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  // Get initials for avatar
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    setSignOutLoading(true);

    try {
      // Trigger sign out immediately without waiting for network
      signOut();

      // Signal other tabs to logout
      localStorage.setItem(LOGOUT_EVENT_KEY, Date.now().toString());

      // Navigate immediately to home
      router.push('/');
    } catch (error) {
      console.error('Layout: signOut error:', error);
      router.push('/');
    }
  };

  // Listen for logout events from other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === LOGOUT_EVENT_KEY && e.newValue) {
        router.push('/');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    } else {
      setSidebarCollapsed(false);
    }
    setTimeout(() => setIsLoaded(true), 50);
  }, []);

  // Close account menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };

    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [accountMenuOpen]);

  // Save sidebar state to localStorage whenever it changes
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LucideIcons.LayoutDashboard },
    { href: '/energy', label: 'Energy', icon: LucideIcons.Zap },
    { href: '/predictions', label: 'Predictions', icon: LucideIcons.TrendingUp },
    { href: '/maintenance', label: 'Maintenance', icon: LucideIcons.Wrench },
    { href: '/settings', label: 'Settings', icon: LucideIcons.Settings },
  ];

  const isActive = (href) => router.pathname === href;

  return (
    <div className={styles.container}>
      {/* Minimal Header with Search */}
      <header className={styles.header}>
        {/* Top Banner */}
        <div className={styles.topBanner}>
          <div className={styles.topBannerContainer}>
            <div className={styles.topBannerLeft}>
              <span className={styles.topBannerText}>info@ieeeinsat.com</span>
            </div>
            <div className={styles.topBannerRight}>
              <img src="/Flag_of_Tunisia.svg" alt="TN" className={styles.flag} />
              <span className={styles.topBannerText}>{CONTACT_PHONE}</span>
            </div>
          </div>
        </div>

        {/* Main Header - Logo, Toggle, Search, and Button */}
        <div className={styles.mainNav}>
          {/* Vertical Divider between Toggle and Search */}
          <div className={styles.headerVerticalDivider}></div>

          <div className={styles.navContainer}>
            {/* Logo */}
            <Link href="/dashboard">
              <a className={styles.logoLink}>
                <div className={styles.logo}>
                  <img
                    src="/solaria-small-logo1.png"
                    alt="Solaira Logo"
                    className={styles.logoImage}
                  />
                  <span className={styles.logoText}>Solaira</span>
                </div>
              </a>
            </Link>

            {/* Toggle Button */}
            <button
              className={styles.headerToggleButton}
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <LucideIcons.Menu size={20} />
            </button>

            {/* Search Bar */}
            <div className={styles.headerSearchContainer}>
              <LucideIcons.Search size={18} className={styles.headerSearchIcon} />
              <input
                type="text"
                placeholder="Search"
                className={styles.headerSearchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Spacer to push button to the right */}
            <div style={{ flex: 1 }}></div>

            {/* CTA Button */}
            <Button
              className={styles.headerButton}
              onClick={handleSignOut}
              disabled={signOutLoading}
            >
              <span>{signOutLoading ? 'Logging out...' : 'Log Out'}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className={styles.mainLayout}>
        {/* Vertical Sidebar */}
        <aside
          className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${!isLoaded ? styles.sidebarNoTransition : ''}`}
        >
          {/* Divider at top */}
          <div className={styles.divider}></div>

          {/* Sidebar Navigation */}
          <nav className={styles.sidebarNav}>
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`${styles.sidebarLink} ${isActive(item.href) ? styles.sidebarLinkActive : ''}`}
                    title={item.label}
                  >
                    <span className={styles.sidebarIcon}>
                      <IconComponent size={20} strokeWidth={2} />
                    </span>
                    {!sidebarCollapsed && <span className={styles.sidebarLabel}>{item.label}</span>}
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Account Section at Bottom */}
          <div
            style={{ padding: '12px', borderTop: '1px solid #E5E7EB', position: 'relative' }}
            ref={accountMenuRef}
          >
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: '100%',
                padding: sidebarCollapsed ? '8px' : '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                borderRadius: '8px',
                transition: 'background-color 0.15s ease',
              }}
              title="Account"
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F3F4F6')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {loading ? (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    minHeight: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#E5E7EB',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    minHeight: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#00D9A3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
              )}
              {!sidebarCollapsed &&
                (loading ? (
                  <div
                    style={{
                      flex: 1,
                      height: '16px',
                      backgroundColor: '#E5E7EB',
                      borderRadius: '4px',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#374151',
                      fontWeight: '500',
                    }}
                  >
                    {displayName}
                  </span>
                ))}
              {!sidebarCollapsed && (
                <LucideIcons.ChevronUp
                  size={16}
                  color="#6B7280"
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: accountMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </button>

            {/* Dropdown Menu */}
            {accountMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: sidebarCollapsed ? '70px' : '12px',
                  right: sidebarCollapsed ? 'auto' : '12px',
                  marginBottom: '8px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '10px',
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  overflow: 'hidden',
                  minWidth: sidebarCollapsed ? '180px' : 'auto',
                  zIndex: 1000,
                }}
              >
                <Link href="/account">
                  <a
                    className={styles.sidebarLink}
                    style={{
                      borderRadius: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                    }}
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    <LucideIcons.User size={18} strokeWidth={2} />
                    <span>Account</span>
                  </a>
                </Link>
                <div style={{ width: '100%', height: '1px', backgroundColor: '#E5E7EB' }}></div>
                <button
                  onClick={() => {
                    setAccountMenuOpen(false);
                    handleSignOut();
                  }}
                  className={styles.sidebarLink}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    width: '100%',
                    borderRadius: '0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    textAlign: 'left',
                  }}
                  disabled={signOutLoading}
                >
                  <LucideIcons.LogOut size={18} strokeWidth={2} />
                  <span>{signOutLoading ? 'Logging out...' : 'Log out'}</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Vertical Divider between sidebar and content */}
        <div className={styles.verticalDivider}></div>

        {/* Main Content Area */}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
