import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingState {
  step: OnboardingStep;
  completed: boolean;
  loading: boolean;
}

interface UseOnboardingStateReturn {
  step: OnboardingStep;
  loading: boolean;
  completed: boolean;
  goToStep: (nextStep: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export const useOnboardingState = (): UseOnboardingStateReturn => {
  const { user, tutorialCompleted, markTutorialCompleted } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    completed: false,
    loading: true,
  });

  // Refs para evitar re-criação de fetchProgress quando esses valores mudam
  const tutorialCompletedRef = useRef(tutorialCompleted);
  tutorialCompletedRef.current = tutorialCompleted;
  const markTutorialCompletedRef = useRef(markTutorialCompleted);
  markTutorialCompletedRef.current = markTutorialCompleted;

  const fetchProgress = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('business_settings')
        .select('onboarding_step, onboarding_completed')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar progresso do onboarding:', error);
      }

      if (data?.onboarding_completed) {
        if (!tutorialCompletedRef.current) {
          await markTutorialCompletedRef.current();
        }
        setState({ step: 5, completed: true, loading: false });
        return;
      }

      const savedStep = data?.onboarding_step
        ? (Math.min(Math.max(data.onboarding_step, 1), 5) as OnboardingStep)
        : 1;

      setState({ step: savedStep, completed: false, loading: false });
    } catch (err) {
      console.error('Erro inesperado no onboarding:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]); // Só re-cria quando o user muda — refs usadas para callbacks estáveis

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const goToStep = useCallback(
    async (nextStep: OnboardingStep) => {
      if (!user) return;

      try {
        await supabase.rpc('update_onboarding_step', {
          p_user_id: user.id,
          p_step: nextStep,
        });
        setState(prev => ({ ...prev, step: nextStep }));
      } catch (err) {
        console.error('Erro ao salvar etapa:', err);
      }
    },
    [user]
  );

  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    try {
      await supabase.rpc('update_onboarding_step', {
        p_user_id: user.id,
        p_step: 5,
        p_completed: true,
      });
      await markTutorialCompletedRef.current();
      setState(prev => ({ ...prev, step: 5, completed: true }));
    } catch (err) {
      console.error('Erro ao finalizar onboarding:', err);
    }
  }, [user]);

  return {
    step: state.step,
    loading: state.loading,
    completed: state.completed,
    goToStep,
    completeOnboarding,
    refreshState: fetchProgress,
  };
};
