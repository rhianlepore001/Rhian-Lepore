import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchOnboardingProgress,
  upsertOnboardingStep,
  completeOnboardingProgress,
} from '@/services/onboarding';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface UseOnboardingStateReturn {
  step: OnboardingStep;
  loading: boolean;
  completed: boolean;
  tenantReady: boolean;
  goToStep: (nextStep: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export const useOnboardingState = (): UseOnboardingStateReturn => {
  const { companyId, user, tutorialCompleted, markTutorialCompleted } = useAuth();
  const queryClient = useQueryClient();

  // Fallback para user.id evita race pós-cadastro em que companyId ainda não
  // foi hidratado no AuthContext (botões pareciam mortos com 403 na RPC).
  const tenantId = companyId || user?.id || null;
  const tenantReady = !!tenantId && !!user;

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding', 'progress', tenantId],
    queryFn: () => fetchOnboardingProgress(tenantId!),
    enabled: tenantReady,
  });

  const goToStepMutation = useMutation({
    mutationFn: (nextStep: OnboardingStep) => {
      if (!tenantId) {
        throw new Error('Sessão incompleta: company_id ausente. Recarregue a página ou entre novamente.');
      }
      return upsertOnboardingStep(tenantId, nextStep);
    },
    onSuccess: (_data, nextStep) => {
      queryClient.setQueryData(['onboarding', 'progress', tenantId], {
        step: nextStep,
        completed: false,
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) {
        throw new Error('Sessão incompleta: company_id ausente. Recarregue a página ou entre novamente.');
      }
      await completeOnboardingProgress(tenantId);
      if (!tutorialCompleted) {
        const { error } = await markTutorialCompleted();
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['onboarding', 'progress', tenantId], {
        step: 5,
        completed: true,
      });
    },
  });

  const refreshState = async () => {
    await queryClient.invalidateQueries({ queryKey: ['onboarding', 'progress', tenantId] });
  };

  const currentStep = progress?.step ?? 1;
  const isCompleted = progress?.completed ?? false;

  return {
    step: Math.min(Math.max(currentStep, 1), 6) as OnboardingStep,
    // Aguarda tenant + primeiro fetch antes de liberar os botões do wizard.
    loading: !tenantReady || isLoading,
    completed: isCompleted,
    tenantReady,
    goToStep: (nextStep) => goToStepMutation.mutateAsync(nextStep),
    completeOnboarding: () => completeOnboardingMutation.mutateAsync(),
    skipOnboarding: () => completeOnboardingMutation.mutateAsync(),
    refreshState,
  };
};
