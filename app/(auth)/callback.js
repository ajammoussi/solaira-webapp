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
        // Get the session from URL hash (Supabase returns tokens in URL)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (session) {
          // Successfully authenticated, redirect to dashboard
          router.replace('/dashboard');
        } else {
          // No session found, might be an error
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const errorDescription = hashParams.get('error_description');
          
          if (errorDescription) {
            setError(decodeURIComponent(errorDescription));
          } else {
            // Try to exchange the code for a session
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
              window.location.href
            );
            
            if (exchangeError) {
              throw exchangeError;
            }
            
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed. Please try again.');
        
        // Redirect to sign in after showing error
        setTimeout(() => {
          router.replace('/auth/signin');
        }, 3000);
      }
    };

    handleCallback();
  }, [router]);

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
            <p style={{ marginTop: '16px', color: '#696e78' }}>
              Completing sign in...
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
