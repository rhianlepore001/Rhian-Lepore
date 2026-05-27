// components/onboarding/WizardEngine.tsx
import React, { Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Scissors } from 'lucide-react';
import { WizardOverlay } from '@/components/onboarding/WizardOverlay';
import { WizardProgress } from '@/components/onboarding/WizardProgress';
import { useWizard, WizardStep } from '@/components/onboarding/WizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
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
  Icon: React.FC<{ className?: string }>;
}

const WIZARD_STEPS: WizardStepConfig[] = [
  { step: 1, title: 'Boas-vindas', Icon: Sparkles },
  { step: 2, title: 'Seus Serviços', Icon: Scissors },
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
  const { companyId, markTutorialCompleted } = useAuth();
  const navigate = useNavigate();

  const { isBeauty, accent, colors, shadow } = useBrutalTheme();

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
            accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
          />
        );
      case 2:
        return (
          <StepServices
            onNext={() => void completeStep(2)}
            onBack={() => goToStep(1)}
            accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
          />
        );
      default:
        return null;
    }
  }

  return (
    <WizardOverlay isActive={isActive}>
      <div className={`relative z-[9997] min-h-screen pointer-events-auto ${colors.bg} ${colors.text} font-sans overflow-x-hidden transition-colors duration-700`}>

        {/* Background Texture Overlay */}
        <div className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay bg-noise z-[1]" />

        {/* Sophisticated Glows */}
        <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
          <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] ${accent.bgDim}`} />
          <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] bg-black/40`} />
        </div>

        {/* Header */}
        <div className="relative z-10 w-full">
          <div className={`sticky top-0 z-[60] w-full border-b ${colors.bg}/95 ${colors.divider} backdrop-blur-md`}>
            <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent.bgDim}`}>
                  <currentStepConfig.Icon className={`w-4 h-4 ${accent.text}`} />
                </div>
                <h2 className="text-sm font-bold tracking-tight">{currentStepConfig.title}</h2>
              </div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Passo {currentStep} de {TOTAL_STEPS}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-8 pb-24">

          {/* Progress bar */}
          <div className="mb-8">
            <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'} />
          </div>

          {/* Step content */}
          <div
            key={currentStep}
            id={`wizard-step-${currentStep}`}
            className={`${colors.card} ${colors.border} border rounded-2xl backdrop-blur-xl shadow-sm overflow-hidden`}
          >
            <div className="p-6 md:p-8">
              <Suspense fallback={<StepLoadingFallback />}>
                {renderCurrentStepContent()}
              </Suspense>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 right-0 z-[60] border-t ${colors.divider} ${colors.bg}/90 backdrop-blur-2xl">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              © {new Date().getFullYear()} AgendiX
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Configuração Inicial
            </span>
          </div>
        </div>

      </div>
    </WizardOverlay>
  );
}
