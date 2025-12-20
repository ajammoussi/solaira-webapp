import React from 'react'
import Link from 'next/link'
import styles from './styles.module.css'

const Footer = ({
  logoImage,
  logoAlt,
  phone,
  email,
  address,
  aboutLinks = [],
  supportLinks = [],
  connectLinks = [],
  copyrightText,
  designedByText,
  designerName,
}) => {
  const currentYear = new Date().getFullYear()

  // Helper to get correct href
  const getHref = (linkText) => {
    const map = {
      'About Us': '/about',
      'Blog': '/blog',
      'Contact': '/contact',
      'Pricing': '/pricing',
      'Product': '/pricing', // Assuming Product maps to Pricing or similar, or # if not exists
      'Home': '/',
      'Sign In': '/signin'
    };
    
    // If it's in the map, return it
    if (map[linkText]) return map[linkText];
    
    // Otherwise return # to prevent 404
    return '#';
  };

  return (
    <>
      <div className={styles.footer}>
        <div className={styles.container266}>
          {/* Main Content Section */}
          <div className={styles.horizontalBorder9}>
            {/* Brand & Contact Info */}
            <div className={styles.container267}>
              <div className={styles.linkmargin13}>
                <div className={styles.link5}>
                  <div className={styles.logo2}>
                    {logoImage && (
                      <img
                        src={logoImage}
                        alt={logoAlt}
                        className={styles.logoImage}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.linkmargin14}>
                <div className={styles.component214}>
                  <a href={`tel:${phone}`} className={styles.text379}>
                    {phone}
                  </a>
                </div>
              </div>
              <div className={styles.linkmargin15}>
                <div className={styles.component215}>
                  <a href={`mailto:${email}`} className={styles.text380}>
                    {email}
                  </a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className={styles.container268}>
              <div className={styles.text381}>
                {typeof address === 'string' ? address : address}
              </div>
            </div>

            {/* Links Sections */}
            <div className={styles.container269}>
              {/* About Links */}
              <div className={styles.container270}>
                <div className={styles.margin46}>
                  <div className={styles.container271}>
                    <span className={styles.text385}>About</span>
                  </div>
                </div>
                {aboutLinks.map((link, index) => (
                  <div key={index} className={styles[`linkmargin${16 + index}`]}>
                    <div className={styles[`component${216 + index}`]}>
                      <Link 
                        href={getHref(link)}
                        className={styles[`text${386 + index}`]}
                      >
                        {link}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Support Links */}
              <div className={styles.container272}>
                <div className={styles.margin47}>
                  <div className={styles.container273}>
                    <span className={styles.text391}>Support</span>
                  </div>
                </div>
                {supportLinks.map((link, index) => (
                  <div key={index} className={styles[`linkmargin${21 + index}`]}>
                    <div className={styles[`component${221 + index}`]}>
                      <Link 
                        href={getHref(link)}
                        className={styles[`text${392 + index}`]}
                      >
                        {link}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connect Links */}
              <div className={styles.container274}>
                <div className={styles.margin48}>
                  <div className={styles.container275}>
                    <span className={styles.text395}>Connect</span>
                  </div>
                </div>
                {connectLinks.map((link, index) => (
                  <div key={index} className={styles[`linkmargin${24 + index}`]}>
                    <div className={styles[`component${224 + index}`]}>
                      <a 
                        href="#" 
                        className={styles[`text${396 + index}`]}
                        aria-label={link}
                      >
                        {link}
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright Section */}
          <div className={styles.container276}>
            <div className={styles.container277}>
              <span className={styles.text399}>
                {copyrightText || `© ${currentYear} Solaira. All rights reserved.`}
              </span>
            </div>
            <div className={styles.container278}>
              <span className={styles.text400}>{designedByText}</span>
              <div className={styles.component227}>
                <span className={styles.text401}>{designerName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Styled JSX Section */}
      <style jsx>{`
        .enhanced-footer {
          width: 100%;
          background-color: #ffffff;
          color: #333333;
          padding: 40px 20px 0;
          position: relative;
          overflow: hidden;
          box-shadow: 0 -2px 30px rgba(0, 0, 0, 0.05);
        }

        .enhanced-footer::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(
            90deg,
            transparent,
            #00ad62 50%,
            transparent
          );
        }

        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .brand-section {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 40px;
        }

        .brand-logo {
          flex-shrink: 0;
        }

        .brand-info {
          flex: 1;
        }

        .brand-tagline {
          color: #666666;
          line-height: 1.6;
          font-size: 14px;
          margin-top: 12px;
          max-width: 500px;
        }

        .social-links {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .social-link {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.3s ease;
          border: 1px solid #eaeaea;
          color: #666666;
          text-decoration: none;
        }

        .social-link:hover {
          background: #00ad62;
          color: white;
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 173, 98, 0.2);
          border-color: #00ad62;
        }

        .newsletter-section {
          background: #f8f9fa;
          border-radius: 16px;
          padding: 32px;
          margin: 40px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 40px;
          border: 1px solid #eaeaea;
        }

        .newsletter-content {
          flex: 1;
        }

        .newsletter-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
          font-family: 'Outfit', sans-serif;
          color: #333333;
        }

        .newsletter-text {
          color: #666666;
          font-size: 14px;
        }

        .newsletter-form {
          display: flex;
          gap: 12px;
          flex: 1;
          max-width: 500px;
        }

        .newsletter-input {
          flex: 1;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1px solid #e0e0e0;
          background: #ffffff;
          color: #333333;
          font-size: 14px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
        }

        .newsletter-input::placeholder {
          color: #999999;
        }

        .newsletter-input:focus {
          outline: none;
          border-color: #00ad62;
          box-shadow: 0 2px 12px rgba(0, 173, 98, 0.1);
        }

        .newsletter-button {
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(135deg, #00ad62, #01a659);
          color: white;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.2);
        }

        .newsletter-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 173, 98, 0.3);
        }

        .footer-bottom {
          padding: 32px 0;
          border-top: 1px solid #eaeaea;
        }

        .footer-bottom-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 20px;
        }

        .copyright {
          color: #666666;
          font-size: 14px;
          margin: 0;
        }

        .footer-bottom-links {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .bottom-link {
          color: #666666;
          text-decoration: none;
          font-size: 14px;
          transition: color 0.2s ease;
        }

        .bottom-link:hover {
          color: #00ad62;
        }

        .separator {
          color: #cccccc;
          font-size: 12px;
        }

        /* Enhance existing CSS classes */
        .footer {
          background-color: #ffffff !important;
          box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.05);
        }

        .text379,
        .text380 {
          color: #00ad62;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .text379:hover,
        .text380:hover {
          color: #01a659;
        }

        .text381 {
          color: #666666;
        }

        .text385,
        .text391,
        .text395 {
          color: #333333;
          font-weight: 600;
          font-size: 18px;
          font-family: 'Outfit', sans-serif;
        }

        .text386,
        .text387,
        .text388,
        .text389,
        .text390,
        .text392,
        .text393,
        .text394,
        .text396,
        .text397,
        .text398 {
          color: #666666;
          text-decoration: none;
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-block;
        }

        .text386:hover,
        .text387:hover,
        .text388:hover,
        .text389:hover,
        .text390:hover,
        .text392:hover,
        .text393:hover,
        .text394:hover,
        .text396:hover,
        .text397:hover,
        .text398:hover {
          color: #00ad62;
          transform: translateX(4px);
        }

        .text399,
        .text400,
        .text401 {
          color: #999999;
        }

        .container266 {
          border-top: 1px solid rgba(0, 0, 0, 0.05);
        }

        @media (max-width: 1024px) {
          .footer-top {
            grid-template-columns: 1fr 1fr;
            gap: 40px;
          }
        }

        @media (max-width: 768px) {
          .enhanced-footer {
            padding: 30px 15px 0;
          }

          .newsletter-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 24px;
          }

          .newsletter-form {
            width: 100%;
            max-width: 100%;
            flex-direction: column;
          }

          .newsletter-button {
            width: 100%;
          }

          .footer-bottom-content {
            flex-direction: column;
            text-align: center;
            gap: 16px;
          }

          .footer-bottom-links {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </>
  )
}

export default Footer