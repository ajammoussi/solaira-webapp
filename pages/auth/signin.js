/**
 * Sign In Page
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
  AuthFooter,
  LinkRow,
  TextLink,
  Checkbox,
} from '../../components/Auth';

export default function SignIn() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signInWithOAuth } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    console.log('SignIn: Auth state check', { authLoading, user: !!user });
    if (!authLoading) {
      if (user) {
        console.log('SignIn: User already authenticated, redirecting to dashboard');
        const redirectTo = router.query.redirect || '/dashboard';
        router.replace(redirectTo);
      }
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setGeneralError('');

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) throw error;

      // Redirect handled by useEffect
    } catch (error) {
      console.error('Sign in error:', error);
      setGeneralError(
        error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message || 'Failed to sign in. Please try again.'
      );
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
        <title>Sign In - Solaira</title>
        <meta name="description" content="Sign in to your Solaira account" />
      </Head>

      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        <AuthHeader
          title="Welcome back"
          subtitle="Sign in to your account to continue"
        />

        <ErrorMessage message={generalError} />

        <form onSubmit={handleSubmit} className="authForm" noValidate>
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
            placeholder="Enter your password"
            error={errors.password}
            disabled={loading}
            required
            autoComplete="current-password"
          />

          <LinkRow>
            <Checkbox
              name="rememberMe"
              checked={formData.rememberMe}
              onChange={handleChange}
              label="Remember me"
            />
            <TextLink href="/forgot-password">Forgot password?</TextLink>
          </LinkRow>

          <PrimaryButton loading={loading}>
            Sign In
          </PrimaryButton>
        </form>

        <Divider text="or continue with" />

        <OAuthButtons
          onGoogleClick={() => handleOAuthSignIn('google')}
          loading={loading}
        />

        <AuthFooter
          text="Don't have an account?"
          linkText="Sign up"
          linkHref="/signup"
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
