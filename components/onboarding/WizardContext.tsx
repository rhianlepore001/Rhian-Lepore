// components/onboarding/WizardContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

export type WizardStep = 1 | 2 | 3 | 4 | 5;

export interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  isActive: boolean;
  isCompleted: boolean;
  isLoading: boolean;
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'COMPLETE_STEP'; step: WizardStep }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'CLOSE_WIZARD' }
  | { type: 'COMPLETE_WIZARD' };

const initialState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  isActive: true,
  isCompleted: false,
  isLoading: false,
};

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'COMPLETE_STEP': {
      const alreadyCompleted = new Set(state.completedSteps);
      alreadyCompleted.add(action.step);
      const nextStep = Math.min((action.step as number) + 1, 5) as WizardStep;
      return {
        ...state,
        completedSteps: Array.from(alreadyCompleted) as WizardStep[],
        currentStep: nextStep,
      };
    }

    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };

    case 'CLOSE_WIZARD':
      return { ...state, isActive: false };

    case 'COMPLETE_WIZARD':
      return { ...state, isCompleted: true, isActive: false };

    default:
      return state;
  }
}

interface WizardContextType {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

const WizardContext = createContext<WizardContextType | null>(null);

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  return (
    <WizardContext.Provider value={{ state, dispatch }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard(): WizardContextType {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error('useWizard deve ser usado dentro de WizardProvider');
  }
  return ctx;
}
