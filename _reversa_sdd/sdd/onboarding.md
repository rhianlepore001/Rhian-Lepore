# Onboarding (onboarding)

## Visão Geral
Sistema de onboarding dual com duas implementações paralelas: um **wizard novo** (2 steps: Boas-vindas + Serviços) persistido na tabela `onboarding_progress` via RPC `upsert_onboarding_progress`, e um **wizard legado** (5 steps) persistido em `business_settings.onboarding_step/onboarding_completed` via RPC `update_onboarding_step`. Inclui onboarding simplificado para staff, SetupCopilot pós-wizard com 6 milestones, guided mode com spotlight/pointer, e ativação condicional via `profiles.activation_completed`.

## Responsabilidades
- Guiar novo owner através de wizard de configuração inicial
- Persistir progresso do wizard (novo: `onboarding_progress`; legado: `business_settings`)
- Verificar completion em múltiplos pontos de entrada (login, ProtectedLayout)
- Fornecer onboarding simplificado para staff
- Guiar setup pós-wizard com 6 milestones (SetupCopilot)
- Destacar elementos da UI via spotlight (WizardPointer)
- Bloquear navegação com focus trap durante wizard
- Auto-completar milestones ao navegar para páginas relevantes

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| company_id | uuid | ID do owner |
| current_step | integer | Step atual (1-5) |
| completed_steps | integer[] | Steps concluídos |
| step_data | jsonb | Dados flexíveis por step |
| business_name | string | Nome do negócio |
| services | Service[] | Serviços cadastrados |
| team_members | TeamMember[] | Profissionais |
| monthly_goal | numeric | Meta mensal |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| OnboardingProgress | object | Progresso persistido |
| SetupStatus | object | Status dos 6 milestones |
| WizardState | object | Estado do reducer |
| GuidedModeState | object | Estado do guided mode |

## Regras de Negócio
- **R85** Wizard novo: 2 steps (Welcome + Services). Wizard legado: 5 steps (BusinessInfo + Services + Team + MonthlyGoal + Success). 🟢
- **R86** Persistência nova: `onboarding_progress` table, merge JSONB com `||`. 🟢
- **R87** Persistência legada: `business_settings.onboarding_step/onboarding_completed`, `GREATEST` para step. 🟢
- **R88** Staff onboarding: saudação + `markTutorialCompleted` → `/`. 🟢
- **R89** SetupCopilot: 6 milestones (services, team, clients, hours, profile, booking, appointment). 🟢
- **R90** Activation: `profiles.activation_completed = true` quando todos milestones completos. 🟢
- **R91** Focus trap: `escapeDeactivates: false` no WizardOverlay. 🟢
- **R92** Guided mode: persistência em `sessionStorage`, spotlight com `MutationObserver`. 🟢
- **R93** Redirect guards: login → verifica `onboarding_progress.is_completed` (fonte canônica); legado `business_settings.onboarding_completed` é compatibilidade temporária. ProtectedLayout → verifica `activation_completed`. 🟢

## Fluxo Principal

### Wizard Novo
1. Owner acessa `/onboarding`
2. `getOnboardingProgress(companyId)`
3. Se `is_completed=true`: `markTutorialCompleted()` → `/`
4. Se `current_step > 1`: restaura progresso
5. Renderiza `WizardEngine` com step atual
6. Step 1 (Welcome): preenche `business_name`
7. `saveOnboardingStep(companyId, 2, [1])`
8. Step 2 (Services): CRUD de serviços
9. `completeOnboarding(companyId)` + `markTutorialCompleted()`
10. Navigate `/`

### Wizard Legado
1. `useOnboardingState` busca `business_settings.onboarding_step`
2. Se `onboarding_completed=true`: `markTutorialCompleted()` → `/`
3. Clamp step: `Math.min(Math.max(step, 1), 5)`
4. Steps 1-5 com navegação
5. `update_onboarding_step(p_user_id, 5, p_completed=true)`

