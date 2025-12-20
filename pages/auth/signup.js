/**
 * Sign Up Page
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
  PasswordInput,
  PrimaryButton,
  GuestButton,
  OAuthButtons,
  Divider,
  ErrorMessage,
  SuccessMessage,
  AuthFooter,
  Checkbox,
} from '../../components/Auth';

export default function SignUp() {
  const router = useRouter();
  const { user, isGuest, loading: authLoading, signUp, signInWithOAuth, enterGuestMode } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    console.log('SignUp: Auth state check', { authLoading, user: !!user, isGuest });
    if (!authLoading) {
      if (user || isGuest) {
        console.log('SignUp: User already authenticated, redirecting to dashboard');
        router.replace('/dashboard');
      }
    }
  }, [user, isGuest, authLoading, router]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms and conditions';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear field error on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGeneralError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setGeneralError('');
    setSuccess('');

    try {
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        display_name: formData.fullName,
      });

      if (error) throw error;

      setSuccess('Account created! Please check your email to verify your account.');
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false,
      });
    } catch (error) {
      console.error('Sign up error:', error);
      if (error.message.includes('already registered')) {
        setGeneralError('An account with this email already exists. Please sign in instead.');
      } else {
        setGeneralError(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    setGeneralError('');

    try {
      const { error } = await signInWithOAuth(provider);

      if (error) throw error;
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      setGeneralError(`Failed to sign in with ${provider}. Please try again.`);
      setLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setGuestLoading(true);
    enterGuestMode();
    router.push('/dashboard');
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
        <title>Sign Up - Solaira</title>
        <meta name="description" content="Create your Solaira account" />
      </Head>

      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        <AuthHeader
          title="Create an account"
          subtitle="Start managing your energy today"
        />

        <ErrorMessage message={generalError} />
        <SuccessMessage message={success} />

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <Input
            label="Full Name"
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            error={errors.fullName}
            disabled={loading}
            required
            autoComplete="name"
          />

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            error={errors.email}
            disabled={loading}
            required
            autoComplete="email"
          />

          <PasswordInput
            label="Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            error={errors.password}
            disabled={loading}
            required
            autoComplete="new-password"
          />

          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
            disabled={loading}
            required
            autoComplete="new-password"
          />

          <div>
            <Checkbox
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleChange}
              label={
                <>
                  I agree to the{' '}
                  <span style={{ color: '#00D9A3' }}>
                    Terms of Service
                  </span>{' '}
                  and{' '}
                  <span style={{ color: '#00D9A3' }}>
                    Privacy Policy
                  </span>
                </>
              }
            />
            {errors.acceptTerms && (
              <span style={{ fontSize: '12px', color: '#d20d0d', marginTop: '4px', display: 'block' }}>
                {errors.acceptTerms}
              </span>
            )}
          </div>

          <PrimaryButton loading={loading} disabled={guestLoading}>
            Create Account
          </PrimaryButton>
        </form>

        <Divider text="or continue with" />

        <OAuthButtons
          onGoogleClick={() => handleOAuthSignIn('google')}
          onGitHubClick={() => handleOAuthSignIn('github')}
          loading={loading}
          disabled={guestLoading}
        />

        <AuthFooter
          text="Already have an account?"
          linkText="Sign in"
          linkHref="/signin"
        />
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
