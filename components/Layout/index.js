/**
 * Main Layout Component - Sidebar Navigation for Dashboard Pages
 * Minimal header + Vertical sidebar with modern icons
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Button from '../Button';
import styles from './styles.module.css';

const Layout = ({ children }) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Default to true to prevent flash
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(savedState === 'true');
    } else {
      setSidebarCollapsed(false); // Default to expanded if no saved state
    }
    // Small delay to ensure smooth render
    setTimeout(() => setIsLoaded(true), 50);
  }, []);

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
              <span className={styles.topBannerText}>(+216) 99-999-999</span>
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
            <Button className={styles.headerButton} href="/sign-up">
              <span>Sign Up</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className={styles.mainLayout}>
        {/* Vertical Sidebar */}
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} ${!isLoaded ? styles.sidebarNoTransition : ''}`}>
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
                    {!sidebarCollapsed && (
                      <span className={styles.sidebarLabel}>{item.label}</span>
                    )}
                  </a>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Vertical Divider between sidebar and content */}
        <div className={styles.verticalDivider}></div>

        {/* Main Content Area */}
        <main className={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;