/**
 * Reset Password Page
 * Accessed via email link with token
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import {
  AuthContainer,
  AuthLogo,
  AuthHeader,
  PasswordInput,
  PrimaryButton,
  SecondaryButton,
  ErrorMessage,
  SuccessMessage,
} from '../../components/Auth';

export default function ResetPassword() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [success, setSuccess] = useState('');
  const [isValidToken, setIsValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);

  // Handle the password recovery flow from the email link
  useEffect(() => {
    const handleRecovery = async () => {
      try {
        // Check for hash parameters (Supabase sends tokens in hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');
        
        console.log('Reset password: Checking for recovery params', { type, hasAccessToken: !!accessToken });
        
        // If this is a recovery type, we have the tokens
        if (type === 'recovery' && accessToken) {
          console.log('Reset password: Recovery type detected, setting session');
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (error) {
            console.error('Reset password: Error setting session', error);
            throw error;
          }
          
          if (data?.session) {
            console.log('Reset password: Session established successfully');
            setIsValidToken(true);
            // Clear the hash from URL for security
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            throw new Error('Could not establish session');
          }
        } else {
          // No recovery tokens in URL, check if we already have a valid session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) throw error;
          
          if (session) {
            console.log('Reset password: Existing session found');
            setIsValidToken(true);
          } else {
            console.log('Reset password: No session or recovery tokens found');
            setGeneralError('Invalid or expired reset link. Please request a new one.');
          }
        }
      } catch (error) {
        console.error('Reset password: Session check error:', error);
        setGeneralError('Invalid or expired reset link. Please request a new one.');
      } finally {
        setCheckingToken(false);
      }
    };

    // Wait for the component to mount and router to be ready
    if (typeof window !== 'undefined') {
      handleRecovery();
    }
  }, []);

  const validateForm = () => {
    const newErrors = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    setSuccess('');

    try {
      console.log('Reset password: Updating password...');
      
      // Update password directly via Supabase
      const { data, error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) {
        console.error('Reset password: Update error', error);
        throw error;
      }

      console.log('Reset password: Password updated successfully');
      setSuccess('Password updated successfully! Redirecting to sign in...');
      
      // Sign out and redirect after a short delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        router.push('/signin');
      }, 2000);
    } catch (error) {
      console.error('Password update error:', error);
      setGeneralError(error.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (checkingToken) {
    return (
      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '16px', color: '#696e78' }}>Verifying reset link...</p>
        </div>
        <style jsx>{`
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
      </AuthContainer>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <>
        <Head>
          <title>Reset Password - Solaira</title>
        </Head>
        <AuthContainer>
          <AuthLogo subtitle="PV Energy Management" />
          <AuthHeader
            title="Reset Link Expired"
            subtitle="This password reset link is no longer valid"
          />
          
          <ErrorMessage message={generalError} />
          
          <div style={{ marginTop: '24px' }}>
            <SecondaryButton onClick={() => router.push('/forgot-password')}>
              Request New Reset Link
            </SecondaryButton>
          </div>
        </AuthContainer>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Reset Password - Solaira</title>
        <meta name="description" content="Set your new Solaira password" />
      </Head>

      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        <AuthHeader
          title="Set new password"
          subtitle="Create a new password for your account"
        />

        <ErrorMessage message={generalError} />
        <SuccessMessage message={success} />

        <form onSubmit={handleSubmit} className="authForm" noValidate>
          <PasswordInput
            label="New Password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Create a strong password"
            error={errors.password}
            disabled={loading || success}
            required
            autoComplete="new-password"
          />

          <PasswordInput
            label="Confirm Password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm your new password"
            error={errors.confirmPassword}
            disabled={loading || success}
            required
            autoComplete="new-password"
          />

          <PrimaryButton loading={loading} disabled={success}>
            Update Password
          </PrimaryButton>
        </form>

        <div style={{ marginTop: '16px', fontSize: '13px', color: '#696e78' }}>
          <p style={{ marginBottom: '8px' }}>Password requirements:</p>
          <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>
      </AuthContainer>

      <style jsx>{`
        .authForm {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
      `}</style>
    </>
  );
}
