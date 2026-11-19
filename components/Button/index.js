// Button/index.js
import React, { forwardRef } from 'react';
import styles from './styles.module.css';

const Button = forwardRef(
  (
    {
      children,
      onClick,
      variant = 'default',
      icon = true,
      fullWidth = false,
      type = 'button',
      href,
      className = '',
      ...props
    },
    ref
  ) => {
    const buttonClasses = [
      styles.button,
      variant === 'primary' && styles.primary,
      variant === 'secondary' && styles.secondary,
      fullWidth && styles.fullWidth,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const content = (
      <>
        {icon && <span className={styles.iconLeft}>●</span>}
        <span className={styles.text}>{children}</span>
        {icon && <span className={styles.iconRight}>●</span>}
      </>
    );

    if (href) {
      return (
        <a href={href} className={buttonClasses} {...props} ref={ref}>
          {content}
        </a>
      );
    }

    return (
      <button type={type} onClick={onClick} className={buttonClasses} {...props} ref={ref}>
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