### SetupCopilot
1. Dashboard monta `SetupCopilot`
2. `getSetupStatus(userId)`: Promise.all de 6 queries
3. Se todos completos: `UPDATE profiles SET activation_completed = true`
4. Dispara evento `system-activated`
5. `ActivationBanner` mostra toast (auto-hide 8s)

### Guided Mode
1. Owner clica "Começar" no SetupCopilot
2. `startGuide(stepId)`
3. Lê `WIZARD_TARGETS[stepId]`
4. Salva `last_guided_step` em `onboarding_progress.step_data`
5. `sessionStorage.setItem('guided_mode_state')`
6. `WizardPointer` aplica spotlight
7. `MutationObserver` aguarda elemento
8. Usuário completa ação → `setup-step-completed` event
9. `StandaloneWizardPointer` mostra overlay de sucesso

## Fluxos Alternativos
- **[Wizard já completado]:** Redirect para `/`. 🟢
- **[Staff loga pela primeira vez]:** Redirect para `/staff-onboarding`. 🟢
- **[Owner pula onboarding]:** Não implementado (focus trap impede). 🟢
- **[Elemento alvo do guided mode não existe]:** `MutationObserver` aguarda indefinidamente. 🟡

## Cenários de Borda

### B1 — Dual system conflitante (Resolvido)
- **Condição:** Wizard novo marca `onboarding_progress.is_completed=true`, mas legado tem `onboarding_completed=false`.
- **Decisão validada:** Depreciar wizard legado como fonte de verdade. Fonte canônica: `onboarding_progress.is_completed`. Durante a transição, sincronizar ambos os campos para evitar loop em contas existentes. `business_settings.onboarding_completed` fica apenas como compatibilidade temporária.
- **Comportamento esperado:** Login deve verificar `onboarding_progress.is_completed` primeiro; se true, nunca redirect para `/onboarding`.
- **Impacto:** Loop eliminado após ajuste no guard de login.
- **Risco:** Baixo — requer mudança no `AuthContext`/`ProtectedLayout`.

### B2 — Focus trap impede saída em mobile
- **Condição:** Usuário em mobile com teclado virtual.
- **Comportamento:** `escapeDeactivates: false` impede saída por Escape. Tab pode não funcionar corretamente em mobile.
- **Impacto:** Usuário preso no wizard.
- **Risco:** Baixo — botão "Próximo" sempre visível.

## Dependências
- `lib/supabase.ts` — RPCs `upsert_onboarding_progress`, `update_onboarding_step`
- `contexts/AuthContext.tsx` — `useAuth`
- `focus-trap-react` — focus trapping
- `react-router-dom` — navegação
- `constants/WIZARD_TARGETS.ts` — alvos do guided mode

## Critérios de Aceitação

```gherkin
# Cenário 1: Wizard novo completo
Dado que um owner se registra
Quando acessa /onboarding
E preenche business_name e serviços
Então o sistema marca onboarding como completo
E redireciona para o dashboard

# Cenário 2: SetupCopilot
Dado que o onboarding está completo
Mas não há serviços cadastrados
Quando o owner acessa o dashboard
Então vê SetupCopilot com milestone "services" pendente

# Cenário 3: Guided mode
Dado que o SetupCopilot está ativo
Quando o owner clica "Começar"
Então o sistema destaca o elemento alvo com spotlight
E exibe tooltip com instrução
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Wizard | Must | Primeira experiência |
| SetupCopilot | Should | Ativação |
| Guided mode | Could | UX premium |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/Onboarding.tsx` | `OnboardingInner` | 🟢 |
| `pages/OnboardingWizard.tsx` | `OnboardingWizard` | 🟢 |
| `components/onboarding/WizardContext.tsx` | `WizardReducer` | 🟢 |
| `components/dashboard/SetupCopilot.tsx` | `SetupCopilot` | 🟢 |
| `contexts/GuidedModeContext.tsx` | `GuidedModeProvider` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
