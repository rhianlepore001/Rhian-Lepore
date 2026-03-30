// contexts/GuidedModeContext.tsx
// Gerencia o estado global do wizard guiado do SetupCopilot.
// Persiste via sessionStorage para sobreviver a navegações entre rotas.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { saveOnboardingStep, getOnboardingProgress } from '../lib/onboarding';
import { WizardStepId, WizardTarget, WIZARD_TARGETS } from '../constants/WIZARD_TARGETS';

const SESSION_KEY = 'guided_mode_state';

interface GuidedModeState {
  activeStep: WizardStepId | null;
  targetElementId: string | null;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
  isGuideActive: boolean;
}

interface GuidedModeContextValue extends GuidedModeState {
  startGuide: (stepId: WizardStepId) => void;
  endGuide: () => void;
}

const defaultState: GuidedModeState = {
  activeStep: null,
  targetElementId: null,
  position: 'bottom',
  message: '',
  isGuideActive: false,
};

function readSessionState(): GuidedModeState {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved) as GuidedModeState;
  } catch {
    // sessionStorage indisponível (SSR, iframe restrito, etc.) — graceful degradation
  }
  return defaultState;
}

const GuidedModeContext = createContext<GuidedModeContextValue | null>(null);

export function GuidedModeProvider({ children }: { children: React.ReactNode }) {
  const { companyId } = useAuth();

  // AC6: restaura estado do sessionStorage na inicialização
  const [state, setState] = useState<GuidedModeState>(readSessionState);

  // AC5: sincroniza sessionStorage sempre que o estado muda
  useEffect(() => {
    try {
      if (state.isGuideActive) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // sessionStorage indisponível — continua sem persistência
    }
  }, [state]);

  // AC3: ativa o guide para um step, carregando target de WIZARD_TARGETS
  // AC7: salva last_guided_step em onboarding_progress.step_data
  const startGuide = useCallback(async (stepId: WizardStepId) => {
    const target: WizardTarget = WIZARD_TARGETS[stepId];

    setState({
      activeStep: stepId,
      targetElementId: target.elementId,
      position: target.position,
      message: target.message,
      isGuideActive: true,
    });

    if (!companyId) return;

    try {
      const progress = await getOnboardingProgress(companyId);
      const currentStep = progress?.current_step ?? 1;
      const completedSteps = (progress?.completed_steps ?? []) as number[];
      await saveOnboardingStep(companyId, currentStep, completedSteps, {
        ...(progress?.step_data ?? {}),
        last_guided_step: stepId,
        guided_started: true,
      });
    } catch (err) {
      // AC9 (US-0402): falha no Supabase não bloqueia o guide local
      console.error('[GuidedModeContext] Erro ao salvar last_guided_step:', err);
    }
  }, [companyId]);

  // AC4: desativa o guide e limpa sessionStorage
  const endGuide = useCallback(() => {
    setState(defaultState);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // sessionStorage indisponível
    }
  }, []);

  const value: GuidedModeContextValue = {
    ...state,
    startGuide,
    endGuide,
  };

  return (
    <GuidedModeContext.Provider value={value}>
      {children}
    </GuidedModeContext.Provider>
  );
}

// AC8: hook exportado para consumo pelos componentes
export function useGuidedMode(): GuidedModeContextValue {
  const ctx = useContext(GuidedModeContext);
  if (!ctx) {
    throw new Error('useGuidedMode deve ser usado dentro de GuidedModeProvider');
  }
  return ctx;
}

export type { WizardStepId };
