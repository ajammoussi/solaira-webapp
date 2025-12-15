import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

      <div className="contact-page">
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className="contact-hero">
          <div className="contact-hero-content">
            <h1 className="contact-title">
              Get in <span className="highlight">Touch</span>
            </h1>
            <p className="contact-subtitle">
              Have questions about our energy solutions? We're here to help you make the switch to smart, clean energy.
            </p>
          </div>
        </section>

        {/* Contact Methods Grid */}
        <section className="contact-methods-section">
          <div className="contact-methods-grid">
            {contactMethods.map((method, idx) => (
              <div key={idx} className="contact-method-card">
                <h3 className="method-title">{method.title}</h3>
                <p className="method-detail">{method.detail}</p>
                <p className="method-description">{method.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main Content: Form + Info */}
        <section className="contact-main-section">
          <div className="contact-main-grid">
            {/* Contact Form */}
            <div className="form-container">
              <h2 className="form-title">
                Send us a <span className="highlight">Message</span>
              </h2>
              <p className="form-subtitle">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <div className="contact-form">
                {/* Name */}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email & Phone */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="+216 XX XXX XXX"
                    />
                  </div>
                </div>

                {/* Subject */}
                <div className="form-group">
                  <label className="form-label">Subject *</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="form-select"
                  >
                    {subjects.map((subject) => (
                      <option key={subject.value} value={subject.value}>
                        {subject.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preferred Contact Method */}
                <div className="form-group">
                  <label className="form-label">Preferred Contact Method</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="email"
                        checked={formData.preferredContact === 'email'}
                        onChange={handleChange}
                        className="radio-input"
                      />
                      <span>Email</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="preferredContact"
                        value="phone"
                        checked={formData.preferredContact === 'phone'}
                        onChange={handleChange}
                        className="radio-input"
                      />
                      <span>Phone</span>
                    </label>
                  </div>
                </div>

                {/* Message */}
                <div className="form-group">
                  <label className="form-label">Message *</label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="form-textarea"
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`submit-button ${isSubmitting ? 'submitting' : ''}`}
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <span>Send Message →</span>
                  )}
                </button>

                {/* Success Message */}
                {formStatus === 'success' && (
                  <div className="success-message">
                    <span className="success-icon">✓</span>
                    <p>Thank you! Your message has been sent successfully. We'll get back to you soon.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="info-container">
              {/* Map Placeholder */}
              <div className="map-placeholder">
                <div className="map-content">
                  <h3 className="map-title">Visit Our Office</h3>
                  <p className="map-address">
                    Centre Urbain Nord<br />
                    676 CUN BP, Tunis 1080
                  </p>
                  <button className="directions-button">Get Directions</button>
                </div>
              </div>

              {/* Quick Info Card */}
              <div className="info-card">
                <h3 className="info-card-title">What to Expect</h3>
                <ul className="info-list">
                  <li className="info-item">
                    <span className="check-icon">✓</span>
                    <span>Response within 24 hours</span>
                  </li>
                  <li className="info-item">
                    <span className="check-icon">✓</span>
                    <span>Free consultation and energy assessment</span>
                  </li>
                  <li className="info-item">
                    <span className="check-icon">✓</span>
                    <span>Custom solution tailored to your needs</span>
                  </li>
                  <li className="info-item">
                    <span className="check-icon">✓</span>
                    <span>Transparent pricing with no hidden fees</span>
                  </li>
                </ul>
              </div>

              {/* Schedule a Call */}
              <div className="schedule-card">
                <h3 className="schedule-title">Prefer to Talk?</h3>
                <p className="schedule-text">
                  Schedule a call with our energy experts at a time that works for you.
                </p>
                <button className="schedule-button">Schedule a Call</button>
              </div>
            </div>
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
        .contact-page {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }

        .contact-hero {
          padding: 160px 20px 60px;
          text-align: center;
        }

        .contact-hero-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .contact-title {
          font-size: 56px;
          font-weight: 300;
          margin-bottom: 24px;
          color: #141414;
        }

        .highlight {
          color: #00ad62;
          font-weight: 400;
        }

        .contact-subtitle {
          font-size: 20px;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto;
        }

        .contact-methods-section {
          padding: 0 20px 60px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .contact-methods-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .contact-method-card {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .contact-method-card:hover {
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-8px);
        }

        .method-title {
          font-size: 18px;
          font-weight: 600;
          color: #141414;
          margin-bottom: 8px;
        }

        .method-detail {
          font-size: 16px;
          color: #00ad62;
          font-weight: 500;
          margin-bottom: 4px;
        }

        .method-description {
          font-size: 14px;
          color: #6b7280;
        }

        .contact-main-section {
          padding: 60px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .contact-main-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
        }

        .form-container {
          display: flex;
          flex-direction: column;
        }

        .form-title {
          font-size: 32px;
          font-weight: 300;
          margin-bottom: 16px;
          color: #141414;
        }

        .form-subtitle {
          color: #6b7280;
          margin-bottom: 32px;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .form-input,
        .form-select,
        .form-textarea {
          padding: 12px 16px;
          border: 1px solid #d1d5db;
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .form-input:focus,
        .form-select:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #00ad62;
          box-shadow: 0 0 0 3px rgba(0, 173, 98, 0.1);
        }

        .form-textarea {
          resize: vertical;
        }

        .radio-group {
          display: flex;
          gap: 24px;
        }

        .radio-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .radio-input {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .submit-button {
          width: 100%;
          padding: 16px;
          background: #00ad62;
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.3);
        }

        .submit-button:hover:not(.submitting) {
          background: #01a659;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 173, 98, 0.4);
        }

        .submit-button.submitting {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success-message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: #d1fae5;
          border: 1px solid #6ee7b7;
          border-radius: 12px;
        }

        .success-icon {
          color: #059669;
          font-size: 20px;
          font-weight: bold;
        }

        .success-message p {
          color: #065f46;
          font-size: 14px;
          margin: 0;
        }

        .info-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .map-placeholder {
          background: linear-gradient(to bottom right, #d1fae5, #dbeafe);
          border-radius: 16px;
          height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .map-content {
          text-align: center;
          padding: 32px;
        }

        .map-title {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 16px;
        }

        .map-address {
          color: #4b5563;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .directions-button {
          background: white;
          color: #00ad62;
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .directions-button:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
          transform: translateY(-2px);
        }

        .info-card {
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .info-card-title {
          font-size: 20px;
          font-weight: 600;
          color: #141414;
          margin-bottom: 16px;
        }

        .info-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          color: #6b7280;
        }

        .check-icon {
          color: #00ad62;
          font-weight: bold;
          flex-shrink: 0;
        }

        .schedule-card {
          background: linear-gradient(to right, #00ad62, #01a659);
          border-radius: 16px;
          padding: 24px;
          color: white;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .schedule-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .schedule-text {
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .schedule-button {
          width: 100%;
          background: white;
          color: #00ad62;
          padding: 12px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .schedule-button:hover {
          background: #f9fafb;
          transform: translateY(-2px);
        }

        @media (max-width: 1024px) {
          .contact-main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .contact-title {
            font-size: 36px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .contact-methods-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
};

export default ContactPage;