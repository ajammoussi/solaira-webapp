/**
 * OAuth Callback Handler
 * Handles redirects from OAuth providers (Google, GitHub)
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '../../lib/supabase';
import { AuthContainer, AuthLogo, ErrorMessage } from '../../components/Auth';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for error in URL params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const errorParam = hashParams.get('error') || router.query.error;
        const errorDescription =
          hashParams.get('error_description') || router.query.error_description;

        if (errorParam) {
          const errorMsg = errorDescription
            ? decodeURIComponent(errorDescription)
            : 'Authentication failed';
          setError(errorMsg);
          setTimeout(() => router.replace('/signin'), 3000);
          return;
        }

        // Check for authorization code (PKCE flow)
        const code = router.query.code;
        if (code && typeof code === 'string' && code.length > 0) {
          console.log('Exchanging code for session...');
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              // Only throw if it's not a code verifier error (which happens on page refresh)
              if (!exchangeError.message?.includes('code verifier')) {
                throw exchangeError;
              }
              console.log('Code exchange skipped (no verifier - likely page refresh)');
            } else if (data?.session) {
              console.log('Session established, redirecting to dashboard');
              router.replace('/dashboard');
              return;
            }
          } catch (codeError) {
            // Silently ignore code exchange errors on normal navigation
            console.log('Code exchange failed:', codeError.message);
          }
        }

        // Check for access token in hash (implicit flow)
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          // Supabase client should pick up the session automatically
          // Wait a moment for it to process
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Try to get the session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (session) {
          console.log('Session found, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          // No session found
          setError('Authentication failed. Please try again.');
          setTimeout(() => router.replace('/signin'), 3000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        setTimeout(() => router.replace('/signin'), 3000);
      }
    };

    // Wait for router to be ready before processing
    if (router.isReady) {
      handleCallback();
    }
  }, [router, router.isReady]);

  return (
    <>
      <Head>
        <title>Authenticating... - Solaira</title>
      </Head>

      <AuthContainer>
        <AuthLogo subtitle="PV Energy Management" />

        {error ? (
          <>
            <ErrorMessage message={error} />
            <p style={{ textAlign: 'center', color: '#696e78', marginTop: '16px' }}>
              Redirecting to sign in...
            </p>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '16px', color: '#696e78' }}>Completing sign in...</p>
          </div>
        )}
      </AuthContainer>

      <style jsx>{`
        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e2e2;
          border-top-color: #00d9a3;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}
