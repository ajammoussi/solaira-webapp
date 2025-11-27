/**
 * Main Layout Component - Sidebar Navigation for Dashboard Pages
 * Minimal header + Vertical sidebar with modern icons
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import * as LucideIcons from 'lucide-react';
import Button from '../Button';
import styles from './styles.module.css';

const Layout = ({ children }) => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      {/* Minimal Header - No Navigation */}
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

        {/* Main Header - Just Branding and Button */}
        <div className={styles.mainNav}>
          <div className={styles.navContainer}>
            {/* Logo */}
            <Link href="/dashboard">
              <a className={styles.logoLink}>
                <div className={styles.logo}>
                  <span className={styles.logoText}>Solaira</span>
                </div>
              </a>
            </Link>

            {/* Spacer */}
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
        <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
          {/* Sidebar Header with Toggle and Brand */}
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarBrandContainer}>
              <span className={styles.sidebarBrand}>Solaira</span>
            </div>
            <button 
              className={styles.toggleButton}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label="Toggle sidebar"
            >
              <LucideIcons.Menu size={18} />
            </button>
          </div>

          {/* Divider */}
          <div className={styles.divider}></div>

          {/* Search Bar */}
          {!sidebarCollapsed && (
            <div className={styles.searchContainer}>
              <LucideIcons.Search size={18} className={styles.searchIcon} />
              <input 
                type="text" 
                placeholder="Search"
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {/* Divider */}
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