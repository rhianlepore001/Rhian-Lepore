// components/onboarding/WizardEngine.tsx
import React, { Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WizardOverlay } from '@/components/onboarding/WizardOverlay';
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
}

const WIZARD_STEPS: WizardStepConfig[] = [
  { step: 1, title: 'Boas-vindas', icon: '👋' },
  { step: 2, title: 'Seus Serviços', icon: '✂️' },
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
  const { userType, companyId, markTutorialCompleted } = useAuth();
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
        await markTutorialCompleted();
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
      <div className="relative z-[9997] flex min-h-screen pointer-events-auto bg-background text-foreground">
        
        {/* Left Side: Brand/Visual */}
        <div className={`hidden lg:flex lg:flex-col lg:w-1/2 p-12 justify-between relative overflow-hidden
          ${isBeauty ? 'bg-beauty-neon/5' : 'bg-accent-gold/5'} border-r border-border`}>
          
          {/* Decorative Pattern / Blobs */}
          <div className={`absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none
            ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`} />
          <div className={`absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-10 pointer-events-none translate-x-1/3 translate-y-1/3
            ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`} />

          <div className="relative z-10">
            <h1 className="text-3xl font-bold font-heading text-foreground tracking-tight">AgendiX</h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm uppercase tracking-wider">Configuração Inicial</p>
          </div>
          
          <div className="space-y-6 max-w-md relative z-10">
            <h2 className="text-4xl font-bold font-heading text-foreground leading-tight">
              Sua agenda <br/>
              <span className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}>inteligente</span> e <br/>
              automatizada.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Prepare seu espaço em poucos minutos e comece a receber agendamentos online hoje mesmo.
            </p>
          </div>

          <div className="text-sm text-muted-foreground relative z-10">
            © {new Date().getFullYear()} AgendiX. Todos os direitos reservados.
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative">
          
          {/* Logo on mobile */}
          <div className="lg:hidden absolute top-6 left-6">
            <h1 className="text-xl font-bold font-heading text-foreground tracking-tight">AgendiX</h1>
          </div>

          <div className="w-full max-w-md mt-16 lg:mt-0">
            {/* Progress bar */}
            <div className="mb-10">
              <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>

            {/* Step title */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">
                  {currentStepConfig.icon}
                </span>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">{currentStepConfig.title}</h2>
              </div>
            </div>

            {/* Step content — ID fora do Suspense para WizardPointer encontrar imediatamente */}
            <div
              key={currentStep}
              id={`wizard-step-${currentStep}`}
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <Suspense fallback={<StepLoadingFallback />}>
                {renderCurrentStepContent()}
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </WizardOverlay>
  );
}
