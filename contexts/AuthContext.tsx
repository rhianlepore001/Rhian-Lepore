import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { parseDate } from '../utils/date';

export type UserType = 'barber' | 'beauty';
export type Region = 'BR' | 'PT';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  userType: UserType;
  region: Region;
  businessName: string;
  fullName: string;
  avatarUrl: string | null;
  tutorialCompleted: boolean;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled';
  trialEndsAt: string | null;
  isSubscriptionActive: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  markTutorialCompleted: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<UserType>('barber');
  const [region, setRegion] = useState<Region>('BR');
  const [businessName, setBusinessName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'past_due' | 'canceled'>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type, region, business_name, full_name, photo_url, tutorial_completed, subscription_status, trial_ends_at')
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
        // Re-fetch profile data on sign in/change
        fetchProfileData(session.user.id).then(() => {
          setLoading(false);
        });
      } else {
        // Reset state on sign out
        setTutorialCompleted(true);
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

  const value = React.useMemo(() => ({
    isAuthenticated: !!session,
    user: session?.user ?? null,
    userType,
    region,
    businessName,
    fullName,
    avatarUrl,
    tutorialCompleted,
    subscriptionStatus,
    trialEndsAt,
    isSubscriptionActive: subscriptionStatus === 'active' || (
      subscriptionStatus === 'trial' &&
      !!trialEndsAt &&
      (() => {
        const end = parseDate(trialEndsAt);
        return end ? new Date() < end : false;
      })()
    ),
    loading,
    login,
    logout,
    markTutorialCompleted
  }), [
    session,
    userType,
    region,
    businessName,
    fullName,
    avatarUrl,
    tutorialCompleted,
    subscriptionStatus,
    trialEndsAt,
    loading
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};