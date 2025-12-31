import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

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
  tutorialCompleted: boolean; // NEW
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  markTutorialCompleted: () => Promise<void>; // NEW
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<UserType>('barber');
  const [region, setRegion] = useState<Region>('BR');
  const [businessName, setBusinessName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(true); // Assume true until proven otherwise
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_type, region, business_name, full_name, photo_url, tutorial_completed')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        setUserType(profile.user_type as UserType || 'barber');
        setRegion(profile.region as Region || 'BR');
        setBusinessName(profile.business_name || '');
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.photo_url || null);
        setTutorialCompleted(profile.tutorial_completed ?? true); // Default to true if null
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
        console.log('Password recovery event detected, redirecting...');
        setLoading(true);
        // Force a small delay to ensure cookie/localStorage sync
        setTimeout(() => {
          window.location.hash = '/update-password';
          setLoading(false);
        }, 500);
        return; // Don't proceed to loading false yet
      }

      if (session?.user?.id) {
        // Re-fetch profile data on sign in/change
        fetchProfileData(session.user.id);
      } else {
        // Reset state on sign out
        setTutorialCompleted(true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
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
    setTutorialCompleted(true); // Reset on logout
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

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!session,
      user: session?.user ?? null,
      userType,
      region,
      businessName,
      fullName,
      avatarUrl,
      tutorialCompleted,
      loading,
      login,
      logout,
      markTutorialCompleted
    }}>
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