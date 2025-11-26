import React from 'react'
import Button from '../Button'
import styles from './styles.module.css'

const CookieBanner = ({
  title,
  description,
  privacyPolicyText,
  privacyPolicyLink,
  closeIcon,
  closeIconAlt,
  acceptButtonText,
  acceptButtonBackground1,
  acceptButtonBackground2,
  acceptButtonAlt1,
  acceptButtonAlt2,
  onClose,
  onAccept,
}) => {
  return (
    <div className={styles.container279}>
      <div className={styles.container280}>
        <div className={styles.backgroundBorder}>
          <div className={styles.container281}>
            <span className={styles.text402}>{title}</span>
            <div className={styles.container282}>
              <span className={styles.text403}>
                {description.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < description.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </span>
              {privacyPolicyText && (
                <div className={styles.component228}>
                  <span className={styles.text407}>{privacyPolicyText}</span>
                </div>
              )}
            </div>
          </div>
          <div className={styles.container283} onClick={onClose}>
            <img
              src={closeIcon}
              alt={closeIconAlt}
              className={styles.closeIcon}
            />
          </div>
          <button className={styles.buttonmargin} onClick={onAccept}>
            <div className={styles.component17}>
              <div className={styles.container284}>
                <span className={styles.text408}>{acceptButtonText}</span>
              </div>
              {acceptButtonBackground1 && (
                <img
                  src={acceptButtonBackground1}
                  alt={acceptButtonAlt1}
                  className={styles.background46}
                />
              )}
              {acceptButtonBackground2 && (
                <img
                  src={acceptButtonBackground2}
                  alt={acceptButtonAlt2}
                  className={styles.background47}
                />
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieBanner

