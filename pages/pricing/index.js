import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './styles.module.css';

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [openFaq, setOpenFaq] = useState(null);

  const plans = [
    {
      name: 'Starter',
      price: { monthly: 49, annual: 490 },
      savings: { monthly: 300, annual: 3600 },
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
      price: { monthly: 89, annual: 890 },
      savings: { monthly: 600, annual: 7200 },
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
      price: { monthly: 139, annual: 1390 },
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

      <div className={styles['pricing-page']}>
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className={styles['pricing-hero']}>
          <div className={styles['pricing-hero-content']}>
            <h1 className={styles['pricing-title']}>
              Simple, <span className={styles['highlight']}>Transparent Pricing</span>
            </h1>
            <p className={styles['pricing-subtitle']}>
              Choose the perfect energy solution for your home. All plans include installation, monitoring, and support.
            </p>

            {/* Billing Toggle */}
            <div className={styles['billing-toggle']}>
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`${styles['toggle-btn']} ${billingCycle === 'monthly' ? styles['active'] : ''}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`${styles['toggle-btn']} ${billingCycle === 'annual' ? styles['active'] : ''}`}
              >
                Annual
                <span className={styles['save-badge']}>Save 17%</span>
              </button>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className={styles['pricing-cards-section']}>
          <div className={styles['pricing-cards-grid']}>
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`${styles['pricing-card']} ${plan.popular ? styles['popular'] : ''}`}
              >
                {plan.popular && (
                  <div className={styles['popular-badge']}>MOST POPULAR</div>
                )}

                <div className={styles['card-header']}>
                  <h3 className={styles['plan-name']}>{plan.name}</h3>
                  <p className={styles['plan-description']}>{plan.description}</p>
                  
                  <div className={styles['price-container']}>
                    <span className={styles['price']}>
                      {plan.price[billingCycle]}
                    </span>
                    <span className={styles['currency']}>TND</span>
                    <span className={styles['billing-period']}>
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>

                  <div className={styles['savings-box']}>
                    <div className={styles['savings-label']}>Estimated Savings</div>
                    <div className={styles['savings-value']}>
                      {plan.savings[billingCycle]} TND
                      <span className={styles['savings-period']}>
                        /{billingCycle === 'monthly' ? 'month' : 'year'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles['card-body']}>
                  <button className={`${styles['get-started-btn']} ${plan.popular ? styles['popular-btn'] : ''}`}>
                    Get Started
                  </button>

                  <div className={styles['features-list']}>
                    <div className={styles['features-heading']}>What's included:</div>
                    {plan.features.map((feature, i) => (
                      <div key={i} className={`${styles['feature-item']} ${styles['included']}`}>
                        <span className={styles['checkmark']}>✓</span>
                        <span className={styles['feature-text']}>{feature}</span>
                      </div>
                    ))}
                    
                    {plan.notIncluded.length > 0 && (
                      <>
                        <div className={styles['features-divider']}></div>
                        <div className={`${styles['features-heading']} ${styles['not-included-heading']}`}>Not included:</div>
                        {plan.notIncluded.map((feature, i) => (
                          <div key={i} className={`${styles['feature-item']} ${styles['not-included']}`}>
                            <span className={styles['crossmark']}>✕</span>
                            <span className={styles['feature-text']}>{feature}</span>
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
        <section className={styles['faq-section']}>
          <h2 className={styles['section-title']}>
            Frequently Asked <span className={styles['highlight']}>Questions</span>
          </h2>
          <p className={styles['section-subtitle']}>
            Everything you need to know about our pricing
          </p>

          <div className={styles['faq-list']}>
            {faqs.map((faq, idx) => (
              <div key={idx} className={styles['faq-item']}>
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className={styles['faq-question']}
                >
                  <span>{faq.q}</span>
                  <span className={`${styles['faq-icon']} ${openFaq === idx ? styles['open'] : ''}`}>›</span>
                </button>
                {openFaq === idx && (
                  <div className={styles['faq-answer']}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className={styles['pricing-cta']}>
          <h2 className={styles['cta-title']}>Still Have Questions?</h2>
          <p className={styles['cta-text']}>
            Our energy experts are here to help you choose the perfect plan
          </p>
          <div className={styles['cta-buttons']}>
            <button className={`${styles['cta-btn']} ${styles['primary']}`}>Call (+216) 99-999-999</button>
            <button className={`${styles['cta-btn']} ${styles['secondary']}`}>Email Us</button>
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
    </>
  );
};

export default PricingPage;
