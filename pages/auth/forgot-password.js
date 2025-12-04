/**
 * Forgot Password Page
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../lib/hooks/useAuth';
import {
  AuthContainer,
  AuthLogo,
  AuthHeader,
  Input,
  PrimaryButton,
  SecondaryButton,
  ErrorMessage,
  SuccessMessage,
  BackLink,
} from '../../components/Auth';

export default function ForgotPassword() {
  const router = useRouter();
  const { user, isGuest, loading: authLoading, resetPassword } = useAuth();
  
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [countdown, setCountdown] = useState(0);

  // Redirect if already logged in (skip for password reset flow)
  useEffect(() => {
    // Only redirect if fully loaded AND user is authenticated
    // Don't redirect during initial load to prevent flash
    if (!authLoading && (user || isGuest)) {
      router.replace('/dashboard');
    }
  }, [user, isGuest, authLoading, router]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const validateEmail = () => {
    if (!email) {
      setFieldError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError('Please enter a valid email');
      return false;
    }
    setFieldError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Sending password reset email to:', email);
      const { error } = await resetPassword(email);

      if (error) throw error;

      setSuccess('Password reset link sent! Check your email inbox.');
      setCanResend(false);
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (fieldError) setFieldError('');
    setError('');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </AuthContainer>
    );
  }

  return (
    <>
      <Head>
        <title>Forgot Password - Solaira</title>
        <meta name="description" content="Reset your Solaira password" />
      </Head>

      <AuthContainer>
        <BackLink href="/signin" text="Back to Sign In" />
        
        <AuthLogo subtitle="PV Energy Management" />
        <AuthHeader
          title="Forgot password?"
          subtitle="Enter your email and we'll send you a reset link"
        />

        <ErrorMessage message={error} />
        <SuccessMessage message={success} />

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <Input
            label="Email"
            type="email"
            name="email"
            value={email}
            onChange={handleChange}
            placeholder="you@example.com"
            error={fieldError}
            disabled={loading}
            required
            autoComplete="email"
          />

          <PrimaryButton loading={loading} disabled={!canResend}>
            {!canResend ? `Resend in ${countdown}s` : 'Send Reset Link'}
          </PrimaryButton>
        </form>

        {success && (
          <div style={{ marginTop: '20px' }}>
            <SecondaryButton onClick={() => router.push('/signin')}>
              Return to Sign In
            </SecondaryButton>
          </div>
        )}

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#696e78', lineHeight: '1.6' }}>
            Remember your password?{' '}
            <a href="/signin" style={{ color: '#00D9A3', textDecoration: 'none' }}>
              Sign in
            </a>
          </p>
        </div>
      </AuthContainer>

      <style jsx>{`
        .authForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e2e2;
          border-top-color: #00D9A3;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
