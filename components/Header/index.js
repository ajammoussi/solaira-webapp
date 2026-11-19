import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router'; // ADD THIS IMPORT
import * as LucideIcons from 'lucide-react';
import styles from './styles.module.css';
import Button from '../Button';
import { CONTACT_PHONE } from '../../lib/config/env';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter(); // ADD THIS HOOK

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Helper function to check if a link is active
  const isActive = (path) => {
    return router.pathname === path;
  };

  return (
    <header className={styles.header}>
      {/* Top Banner (keep as is) */}
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

      {/* Main Navigation */}
      <div className={styles.mainNav}>
        <div className={styles.navContainer}>
          {/* Logo */}
          <Link href="/">
            <a className={styles.logoLink}>
              <div className={styles.logo}>
                <span className={styles.logoText}>Solaira</span>
              </div>
            </a>
          </Link>

          {/* Mobile Menu Toggle Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={toggleMobileMenu}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <LucideIcons.X size={24} /> : <LucideIcons.Menu size={24} />}
          </button>

          {/* Navigation Menu */}
          <div className={`${styles.navWrapper} ${mobileMenuOpen ? styles.navWrapperOpen : ''}`}>
            <nav className={styles.navigation}>
              <Link href="/about">
                <a
                  className={`${styles.navLink} ${isActive('/about') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About Us
                </a>
              </Link>
              <Link href="/pricing">
                <a
                  className={`${styles.navLink} ${isActive('/pricing') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Pricing
                </a>
              </Link>
              <Link href="/blog">
                <a
                  className={`${styles.navLink} ${isActive('/blog') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Blog
                </a>
              </Link>
              <Link href="/contact">
                <a
                  className={`${styles.navLink} ${isActive('/contact') ? styles.active : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Contact
                </a>
              </Link>
            </nav>

            {/* CTA Button */}
            <div className={styles.ctaContainer}>
              <Button className={styles.headerButton} href="/signin">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
