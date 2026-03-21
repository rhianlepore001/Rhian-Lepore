# QA Report — validate-wizard-flow
> Agent: Quinn (qa-validator) | Data: 2026-03-21 | Squad: onboarding-wizard-squad

---

## 1. Resultado do Typecheck e Lint

| Verificacao | Resultado | Detalhe |
|-------------|-----------|---------|
| `npm run typecheck` | **PASS** | 0 erros TypeScript |
| `npm run lint` | **NAO EXECUTADO** | Permissao bash negada no ambiente. Analise estatica manual realizada — ver secao 5. |

> Nota: O typecheck passou sem erros, confirmado pela saida do comando. O lint nao pudo ser executado via Bash nesta sessao; a analise de ESLint foi realizada manualmente via inspecao do codigo-fonte.

---

## 2. Checklist de Validacao

### 1. Happy Path Completo

| Item | Status | Observacao |
|------|--------|------------|
| 1. Login novo usuario → wizard abre automaticamente | ✅ PASS | `AuthContext` define `tutorialCompleted = false` para novos perfis. `ProtectedLayout` redireciona para `/onboarding`. `Onboarding.tsx` monta `WizardProvider` + `WizardEngine`. |
| 2. Wizard abre automaticamente | ✅ PASS | `isActive: true` no `initialState` de `WizardContext`. `WizardOverlay` renderiza quando `isActive=true`. |
| 3. Step 1: preencher dados → Continuar → avanca Step 2 | ⚠️ CONCERN | `StepBusinessInfo` chama `update_onboarding_step` (RPC legacy, nao `upsert_onboarding_progress`). Avanca via `onNext()` do `WizardEngine` que chama `completeStep(1)` e depois `saveOnboardingStep`. **Dupla persistencia** com RPC distintos — potencial inconsistencia de estado. |
| 4. Step 2: servico cadastrado → avanca Step 3 | ⚠️ CONCERN | Mesma questao: `StepServices` usa `update_onboarding_step` (legacy). Botao Continuar desabilitado se nenhum servico cadastrado — comportamento correto, mas sem mensagem de validacao. |
| 5. Step 3: profissional → avanca Step 4 | ⚠️ CONCERN | Idem: `StepTeam` usa `update_onboarding_step` (legacy). |
| 6. Step 4: meta mensal → avanca Step 5 | ✅ PASS | `StepMonthlyGoal` salva corretamente em `monthly_goals`, tem skip funcional. |
| 7. Step 5: Concluir → redireciona Dashboard | ✅ PASS | `StepSuccess.handleFinish()` chama `markTutorialCompleted()` + `navigate(path)`. Fluxo correto. |
| 8. Toast de sucesso | ❌ FAIL | `StepSuccess` **NAO exibe toast**. Nao ha chamada a `useAlerts()` ou similar. Usuario conclui sem feedback visual de confirmacao. |
| 9. Recarregar pagina → wizard nao reaparece | ✅ PASS | `markTutorialCompleted()` define `tutorial_completed = true` em `profiles`. `AuthContext` le esse valor e `ProtectedLayout` nao redireciona mais. `Onboarding.tsx` tambem verifica `is_completed` em `onboarding_progress`. |

### 2. Validacoes de Formulario

| Item | Status | Observacao |
|------|--------|------------|
| Step 1: submit sem nome → erro exibido | ❌ FAIL | Input tem `required`, mas o form nao exibe mensagem de erro customizada visivel. Depende do comportamento nativo do browser (HTML5 validation), que pode ser silenciado em alguns contextos. Nao ha `<span>` de erro ou estado de validacao controlado. |
| Step 2: submit sem preco → erro exibido | ❌ FAIL | `ServiceModal` gerencia a validacao internamente — nao examinado neste QA gate. O botao Continuar no Step 2 fica desabilitado se `services.length === 0`, mas sem mensagem explicativa. |
| Step 4: data no passado → erro de validacao | N/A | Step 4 nao tem campo de data — e uma meta monetaria mensal. O checklist menciona `data no passado`, mas o step implementado e `StepMonthlyGoal` (campo numerico). **Discrepancia entre spec do checklist e implementacao real.** |
| Step 5: slug invalido → slug normalizado | N/A | Step 5 (`StepSuccess`) nao tem campo de slug. A spec originalmente previa confirmacao de slug, mas a implementacao usa apenas CTAs de navegacao. **Discrepancia entre spec e implementacao.** |
| Step 5: slug duplicado → erro | N/A | Idem — nao implementado neste fluxo. |

### 3. Persistencia

