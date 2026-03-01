import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { parseDate } from '../utils/date';

/** User type for business classification */
export type UserType = 'barber' | 'beauty';

/** Region for localization (Brazil or Portugal) */
export type Region = 'BR' | 'PT';

/**
 * Authentication context type containing user data, authentication state, and auth methods
 * @interface AuthContextType
 */
interface AuthContextType {
  /** Whether user is currently authenticated */
  isAuthenticated: boolean;

  /** Current authenticated user or null */
  user: User | null;

  /** User's business type (barber or beauty) */
  userType: UserType;

  /** User's region (Brazil or Portugal) */
  region: Region;

  /** User's business/shop name */
  businessName: string;

  /** User's full name */
  fullName: string;

  /** User's profile avatar URL */
  avatarUrl: string | null;

  /** Whether user completed the onboarding tutorial */
  tutorialCompleted: boolean;

  /** Current subscription status */
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'subscriber';

  /** Trial end date in ISO format */
  trialEndsAt: string | null;

  /** Whether subscription is currently active (includes trial and paid) */
  isSubscriptionActive: boolean;

  /** Whether user is a dev/admin */
  isDev: boolean;

  /** Whether AIOS integration is enabled */
  aiosEnabled: boolean;

  /** Override user type for dev mode testing */
  setDevUserType: (type: UserType) => void;

  /** Whether auth state is currently loading */
  loading: boolean;

  /**
   * Sign in with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Error object if login fails, null on success
   */
  login: (email: string, password: string) => Promise<{ error: any }>;

  /** Sign out current user */
  logout: () => Promise<void>;

  /** Mark onboarding tutorial as completed */
  markTutorialCompleted: () => Promise<void>;

  /**
   * Register new user
   * @param data - Registration data including email, password, and profile info
   * @returns Error object if registration fails, null on success
   */
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    userType: UserType;
    region: Region;
    phone: string;
  }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Authentication provider component that wraps the app and provides auth context
 * Handles session management, user data fetching, and auth state changes
 * @component
 * @example
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<UserType>('barber');
  const [region, setRegion] = useState<Region>('BR');
  const [businessName, setBusinessName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'past_due' | 'canceled' | 'subscriber'>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [aiosEnabled, setAiosEnabled] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [devUserType, setDevUserTypeState] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('rhian_lepore_dev_type');
    return (saved as UserType) || null;
  });
  const [loading, setLoading] = useState(true);

  /**
   * Fetch user profile data from Supabase
   * @param {string} userId - The user's ID
   * @async
   */
  const fetchProfileData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type, region, business_name, full_name, photo_url, tutorial_completed, subscription_status, trial_ends_at, aios_enabled')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        setUserType(profile.user_type as UserType || 'barber');
        setRegion(profile.region as Region || 'BR');
        setBusinessName(profile.business_name || '');
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.photo_url || null);
        setTutorialCompleted(profile.tutorial_completed ?? true);
        setSubscriptionStatus((profile.subscription_status as any) || 'trial');
        setTrialEndsAt(profile.trial_ends_at || null);
        setAiosEnabled(profile.aios_enabled ?? false);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        if (session?.user?.id) {
          await fetchProfileData(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false);
        return;
      }

      if (session?.user?.id) {
        setIsDev(session.user.email === 'rleporesilva@gmail.com');
        // Re-fetch profile data on sign in/change
        fetchProfileData(session.user.id).then(() => {
          setLoading(false);
        });
      } else {
        // Reset state on sign out
        setIsDev(false);
        setUserType('barber');
        setRegion('BR');
        setBusinessName('');
        setFullName('');
        setAvatarUrl(null);
        setTutorialCompleted(true);
        setSubscriptionStatus('trial');
        setTrialEndsAt(null);
        setAiosEnabled(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    // 1. Check Rate Limit (Anti-brute force)
    try {
      const { data: allowed } = await supabase.rpc('check_login_rate_limit', { p_email: email });
      if (allowed === false) {
        return { error: { message: 'Muitas tentativas de login. Por segurança, aguarde 1 minuto.' } };
      }
    } catch (err) {
      console.error('Erro ao verificar rate limit:', err);
      // Fail open to avoid blocking legitimate users on system error
    }

    // 2. Perform Login
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserType('barber');
    setRegion('BR');
    setBusinessName('');
    setFullName('');
    setAvatarUrl(null);
    setTutorialCompleted(true);
    setSubscriptionStatus('trial');
    setTrialEndsAt(null);
  };

  const markTutorialCompleted = async () => {
    if (!session?.user) return;
    try {
      await supabase
        .from('profiles')
        .update({ tutorial_completed: true })
        .eq('id', session.user.id);
      setTutorialCompleted(true);
    } catch (error) {
      console.error('Error marking tutorial as complete:', error);
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    userType: UserType;
    region: Region;
    phone: string;
  }) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            business_name: data.businessName,
          }
        }
      });

      if (authError) return { error: authError };

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: data.fullName,
              business_name: data.businessName,
              user_type: data.userType,
              region: data.region,
              phone: data.phone,
              tutorial_completed: false,
              subscription_status: 'trial',
              trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days trial
              aios_enabled: true
            }
          ]);

        if (profileError) return { error: profileError };
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const setDevUserType = (type: UserType) => {
    setDevUserTypeState(type);
    localStorage.setItem('rhian_lepore_dev_type', type);
  };

  const activeUserType = (isDev && devUserType) ? devUserType : userType;

  const value = React.useMemo(() => ({
    isAuthenticated: !!session,
    user: session?.user ?? null,
    userType: activeUserType,
    region,
    businessName,
    fullName,
    avatarUrl,
    tutorialCompleted,
    subscriptionStatus,
    trialEndsAt,
    isSubscriptionActive: subscriptionStatus === 'active' || subscriptionStatus === 'subscriber' || (
      subscriptionStatus === 'trial' &&
      !!trialEndsAt &&
      (() => {
        const end = parseDate(trialEndsAt);
        return end ? new Date() < end : false;
      })()
    ),
    isDev,
    aiosEnabled,
    setDevUserType,
    loading,
    login,
    logout,
    markTutorialCompleted,
    register
  }), [
    session,
    activeUserType,
    region,
    businessName,
    fullName,
    avatarUrl,
    tutorialCompleted,
    subscriptionStatus,
    trialEndsAt,
    isDev,
    aiosEnabled,
    devUserType,
    loading
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to access authentication context
 * Must be used within an AuthProvider
 * @returns {AuthContextType} Authentication context with user data and auth methods
 * @throws {Error} When used outside of AuthProvider
 * @example
 * const { user, isAuthenticated, login } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};