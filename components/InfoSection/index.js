// InfoSection/index.js
import React from 'react';
import Button from '../Button';
import styles from './styles.module.css';

const InfoSection = ({ 
  title,
  highlightedTitle,
  description,
  buttonText,
  buttonLink,
  image,
  logo,
  logoAlt = "Logo",
  reverse = false
}) => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={`${styles.content} ${reverse ? styles.reverse : ''}`}>
          {/* Left Side - Text Content */}
          <div className={styles.textContent}>
            <h2 className={styles.title}>
              {title}{' '}
              {highlightedTitle && (
                <span className={styles.highlight}>{highlightedTitle}</span>
              )}
            </h2>
            
            <p className={styles.description}>{description}</p>

            {logo && (
              <div className={styles.logoWrapper}>
                <img src={logo} alt={logoAlt} className={styles.logo} />
              </div>
            )}

            {buttonText && (
              <div className={styles.buttonWrapper}>
                <Button href={buttonLink} icon={true}>
                  {buttonText}
                </Button>
              </div>
            )}
          </div>

          {/* Right Side - Image */}
          <div className={styles.imageWrapper}>
            <img src={image} alt={title} className={styles.image} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default InfoSection;