| Item | Status | Observacao |
|------|--------|------------|
| Completar Step 2 → fechar browser → retomar no Step 3 | ⚠️ CONCERN | `Onboarding.tsx` verifica `onboarding_progress.is_completed`, mas **nao le `current_step`** para restaurar o wizard no ponto correto. `WizardContext` sempre inicia em `currentStep: 1`. Retomada de progresso **nao funciona** — usuario reinicia do Step 1. |
| Tabela `onboarding_progress`: `current_step = 3, completed_steps = [1, 2]` | ⚠️ CONCERN | A tabela e gravada corretamente por `saveOnboardingStep`/`upsert_onboarding_progress`. Porem, como `Onboarding.tsx` ignora `current_step` ao montar, o dado salvo e ignorado. |
| Completar wizard → `is_completed = true` e `completed_at` preenchido | ✅ PASS | `completeOnboarding()` em `lib/onboarding.ts` faz `UPDATE` com `is_completed: true` e `completed_at: new Date().toISOString()`. Correto. |

### 4. Overlay Visual

| Item | Status | Observacao |
|------|--------|------------|
| Overlay escurece o fundo (rgba(0,0,0,0.75)) | ✅ PASS | `WizardOverlay`: `bg-black/75 backdrop-blur-sm`. Correto. |
| Spotlight no elemento alvo | ✅ PASS | `WizardPointer` aplica `boxShadow: '0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px #F59E0B'` via `data-wizard-spotlight`. Tecnica valida. |
| Pointer (seta) aponta para elemento correto | ⚠️ CONCERN | O pointer aponta para elementos `#wizard-step-{N}` que sao os proprios containers do step renderizado dentro do overlay. Como o overlay e `fixed inset-0`, os elementos sempre existem, mas a seta aponta para si mesma dentro do painel — nao para elementos externos da UI. O design de spotlight nao destaca elementos **fora** do wizard. |
| Animacao de bounce no pointer | ❌ FAIL | As animacoes `wizard-pointer-bounce`, `wizard-pointer-bounce-x` e `wizard-pulse` usadas com sintaxe Tailwind `animate-[...]` **nao estao registradas** em nenhum lugar: nao ha `tailwind.config.js/ts` no projeto, e o `tailwind.config` inline em `index.html` nao inclui esses keyframes. As classes serao ignoradas silenciosamente pelo Tailwind CDN. |
| Transicao entre steps | ⚠️ CONCERN | Nao ha animacao de transicao entre steps. O `Suspense` cobre o loading, mas nao ha `slide-left` ou similar. |
| Progress bar atualiza (20% → 40% → ...) | ✅ PASS | `WizardProgress` calcula `(currentStep / totalSteps) * 100` corretamente. Step 1 = 20%, Step 2 = 40%, ..., Step 5 = 100%. |

### 5. Responsividade

| Item | Status | Observacao |
|------|--------|------------|
| Mobile 380px: wizard no bottom (bottom sheet) | ⚠️ CONCERN | O layout usa `flex flex-col items-center justify-center min-h-screen` — centraliza verticalmente, nao implementa um bottom sheet. |
| Mobile 380px: pointer → pulsing circle | ✅ PASS | `WizardPointer` detecta `window.innerWidth < 768` e renderiza o circulo pulsante. Logica presente. Porem a animacao `wizard-pulse` nao esta registrada (ver item anterior). |
| Tablet 768px: card centralizado | ✅ PASS | Layout `max-w-lg` centralizado funciona. |
| Desktop 1024px+: card proximo ao elemento alvo | ⚠️ CONCERN | O card e sempre centralizado via `justify-center`. Nao ha posicionamento dinamico proximo ao elemento alvo no desktop. |
| Touch targets ≥ 44x44px | ✅ PASS | Botoes usam `py-4` (padding vertical 16px) + texto largo. Estimativa de altura adequada para touch targets. |

### 6. Acessibilidade

