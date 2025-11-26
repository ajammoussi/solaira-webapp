// Button/index.js
import React from 'react';
import styles from './styles.module.css';

const Button = ({ 
  children, 
  onClick, 
  variant = 'default', 
  icon = true,
  fullWidth = false,
  type = 'button',
  href,
  className = '',
  ...props 
}) => {
  const buttonClasses = [
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    fullWidth && styles.fullWidth,
    className
  ].filter(Boolean).join(' ');

  const content = (
    <>
      {icon && <span className={styles.iconLeft}>●</span>}
      <span className={styles.text}>{children}</span>
      {icon && <span className={styles.iconRight}>●</span>}
    </>
  );

  if (href) {
    return (
      <a href={href} className={buttonClasses} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={buttonClasses} {...props}>
      {content}
    </button>
  );
};

export default Button;