/**
 * Protected Route HOC
 * Wraps pages that require authentication
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';

/**
 * Higher-order component to protect routes
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowGuest - Whether to allow guest users (default: true)
 * @param {string} options.redirectTo - Where to redirect unauthenticated users (default: /signin)
 */
export function withAuth(WrappedComponent, options = {}) {
  const { allowGuest = true, redirectTo = '/signin' } = options;

  return function ProtectedRoute(props) {
    const router = useRouter();
    const { user, loading, isAuthenticated } = useAuth();

    useEffect(() => {
      if (!loading) {
        if (!isAuthenticated) {
          // Not logged in, redirect to sign in
          const returnUrl = encodeURIComponent(router.asPath);
          router.replace(`${redirectTo}?redirect=${returnUrl}`);
        } else if (!allowGuest && user?.is_anonymous) {
          // Guest not allowed, redirect to sign up
          router.replace('/signup?upgrade=true');
        }
      }
    }, [loading, isAuthenticated, user, router]);

    // Show loading state
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#f0f5f5',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e2e2e2',
            borderTopColor: '#00D9A3',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style jsx>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

    // Not authenticated
    if (!isAuthenticated) {
      return null;
    }

    // Guest not allowed
    if (!allowGuest && user?.is_anonymous) {
      return null;
    }

    // Render the protected component
    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook for checking auth status in components
 */
export function useRequireAuth(options = {}) {
  const { allowGuest = true, redirectTo = '/signin' } = options;
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        const returnUrl = encodeURIComponent(router.asPath);
        router.replace(`${redirectTo}?redirect=${returnUrl}`);
      } else if (!allowGuest && user?.is_anonymous) {
        router.replace('/signup?upgrade=true');
      }
    }
  }, [loading, isAuthenticated, user, router, allowGuest, redirectTo]);

  return {
    user,
    loading,
    isAuthenticated,
    isGuest: user?.is_anonymous,
  };
}

/**
 * Hook to redirect authenticated users away from auth pages
 */
export function useRedirectIfAuthenticated(redirectTo = '/dashboard') {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo);
    }
  }, [loading, user, router, redirectTo]);

  return { loading, isAuthenticated: !!user };
}

export default withAuth;