| Item | Status | Observacao |
|------|--------|------------|
| Overlay tem `role="dialog"` e `aria-modal="true"` | ✅ PASS | `WizardOverlay.tsx` linha 16-17: `role="dialog" aria-modal="true"`. Correto. |
| Todos os botoes tem `aria-label` descritivo | ❌ FAIL | Os botoes de navegacao ("Continuar", "Voltar", "Pular por agora") nao tem `aria-label`. Os botoes CTA no `StepSuccess` tambem nao. Apenas elementos decorativos tem `aria-hidden="true"`. |
| Focus trap: Tab circula dentro do wizard panel | ❌ FAIL | Nenhum foco trap implementado. O `WizardOverlay` tem `pointer-events-none` no container root, apenas o child `div` tem `pointer-events-auto`. Nao ha `useFocusTrap` ou equivalente em nenhum componente do wizard. O projeto ja implementou focus trap em outros modais (US-031), mas nao no wizard. |
| Esc fecha/pula wizard | ❌ FAIL | Nenhum `keydown` handler para ESC em `WizardOverlay` ou `WizardEngine`. |
| Contraste de texto ≥ 4.5:1 | ✅ PASS | Amber-400 (#FBBF24) sobre preto (#000000) = ratio ~8.7:1. Adequado. Texto branco sobre neutro-800 tambem adequado. |
| Screen reader anuncia "Step X de 5" | ✅ PASS | `WizardProgress` tem `role="progressbar"` com `aria-label="Passo X de Y"`. O texto visivel tambem e exibido. |

### 7. Seguranca e Isolamento

| Item | Status | Observacao |
|------|--------|------------|
| `company_id` nao aparece em URL durante o wizard | ✅ PASS | A rota `/onboarding` nao expoe `company_id`. Os dados sao obtidos do contexto de autenticacao. |
| Query de outra empresa retorna 0 rows | ✅ PASS | RLS SELECT policy em `onboarding_progress` filtra por `company_id` via `profiles WHERE id = auth.uid()`. Correto. |
| Inserir com `company_id` externo → RLS bloqueia | ✅ PASS | RLS INSERT policy com `WITH CHECK` identico. Funcao `upsert_onboarding_progress` valida `v_caller_company_id != p_company_id` e lanca excecao. Dupla camada de seguranca. |

---

## 3. Bugs e Issues Encontrados

### P0 — Critico (bloqueante)

| ID | Arquivo | Descricao | Impacto |
|----|---------|-----------|---------|
| P0-01 | `pages/Onboarding.tsx` | **Retomada de progresso nao funciona.** O useEffect verifica `is_completed` mas nunca le `current_step` de `onboarding_progress`. `WizardContext` inicia sempre em `currentStep: 1`. Usuario que completou 2 steps e voltou ira recomecar do zero. | Happy path interrompido; persistencia gravada mas nao consumida. |
| P0-02 | `components/onboarding/WizardPointer.tsx`, `index.html` | **Animacoes CSS nao registradas.** `wizard-pointer-bounce`, `wizard-pointer-bounce-x` e `wizard-pulse` sao usadas com `animate-[...]` do Tailwind mas nao estao nos `keyframes` do config inline em `index.html`. Tailwind CDN nao reconhece classes arbitrarias sem JIT local. As animacoes simplesmente nao ocorrem. | Experiencia visual degradada; o pointer fica estatico, sem bounce. |

### P1 — Grave (deve corrigir antes do merge)

| ID | Arquivo | Descricao | Impacto |
|----|---------|-----------|---------|
| P1-01 | `components/onboarding/StepSuccess.tsx` | **Nenhum toast de sucesso.** O step final nao exibe nenhum feedback visual de conclusao alem do proprio layout. `AlertsContext` nao e invocado. | UX degradada; usuario pode nao perceber que o setup foi concluido. |
| P1-02 | `components/onboarding/WizardOverlay.tsx` | **Nenhum focus trap implementado.** Tab navega para fora do wizard enquanto o overlay esta ativo. Isso e regressao em relacao ao US-031 (focus trap em modais) que ja foi implementado. | Falha WCAG 2.1 SC 2.1.2 (No Keyboard Trap) e SC 2.4.3 (Focus Order). |
| P1-03 | Multiplos steps (StepServices, StepTeam, StepMonthlyGoal, StepBusinessInfo) | **Dupla persistencia / RPC duplicado.** Os steps chamam `update_onboarding_step` (RPC legado em `business_settings`) **e** o `WizardEngine` chama `upsert_onboarding_progress` (nova tabela). O estado de onboarding e gravado em dois lugares com logica distinta. Potencial dessincronizacao. | Corrompimento de dados de onboarding em producao. |
| P1-04 | `components/onboarding/StepBusinessInfo.tsx`, `StepServices.tsx`, `StepTeam.tsx`, `StepMonthlyGoal.tsx` | **Imports relativos (`../../`) ao inves de `@/` alias.** O padrao do projeto e `@/` (ver CLAUDE.md e outros componentes do wizard engine). Steps usam caminhos relativos inconsistentes. | Inconsistencia de padrao; pode quebrar se os arquivos forem movidos. |

### P2 — Menor (concern, pode fazer merge com nota)

| ID | Arquivo | Descricao | Impacto |
|----|---------|-----------|---------|
| P2-01 | `components/onboarding/StepServices.tsx`, `StepTeam.tsx` | **`useState<any[]>`** sem tipo definido. Viola boas praticas de TypeScript. | Menor — typecheck passa mas sem seguranca de tipos. |
| P2-02 | `components/onboarding/StepBusinessInfo.tsx`, `StepMonthlyGoal.tsx` | **Labels sem `htmlFor`** correspondente ao `id` do input. `<label>` nao esta programaticamente vinculada ao controle. | Falha WCAG 2.1 SC 1.3.1 (Info and Relationships) e SC 4.1.2. |
| P2-03 | `components/onboarding/WizardEngine.tsx` linha 169 | **`StepSuccess` recebe apenas `accentColor`** — sem `onNext` prop. O step completa o wizard via `markTutorialCompleted()` internamente sem sinalizar ao `WizardEngine`. A acao `COMPLETE_WIZARD` nunca e disparada para o Step 5 via `completeStep(5)`. O `completeOnboarding(companyId)` em `lib/onboarding.ts` nunca e chamado para o step 5. | Tabela `onboarding_progress` permanece com `is_completed = false` apos conclusao (apenas `profiles.tutorial_completed` e atualizado). |
| P2-04 | Checklist `validate-wizard-flow.md` | **Spec desatualizada.** O checklist menciona Step 5 com campo "slug" e Step 4 com "data no passado", mas a implementacao real e Step 4 = meta monetaria e Step 5 = CTAs de navegacao. Requer atualizacao do documento. | Documentacao incorreta. |
| P2-05 | `components/onboarding/WizardEngine.tsx` | **Nenhum handler para ESC.** Overlay `role="dialog"` sem `onKeyDown` para fechar ao pressionar Escape. | WCAG 2.1 SC 2.1.2 parcial. |

---

## 4. Verificacao do Fluxo Completo

```
[Login] → AuthContext.fetchProfileData() → tutorialCompleted = false
    ↓
ProtectedLayout → <Navigate to="/onboarding" replace />
    ↓
Onboarding.tsx → WizardProvider → OnboardingInner
    ↓
useEffect → getOnboardingProgress(companyId)
    → is_completed = false → permanece na pagina
    → [BUG P0-01] current_step IGNORADO → WizardEngine inicia em step 1
    ↓
WizardEngine → WizardOverlay(isActive=true) → renderCurrentStep()
    ↓
Step 1 → StepBusinessInfo.handleSubmit()
    → [BUG P1-03] update_onboarding_step (legacy) + onNext()
    → completeStep(1) → COMPLETE_STEP dispatch → currentStep=2
    → saveOnboardingStep(companyId, 2, [1]) → upsert_onboarding_progress
    ↓
Step 2 → StepServices.handleContinue()
    → [BUG P1-03] update_onboarding_step (legacy) + onNext()
    → completeStep(2) → currentStep=3 → saveOnboardingStep
    ↓
Step 3 → StepTeam.handleContinue() → idem
    ↓
Step 4 → StepMonthlyGoal.handleSubmit()
    → salva monthly_goals
    → [BUG P1-03] update_onboarding_step (legacy) + onNext()
    → completeStep(4) → currentStep=5 → saveOnboardingStep
    ↓
Step 5 → StepSuccess → usuario clica CTA
    → markTutorialCompleted() → profiles.tutorial_completed = true
    → navigate(path)
    → [BUG P2-03] completeOnboarding() NUNCA e chamado
    → onboarding_progress.is_completed permanece FALSE
    ↓
Dashboard carrega → tutorialCompleted = true → sem redirecionamento
```

**Conclusao do fluxo:** O happy path funciona para o usuario (ele chega ao dashboard), mas com 2 bugs criticos (P0-01: retomada quebrada; P2-03: `is_completed` nao atualizado na nova tabela) e 1 grave (P1-03: dupla persistencia).

---

## 5. Analise Estatica de Lint (Manual)

Com base na inspecao do codigo, os seguintes problemas de lint sao esperados:

| Arquivo | Regra Provavel | Detalhe |
|---------|---------------|---------|
| `StepServices.tsx:15-16` | `@typescript-eslint/no-explicit-any` | `useState<any[]>()` |
| `StepTeam.tsx:16,20` | `@typescript-eslint/no-explicit-any` | `useState<any[]>()`, `useState<any>` |
| `StepSuccess.tsx:5` | `no-unused-vars` potencial | `BrutalButton` importado mas nao utilizado em nenhum lugar do JSX renderizado |
| Todos os steps | `import/order` | Imports relativos `../../` em vez de `@/` |

---

## 6. Verificacao de Seguranca

| Verificacao | Status | Detalhe |
|-------------|--------|---------|
| `company_id` nunca de URL/form | ✅ PASS | `WizardEngine` extrai `companyId` de `useAuth()` (contexto de sessao). |
| Funcao SECURITY DEFINER valida `company_id` vs `auth.uid()` | ✅ PASS | `upsert_onboarding_progress` verifica `v_caller_company_id != p_company_id` com RAISE EXCEPTION. |
| RLS SELECT/INSERT/UPDATE corretos | ✅ PASS | 3 policies corretas em `20260320_onboarding_wizard.sql`. |
| Ausencia de policy DELETE | ⚠️ CONCERN | Nenhuma policy DELETE na tabela `onboarding_progress`. Por padrao (RLS ativo), DELETE e bloqueado para `authenticated` — comportamento correto, mas deveria ser documentado explicitamente. |
| REVOKE PUBLIC na funcao | ✅ PASS | `REVOKE ALL ON FUNCTION upsert_onboarding_progress FROM PUBLIC; GRANT EXECUTE TO authenticated;`. Correto. |

---

## 7. Veredito Final

**FAIL**

### Justificativa

O sistema possui **2 bugs P0** que comprometem funcionalidades core:

1. **P0-01** — Retomada de progresso quebrada: a persistencia em `onboarding_progress` e gravada mas nunca lida ao reabrir o wizard. O usuario sempre reinicia do Step 1, tornando a feature de persistencia inutilizavel.

2. **P0-02** — Animacoes CSS ausentes: as 3 animacoes customizadas do pointer/spotlight nao estao registradas no Tailwind config, fazendo o elemento visual mais importante do wizard (o pointer com bounce) ficar estatico.

Adicionalmente, **1 bug P1 critico** (dupla persistencia em RPCs distintos com logica dessincronizada) e **1 bug P2 grave** (tabela `onboarding_progress.is_completed` nunca atualizada para o step final) comprometem a integridade dos dados.

---

## 8. Correcoes Necessarias para Aprovacao

### Obrigatorio (P0 — bloqueante)

1. **[P0-01] Restaurar `current_step` ao montar o wizard**
   - Em `pages/Onboarding.tsx`, apos `getOnboardingProgress()`, se `progress && !progress.is_completed && progress.current_step > 1`, fazer `dispatch({ type: 'SET_STEP', step: progress.current_step as WizardStep })`.
   - Requer que `dispatch` seja acessivel via `useWizard()` em `OnboardingInner`, ou que a logica de restauracao seja passada como prop ao `WizardEngine`.

2. **[P0-02] Registrar keyframes das animacoes do wizard**
   - Adicionar `wizard-pointer-bounce`, `wizard-pointer-bounce-x` e `wizard-pulse` ao bloco `keyframes` e `animation` do `tailwind.config` inline em `index.html`, conforme especificado em `docs/onboarding-overlay-spec.md` linhas 452-558.

### Obrigatorio (P1 — grave)

3. **[P1-01] Exibir toast de sucesso no StepSuccess**
   - Importar `useAlerts` e disparar toast de sucesso antes de navegar.

4. **[P1-02] Implementar focus trap no WizardOverlay**
   - Reutilizar o hook de focus trap ja implementado em US-031 (referenciado em `components/onboarding/` vizinhanca).

5. **[P1-03] Eliminar dupla persistencia**
   - Remover chamadas a `update_onboarding_step` (RPC legado) dos steps. A persistencia deve ser centralizada em `WizardEngine.completeStep()` via `upsert_onboarding_progress`. Os steps devem apenas chamar `onNext()`.

6. **[P2-03 → reclassificado P1] Chamar `completeOnboarding()` no Step 5**
   - `StepSuccess` deve receber `onNext?: () => void` ou o `WizardEngine` deve interceptar a conclusao do Step 5. `completeOnboarding(companyId)` precisa ser chamado para que `onboarding_progress.is_completed = true`.

### Recomendado (P2 — menor)

7. **[P2-01] Tipar corretamente os arrays de estado** em `StepServices` e `StepTeam`.
8. **[P2-02] Adicionar `htmlFor` + `id` nos inputs** de `StepBusinessInfo` e `StepMonthlyGoal`.
9. **[P2-04] Atualizar checklist de validacao** (`validate-wizard-flow.md`) para refletir a implementacao real (Step 4 = meta, Step 5 = CTAs sem slug).
10. **[P2-05] Adicionar handler ESC** no `WizardOverlay` ou `WizardEngine`.
11. **[P1-04] Padronizar imports** para `@/` em todos os componentes de step.

---

*Relatorio gerado por Quinn — QA Validator — onboarding-wizard-squad — 2026-03-21*
