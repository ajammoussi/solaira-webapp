import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useTranslations } from 'next-intl';
import * as LucideIcons from 'lucide-react';
import styles from './styles.module.css';

const AboutPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(120); // Start with estimated height to prevent "pop-in"

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        setScrollProgress((scrolled / maxScroll) * 100);
      }
    };

    const updateHeaderHeight = () => {
      const header = document.querySelector('header');
      if (header) {
        setHeaderHeight(header.offsetHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', updateHeaderHeight);
    
    // Initial measurement
    updateHeaderHeight();
    handleScroll(); // Calculate progress immediately
    
    // Check again after a short delay to ensure styles are applied
    setTimeout(updateHeaderHeight, 100);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  const stats = [
    { label: 'Happy Customers', value: '400+' },
    { label: 'Energy Saved (MWh)', value: '2,500+' },
    { label: 'CO₂ Reduced (tons)', value: '1,200+' },
    { label: 'Years Experience', value: '5+' }
  ];

  const values = [
    {
      title: 'Innovation',
      description: 'We continuously develop cutting-edge energy solutions that push the boundaries of what\'s possible.',
      icon: <LucideIcons.Lightbulb size={24} />
    },
    {
      title: 'Sustainability',
      description: 'Our commitment to the environment drives every decision we make, ensuring a cleaner future.',
      icon: <LucideIcons.Leaf size={24} />
    },
    {
      title: 'Reliability',
      description: 'We deliver consistent, dependable energy solutions that you can trust 24/7.',
      icon: <LucideIcons.Shield size={24} />
    },
    {
      title: 'Customer Focus',
      description: 'Your energy independence and satisfaction are at the heart of everything we do.',
      icon: <LucideIcons.Users size={24} />
    }
  ];

  const vision = [
    { year: '2026', goal: 'Regional Expansion', description: 'Establish operations in 3 additional North African countries', icon: <LucideIcons.Globe size={32} /> },
    { year: '2027', goal: 'Smart Grid Integration', description: 'Launch vehicle-to-grid technology for electric vehicles', icon: <LucideIcons.Zap size={32} /> },
    { year: '2028', goal: '10,000 Homes Powered', description: 'Reach 10,000+ households with clean energy solutions', icon: <LucideIcons.Home size={32} /> },
    { year: '2029', goal: 'Carbon Neutral Operations', description: 'Achieve 100% carbon-neutral manufacturing and operations', icon: <LucideIcons.TreeDeciduous size={32} /> },
    { year: '2030', goal: 'Energy Independence', description: 'Help 50,000 families achieve complete energy independence', icon: <LucideIcons.Flag size={32} /> }
  ];

  return (
    <>
      <Head>
        <title>About Us - Solaira</title>
        <meta name="description" content="Learn about Solaira's mission to make clean, intelligent energy accessible to every household in Tunisia" />
      </Head>

      <div className={styles['about-page']}>
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Progress Bar */}
        <div 
          className={styles['progress-bar-container']}
          style={{ top: `${headerHeight}px` }}
        >
          <div 
            className={styles['progress-bar']}
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Hero Section */}
        <section className={styles['about-hero']}>
          <div className={styles['about-hero-content']}>
            <h1 className={styles['about-title']}>
              About <span className={styles['highlight']}>Solaira</span>
            </h1>
            <p className={styles['about-subtitle']}>
              We're on a mission to make clean, intelligent energy accessible to every household in Tunisia and beyond.
            </p>

            {/* Stats Grid */}
            <div className={styles['stats-grid']}>
              {stats.map((stat, idx) => (
                <div key={idx} className={styles['stat-card']}>
                  <div className={styles['stat-value']}>{stat.value}</div>
                  <div className={styles['stat-label']}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className={styles['mission-section']}>
          <div className={styles['mission-card']}>
            <h2 className={styles['mission-title']}>Our Mission</h2>
            <p className={styles['mission-text']}>
              To empower every Tunisian household with intelligent energy solutions that reduce costs, 
              increase independence, and protect our planet. We believe energy should be smart, clean, 
              and accessible to all.
            </p>
          </div>
        </section>

        {/* Core Values */}
        <section className={styles['values-section']}>
          <h2 className={styles['section-title']}>
            Our <span className={styles['highlight']}>Values</span>
          </h2>
          <p className={styles['section-subtitle']}>
            The principles that guide everything we do
          </p>
          
          <div className={styles['values-grid']}>
            {values.map((value, idx) => (
              <div key={idx} className={styles['value-card']}>
                <div className={styles['value-icon']}>{value.icon}</div>
                <h3 className={styles['value-title']}>{value.title}</h3>
                <p className={styles['value-description']}>{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section className={styles['vision-section']}>
          <h2 className={styles['section-title']}>
            Our <span className={styles['highlight']}>Vision</span>
          </h2>
          <p className={styles['section-subtitle']}>
            The next 5 years: Building a sustainable energy future for North Africa
          </p>

          <div className={styles['vision-grid']}>
            {vision.map((item, idx) => (
              <div key={idx} className={styles['vision-card']}>
                <div className={styles['vision-year']}>{item.year}</div>
                <div className={styles['vision-icon']}>{item.icon}</div>
                <h3 className={styles['vision-goal']}>{item.goal}</h3>
                <p className={styles['vision-description']}>{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles['cta-section']}>
          <h2 className={styles['cta-title']}>
            Ready to Join the Energy Revolution?
          </h2>
          <p className={styles['cta-text']}>
            Discover how Solaira can transform your home's energy independence
          </p>
          <Link href="/signin">
            <button className={styles['cta-button']}>
              Get Started Today →
            </button>
          </Link>
        </section>

        <Footer
          logoAlt="Solaira Logo"
          phone="(+216) 99-999-999"
          email="info@solaira.tn"
          address={
            <>
              <span>Centre Urbain Nord</span>
              <br />
              <span>676 CUN BP, Tunis 1080</span>
            </>
          }
          aboutLinks={['Solar Panels', 'Home Battery', 'About Us', 'Blog', 'Product']}
          supportLinks={['Contact', 'Privacy Policy', 'Terms of Service']}
          connectLinks={['LinkedIn', 'Instagram', 'Facebook']}
          copyrightText="2025 Solaira. All right reserved."
        />
      </div>
    </>
  );
};

export default AboutPage;
