// SectionHeading/index.js
import React from 'react';
import styles from './styles.module.css';

const SectionHeading = ({ text, highlightedText, subtitle, centered = true }) => {
  return (
    <div className={`${styles.heading} ${centered ? styles.centered : ''}`}>
      <h2 className={styles.title}>
        {text} {highlightedText && <span className={styles.highlight}>{highlightedText}</span>}
        {text.endsWith('?') ? '' : '?'}
      </h2>

      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
  );
};

export default SectionHeading;
