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
  goToStep: (nextStep: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshState: () => Promise<void>;
}

export const useOnboardingState = (): UseOnboardingStateReturn => {
  const { companyId, user, tutorialCompleted, markTutorialCompleted } = useAuth();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['onboarding', 'progress', companyId],
    queryFn: () => fetchOnboardingProgress(companyId!),
    enabled: !!companyId && !!user,
  });

  const goToStepMutation = useMutation({
    mutationFn: (nextStep: OnboardingStep) => upsertOnboardingStep(companyId!, nextStep),
    onSuccess: (_data, nextStep) => {
      queryClient.setQueryData(['onboarding', 'progress', companyId], {
        step: nextStep,
        completed: false,
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: () => completeOnboardingProgress(companyId!),
    onSuccess: () => {
      queryClient.setQueryData(['onboarding', 'progress', companyId], {
        step: 5,
        completed: true,
      });
      if (!tutorialCompleted) {
        markTutorialCompleted();
      }
    },
  });

  const refreshState = async () => {
    await queryClient.invalidateQueries({ queryKey: ['onboarding', 'progress', companyId] });
  };

  const currentStep = progress?.step ?? 1;
  const isCompleted = progress?.completed ?? false;

  return {
    step: Math.min(Math.max(currentStep, 1), 6) as OnboardingStep,
    loading: isLoading,
    completed: isCompleted,
    goToStep: (nextStep) => goToStepMutation.mutateAsync(nextStep),
    completeOnboarding: () => completeOnboardingMutation.mutateAsync(),
    refreshState,
  };
};