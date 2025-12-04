/**
 * useAuth Hook
 * Manages authentication state with Supabase
 * Includes guest mode support for demo access
 */

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

// Guest mode key for localStorage
const GUEST_MODE_KEY = 'solaira_guest_mode';

// Helper function to add timeout to promises
const withTimeout = (promise, ms, errorMessage = 'Operation timed out') => {
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error(errorMessage)), ms)
  );
  return Promise.race([promise, timeout]);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch profile when user changes (with timeout)
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data, error } = await withTimeout(profilePromise, 5000, 'Profile fetch timed out');

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch error:', error);
        // Don't throw - profile is optional
      }
      setProfile(data || null);
    } catch (err) {
      console.warn('Error fetching profile (non-blocking):', err.message);
      setProfile(null);
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for guest mode first
        if (typeof window !== 'undefined') {
          const guestMode = localStorage.getItem(GUEST_MODE_KEY);
          if (guestMode === 'true') {
            setIsGuest(true);
            setLoading(false);
            return;
          }
        }

        const sessionPromise = supabase.auth.getSession();
        const { data: { session } } = await withTimeout(sessionPromise, 5000, 'Session fetch timed out');
        
        setUser(session?.user || null);
        if (session?.user) {
          // Don't await - fetch profile in background
          fetchProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        setUser(session?.user || null);
        
        if (session?.user) {
          // Exit guest mode if signing in
          setIsGuest(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_MODE_KEY);
          }
          // Don't await - fetch profile in background to prevent blocking
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Sign up with email/password
  const signUp = useCallback(async (email, password, metadata = {}) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
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
      // Exit guest mode
      setIsGuest(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(GUEST_MODE_KEY);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
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
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/callback`
        : undefined;
      
      console.log('OAuth redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: false
        }
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
    setIsGuest(false);
    setUser(null);
    setProfile(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_MODE_KEY);
      // Also clear any Supabase storage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
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

  // Enter guest mode (for demo)
  const enterGuestMode = useCallback(() => {
    setIsGuest(true);
    setUser(null);
    setProfile(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(GUEST_MODE_KEY, 'true');
    }
  }, []);

  // Exit guest mode
  const exitGuestMode = useCallback(() => {
    setIsGuest(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(GUEST_MODE_KEY);
    }
  }, []);

  // Update profile
  const updateProfile = useCallback(async (updates) => {
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
  }, [user]);

  // Send password reset email
  const resetPassword = useCallback(async (email) => {
    setError(null);
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;
      
      console.log('Password reset redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
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
        password: newPassword
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
    isGuest,
    loading,
    error,
    isAuthenticated: !!user || isGuest,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    enterGuestMode,
    exitGuestMode,
    updateProfile,
    resetPassword,
    updatePassword,
    refreshProfile: () => fetchProfile(user?.id)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
