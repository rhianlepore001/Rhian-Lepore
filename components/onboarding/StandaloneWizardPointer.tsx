import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useGuidedMode } from '../../contexts/GuidedModeContext';
import { WizardPointer } from './WizardPointer';
import { Check, ChevronRight } from 'lucide-react';
import { getSetupStatus } from '../../lib/onboarding';
import { useAuth } from '../../contexts/AuthContext';
import { WIZARD_TARGETS, WizardStepId } from '../../constants/WIZARD_TARGETS';
import { useNavigate } from 'react-router-dom';

const STEP_PRIORITY: WizardStepId[] = ['services', 'team', 'hours', 'profile', 'booking', 'appointment'];

export function StandaloneWizardPointer() {
  const { isGuideActive, targetElementId, position, message, endGuide, activeStep } = useGuidedMode();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showSuccess, setShowSuccess] = useState(false);
  const [toastData, setToastData] = useState<{ stepId: string; nextStepId: WizardStepId | null } | null>(null);

  const [renderState, setRenderState] = useState<{ active: boolean; exiting: boolean }>({ active: false, exiting: false });

  useEffect(() => {
    if (isGuideActive) {
      setRenderState({ active: true, exiting: false });
    } else if (renderState.active) {
      setRenderState({ active: true, exiting: true });
      const t = setTimeout(() => {
        setRenderState({ active: false, exiting: false });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isGuideActive, renderState.active]);

  useEffect(() => {
    // Only listen if a guide is active, to not randomly trigger on standalone pages
    if (!isGuideActive) return;

    const handler = async (e: CustomEvent<{ stepId: string }>) => {
      if (e.detail.stepId === activeStep) {
        setShowSuccess(true);
        
        // Calcular próximo passo silenciosamente
        let nextPending: WizardStepId | null = null;
        if (user) {
          try {
            const status = await getSetupStatus(user.id);
            const isWizardStepComplete = (id: WizardStepId): boolean => {
                switch (id) {
                    case 'services': return status.hasServices;
                    case 'team': return status.hasTeam;
                    case 'hours': return status.hasBusinessHours;
                    case 'profile': return false; // Perfil não é tracked por bool no getSetupStatus original
                    case 'booking': return status.hasBookingSlug;
                    case 'appointment': return status.hasAppointments;
                    default: return false;
                }
            };
            
            // Procura o próximo que não está completo e que não seja o atual que acabou de terminar
            nextPending = STEP_PRIORITY.find(id => !isWizardStepComplete(id) && id !== e.detail.stepId) ?? null;
          } catch (err) {
            console.error('Failed to get setup status', err);
          }
        }

        setTimeout(() => {
          setShowSuccess(false);
          endGuide();
          // Renderiza toast após o pointer desaparecer
          setToastData({ stepId: e.detail.stepId, nextStepId: nextPending });
          
          // Toast exibe por 6 segundos
          setTimeout(() => setToastData(null), 6000);
        }, 1500);
      }
    };
    
    window.addEventListener('setup-step-completed' as any, handler as any);
    return () => window.removeEventListener('setup-step-completed' as any, handler as any);
  }, [activeStep, endGuide, user, isGuideActive]);

  return ReactDOM.createPortal(
    <>
      {renderState.active && targetElementId && !showSuccess && (
        <WizardPointer
          target={{ elementId: targetElementId, position, message }}
          isExiting={renderState.exiting}
        />
      )}
      {showSuccess && targetElementId && (
        <SuccessOverlay targetElementId={targetElementId} />
      )}
      {toastData && (
        <OnboardingToast data={toastData} onClose={() => setToastData(null)} onGoDashboard={() => {
            setToastData(null);
            navigate('/');
        }} />
      )}
    </>,
    document.body
  );
}

function SuccessOverlay({ targetElementId }: { targetElementId: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const calculateRect = () => {
      const el = document.getElementById(targetElementId);
      if (!el) return;
      setRect(el.getBoundingClientRect());
    };

    calculateRect();
    window.addEventListener('resize', calculateRect);
    return () => window.removeEventListener('resize', calculateRect);
  }, [targetElementId]);

  if (!rect) return null;

  return (
    <div
      className="fixed z-[9999] bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg animate-check-complete"
      style={{
        top: rect.top + rect.height / 2 - 24,
        left: rect.left + rect.width / 2 - 24,
        width: 48,
        height: 48,
      }}
    >
      <Check className="w-8 h-8" strokeWidth={3} />
    </div>
  );
}

const STEP_LABELS: Record<WizardStepId, string> = {
  services: 'Serviços',
  team: 'Equipe',
  hours: 'Horários',
  profile: 'Perfil',
  booking: 'Link de Agendamento',
  appointment: 'Primeiro Agendamento',
};

function OnboardingToast({ 
  data, 
  onClose,
  onGoDashboard
}: { 
  data: { stepId: string; nextStepId: WizardStepId | null };
  onClose: () => void;
  onGoDashboard: () => void;
}) {
  const stepName = STEP_LABELS[data.stepId as WizardStepId] || data.stepId;
  const nextStepName = data.nextStepId ? STEP_LABELS[data.nextStepId as WizardStepId] : null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] bg-surface bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-5 min-w-[320px] max-w-sm animate-in slide-in-from-bottom-6 fade-in duration-300 ease-out">
      <div className="flex items-start gap-4">
        <div className="bg-green-500/20 p-2 rounded-full mt-1">
          <Check className="w-5 h-5 text-green-500" strokeWidth={3} />
        </div>
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm">✓ {stepName} concluído!</h4>
          {nextStepName ? (
            <p className="text-gray-400 text-sm mt-1">Próximo: {nextStepName}</p>
          ) : (
            <p className="text-gray-400 text-sm mt-1">Você está quase lá!</p>
          )}
          <button 
            onClick={onGoDashboard}
            className="mt-4 text-amber-500 hover:text-amber-400 text-sm font-medium flex items-center gap-1 transition-colors"
          >
            Voltar ao dashboard <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
