# Plano de Refatoração: Onboarding Wizard
**Data:** 2026-03-23
**Branch:** ux-teste
**Responsável:** Atlas (@analyst) + Dev Squad
**Status:** AGUARDANDO APROVAÇÃO

---

## Contexto

O wizard de onboarding foi implementado em 2 sistemas paralelos e nunca integrado corretamente:

- **Sistema Legado** (`pages/OnboardingWizard.tsx` + `useOnboardingState` + `business_settings` + `update_onboarding_step`)
- **Sistema Novo** (`pages/Onboarding.tsx` + `WizardEngine` + `onboarding_progress` + `upsert_onboarding_progress`)

Os step components (`StepBusinessInfo`, `StepServices`, `StepTeam`, `StepMonthlyGoal`) ainda chamam o sistema legado enquanto o `WizardEngine` gerencia o novo sistema — criando dupla persistência conflitante.

**Evidência visual:** erro `[WizardPointer] Elemento não encontrado: #wizard-step-2` visível no browser.

---

## Fase 1 — P0: Corrigir o Wizard Quebrado
**Esforço estimado: ~3h | Agente: @dev**

### Fix 1.1 — WizardPointer: adicionar retry com MutationObserver

**Arquivo:** `components/onboarding/WizardPointer.tsx`

**Problema:** O `useEffect` roda uma vez quando `target.elementId` muda, mas o elemento ainda não existe no DOM (Suspense ainda carregando). Sem mecanismo de retry.

**Solução:** Adicionar `MutationObserver` para detectar quando o elemento aparece no DOM.

```tsx
// WizardPointer.tsx — substituir useEffect por:
useEffect(() => {
  const POINTER_SIZE = 32;
  const GAP = 12;

  function calculate() {
    const isMobileViewport = window.innerWidth < 768;
    setIsMobile(isMobileViewport);
    const el = document.getElementById(target.elementId);
    if (!el) return false; // retorna false se não encontrou

    const elRect = el.getBoundingClientRect();
    if (elRect.width === 0 && elRect.height === 0) return false;

    setRect(elRect);
    // ... resto do cálculo de posição
    return true;
  }

  // Tentar imediatamente
  const found = calculate();

  // Se não encontrou, observar o DOM até aparecer
  let observer: MutationObserver | null = null;
  if (!found) {
    observer = new MutationObserver(() => {
      const success = calculate();
      if (success) observer?.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Spotlight e resize listener (apenas se encontrou)
  // ... código de spotlight existente

  window.addEventListener('resize', calculate);
  return () => {
    window.removeEventListener('resize', calculate);
    observer?.disconnect();
    // ... cleanup de spotlight
  };
}, [target.elementId, target.position]);
```

### Fix 1.2 — WizardEngine: mover IDs dos steps para fora do Suspense

**Arquivo:** `components/onboarding/WizardEngine.tsx`

**Problema:** O `<div id="wizard-step-N">` está dentro do retorno de `renderCurrentStep()`, que é envolvido pelo `<Suspense>`. Durante o loading, o Suspense substitui TODO o conteúdo pelo fallback.

**Solução:** Separar o container (com o ID) da carga lazy:

```tsx
// ANTES (problemático):
<Suspense fallback={<StepLoadingFallback />}>
  {renderCurrentStep()}  // <div id="wizard-step-2"><StepServices/></div>
</Suspense>

// DEPOIS (correto):
<div id={`wizard-step-${currentStep}`}>
  <Suspense fallback={<StepLoadingFallback />}>
    {renderCurrentStepContent()}  // apenas <StepServices/> sem o wrapper div
  </Suspense>
</div>
```

Renomear `renderCurrentStep()` para `renderCurrentStepContent()` e remover os `<div id="wizard-step-N">` de cada case do switch.

### Fix 1.3 — Remover chamadas ao RPC legado dos step components

**Arquivos:** `StepBusinessInfo.tsx`, `StepServices.tsx`, `StepTeam.tsx`, `StepMonthlyGoal.tsx`

