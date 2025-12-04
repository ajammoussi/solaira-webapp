/**
 * OAuth Consent Page
 * Required by Supabase for local development OAuth flow
 * This page handles the OAuth consent/authorization step
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { AuthContainer, AuthLogo } from '../../components/Auth';

export default function OAuthConsent() {
  const router = useRouter();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleOAuthConsent = async () => {
      try {
        // Check for hash params (implicit flow) or query params (PKCE flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = router.query;

        // Check for error in URL
        const errorParam = hashParams.get('error') || queryParams.error;
        const errorDescription = hashParams.get('error_description') || queryParams.error_description;

        if (errorParam) {
          setError(errorDescription ? decodeURIComponent(errorDescription) : 'OAuth authorization failed');
          setProcessing(false);
          setTimeout(() => router.replace('/signin'), 3000);
          return;
        }

        // Try to get session (tokens might be in URL hash)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          // Already have a session, redirect to dashboard
          router.replace('/dashboard');
          return;
        }

        // Check for authorization code in query params
        const code = queryParams.code;
        if (code) {
          // Exchange code for session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            throw exchangeError;
          }
          
          router.replace('/dashboard');
          return;
        }

        // Check for access token in hash
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          // Session should be set automatically by Supabase client
          // Just redirect to dashboard
          router.replace('/dashboard');
          return;
        }

        // No auth data found, redirect to signin
        setError('No authorization data received');
        setProcessing(false);
        setTimeout(() => router.replace('/signin'), 3000);

      } catch (err) {
        console.error('OAuth consent error:', err);
        setError(err.message || 'Authentication failed');
        setProcessing(false);
        setTimeout(() => router.replace('/signin'), 3000);
      }
    };

    // Wait for router to be ready
    if (router.isReady) {
      handleOAuthConsent();
    }
  }, [router, router.isReady]);

  return (
    <>
      <Head>
        <title>Authorizing... - Solaira</title>
      </Head>

      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />
        
        {error ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ 
              background: '#fee2e2', 
              color: '#dc2626', 
              padding: '12px 16px', 
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              {error}
            </div>
            <p style={{ color: '#696e78' }}>
              Redirecting to sign in...
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', color: '#696e78' }}>
              {processing ? 'Completing authorization...' : 'Redirecting...'}
            </p>
          </div>
        )}
      </AuthContainer>

      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
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
