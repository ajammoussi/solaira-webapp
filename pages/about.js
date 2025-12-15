import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useTranslations } from 'next-intl';

const AboutPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((scrolled / maxScroll) * 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    },
    {
      title: 'Sustainability',
      description: 'Our commitment to the environment drives every decision we make, ensuring a cleaner future.',
    },
    {
      title: 'Reliability',
      description: 'We deliver consistent, dependable energy solutions that you can trust 24/7.',
    },
    {
      title: 'Customer Focus',
      description: 'Your energy independence and satisfaction are at the heart of everything we do.',
    }
  ];

  const vision = [
    { year: '2026', goal: 'Regional Expansion', description: 'Establish operations in 3 additional North African countries' },
    { year: '2027', goal: 'Smart Grid Integration', description: 'Launch vehicle-to-grid technology for electric vehicles' },
    { year: '2028', goal: '10,000 Homes Powered', description: 'Reach 10,000+ households with clean energy solutions' },
    { year: '2029', goal: 'Carbon Neutral Operations', description: 'Achieve 100% carbon-neutral manufacturing and operations' },
    { year: '2030', goal: 'Energy Independence', description: 'Help 50,000 families achieve complete energy independence' }
  ];

  return (
    <>
      <Head>
        <title>About Us - Solaira</title>
        <meta name="description" content="Learn about Solaira's mission to make clean, intelligent energy accessible to every household in Tunisia" />
      </Head>

      <div className="about-page">
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div 
            className="progress-bar"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Hero Section */}
        <section className="about-hero">
          <div className="about-hero-content">
            <h1 className="about-title">
              About <span className="highlight">Solaira</span>
            </h1>
            <p className="about-subtitle">
              We're on a mission to make clean, intelligent energy accessible to every household in Tunisia and beyond.
            </p>

            {/* Stats Grid */}
            <div className="stats-grid">
              {stats.map((stat, idx) => (
                <div key={idx} className="stat-card">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Statement */}
        <section className="mission-section">
          <div className="mission-card">
            <h2 className="mission-title">Our Mission</h2>
            <p className="mission-text">
              To empower every Tunisian household with intelligent energy solutions that reduce costs, 
              increase independence, and protect our planet. We believe energy should be smart, clean, 
              and accessible to all.
            </p>
          </div>
        </section>

        {/* Core Values */}
        <section className="values-section">
          <h2 className="section-title">
            Our <span className="highlight">Values</span>
          </h2>
          <p className="section-subtitle">
            The principles that guide everything we do
          </p>
          
          <div className="values-grid">
            {values.map((value, idx) => (
              <div key={idx} className="value-card">
                <h3 className="value-title">{value.title}</h3>
                <p className="value-description">{value.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section className="vision-section">
          <h2 className="section-title">
            Our <span className="highlight">Vision</span>
          </h2>
          <p className="section-subtitle">
            The next 5 years: Building a sustainable energy future for North Africa
          </p>

          <div className="vision-grid">
            {vision.map((item, idx) => (
              <div key={idx} className="vision-card">
                <div className="vision-year">{item.year}</div>
                <div className="vision-icon">🎯</div>
                <h3 className="vision-goal">{item.goal}</h3>
                <p className="vision-description">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <h2 className="cta-title">
            Ready to Join the Energy Revolution?
          </h2>
          <p className="cta-text">
            Discover how Solaira can transform your home's energy independence
          </p>
          <Link href="/signin">
            <button className="cta-button">
              Get Started Today →
            </button>
          </Link>
        </section>

        <Footer
          logoImage="https://play.teleporthq.io/static/svg/default-img.svg"
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

      <style jsx>{`
        .about-page {
          width: 100%;
          min-height: 100vh;
          background-color: #ffffff;
        }

        .progress-bar-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background-color: #f0f0f0;
          z-index: 1000;
        }

        .progress-bar {
          height: 100%;
          background: linear-gradient(to right, #00ad62, #01a659);
          transition: width 0.1s ease;
        }

        .about-hero {
          padding: 160px 20px 80px;
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }

        .about-hero-content {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .about-title {
          font-size: 56px;
          font-weight: 300;
          margin-bottom: 24px;
          color: #141414;
        }

        .highlight {
          color: #00ad62;
          font-weight: 400;
        }

        .about-subtitle {
          font-size: 20px;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto 60px;
          line-height: 1.6;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        }

        .stat-value {
          font-size: 36px;
          font-weight: bold;
          color: #141414;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b7280;
        }

        .mission-section {
          padding: 80px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .mission-card {
          background: linear-gradient(to right, #00ad62, #01a659);
          border-radius: 24px;
          padding: 64px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .mission-title {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 24px;
        }

        .mission-text {
          font-size: 20px;
          line-height: 1.8;
          max-width: 900px;
        }

        .values-section {
          padding: 80px 20px;
          background: white;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 40px;
          font-weight: 300;
          text-align: center;
          margin-bottom: 16px;
          color: #141414;
        }

        .section-subtitle {
          text-align: center;
          color: #6b7280;
          margin-bottom: 60px;
          font-size: 18px;
        }

        .values-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 32px;
        }

        .value-card {
          background: #f9fafb;
          border-radius: 16px;
          padding: 32px;
          transition: all 0.3s ease;
          border: 1px solid #e5e7eb;
        }

        .value-card:hover {
          background: white;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
          transform: translateY(-4px);
        }

        .value-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #141414;
        }

        .value-description {
          color: #6b7280;
          line-height: 1.6;
        }

        .vision-section {
          padding: 80px 20px;
          max-width: 1400px;
          margin: 0 auto;
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }

        .vision-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
          margin-top: 60px;
          max-width: 1200px;
          margin-left: auto;
          margin-right: auto;
        }

        .vision-card {
          background: white;
          border-radius: 20px;
          padding: 40px 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          border: 2px solid transparent;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .vision-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(to right, #00ad62, #01a659);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s ease;
        }

        .vision-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 173, 98, 0.15);
          border-color: #00ad62;
        }

        .vision-card:hover::before {
          transform: scaleX(1);
        }

        .vision-year {
          display: inline-block;
          background: linear-gradient(135deg, #00ad62, #01a659);
          color: white;
          padding: 8px 20px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 20px;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.3);
        }

        .vision-icon {
          font-size: 56px;
          margin: 20px 0;
          display: block;
          filter: grayscale(0);
        }

        .vision-goal {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 16px;
          color: #141414;
          line-height: 1.3;
        }

        .vision-description {
          color: #6b7280;
          line-height: 1.7;
          font-size: 16px;
        }

        .cta-section {
          padding: 80px 20px;
          background: linear-gradient(to right, #1f2937, #111827);
          text-align: center;
          color: white;
        }

        .cta-title {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 16px;
        }

        .cta-text {
          font-size: 18px;
          color: #d1d5db;
          margin-bottom: 32px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-button {
          background: #00ad62;
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.3);
        }

        .cta-button:hover {
          background: #01a659;
          transform: scale(1.05);
          box-shadow: 0 8px 20px rgba(0, 173, 98, 0.4);
        }

        @media (max-width: 768px) {
          .about-title {
            font-size: 36px;
          }

          .about-subtitle {
            font-size: 16px;
          }

          .mission-card {
            padding: 32px;
          }

          .mission-title {
            font-size: 28px;
          }

          .mission-text {
            font-size: 16px;
          }

          .vision-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .vision-card {
            padding: 32px 24px;
          }

          .vision-year {
            font-size: 14px;
            padding: 6px 16px;
          }

          .vision-icon {
            font-size: 48px;
            margin: 16px 0;
          }

          .vision-goal {
            font-size: 20px;
          }

          .vision-description {
            font-size: 15px;
          }
        }
      `}</style>
    </>
  );
};

export default AboutPage;