**Problema:** Cada step chama `supabase.rpc('update_onboarding_step', ...)` (sistema legado). O `WizardEngine` já gerencia a persistência via `saveOnboardingStep` (sistema novo). Dupla gravação conflitante.

**Solução:** Remover as chamadas RPC legadas dos step components. Eles devem apenas:
1. Salvar os dados do próprio step (business info, serviços, equipe, meta)
2. Chamar `onNext()` quando concluído

A persistência do progresso fica 100% responsabilidade do `WizardEngine`.

```tsx
// StepBusinessInfo.tsx — remover estas linhas:
await supabase.rpc('update_onboarding_step', {
  p_user_id: user.id,
  p_step: 2,
});

// StepServices.tsx — remover:
await supabase.rpc('update_onboarding_step', { p_user_id: user.id, p_step: 3 });

// StepTeam.tsx — remover:
await supabase.rpc('update_onboarding_step', { p_user_id: user.id, p_step: 4 });

// StepMonthlyGoal.tsx — remover ambas as chamadas:
await supabase.rpc('update_onboarding_step', { p_user_id, p_step: 5, p_completed: true });
```

### Fix 1.4 — `completeOnboarding`: trocar `.update()` por upsert

**Arquivo:** `lib/onboarding.ts`

```ts
// ANTES:
export async function completeOnboarding(companyId: string): Promise<void> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({ is_completed: true, completed_at: new Date().toISOString() })
    .eq('company_id', companyId);
  if (error) throw error;
}

// DEPOIS:
export async function completeOnboarding(companyId: string): Promise<void> {
  const { error } = await supabase
    .from('onboarding_progress')
    .upsert(
      { company_id: companyId, is_completed: true, completed_at: new Date().toISOString() },
      { onConflict: 'company_id' }
    );
  if (error) throw error;
}
```

### Fix 1.5 — StepSuccess: await `onComplete` antes de navegar

**Arquivo:** `components/onboarding/StepSuccess.tsx`

```tsx
// ANTES:
const handleFinish = async (path: string) => {
  await markTutorialCompleted();
  onComplete?.();        // ← sem await
  navigate(path);
};

// DEPOIS:
const handleFinish = async (path: string) => {
  await markTutorialCompleted();
  await onComplete?.();  // ← com await
  navigate(path);
};
```

---

## Fase 2 — P1: Multi-tenant e Segurança
**Esforço estimado: ~4h | Agente: @dev + @data-engineer**

### Fix 2.1 — StepServices: usar `companyId` em vez de `user.id`

**Arquivo:** `components/onboarding/StepServices.tsx`

Usar `companyId` do `useAuth()` para todas as queries:
```tsx
const { user, companyId } = useAuth();

// Substituir todos os .eq('user_id', user.id) por:
.eq('user_id', companyId ?? user?.id)
```

### Fix 2.2 — StepTeam: usar `companyId` + adicionar filtro no delete

**Arquivo:** `components/onboarding/StepTeam.tsx`

```tsx
// Delete com filtro de segurança:
await supabase.from('team_members')
  .delete()
  .eq('id', id)
  .eq('user_id', companyId ?? user?.id);  // ← proteção multi-tenant
```

### Fix 2.3 — StepMonthlyGoal: adicionar `company_id` no upsert

**Arquivo:** `components/onboarding/StepMonthlyGoal.tsx`

### Fix 2.4 — `AuthContext.tutorialCompleted`: mudar default para `false`

**Arquivo:** `contexts/AuthContext.tsx:52`

```tsx
// ANTES:
const [tutorialCompleted, setTutorialCompleted] = useState(true);

// DEPOIS:
const [tutorialCompleted, setTutorialCompleted] = useState(false);
```

---

## Fase 3 — P2: Cleanup e Arquitetura
**Esforço estimado: ~3h | Agente: @dev + @architect**

### Fix 3.1 — WizardOverlay: separar backdrop do container interativo

**Arquivo:** `components/onboarding/WizardOverlay.tsx`

