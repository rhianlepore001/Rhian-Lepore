// pages/Onboarding.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardProvider, useWizard, WizardStep } from '@/components/onboarding/WizardContext';
import { WizardEngine } from '@/components/onboarding/WizardEngine';
import { getOnboardingProgress } from '@/lib/onboarding';
import { useAuth } from '@/contexts/AuthContext';

function OnboardingInner() {
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const { dispatch } = useWizard();

  useEffect(() => {
    if (!companyId) return;

    let cancelled = false;

    getOnboardingProgress(companyId)
      .then((progress) => {
        if (cancelled) return;

        if (progress?.is_completed) {
          navigate('/', { replace: true });
          return;
        }

        // P0-01: restaurar passo salvo para retomada correta ao fechar/reabrir
        if (progress?.current_step && progress.current_step > 1) {
          dispatch({ type: 'SET_STEP', step: progress.current_step as WizardStep });
        }
      })
      .catch((err) => {
        console.error('[Onboarding] Erro ao buscar progresso:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [companyId, navigate, dispatch]);

  return <WizardEngine />;
}

export default function Onboarding() {
  return (
    <WizardProvider>
      <OnboardingInner />
    </WizardProvider>
  );
}
