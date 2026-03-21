// components/onboarding/WizardEngine.tsx
import React, { Suspense, useCallback } from 'react';
import { WizardOverlay } from '@/components/onboarding/WizardOverlay';
import { WizardPointer } from '@/components/onboarding/WizardPointer';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { useWizard, WizardStep } from '@/components/onboarding/WizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { saveOnboardingStep, completeOnboarding } from '@/lib/onboarding';

// Lazy imports dos componentes de step
const StepBusinessInfo = React.lazy(
  () => import('@/components/onboarding/StepBusinessInfo').then((m) => ({ default: m.StepBusinessInfo }))
);
const StepServices = React.lazy(
  () => import('@/components/onboarding/StepServices').then((m) => ({ default: m.StepServices }))
);
const StepTeam = React.lazy(
  () => import('@/components/onboarding/StepTeam').then((m) => ({ default: m.StepTeam }))
);
const StepMonthlyGoal = React.lazy(
  () => import('@/components/onboarding/StepMonthlyGoal').then((m) => ({ default: m.StepMonthlyGoal }))
);
const StepSuccess = React.lazy(
  () => import('@/components/onboarding/StepSuccess').then((m) => ({ default: m.StepSuccess }))
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
    title: 'Informações do Negócio',
    icon: '🏢',
    elementId: 'wizard-step-1',
    position: 'bottom',
    message: 'Preencha os dados do seu negócio',
  },
  {
    step: 2,
    title: 'Seus Serviços',
    icon: '✂️',
    elementId: 'wizard-step-2',
    position: 'bottom',
    message: 'Cadastre os serviços que você oferece',
  },
  {
    step: 3,
    title: 'Sua Equipe',
    icon: '👥',
    elementId: 'wizard-step-3',
    position: 'bottom',
    message: 'Adicione os profissionais da sua equipe',
  },
  {
    step: 4,
    title: 'Meta Mensal',
    icon: '🎯',
    elementId: 'wizard-step-4',
    position: 'bottom',
    message: 'Defina sua meta de faturamento mensal',
  },
  {
    step: 5,
    title: 'Tudo Pronto!',
    icon: '🎉',
    elementId: 'wizard-step-5',
    position: 'bottom',
    message: 'Seu sistema está configurado',
  },
];

const TOTAL_STEPS = WIZARD_STEPS.length;

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
      } else {
        await saveOnboardingStep(companyId, nextStep, newCompleted);
      }
    } catch (err) {
      console.error('[WizardEngine] Erro ao persistir progresso:', err);
    }
  }, [companyId, completedSteps, dispatch]);

  function renderCurrentStep() {
    switch (currentStep) {
      case 1:
        return (
          <div id="wizard-step-1">
            <StepBusinessInfo
              onNext={() => void completeStep(1)}
              accentColor={accentColor}
            />
          </div>
        );
      case 2:
        return (
          <div id="wizard-step-2">
            <StepServices
              onNext={() => void completeStep(2)}
              onBack={() => goToStep(1)}
              accentColor={accentColor}
            />
          </div>
        );
      case 3:
        return (
          <div id="wizard-step-3">
            <StepTeam
              onNext={() => void completeStep(3)}
              onBack={() => goToStep(2)}
              accentColor={accentColor}
            />
          </div>
        );
      case 4:
        return (
          <div id="wizard-step-4">
            <StepMonthlyGoal
              onNext={() => void completeStep(4)}
              onBack={() => goToStep(3)}
              onSkip={() => void completeStep(4)}
              accentColor={accentColor}
            />
          </div>
        );
      case 5:
        return (
          <div id="wizard-step-5">
            <StepSuccess
              accentColor={accentColor}
              onComplete={() => void completeStep(5)}
            />
          </div>
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

        {/* Step content */}
        <div className="w-full max-w-lg">
          <Suspense fallback={<StepLoadingFallback />}>
            {renderCurrentStep()}
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