```tsx
// ANTES: container principal com pointer-events-none
<div className="fixed inset-0 ... pointer-events-none" role="dialog">
  {children}
</div>

// DEPOIS: backdrop separado do container interativo
<div className="fixed inset-0 z-[9996]" role="dialog" aria-modal="true">
  {/* Backdrop não-interativo */}
  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm pointer-events-none" />
  {/* Conteúdo interativo */}
  <div className="relative z-10">
    {children}
  </div>
</div>
```

### Fix 3.2 — FocusTrap: corrigir `fallbackFocus`

**Arquivo:** `components/onboarding/WizardOverlay.tsx`

```tsx
<FocusTrap
  focusTrapOptions={{
    allowOutsideClick: false,
    escapeDeactivates: false,
    fallbackFocus: () =>
      (document.querySelector('[data-wizard-panel] input, [data-wizard-panel] button') as HTMLElement)
      ?? (document.querySelector('[data-wizard-panel]') as HTMLElement),
  }}
>
```

### Fix 3.3 — Deprecar sistema legado de onboarding

**Arquivos a remover/arquivar:**
- `pages/OnboardingWizard.tsx` → mover para `docs/archive/`
- `hooks/useOnboardingState.ts` → mover para `docs/archive/`
- Rota `/onboarding-wizard` em `App.tsx` → remover

**Justificativa:** O sistema novo (`pages/Onboarding.tsx` + `WizardEngine`) é multi-tenant correto. O sistema legado usa `user_id` e `business_settings` — incompatível com a arquitetura atual.

### Fix 3.4 — Login Gateway: tornar opcional

**Arquivo:** `pages/Login.tsx`

Remover a Gateway obrigatória ou auto-detectar o tipo de negócio pelo histórico/perfil:
```tsx
// Inicializar com gateway=false por padrão ou detectar do localStorage
const [showGateway, setShowGateway] = useState(false);
```

---

## Resumo de Implementação

| Fix | Arquivo | Prioridade | Esforço |
|-----|---------|-----------|---------|
| 1.1 WizardPointer retry | WizardPointer.tsx | 🔴 P0 | 45min |
| 1.2 IDs fora do Suspense | WizardEngine.tsx | 🔴 P0 | 30min |
| 1.3 Remover RPC legado dos steps | 4 arquivos | 🔴 P0 | 30min |
| 1.4 completeOnboarding upsert | lib/onboarding.ts | 🔴 P0 | 10min |
| 1.5 StepSuccess await | StepSuccess.tsx | 🔴 P0 | 5min |
| 2.1 StepServices companyId | StepServices.tsx | 🟠 P1 | 30min |
| 2.2 StepTeam companyId + delete | StepTeam.tsx | 🟠 P1 | 30min |
| 2.3 StepMonthlyGoal companyId | StepMonthlyGoal.tsx | 🟠 P1 | 20min |
| 2.4 tutorialCompleted default | AuthContext.tsx | 🟠 P1 | 5min |
| 3.1 WizardOverlay pointer-events | WizardOverlay.tsx | 🟡 P2 | 20min |
| 3.2 FocusTrap fallbackFocus | WizardOverlay.tsx | 🟡 P2 | 10min |
| 3.3 Deprecar sistema legado | App.tsx + arquivos | 🟡 P2 | 1h |
| 3.4 Login Gateway opcional | Login.tsx | 🟡 P2 | 20min |

**Total Fase 1 (crítico): ~2h**
**Total Fases 1+2+3: ~10h**

---

## Ordem de Execução Recomendada

```
@dev implementa Fase 1 (Fix 1.1 → 1.5)
  → teste manual no browser
  → @dev implementa Fase 2 (Fix 2.1 → 2.4)
  → npm run lint && npm run typecheck
  → @dev implementa Fase 3 (Fix 3.1 → 3.4)
  → npm run lint && npm run typecheck
  → @devops push + PR
```

---

*Plano gerado por Atlas (@analyst) em 2026-03-23*
