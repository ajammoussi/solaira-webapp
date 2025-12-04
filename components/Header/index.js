import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';
import Button from '../Button';
const Header = () => {
  return (
    <header className={styles.header}>
      {/* Top Banner */}
      <div className={styles.topBanner}>
        <div className={styles.topBannerContainer}>
          <div className={styles.topBannerLeft}>
            <span className={styles.topBannerText}>info@ieeeinsat.com</span>
          </div>
          <div className={styles.topBannerRight}>
            <img src="Flag_of_Tunisia.svg" alt="TN" className={styles.flag} />
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

          {/* Navigation Menu */}
          <nav className={styles.navigation}>
            <Link href="/About Us">
              <a className={styles.navLink}>About Us</a>
            </Link>
            <Link href="/Pricing">
              <a className={styles.navLink}>Pricing</a>
            </Link>
            <Link href="/over-ons">
              <a className={styles.navLink}>Over ons</a>
            </Link>
            <Link href="/blog">
              <a className={styles.navLink}>Blog</a>
            </Link>
            <Link href="/contact">
              <a className={styles.navLink}>Contact</a>
            </Link>
          </nav>

          {/* CTA Button */}
          <Button className={styles.headerButton} href="/signin">
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;