# Task: implement-wizard-engine
> Agent: core-developer | Phase: 2 | elicit: false
> depends_on: [implement-overlay-component]

## Objetivo

Implementar a state machine do wizard (`WizardContext.tsx` + `WizardEngine.tsx`),
a rota `/#/onboarding` no `App.tsx` e a lógica de detecção de primeiro login.

## Arquivos a Criar/Modificar

- **Criar:** `components/onboarding/WizardContext.tsx`
- **Criar:** `components/onboarding/WizardEngine.tsx`
- **Criar:** `lib/onboarding.ts`
- **Criar:** `pages/Onboarding.tsx`
- **Modificar:** `App.tsx` (adicionar rota + lazy import)

## Implementação

### lib/onboarding.ts

```typescript
// lib/onboarding.ts
import { supabase } from './supabase';

export interface OnboardingProgress {
  id: string;
  company_id: string;
  current_step: number;
  completed_steps: number[];
  is_completed: boolean;
  step_data: Record<string, unknown>;
}

export async function getOnboardingProgress(
  companyId: string
): Promise<OnboardingProgress | null> {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (error?.code === 'PGRST116') return null; // not found
  if (error) throw error;
  return data;
}

export async function saveOnboardingStep(
  companyId: string,
  currentStep: number,
  completedSteps: number[],
  stepData: Record<string, unknown> = {}
): Promise<OnboardingProgress> {
  const { data, error } = await supabase
    .rpc('upsert_onboarding_progress', {
      p_company_id: companyId,
      p_current_step: currentStep,
      p_completed_steps: completedSteps,
      p_step_data: stepData,
    });

  if (error) throw error;
  return data;
}

export async function completeOnboarding(
  companyId: string
): Promise<void> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('company_id', companyId);

  if (error) throw error;
}
```

### WizardContext.tsx

```tsx
// components/onboarding/WizardContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  isActive: boolean;
  isCompleted: boolean;
  isLoading: boolean;
}

type WizardAction =
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

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: [...new Set([...state.completedSteps, action.step])],
        currentStep: Math.min(state.currentStep + 1, 5) as WizardStep,
      };
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

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard deve ser usado dentro de WizardProvider');
  return ctx;
}
```

### Modificação em App.tsx

```tsx
// Adicionar lazy import
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

// Adicionar rota dentro do Router
<Route path="/onboarding" element={
  <Suspense fallback={<LoadingFallback />}>
    <Onboarding />
  </Suspense>
} />
```

### Detecção de Primeiro Login em AuthContext

```tsx
// Em AuthContext.tsx — após autenticação bem-sucedida
const progress = await getOnboardingProgress(companyId);
if (!progress || !progress.is_completed) {
  navigate('/#/onboarding');
}
```

## Checklist de Conclusão

- [ ] `WizardContext` exporta `useWizard` hook corretamente
- [ ] `wizardReducer` trata todos os actions sem mutação de state
- [ ] `lib/onboarding.ts` tem todas as funções de persistência
- [ ] Rota `/#/onboarding` adicionada ao `App.tsx`
- [ ] Primeiro login detecta ausência de progresso e redireciona
- [ ] `npm run lint` passa sem warnings
- [ ] `npm run typecheck` passa sem erros
