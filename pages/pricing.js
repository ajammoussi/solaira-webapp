import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'Starter',
      price: { monthly: 199, annual: 1990 },
      savings: { monthly: 400, annual: 4800 },
      description: 'Perfect for small households',
      features: [
        '5 kWh Battery Capacity',
        'Basic Energy Monitoring',
        'Mobile App Access',
        'Email Support',
        '2-Year Warranty',
        'Standard Installation'
      ],
      notIncluded: [
        'AI Optimization',
        'Priority Support',
        'Advanced Analytics'
      ],
      popular: false
    },
    {
      name: 'Smart Home',
      price: { monthly: 349, annual: 3490 },
      savings: { monthly: 800, annual: 9600 },
      description: 'Most popular for medium homes',
      features: [
        '10 kWh Battery Capacity',
        'AI-Powered Energy Optimization',
        'Real-Time Monitoring',
        'Mobile & Web Dashboard',
        'Priority Email Support',
        '24/7 System Monitoring',
        'Premium Installation',
        '5-Year Warranty',
        'Predictive Maintenance'
      ],
      notIncluded: [
        'Dedicated Account Manager',
        'Custom Integration'
      ],
      popular: true
    },
    {
      name: 'Premium',
      price: { monthly: 599, annual: 5990 },
      savings: { monthly: 1200, annual: 14400 },
      description: 'For large homes & businesses',
      features: [
        '20 kWh Battery Capacity',
        'Advanced AI Optimization',
        'Multi-Zone Management',
        'Complete Energy Analytics',
        'Dedicated Account Manager',
        '24/7 Phone Support',
        'Custom Integration',
        'White-Glove Installation',
        '10-Year Warranty',
        'Quarterly System Optimization',
        'Priority Service Calls'
      ],
      notIncluded: [],
      popular: false
    }
  ];

  const faqs = [
    {
      q: 'What is included in the installation?',
      a: 'Professional installation includes battery setup, system configuration, safety inspections, and a complete walkthrough of your system.'
    },
    {
      q: 'How long does installation take?',
      a: 'Typical installation takes 1-2 days depending on your home setup and chosen system.'
    },
    {
      q: 'Can I upgrade my plan later?',
      a: 'Yes! You can upgrade to a higher capacity system at any time. Contact us for upgrade options.'
    },
    {
      q: 'What about maintenance?',
      a: 'All plans include remote system monitoring. Premium plans include quarterly optimization visits.'
    }
  ];

  return (
    <>
      <Head>
        <title>Pricing - Solaira</title>
        <meta name="description" content="Choose the perfect energy solution for your home with Solaira's transparent pricing" />
      </Head>

      <div className="pricing-page">
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className="pricing-hero">
          <div className="pricing-hero-content">
            <h1 className="pricing-title">
              Simple, <span className="highlight">Transparent Pricing</span>
            </h1>
            <p className="pricing-subtitle">
              Choose the perfect energy solution for your home. All plans include installation, monitoring, and support.
            </p>

            {/* Billing Toggle */}
            <div className="billing-toggle">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`toggle-btn ${billingCycle === 'annual' ? 'active' : ''}`}
              >
                Annual
                <span className="save-badge">Save 17%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pricing-cards-section">
          <div className="pricing-cards-grid">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`pricing-card ${plan.popular ? 'popular' : ''}`}
              >
                {plan.popular && (
                  <div className="popular-badge">MOST POPULAR</div>
                )}

                <div className="card-header">
                  <h3 className="plan-name">{plan.name}</h3>
                  <p className="plan-description">{plan.description}</p>
                  
                  <div className="price-container">
                    <span className="price">
                      {plan.price[billingCycle]}
                    </span>
                    <span className="currency">TND</span>
                    <span className="billing-period">
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>

                  <div className="savings-box">
                    <div className="savings-label">Estimated Savings</div>
                    <div className="savings-value">
                      {plan.savings[billingCycle]} TND
                      <span className="savings-period">
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-body">
                  <button className={`get-started-btn ${plan.popular ? 'popular-btn' : ''}`}>
                    Get Started
                  </button>

                  <div className="features-list">
                    <div className="features-heading">What's included:</div>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="feature-item included">
                        <span className="checkmark">✓</span>
                        <span className="feature-text">{feature}</span>
                      </div>
                    ))}
                    
                    {plan.notIncluded.length > 0 && (
                      <>
                        <div className="features-divider"></div>
                        <div className="features-heading not-included-heading">Not included:</div>
                        {plan.notIncluded.map((feature, i) => (
                          <div key={i} className="feature-item not-included">
                            <span className="crossmark">✕</span>
                            <span className="feature-text">{feature}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="faq-section">
          <h2 className="section-title">
            Frequently Asked <span className="highlight">Questions</span>
          </h2>
          <p className="section-subtitle">
            Everything you need to know about our pricing
          </p>

          <div className="faq-list">
            {faqs.map((faq, idx) => (
              <div key={idx} className="faq-item">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="faq-question"
                >
                  <span>{faq.q}</span>
                  <span className={`faq-icon ${openFaq === idx ? 'open' : ''}`}>›</span>
                </button>
                {openFaq === idx && (
                  <div className="faq-answer">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="pricing-cta">
          <h2 className="cta-title">Still Have Questions?</h2>
          <p className="cta-text">
            Our energy experts are here to help you choose the perfect plan
          </p>
          <div className="cta-buttons">
            <button className="cta-btn primary">Call (+216) 99-999-999</button>
            <button className="cta-btn secondary">Email Us</button>
          </div>
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
        .pricing-page {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }

        .pricing-hero {
          padding: 160px 20px 60px;
          text-align: center;
        }

        .pricing-hero-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .pricing-title {
          font-size: 56px;
          font-weight: 300;
          margin-bottom: 24px;
          color: #141414;
        }

        .highlight {
          color: #00ad62;
          font-weight: 400;
        }

        .pricing-subtitle {
          font-size: 20px;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto 40px;
        }

        .billing-toggle {
          display: inline-flex;
          background: white;
          border-radius: 50px;
          padding: 4px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .toggle-btn {
          padding: 12px 32px;
          border-radius: 50px;
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.3s ease;
          position: relative;
        }

        .toggle-btn.active {
          background: #00ad62;
          color: white;
          box-shadow: 0 2px 8px rgba(0, 173, 98, 0.3);
        }

        .save-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          background: #f97316;
          color: white;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .pricing-cards-section {
          padding: 60px 20px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .pricing-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 32px;
        }

        .pricing-card {
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .pricing-card:hover {
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-4px);
        }

        .pricing-card.popular {
          border-color: #00ad62;
          transform: translateY(-16px);
        }

        .popular-badge {
          background: #00ad62;
          color: white;
          padding: 8px 24px;
          font-size: 12px;
          font-weight: bold;
          text-align: center;
        }

        .card-header {
          background: linear-gradient(to right, #00ad62, #01a659);
          color: white;
          padding: 32px;
        }

        .plan-name {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .plan-description {
          font-size: 14px;
          opacity: 0.9;
          margin-bottom: 24px;
        }

        .price-container {
          margin-bottom: 24px;
        }

        .price {
          font-size: 56px;
          font-weight: bold;
        }

        .currency {
          font-size: 24px;
          margin-left: 8px;
        }

        .billing-period {
          display: block;
          font-size: 14px;
          opacity: 0.8;
          margin-top: 8px;
        }

        .savings-box {
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 16px;
        }

        .savings-label {
          font-size: 12px;
          opacity: 0.9;
          margin-bottom: 4px;
        }

        .savings-value {
          font-size: 24px;
          font-weight: bold;
        }

        .savings-period {
          font-size: 14px;
          font-weight: normal;
        }

        .card-body {
          padding: 32px;
        }

        .get-started-btn {
          width: 100%;
          padding: 16px;
          border-radius: 12px;
          border: none;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          background: #f3f4f6;
          color: #1f2937;
          margin-bottom: 32px;
        }

        .get-started-btn.popular-btn {
          background: #00ad62;
          color: white;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.3);
        }

        .get-started-btn:hover {
          transform: scale(1.02);
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .features-heading {
          font-weight: 600;
          color: #141414;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .not-included-heading {
          color: #9ca3af;
        }

        .feature-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .feature-item.included .checkmark {
          color: #00ad62;
          font-weight: bold;
        }

        .feature-item.not-included {
          opacity: 0.5;
        }

        .feature-item.not-included .crossmark {
          color: #9ca3af;
        }

        .feature-text {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.5;
        }

        .features-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 16px 0;
        }

        .faq-section {
          padding: 80px 20px;
          max-width: 900px;
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

        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .faq-question {
          width: 100%;
          padding: 20px 24px;
          background: white;
          border: none;
          text-align: left;
          font-size: 16px;
          font-weight: 600;
          color: #141414;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s ease;
        }

        .faq-question:hover {
          background: #f9fafb;
        }

        .faq-icon {
          font-size: 24px;
          color: #00ad62;
          transition: transform 0.3s ease;
        }

        .faq-icon.open {
          transform: rotate(90deg);
        }

        .faq-answer {
          padding: 0 24px 20px;
          color: #6b7280;
          line-height: 1.6;
        }

        .pricing-cta {
          padding: 80px 20px;
          background: linear-gradient(to right, #00ad62, #01a659);
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
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 32px;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-btn {
          padding: 16px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .cta-btn.primary {
          background: white;
          color: #00ad62;
        }

        .cta-btn.primary:hover {
          background: #f9fafb;
          transform: scale(1.05);
        }

        .cta-btn.secondary {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          backdrop-filter: blur(10px);
        }

        .cta-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        @media (max-width: 768px) {
          .pricing-title {
            font-size: 36px;
          }

          .pricing-cards-grid {
            grid-template-columns: 1fr;
          }

          .pricing-card.popular {
            transform: translateY(0);
          }

          .cta-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
};

export default PricingPage;