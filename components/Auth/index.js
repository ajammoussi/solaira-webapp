/**
 * Auth Components - Reusable UI components for authentication
 */

import { useState } from 'react';
import Link from 'next/link';
import styles from './styles.module.css';

// Icons as simple SVG components
const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const AlertCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Auth Container
export function AuthContainer({ children }) {
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>{children}</div>
    </div>
  );
}

// Logo
export function AuthLogo({ subtitle }) {
  return (
    <div className={styles.logo}>
      <Link href="/">
        <a className={styles.logoText}>Solaira</a>
      </Link>
      {subtitle && <p className={styles.logoSubtext}>{subtitle}</p>}
    </div>
  );
}

// Header
export function AuthHeader({ title, subtitle }) {
  return (
    <div className={styles.authHeader}>
      <h1 className={styles.authTitle}>{title}</h1>
      {subtitle && <p className={styles.authSubtitle}>{subtitle}</p>}
    </div>
  );
}

// Input
export function Input({
  label,
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  required,
  autoComplete,
  ...props
}) {
  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span style={{ color: '#d20d0d' }}> *</span>}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className={`${styles.input} ${error ? styles.inputError : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${name}-error`} className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Password Input
export function PasswordInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  required,
  autoComplete,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.formGroup}>
      {label && (
        <label className={styles.label} htmlFor={name}>
          {label}
          {required && <span style={{ color: '#d20d0d' }}> *</span>}
        </label>
      )}
      <div className={styles.passwordWrapper}>
        <input
          id={name}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          style={{ paddingRight: '44px' }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${name}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && (
        <span id={`${name}-error`} className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Primary Button
export function PrimaryButton({ children, loading, disabled, type = 'submit', onClick }) {
  return (
    <button
      type={type}
      className={styles.primaryButton}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className={styles.spinner} />}
      {children}
    </button>
  );
}

// Secondary Button
export function SecondaryButton({ children, loading, disabled, type = 'button', onClick }) {
  return (
    <button
      type={type}
      className={styles.secondaryButton}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <span className={`${styles.spinner} ${styles.spinnerDark}`} />}
      {children}
    </button>
  );
}

// Guest Button
export function GuestButton({ onClick, loading, disabled }) {
  return (
    <button
      type="button"
      className={styles.guestButton}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className={`${styles.spinner} ${styles.spinnerDark}`} />
      ) : (
        <>
          <UserIcon /> Enter as Guest
        </>
      )}
    </button>
  );
}

// OAuth Buttons
export function OAuthButtons({ onGoogleClick, loading, disabled }) {
  return (
    <div className={styles.oauthButtons}>
      <button
        type="button"
        className={styles.oauthButton}
        onClick={onGoogleClick}
        disabled={disabled || loading}
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  );
}

// Divider
export function Divider({ text = 'or' }) {
  return (
    <div className={styles.divider}>
      <span className={styles.dividerLine} />
      <span className={styles.dividerText}>{text}</span>
      <span className={styles.dividerLine} />
    </div>
  );
}

// Error Message
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div className={styles.errorMessage} role="alert">
      <AlertCircleIcon className={styles.errorIcon} />
      <span>{message}</span>
    </div>
  );
}

// Success Message
export function SuccessMessage({ message }) {
  if (!message) return null;
  return (
    <div className={styles.successMessage} role="status">
      <CheckCircleIcon className={styles.successIcon} />
      <span>{message}</span>
    </div>
  );
}

// Auth Footer
export function AuthFooter({ text, linkText, linkHref }) {
  return (
    <div className={styles.authFooter}>
      <p className={styles.footerText}>
        {text}{' '}
        <Link href={linkHref}>
          <a className={styles.link}>{linkText}</a>
        </Link>
      </p>
    </div>
  );
}

// Back Link
export function BackLink({ href, text = 'Back' }) {
  return (
    <Link href={href}>
      <a className={styles.backLink}>
        <ArrowLeftIcon />
        {text}
      </a>
    </Link>
  );
}

// Link Row (for forgot password, etc)
export function LinkRow({ children }) {
  return <div className={styles.linkRow}>{children}</div>;
}

// Text Link
export function TextLink({ href, children }) {
  return (
    <Link href={href}>
      <a className={styles.link}>{children}</a>
    </Link>
  );
}

// Checkbox
export function Checkbox({ name, checked, onChange, label }) {
  return (
    <div className={styles.checkboxGroup}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={onChange}
        className={styles.checkbox}
      />
      <label htmlFor={name} className={styles.checkboxLabel}>
        {label}
      </label>
    </div>
  );
}

export default {
  AuthContainer,
  AuthLogo,
  AuthHeader,
  Input,
  PasswordInput,
  PrimaryButton,
  SecondaryButton,
  OAuthButtons,
  Divider,
  ErrorMessage,
  SuccessMessage,
  AuthFooter,
  BackLink,
  LinkRow,
  TextLink,
  Checkbox,
};
