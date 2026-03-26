// components/onboarding/WizardEngine.tsx
import React, { Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardOverlay } from '@/components/onboarding/WizardOverlay';
import { WizardPointer } from '@/components/onboarding/WizardPointer';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { useWizard, WizardStep } from '@/components/onboarding/WizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveOnboardingStep, completeOnboarding } from '@/lib/onboarding';

// Fluxo simplificado: apenas boas-vindas + cadastro de serviço
const StepWelcome = React.lazy(
  () => import('@/components/onboarding/StepBusinessInfo').then((m) => ({ default: m.StepWelcome }))
);
const StepServices = React.lazy(
  () => import('@/components/onboarding/StepServices').then((m) => ({ default: m.StepServices }))
);

interface WizardStepConfig {
  step: WizardStep;
  title: string;
  icon: string;
  elementId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
}

const WIZARD_STEPS: WizardStepConfig[] = [
  {
    step: 1,
    title: 'Boas-vindas',
    icon: '👋',
    elementId: 'wizard-welcome-next',
    position: 'bottom',
    message: 'Vamos configurar seu primeiro serviço',
  },
  {
    step: 2,
    title: 'Seus Serviços',
    icon: '✂️',
    elementId: 'wizard-add-service',
    position: 'top',
    message: 'Cadastre os serviços que você oferece',
  },
];

const TOTAL_STEPS = WIZARD_STEPS.length; // 2

function StepLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-400" />
    </div>
  );
}

export function WizardEngine() {
  const { state, dispatch } = useWizard();
  const { userType, companyId } = useAuth();
  const navigate = useNavigate();

  const isBeauty = userType === 'beauty';
  const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

  const { currentStep, isActive, completedSteps } = state;

  const currentStepConfig = WIZARD_STEPS.find((s) => s.step === currentStep) ?? WIZARD_STEPS[0];

  function goToStep(step: WizardStep) {
    dispatch({ type: 'SET_STEP', step });
  }

  const completeStep = useCallback(async (step: WizardStep) => {
    dispatch({ type: 'COMPLETE_STEP', step });

    if (!companyId) return;

    const nextStep = Math.min(step + 1, TOTAL_STEPS) as WizardStep;
    const newCompleted = [...new Set([...completedSteps, step])];

    try {
      if (step === TOTAL_STEPS) {
        await completeOnboarding(companyId);
        dispatch({ type: 'COMPLETE_WIZARD' });
        navigate('/', { replace: true });
      } else {
        await saveOnboardingStep(companyId, nextStep, newCompleted);
      }
    } catch (err) {
      console.error('[WizardEngine] Erro ao persistir progresso:', err);
    }
  }, [companyId, completedSteps, dispatch, navigate]);

  function renderCurrentStepContent() {
    switch (currentStep) {
      case 1:
        return (
          <StepWelcome
            onNext={() => void completeStep(1)}
            accentColor={accentColor}
          />
        );
      case 2:
        return (
          <StepServices
            onNext={() => void completeStep(2)}
            onBack={() => goToStep(1)}
            accentColor={accentColor}
          />
        );
      default:
        return null;
    }
  }

  return (
    <WizardOverlay isActive={isActive}>
      <div className="relative z-[9997] flex flex-col items-center justify-center min-h-screen p-4 pointer-events-auto">
        {/* Progress bar */}
        <div className="w-full max-w-lg mb-6">
          <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>

        {/* Step title */}
        <div className="text-center mb-4">
          <span className="text-2xl" aria-hidden="true">
            {currentStepConfig.icon}
          </span>
          <h2 className="text-white text-xl font-bold mt-1">{currentStepConfig.title}</h2>
        </div>

        {/* Step content — ID fora do Suspense para WizardPointer encontrar imediatamente */}
        <div
          key={currentStep}
          id={`wizard-step-${currentStep}`}
          className="w-full max-w-lg animate-slide-up"
        >
          <Suspense fallback={<StepLoadingFallback />}>
            {renderCurrentStepContent()}
          </Suspense>
        </div>
      </div>

      {/* Pointer apontando para o elemento do step atual */}
      <WizardPointer
        target={{
          elementId: currentStepConfig.elementId,
          position: currentStepConfig.position,
          message: currentStepConfig.message,
        }}
      />
    </WizardOverlay>
  );
}
