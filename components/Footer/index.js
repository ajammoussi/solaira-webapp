import React from 'react'
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
  return (
    <div className={styles.footer}>
      <div className={styles.container266}>
        <div className={styles.horizontalBorder9}>
          <div className={styles.container267}>
            <div className={styles.linkmargin13}>
              <div className={styles.link5}>
                <div className={styles.logo2}>
                  <img
                    src={logoImage}
                    alt={logoAlt}
                    className={styles.logoImage}
                  />
                </div>
              </div>
            </div>
            <div className={styles.linkmargin14}>
              <div className={styles.component214}>
                <span className={styles.text379}>{phone}</span>
              </div>
            </div>
            <div className={styles.linkmargin15}>
              <div className={styles.component215}>
                <span className={styles.text380}>{email}</span>
              </div>
            </div>
          </div>
          <div className={styles.container268}>
            <span className={styles.text381}>
              {typeof address === 'string' ? address : address}
            </span>
          </div>
          <div className={styles.container269}>
            <div className={styles.container270}>
              <div className={styles.margin46}>
                <div className={styles.container271}>
                  <span className={styles.text385}>About</span>
                </div>
              </div>
              {aboutLinks.map((link, index) => (
                <div key={index} className={styles[`linkmargin${16 + index}`]}>
                  <div className={styles[`component${216 + index}`]}>
                    <span className={styles[`text${386 + index}`]}>{link}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.container272}>
              <div className={styles.margin47}>
                <div className={styles.container273}>
                  <span className={styles.text391}>Support</span>
                </div>
              </div>
              {supportLinks.map((link, index) => (
                <div key={index} className={styles[`linkmargin${21 + index}`]}>
                  <div className={styles[`component${221 + index}`]}>
                    <span className={styles[`text${392 + index}`]}>{link}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.container274}>
              <div className={styles.margin48}>
                <div className={styles.container275}>
                  <span className={styles.text395}>Connect</span>
                </div>
              </div>
              {connectLinks.map((link, index) => (
                <div key={index} className={styles[`linkmargin${24 + index}`]}>
                  <div className={styles[`component${224 + index}`]}>
                    <span className={styles[`text${396 + index}`]}>{link}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.container276}>
          <div className={styles.container277}>
            <span className={styles.text399}>{copyrightText}</span>
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
  )
}

export default Footer

