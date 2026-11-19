// FeatureCard/index.js
import React, { useState } from 'react';
import styles from './styles.module.css';

const FeatureCard = ({ icon, title, description, image, iconColor = '#00d084' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.card} onClick={() => setIsExpanded(!isExpanded)}>
      {/* Decorative dots pattern */}
      <div className={styles.dots}></div>

      {/* Plus button */}
      <div className={styles.plusButton} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
        <span className={`${styles.plusIcon} ${isExpanded ? styles.rotated : ''}`}>+</span>
      </div>

      {/* Icon */}
      <div className={styles.iconWrapper} style={{ backgroundColor: iconColor }}>
        {icon}
      </div>

      {/* Circular Image */}
      <div className={styles.imageWrapper}>
        <img src={image} alt={title} className={styles.image} />
      </div>

      {/* Title */}
      <h3 className={styles.title}>{title}</h3>

      {/* Expanded Description */}
      <div className={`${styles.description} ${isExpanded ? styles.expanded : ''}`}>
        <p>{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
