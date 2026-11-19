/**
 * useAuth Hook
 * Manages authentication state with Supabase
 * Includes guest mode support for demo access
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch profile when user changes (with timeout)
  const fetchProfile = useCallback(async (userOrId) => {
    const userId = userOrId?.id || userOrId;
    const userObj = typeof userOrId === 'object' ? userOrId : null;

    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      console.log('Fetching profile for:', userId);

      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      // Race the supabase query against the timeout
      const queryPromise = supabase.from('profiles').select('*').eq('id', userId).single();

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch error:', error);
        // Don't throw - profile is optional
      }

      let profileData = data || null;

      // Sync Google/OAuth name to profile if missing or default email
      if (profileData && userObj && userObj.user_metadata) {
        const { full_name, name } = userObj.user_metadata;
        const displayName = full_name || name;

        if (
          displayName &&
          (!profileData.display_name || profileData.display_name === userObj.email)
        ) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', userId);

          if (!updateError) {
            profileData = { ...profileData, display_name: displayName };
          }
        }
      }

      setProfile(profileData);
    } catch (err) {
      console.warn('Error fetching profile (non-blocking):', err.message);
      // Keep existing profile on error instead of clearing it
      // setProfile(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log('Auth: Initializing...');

      // Without Supabase credentials there is no session to restore.
      if (!isSupabaseConfigured) {
        console.warn('Auth: Supabase not configured, running without authentication');
        if (mounted) setLoading(false);
        return;
      }

      try {
        // Race execution to prevent infinite loading
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );

        const {
          data: { session },
          error,
        } = await Promise.race([sessionPromise, timeoutPromise]);

        if (error) throw error;

        if (mounted) {
          if (session?.user) {
            console.log('Auth: Session found for', session.user.email);
            // Await profile fetch but don't block indefinitely
            try {
              await Promise.race([
                fetchProfile(session.user),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Profile timeout')), 3000)
                ),
              ]);
            } catch (e) {
              console.warn('Profile fetch timed out during init');
            }
          } else {
            console.log('Auth: No session found');
          }

          setUser(session?.user || null);
        }
      } catch (err) {
        console.error('Auth init error:', err.message);
        if (mounted) setError(err.message);
      } finally {
        console.log('Auth: Initialization complete, loading=false');
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } = {} } = isSupabaseConfigured
      ? supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth event:', event, session?.user?.email);

          if (mounted) {
            if (session?.user) {
              try {
                await fetchProfile(session.user);
              } catch (e) {
                console.warn('Profile fetch failed in onAuthStateChange', e);
              }
            } else {
              setProfile(null);
            }

            setUser(session?.user || null);
            setLoading(false);
          }
        })
      : {};

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, metadata = {}) => {
    setError(null);
    if (!isSupabaseConfigured) {
      const err = new Error('Authentication is not configured. See .env.example');
      setError(err.message);
      return { data: null, error: err };
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  }, []);

  // Sign in with email/password
  const signIn = useCallback(async (email, password) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  }, []);

  // Sign in with OAuth (Google, GitHub)
  const signInWithOAuth = useCallback(async (provider) => {
    setError(null);
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/callback` : undefined;

      console.log('OAuth redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false,
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      console.error('OAuth error:', err);
      setError(err.message);
      return { data: null, error: err };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    console.log('SignOut: Starting...');
    setError(null);

    // Clear local state FIRST (before any async operation)
    setUser(null);
    setProfile(null);

    if (typeof window !== 'undefined') {
      // Also clear any Supabase storage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }

    try {
      // Sign out from Supabase with global scope to clear all sessions
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.warn('SignOut: Supabase error:', error.message);
      } else {
        console.log('SignOut: Supabase signOut completed successfully');
      }
      return { error: null };
    } catch (err) {
      console.warn('SignOut: Exception during signOut:', err.message);
      return { error: null }; // Return success anyway since local state is cleared
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(
    async (updates) => {
      setError(null);
      try {
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();

        if (error) throw error;
        setProfile(data);
        return { data, error: null };
      } catch (err) {
        setError(err.message);
        return { data: null, error: err };
      }
    },
    [user]
  );

  // Send password reset email
  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;

      console.log('Password reset redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      console.log('Password reset email sent successfully');
      return { data, error: null };
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message);
      return { error: err };
    }
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword) => {
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return { error: null };
    } catch (err) {
      setError(err.message);
      return { error: err };
    }
  }, []);

  const value = {
    user,
    profile,
    loading,
    error,
    isAuthenticated: !!user,
    // Supabase anonymous sessions are "guests": signed in, but no email/OAuth.
    isGuest: Boolean(user?.is_anonymous),
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshProfile: () => fetchProfile(user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
