import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { parseDate } from '../utils/date';
import { resolveIsDev } from '../utils/devAccess';
import { applyPublicAuthTheme } from '../utils/publicAuthTheme';
import { normalizeRegion } from '../utils/formatters';
import { getTrialEndsAt } from '../constants';
import { isEmailTakenError } from '../utils/mapError';

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
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'subscriber';
  trialEndsAt: string | null;
  isSubscriptionActive: boolean;
  role: 'owner' | 'staff';
  companyId: string | null;
  teamMemberId: string | null;
  isDev: boolean;
  aiosEnabled: boolean;
  setDevUserType: (type: UserType) => void;
  updateRegion: (region: Region) => void;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  markTutorialCompleted: () => Promise<{ error: Error | null }>;
  register: (data: {
    email: string;
    password: string;
    fullName: string;
    businessName: string;
    userType: UserType;
    region: Region;
    phone: string;
    companyId?: string;
    teamMemberId?: string;
    birthDate?: string;
  }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userType, setUserType] = useState<UserType>('barber');
  const [region, setRegion] = useState<Region>('BR');
  const [businessName, setBusinessName] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [tutorialCompleted, setTutorialCompleted] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trial' | 'active' | 'past_due' | 'canceled' | 'subscriber'>('trial');
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [role, setRole] = useState<'owner' | 'staff'>('owner');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [teamMemberId, setTeamMemberId] = useState<string | null>(null);
  const [aiosEnabled, setAiosEnabled] = useState(false);
  const [isDev, setIsDev] = useState(false);
  const [devUserType, setDevUserTypeState] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('rhian_lepore_dev_type');
    return (saved as UserType) || null;
  });
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (profile) {
        // Para staff, userType será definido a partir do perfil do owner (evita flicker de tema)
        const isStaffAccount = profile.role === 'staff';
        if (!isStaffAccount) {
          setUserType(profile.user_type as UserType || 'barber');
        }
        setRegion(normalizeRegion(profile.region));
        setBusinessName(profile.business_name || '');
        setFullName(profile.full_name || '');
        setAvatarUrl(profile.photo_url || null);
        setRole(isStaffAccount ? 'staff' : 'owner');
        setCompanyId(profile.company_id || userId);
        setAiosEnabled(profile.aios_enabled ?? false);

        // Se for staff, herda o plano de assinatura do dono
        if (isStaffAccount && profile.company_id) {
          setTutorialCompleted(profile.tutorial_completed ?? false);

          const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('subscription_status, trial_ends_at, user_type, business_name, region')
            .eq('id', profile.company_id)
            .single();

          if (ownerProfile) {
            setSubscriptionStatus((ownerProfile.subscription_status as any) || 'trial');
            setTrialEndsAt(ownerProfile.trial_ends_at || null);
            // Herda o userType, businessName e região/moeda do dono — chamada única, sem flicker
            setUserType(ownerProfile.user_type as UserType || 'barber');
            setBusinessName(ownerProfile.business_name || '');
            setRegion(normalizeRegion(ownerProfile.region));
          } else {
            // Dono não encontrado (conta desativada/excluída): bloquear acesso do staff órfão
            setUserType(profile.user_type as UserType || 'barber');
            setSubscriptionStatus('canceled');
            setTrialEndsAt(null);
          }

          // Busca o ID do registro de profissional vinculado ao staff
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('staff_user_id', userId)
            .eq('user_id', profile.company_id)
            .maybeSingle();

          let resolvedMemberId = teamMember?.id || null;
          if (!resolvedMemberId) {
            const { data: relinked } = await supabase.rpc('relink_staff_if_unbound');
            resolvedMemberId = relinked || null;
          }
          setTeamMemberId(resolvedMemberId);
        } else {
          const { data: onboardingProgress, error: onboardingError } = await supabase
            .from('onboarding_progress')
            .select('is_completed')
            .eq('company_id', profile.company_id || userId)
            .single();

          if (onboardingError && onboardingError.code !== 'PGRST116') {
            console.error('Error fetching onboarding progress:', onboardingError);
          }

          setTutorialCompleted(onboardingProgress?.is_completed ?? profile.tutorial_completed ?? false);
          setSubscriptionStatus((profile.subscription_status as any) || 'trial');
          setTrialEndsAt(profile.trial_ends_at || null);
          setTeamMemberId(null);
        }
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
          // Boot frio: sem isso, isDev fica false até um evento de auth
          // posterior (e as telas devOnly somem após refresh).
          setIsDev(resolveIsDev(session.user.email));
          await fetchProfileData(session.user.id);
        } else {
          setIsDev(false);
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
        setIsDev(resolveIsDev(session.user.email));
        // supabase-js segura um lock neste callback; queries no mesmo tick travam o signUp.
        setTimeout(() => {
          fetchProfileData(session.user.id).then(() => {
            setLoading(false);
          });
        }, 0);
      } else {
        setIsDev(false);
        setUserType('barber');
        setRegion('BR');
        setBusinessName('');
        setFullName('');
        setAvatarUrl(null);
        setTutorialCompleted(false);
        setSubscriptionStatus('trial');
        setTrialEndsAt(null);
        setRole('owner');
        setCompanyId(null);
        setTeamMemberId(null);
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
    applyPublicAuthTheme();
    setSession(null);
    setUserType('barber');
    setRegion('BR');
    setBusinessName('');
    setFullName('');
    setAvatarUrl(null);
    setTutorialCompleted(false);
    setSubscriptionStatus('trial');
    setTrialEndsAt(null);
    setRole('owner');
    setCompanyId(null);
    setTeamMemberId(null);
  };

  const markTutorialCompleted = async (): Promise<{ error: Error | null }> => {
    if (!session?.user) return { error: new Error('Sessão não encontrada.') };
    try {
      if (role === 'staff') {
        const { error } = await supabase
          .from('profiles')
          .update({ tutorial_completed: true })
          .eq('id', session.user.id);
        if (error) throw error;
      } else {
        const tenantId = companyId || session.user.id;
        const { error } = await supabase
          .from('onboarding_progress')
          .upsert(
            {
              company_id: tenantId,
              current_step: 5,
              completed_steps: [1, 2, 3, 4, 5],
              is_completed: true,
              completed_at: new Date().toISOString(),
            },
            { onConflict: 'company_id' }
          );

        if (error) throw error;

        // Mantém profiles.tutorial_completed alinhado ao gate legado / relatórios.
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ tutorial_completed: true })
          .eq('id', session.user.id);
        if (profileError) throw profileError;
      }

      setTutorialCompleted(true);
      return { error: null };
    } catch (error) {
      console.error('Error marking tutorial as complete:', error);
      return { error: error instanceof Error ? error : new Error('Erro ao concluir o tutorial.') };
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
    companyId?: string;
    teamMemberId?: string;
    birthDate?: string;
  }) => {
    try {
      if (data.companyId && !data.teamMemberId) {
        return { error: { message: 'Convite inválido. Peça ao gestor um link atualizado.' } };
      }

      const signUpPayload = {
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            business_name: data.businessName,
            phone: data.phone,
            type: data.userType,
            region: data.region,
            role: data.companyId ? 'staff' : 'owner',
            company_id: data.companyId || undefined,
            member_id: data.teamMemberId || undefined,
          }
        }
      };

      let { data: authData, error: authError } = await supabase.auth.signUp(signUpPayload);

      if (authError && isEmailTakenError(authError) && data.companyId && data.teamMemberId) {
        const existing = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });

        if (!existing?.error && existing?.data?.user) {
          const { data: claimedId, error: claimError } = await supabase.rpc('complete_staff_invite', {
            p_company_id: data.companyId,
            p_member_id: data.teamMemberId,
            p_birth_date: data.birthDate || null,
          });
          if (!claimError) {
            setCompanyId(data.companyId);
            setRole('staff');
            setUserType(data.userType);
            setRegion(normalizeRegion(data.region));
            setBusinessName(data.businessName);
            setFullName(data.fullName);
            setTutorialCompleted(false);
            setTeamMemberId(claimedId || data.teamMemberId);
            return { error: null };
          }

          const { data: released } = await supabase.rpc('release_staff_email_for_reinvite', {
            p_company_id: data.companyId,
            p_member_id: data.teamMemberId,
            p_email: data.email,
          });
          await supabase.auth.signOut();
          if (released === true) {
            const retry = await supabase.auth.signUp(signUpPayload);
            authData = retry.data;
            authError = retry.error;
          }
        } else {
          const code = (existing?.error as unknown as Record<string, unknown>)?.code ?? '';
          if (code === 'email_not_confirmed') {
            return { error: { message: 'Este e-mail já foi cadastrado mas não foi confirmado. Verifique sua caixa de entrada ou peça ao gestor para reenviar o convite.' } as unknown as Error };
          }
          return { error: { message: 'Este e-mail já está em uso. Se você é colaborador, peça ao gestor para excluir e recriar o convite.' } as unknown as Error };
        }
      }

      if (authError) return { error: authError };

      if (authData.user) {
        const resolvedCompanyId = data.companyId || authData.user.id;
        const isStaffSignup = Boolean(data.companyId);

        if (isStaffSignup && !authData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password,
          });
          if (signInError) return { error: signInError };
        }

        if (isStaffSignup && data.teamMemberId) {
          const { data: claimedId, error: claimError } = await supabase.rpc('complete_staff_invite', {
            p_company_id: data.companyId,
            p_member_id: data.teamMemberId,
            p_birth_date: data.birthDate || null,
          });
          if (claimError) return { error: claimError };

          setCompanyId(resolvedCompanyId);
          setRole('staff');
          setUserType(data.userType);
          setRegion(normalizeRegion(data.region));
          setBusinessName(data.businessName);
          setFullName(data.fullName);
          setTutorialCompleted(false);
          setTeamMemberId(claimedId || data.teamMemberId);
          return { error: null };
        }

        const profileRow = {
          id: authData.user.id,
          full_name: data.fullName,
          business_name: data.businessName,
          user_type: data.userType,
          region: data.region,
          phone: data.phone,
          birth_date: data.birthDate || null,
          email: data.email,
          tutorial_completed: false,
          subscription_status: 'trial',
          trial_ends_at: getTrialEndsAt(),
          aios_enabled: true
        };

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileRow, { onConflict: 'id' });

        if (profileError && profileError.code !== '23505') return { error: profileError };

        setCompanyId(resolvedCompanyId);
        setRole('owner');
        setUserType(data.userType);
        setRegion(normalizeRegion(data.region));
        setBusinessName(data.businessName);
        setFullName(data.fullName);
        setTutorialCompleted(false);

        const { error: onboardingError } = await supabase.rpc('upsert_onboarding_progress', {
          p_company_id: authData.user.id,
          p_current_step: 1,
          p_completed_steps: [],
          p_step_data: {}
        });

        if (onboardingError) return { error: onboardingError };
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

  const updateRegion = useCallback((next: Region) => {
    setRegion(normalizeRegion(next));
  }, []);

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
    role,
    companyId,
    teamMemberId,
    isDev,
    aiosEnabled,
    setDevUserType,
    updateRegion,
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
    role,
    companyId,
    teamMemberId,
    isDev,
    aiosEnabled,
    devUserType,
    loading,
    updateRegion,
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
