// FeaturesSection/index.js
import React from 'react';
import FeatureCard from '../FeatureCard';
import styles from './styles.module.css';

const FeaturesSection = ({ children }) => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.grid}>
          {children}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;