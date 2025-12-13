import React, { useState } from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react'; // Import icons
import styles from './styles.module.css';
import Button from '../Button';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
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
            {mobileMenuOpen ? (
              <LucideIcons.X size={24} />
            ) : (
              <LucideIcons.Menu size={24} />
            )}
          </button>

          {/* Navigation Menu (Desktop + Mobile Wrapper) */}
          <div className={`${styles.navWrapper} ${mobileMenuOpen ? styles.navWrapperOpen : ''}`}>
            <nav className={styles.navigation}>
              <Link href="/about-us">
                <a className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>About Us</a>
              </Link>
              <Link href="/pricing">
                <a className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              </Link>
              <Link href="/over-ons">
                <a className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Over ons</a>
              </Link>
              <Link href="/blog">
                <a className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Blog</a>
              </Link>
              <Link href="/contact">
                <a className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>Contact</a>
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