import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './styles.module.css';

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'general',
    message: '',
    preferredContact: 'email'
  });

  const [formStatus, setFormStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setFormStatus('success');
      setIsSubmitting(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'general',
        message: '',
        preferredContact: 'email'
      });
      
      setTimeout(() => setFormStatus(null), 5000);
    }, 1500);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const contactMethods = [
    {
      title: 'Phone',
      detail: '(+216) 99-999-999',
      description: 'Mon-Fri 8am-6pm CET'
    },
    {
      title: 'Email',
      detail: 'info@solaira.tn',
      description: 'We reply within 24 hours'
    },
    {
      title: 'Visit Us',
      detail: 'Centre Urbain Nord',
      description: '676 CUN BP, Tunis 1080'
    },
    {
      title: 'Business Hours',
      detail: 'Mon-Fri: 8am-6pm',
      description: 'Sat: 9am-1pm'
    }
  ];

  const subjects = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'pricing', label: 'Pricing & Plans' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'installation', label: 'Installation Request' },
    { value: 'partnership', label: 'Partnership Opportunity' }
  ];

  return (
    <>
      <Head>
        <title>Contact Us - Solaira</title>
        <meta name="description" content="Get in touch with Solaira for energy solutions, support, and inquiries" />
      </Head>

      <div className={styles['contact-page']}>
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className={styles['contact-hero']}>
          <div className={styles['contact-hero-content']}>
            <h1 className={styles['contact-title']}>
              Get in <span className={styles['highlight']}>Touch</span>
            </h1>
            <p className={styles['contact-subtitle']}>
              Have questions about our energy solutions? We're here to help you make the switch to smart, clean energy.
            </p>
          </div>
        </section>

        {/* Contact Methods Grid */}
        <section className={styles['contact-methods-section']}>
          <div className={styles['contact-methods-grid']}>
            {contactMethods.map((method, idx) => (
              <div key={idx} className={styles['contact-method-card']}>
                <h3 className={styles['method-title']}>{method.title}</h3>
                <p className={styles['method-detail']}>{method.detail}</p>
                <p className={styles['method-description']}>{method.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main Content: Form + Info */}
        <section className={styles['contact-main-section']}>
          <div className={styles['contact-main-grid']}>
            {/* Contact Form */}
            <div className={styles['form-container']}>
              <h2 className={styles['form-title']}>
                Send us a <span className={styles['highlight']}>Message</span>
              </h2>
              <p className={styles['form-subtitle']}>
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <div className={styles['contact-form']}>
                {/* Name */}
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={styles['form-input']}
                    placeholder="John Doe"
                  />
                </div>

                {/* Email & Phone */}
                <div className={styles['form-row']}>
                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={styles['form-input']}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className={styles['form-group']}>
                    <label className={styles['form-label']}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={styles['form-input']}
                      placeholder="+216 XX XXX XXX"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Subject *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className={styles['form-select']}
                  >
                    {subjects.map((subject) => (
                      <option key={subject.value} value={subject.value}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Contact Method */}
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Preferred Contact Method</label>
                  <div className={styles['radio-group']}>
                    <label className={styles['radio-label']}>
                      <input
                        type="radio"
                        name="preferredContact"
                        value="email"
                        checked={formData.preferredContact === 'email'}
                        onChange={handleChange}
                        className={styles['radio-input']}
                      />
                      <span>Email</span>
                    </label>
                    <label className={styles['radio-label']}>
                      <input
                        type="radio"
                        name="preferredContact"
                        value="phone"
                        checked={formData.preferredContact === 'phone'}
                        onChange={handleChange}
                        className={styles['radio-input']}
                      />
                      <span>Phone</span>
                    </label>
                  </div>
                </div>

                {/* Message */}
                <div className={styles['form-group']}>
                  <label className={styles['form-label']}>Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className={styles['form-textarea']}
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`${styles['submit-button']} ${isSubmitting ? styles['submitting'] : ''}`}
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <span>Send Message →</span>
                  )}
                </button>

                {/* Success Message */}
                {formStatus === 'success' && (
                  <div className={styles['success-message']}>
                    <span className={styles['success-icon']}>✓</span>
                    <p>Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className={styles['info-container']}>
              {/* Map Placeholder */}
              <div className={styles['map-placeholder']}>
                <div className={styles['map-content']}>
                  <h3 className={styles['map-title']}>Visit Our Office</h3>
                  <p className={styles['map-address']}>
                    Centre Urbain Nord<br />
                    676 CUN BP, Tunis 1080
                  </p>
                  <button className={styles['directions-button']}>Get Directions</button>
                </div>
              </div>

              {/* Quick Info Card */}
              <div className={styles['info-card']}>
                <h3 className={styles['info-card-title']}>What to Expect</h3>
                <ul className={styles['info-list']}>
                  <li className={styles['info-item']}>
                    <span className={styles['check-icon']}>✓</span>
                    <span>Response within 24 hours</span>
                  </li>
                  <li className={styles['info-item']}>
                    <span className={styles['check-icon']}>✓</span>
                    <span>Free consultation and energy assessment</span>
                  </li>
                  <li className={styles['info-item']}>
                    <span className={styles['check-icon']}>✓</span>
                    <span>Custom solution tailored to your needs</span>
                  </li>
                  <li className={styles['info-item']}>
                    <span className={styles['check-icon']}>✓</span>
                    <span>Transparent pricing with no hidden fees</span>
                  </li>
                </ul>
              </div>

              {/* Schedule a Call */}
              <div className={styles['schedule-card']}>
                <h3 className={styles['schedule-title']}>Prefer to Talk?</h3>
                <p className={styles['schedule-text']}>
                  Schedule a call with our energy experts at a time that works for you.
                </p>
                <button className={styles['schedule-button']}>Schedule a Call</button>
              </div>
            </div>
          </div>
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

export default ContactPage;
