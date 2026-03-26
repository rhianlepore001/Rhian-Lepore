# SM Handoff — Onboarding Wizard Refactor
**Data:** 2026-03-26
**Squad:** setup-wizard-squad
**Branch base:** `ux-teste` → `feature/onboarding-wizard-refactor`
**Status:** Pronto para @sm *create-story

---

## Contexto Estratégico

### Problema Identificado (Atlas Brief)
O `WizardEngine` atual bloqueia o dashboard com um overlay de 5 steps obrigatórios. O `StepBusinessInfo` (Step 1) repete dados já coletados no registro (`fullName`, `businessName`, `phone`). A tecnologia de `WizardPointer` — que inclui spotlight, seta animada bouncing e MutationObserver — existe e funciona, mas está presa no onboarding inicial ao invés de estar onde o usuário precisa: **dentro do dashboard**.

### Visão do Produto
Transformar o `SetupCopilot` (hoje uma lista passiva de 6 itens) em um **wizard guiado real**: ao clicar em um step, o sistema navega para a página correta e uma seta animada aponta exatamente para onde o usuário precisa agir — com o restante da tela em spotlight escurecido.

### Decisões do Produto (confirmadas pelo PO)
| Decisão | Escolha |
|---------|---------|
| Activation Event | Primeiro agendamento criado |
| Wizard na 1ª visita | Inicia automaticamente (com opção de pular) |
| Retomada de sessão | Retoma do último step incompleto |
| Solo vs Equipe | Step de equipe opcional para todos (sem distinção) |

### Decisões Técnicas (squad)
| Decisão | Resolução |
|---------|-----------|
| Overflow hidden no spotlight | WizardPointer usa `position: fixed` — imune ao clip |
| Persistência do guided mode | `sessionStorage` + `onboarding_progress.step_data` |
| Animação mobile | `prefers-reduced-motion` + disable infinite em hw lento |
| Detecção de conclusão | Custom event `setup-step-completed` por página |

---

## Artefatos Existentes (reutilizar)

| Arquivo | Status | Uso |
|---------|--------|-----|
| `components/onboarding/WizardPointer.tsx` | ✅ Existe | Extrair do overlay, tornar standalone |
| `components/onboarding/WizardOverlay.tsx` | ✅ Existe | Manter apenas para fallback |
| `components/dashboard/SetupCopilot.tsx` | ✅ Existe | Refatorar para guided mode |
| `lib/onboarding.ts` | ✅ Existe | Estender `step_data` schema |
| `onboarding_progress` (Supabase) | ✅ Existe | Adicionar campos: `last_guided_step`, `guided_dismissed_at`, `guided_started` |

---

## Mapa de Dependências

```
STORY-01 (Simplificar Onboarding) ─────────────────────────────────────┐
STORY-02 (GuidedModeContext) ──────────┐                               │
                                       ▼                               │
                              STORY-03 + STORY-04                      │
                                       │ ◄─────────────────────────────┘
                                       ▼
                                  STORY-05
                                       ▼
                                  STORY-06
                                  ▼       ▼
                            STORY-07  STORY-08
                                          ▼
                                  STORY-09 + STORY-10
```

---

## Stories

---

### STORY-01 — Simplificar Onboarding Inicial
**Esforço:** 5h | **Blocker:** nenhum | **Paralela com:** STORY-02
**Lead:** @dev

**Contexto:**
O `WizardEngine` atual tem 5 steps com overlay bloqueante. `StepBusinessInfo` (Step 1) repete dados já coletados no registro. A proposta é reduzir o onboarding para 1 tela de boas-vindas + 1 step essencial (primeiro serviço).

**Escopo de alteração:**
- Remover `StepBusinessInfo` do wizard (dados já existem em `profiles`)
- Remover `StepTeam` e `StepMonthlyGoal` do fluxo obrigatório
- Substituir os 5 steps por **1 tela de boas-vindas** + nome do negócio pré-preenchido + botão "Entrar no Dashboard"
- Preservar apenas `StepServices` como step funcional antes de liberar o dashboard
- Após 1 serviço cadastrado → redirecionar para `/#/` com `SetupCopilot` visível

**Arquivos a modificar:**
- `components/onboarding/WizardEngine.tsx` — remover steps 1, 3, 4
- `components/onboarding/StepBusinessInfo.tsx` — substituir por tela de boas-vindas simples
- `lib/onboarding.ts` — ajustar lógica de `saveOnboardingStep`

**Critérios de aceite:**
```gherkin
Scenario: Novo usuário acessa o onboarding
  Given um usuário que acabou de se registrar
  When é redirecionado para /onboarding
  Then vê apenas uma tela de boas-vindas com nome do negócio pré-preenchido
    And um único passo de "Cadastrar primeiro serviço"
    And nenhum overlay bloqueante após cadastrar o serviço

Scenario: Onboarding mínimo concluído
  Given o usuário cadastrou ao menos 1 serviço
  When clica em "Entrar no Dashboard"
  Then é redirecionado para /#/ com SetupCopilot visível

Scenario: Acesso direto ao dashboard sem onboarding
  Given o usuário tenta acessar /#/ sem completar o onboarding
  When a rota verifica o status do onboarding
  Then é redirecionado de volta para /onboarding
```

---

### STORY-02 — GuidedModeContext (estado global do wizard)
**Esforço:** 4h | **Blocker:** nenhum | **Paralela com:** STORY-01
**Lead:** @dev

**Contexto:**
O wizard guiado precisa sobreviver à navegação entre páginas (ex: SetupCopilot ativa o guia, usuário vai para `/configuracoes/agendamento`, o pointer continua ativo). Um Context global gerencia esse estado.

**Criar:** `contexts/GuidedModeContext.tsx`

```typescript
interface GuidedModeState {
  activeStep: string | null;          // ex: "hours", "services", "profile"
  targetElementId: string | null;     // ex: "business-hours-section"
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
  isGuideActive: boolean;
}

interface GuidedModeActions {
  startGuide: (stepId: string) => void;
  endGuide: () => void;
}
```

**Comportamento:**
- Persistência via `sessionStorage` (sobrevive à navegação, perde ao fechar o browser)
- Ao inicializar o app: verificar `sessionStorage` e restaurar estado pendente
- Ao encerrar guided mode: limpar `sessionStorage`
- Integrar com `onboarding_progress.step_data` para persistência entre sessões (campo: `last_guided_step`)

**Arquivos a criar/modificar:**
- `contexts/GuidedModeContext.tsx` — novo
- `App.tsx` — adicionar `GuidedModeProvider` no wrapper

**Critérios de aceite:**
```gherkin
Scenario: Persistência durante navegação
  Given GuidedModeContext está ativo para o step "hours"
  When o usuário navega de /configuracoes/servicos para /configuracoes/agendamento
  Then o contexto mantém activeStep = "hours" sem reset

Scenario: Persistência entre sessões
  Given o usuário fecha o browser com guided mode ativo no step "hours"
  When retorna ao dashboard em nova sessão
  Then onboarding_progress.step_data contém last_guided_step = "hours"

Scenario: Guided mode inativo
  Given isGuideActive = false
  When usuário navega entre quaisquer páginas
  Then nenhum pointer ou spotlight é exibido
```

---

### STORY-03 — IDs nos elementos-alvo (contratos do wizard)
**Esforço:** 2h | **Blocker:** STORY-02
**Lead:** @dev

**Contexto:**
O `WizardPointer` usa `document.getElementById` para spotlight. Cada página precisa ter IDs estáveis nos elementos corretos. Uma fonte de verdade centralizada previne inconsistências.

**Criar:** `constants/WIZARD_TARGETS.ts`

```typescript
export const WIZARD_TARGETS = {
  services: {
    elementId: 'btn-add-service',
    path: '/configuracoes/servicos',
    position: 'bottom' as const,
    message: 'Clique aqui para adicionar um serviço'
  },
  team: {
    elementId: 'btn-add-team-member',
    path: '/configuracoes/equipe',
    position: 'bottom' as const,
    message: 'Adicione os profissionais da sua equipe'
  },
  hours: {
    elementId: 'business-hours-section',
    path: '/configuracoes/agendamento',
    position: 'top' as const,
    message: 'Configure seus dias e horários de atendimento'
  },
  profile: {
    elementId: 'profile-logo-upload',
    path: '/configuracoes/perfil',
    position: 'right' as const,
    message: 'Adicione a logo e foto de capa do seu espaço'
  },
  booking: {
    elementId: 'toggle-public-booking',
    path: '/configuracoes/agendamento-publico',
    position: 'bottom' as const,
    message: 'Ative para receber agendamentos online'
  },
  appointment: {
    elementId: 'btn-new-appointment',
    path: '/agenda',
    position: 'bottom' as const,
    message: 'Crie seu primeiro agendamento aqui'
  },
} as const;

export type WizardStepId = keyof typeof WIZARD_TARGETS;
```

**Adicionar IDs nos elementos:**
- `btn-add-service` → botão "Adicionar Serviço" em `/configuracoes/servicos`
- `btn-add-team-member` → botão "Adicionar Membro" em `/configuracoes/equipe`
- `business-hours-section` → seção de horários em `/configuracoes/agendamento`
- `profile-logo-upload` → campo de logo em `/configuracoes/perfil`
- `toggle-public-booking` → toggle em `/configuracoes/agendamento-publico`
- `btn-new-appointment` → botão "Novo Agendamento" na `/agenda`

**Critérios de aceite:**
```gherkin
Scenario: Fonte de verdade centralizada
  Given o arquivo WIZARD_TARGETS.ts existe
  When qualquer componente referencia um target do wizard
  Then usa WIZARD_TARGETS — nunca string de ID hardcoded

Scenario: Todos os IDs presentes no DOM
  Given cada página listada no WIZARD_TARGETS
  When a página renderiza completamente
  Then document.getElementById(elementId) retorna não-nulo para cada target
```

---

### STORY-04 — WizardPointer standalone via GuidedModeContext
**Esforço:** 3h | **Blocker:** STORY-02
**Lead:** @dev

**Contexto:**
O `WizardPointer` atual está acoplado ao `WizardEngine` e só funciona dentro do `WizardOverlay`. Precisa ser extraído para funcionar em qualquer página via `GuidedModeContext`, renderizando via `ReactDOM.createPortal` no `document.body`.

**O que fazer:**
- Desacoplar `WizardPointer` do `WizardEngine` / `WizardOverlay`
- Conectar ao `GuidedModeContext`: renderiza automaticamente quando `isGuideActive = true`
- Renderizar via `ReactDOM.createPortal(pointer, document.body)`
- Adicionar ao `App.tsx` como componente sempre montado (renderiza só quando ativo)
- Preservar toda lógica existente: spotlight `boxShadow`, bounce animation, MutationObserver, mobile pulse circle

**Arquivos a modificar:**
- `components/onboarding/WizardPointer.tsx` — adicionar suporte a Context
- `App.tsx` — montar `<StandaloneWizardPointer />` no root

**Critérios de aceite:**
```gherkin
Scenario: Pointer ativo via Context
  Given GuidedModeContext.isGuideActive = true com targetElementId = "btn-add-service"
  When qualquer página renderiza
  Then WizardPointer aparece com spotlight no elemento correto

Scenario: Pointer inativo
  Given GuidedModeContext.isGuideActive = false
  When qualquer página renderiza
  Then nenhum WizardPointer existe no DOM

Scenario: Spotlight em elemento dentro de card
  Given WizardPointer está ativo apontando para um elemento em card com overflow: hidden
  When o pointer renderiza
  Then spotlight funciona corretamente (position: fixed não é clipado)
```

---

### STORY-05 — SetupCopilot: auto-start na primeira visita
**Esforço:** 4h | **Blocker:** STORY-02, STORY-04
**Lead:** @dev

**Contexto:**
Ao entrar no dashboard pela primeira vez após o onboarding, o wizard deve iniciar automaticamente no primeiro step pendente. O usuário pode pular a qualquer momento.

**O que fazer:**
- Detectar "primeira visita": `onboarding_progress.is_completed = false` + `step_data.guided_started` ausente
- Exibir banner no topo: `"Quer um tour guiado pelo sistema? [Iniciar Tour] [Pular por agora]"`
- "Iniciar Tour": salva `guided_started: true` no `step_data`, chama `startGuide(firstPendingStep)`
- "Pular por agora": salva `guided_dismissed_at: timestamp`, banner não reaparece
- Usuário que pulou pode retomar clicando em qualquer step do SetupCopilot

**Critérios de aceite:**
```gherkin
Scenario: Primeira visita ao dashboard
  Given step_data não contém guided_started nem guided_dismissed_at
  When usuário acessa /#/ pela primeira vez após onboarding
  Then banner "Quer um tour guiado?" aparece no topo do dashboard

Scenario: Usuário inicia o tour
  Given o banner está visível
  When usuário clica "Iniciar Tour"
  Then guided_started = true é salvo no step_data
    And GuidedModeContext inicia no primeiro step pendente
    And WizardPointer aparece no elemento-alvo

Scenario: Usuário pula o tour
  Given o banner está visível
  When usuário clica "Pular por agora"
  Then guided_dismissed_at é salvo no step_data
    And banner não reaparece em visitas futuras
    And todos os steps do SetupCopilot permanecem clicáveis
```

---

### STORY-06 — SetupCopilot: guided mode por step
**Esforço:** 8h | **Blocker:** STORY-03, STORY-04, STORY-05
**Lead:** @dev

**Contexto:**
Cada step do SetupCopilot, ao ser clicado, deve navegar para a página correta E ativar o WizardPointer no elemento-alvo. Este é o coração do redesign.

**O que fazer:**
- Refatorar `SetupCopilot.tsx`: ao clicar em step → `startGuide(stepId)` → `navigate(WIZARD_TARGETS[stepId].path)`
- Implementar para todos os 6 steps usando `WIZARD_TARGETS`
- Step "team": adicionar badge visual `"Opcional"` (não bloqueia o wizard)
- Botão `"Parar tutorial"` sempre visível enquanto guided mode ativo (canto superior direito do dashboard)
- Ao retornar ao dashboard com step concluído: re-verificar `checkSetupProgress()` e animar check verde

**Critérios de aceite:**
```gherkin
Scenario: Clique em step do SetupCopilot
  Given SetupCopilot está visível com step "hours" pendente
  When usuário clica no step "Configurar horários"
  Then navega para /configuracoes/agendamento
    And WizardPointer aparece em business-hours-section com mensagem correta
    And spotlight escurece o restante da tela

Scenario: Step opcional de equipe
  Given SetupCopilot exibe step "team"
  When usuário visualiza o step
  Then badge "Opcional" está visível
    And o step pode ser ignorado sem bloquear o wizard

Scenario: Parar tutorial
  Given guided mode está ativo em qualquer página
  When usuário clica "Parar tutorial"
  Then GuidedModeContext.endGuide() é chamado
    And WizardPointer desaparece imediatamente
    And estado atual é salvo no sessionStorage
```

---

### STORY-07 — Retomada de sessão ("Continuar de onde parou")
**Esforço:** 3h | **Blocker:** STORY-05, STORY-06
**Lead:** @dev

**Contexto:**
Usuário fechou o browser no meio do tour. Ao retornar, o sistema deve oferecer retomada do ponto onde parou.

**O que fazer:**
- Ao carregar dashboard: verificar `onboarding_progress.step_data.last_guided_step`
- Se step não estiver concluído: exibir banner de retomada
- Copy: `"Você parou em [Nome do Step] — quer continuar o tour?"`
- Botões: `[Continuar]` → retoma guided mode no step salvo | `[Não, obrigado]` → limpa `last_guided_step`
- Banner de retomada é visualmente distinto do banner de primeira visita (cor/ícone diferente)

**Critérios de aceite:**
```gherkin
Scenario: Retorno após abandono do tour
  Given usuário fechou o browser com guided mode ativo no step "profile"
  When retorna ao dashboard em nova sessão
  Then vê banner "Você parou em Personalizar Perfil — quer continuar?"

Scenario: Aceitar retomada
  Given banner de retomada está visível
  When usuário clica "Continuar"
  Then guided mode inicia no step "profile" com WizardPointer ativo

Scenario: Recusar retomada
  Given banner de retomada está visível
  When usuário clica "Não, obrigado"
  Then last_guided_step é removido do step_data
    And banner desaparece e não reaparece
```

---

### STORY-08 — Completion detection por página
**Esforço:** 4h | **Blocker:** STORY-06
**Lead:** @dev

**Contexto:**
O wizard precisa saber quando o usuário completou a ação na página (ex: salvou os horários). A detecção é via Custom Event disparado nas páginas-alvo após save bem-sucedido.

**O que fazer:**
- Em cada página-alvo, após save bem-sucedido:
  ```typescript
  window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'hours' } }))
  ```
- Páginas a modificar: `ServicesSettings`, `TeamSettings`, `BusinessHoursSettings`, `ProfileSettings`, `PublicBookingSettings`, `AgendaPage` (após criar appointment)
- `SetupCopilot` escuta o evento e re-executa `checkSetupProgress()`
- `WizardPointer` escuta o evento: exibe ícone de check por 1.5s → fade out → `endGuide()`

**Critérios de aceite:**
```gherkin
Scenario: Save bem-sucedido com wizard ativo
  Given usuário está em /configuracoes/agendamento com WizardPointer ativo
  When salva as configurações de horários com sucesso
  Then evento "setup-step-completed" com stepId "hours" é disparado
    And WizardPointer exibe ícone de check por 1.5s antes de sair
    And SetupCopilot re-verifica e marca "hours" como concluído

Scenario: Save com erro
  Given usuário tenta salvar mas ocorre erro
  When o erro é exibido
  Then evento "setup-step-completed" NÃO é disparado
    And WizardPointer permanece ativo
```

---

### STORY-09 — Activation Event: "Primeiro Agendamento" milestone
**Esforço:** 3h | **Blocker:** STORY-08
**Lead:** @dev

**Contexto:**
O Activation Event definido pelo produto é o primeiro agendamento criado. Neste momento, o sistema celebra e marca o usuário como "ativado".

**O que fazer:**
- Após criar primeiro agendamento: verificar `profiles.activation_completed = false`
- Se false: exibir banner de celebração no dashboard
  - Copy: `"Seu primeiro agendamento foi criado! O AgenX está no ar 🚀"`
  - Duração: 8s ou até fechar manualmente
- Salvar `activation_completed = true` no perfil
- Salvar `onboarding_progress.is_completed = true`
- SetupCopilot substituir lista de steps por estado final:
  - `"Sistema ativado! Continue explorando →"` com link para o dashboard

**Critérios de aceite:**
```gherkin
Scenario: Primeiro agendamento criado
  Given activation_completed = false no perfil
  When usuário cria seu primeiro agendamento com sucesso
  Then banner de celebração aparece com copy correto
    And activation_completed = true é salvo no perfil
    And onboarding_progress.is_completed = true

Scenario: Usuário ativado retorna ao dashboard
  Given activation_completed = true
  When usuário acessa /#/ em qualquer sessão futura
  Then SetupCopilot exibe estado "ativado" (sem lista de steps)
    And banner de celebração não reaparece
```

---

### STORY-10 — Animações e polish do wizard
**Esforço:** 4h | **Blocker:** STORY-06, STORY-08
**Lead:** @dev + @ux-design-expert (revisão)

**Contexto:**
Polir todas as animações do wizard para que sejam fluidas, acessíveis e performáticas em mobile.

**Especificações de animação:**

| Elemento | Animação | Duração | Easing |
|----------|----------|---------|--------|
| WizardPointer entrada | fade-in + scale 0.8→1.0 | 200ms | ease-out |
| WizardPointer saída | fade-out + scale 1.0→0.8 | 150ms | ease-in |
| Check concluído (SetupCopilot) | scale 0→1.2→1.0 | 300ms | spring |
| Banner entrada | slide-in-from-top + fade | 250ms | ease-out |
| Banner saída | slide-out-to-top + fade | 200ms | ease-in |

**Regras de acessibilidade/performance:**
- `prefers-reduced-motion`: substituir bounce/pulse por fade estático
- `navigator.hardwareConcurrency <= 4`: desativar animações `infinite`
- Não usar `will-change` em mais de 3 elementos simultâneos

**Critérios de aceite:**
```gherkin
Scenario: Reduced motion preference
  Given prefers-reduced-motion está ativo no SO
  When WizardPointer é renderizado
  Then bounce animation não executa — apenas fade-in estático

Scenario: Step concluído animado
  Given usuário completa um step do SetupCopilot
  When check icon aparece
  Then animação de scale 0→1.2→1.0 é visível (300ms)

Scenario: Dispositivo com performance limitada
  Given navigator.hardwareConcurrency <= 4
  When WizardPointer está ativo
  Then animação bounce infinite é substituída por pulse estático
```

---

## Resumo para o @sm

```
Epic sugerido: EPIC-004-ONBOARDING-WIZARD-REFACTOR
Total stories: 10
Total estimado: 40h (~1 sprint de 2 devs)

Ordem de execução:
  Sprint A (paralelas, sem blocker): STORY-01, STORY-02
  Sprint B (após Sprint A): STORY-03, STORY-04 (paralelas)
  Sprint C (após Sprint B): STORY-05
  Sprint D (após Sprint C): STORY-06
  Sprint E (após Sprint D, paralelas): STORY-07, STORY-08
  Sprint F (após Sprint E, paralelas): STORY-09, STORY-10

Artefatos a criar:
  contexts/GuidedModeContext.tsx        (STORY-02)
  constants/WIZARD_TARGETS.ts           (STORY-03)

Artefatos a refatorar:
  components/onboarding/WizardEngine.tsx      (STORY-01)
  components/onboarding/WizardPointer.tsx     (STORY-04)
  components/dashboard/SetupCopilot.tsx       (STORY-05, STORY-06)
  App.tsx                                     (STORY-02, STORY-04)

Artefatos a modificar (adicionar IDs + events):
  pages/settings/ServicesSettings.tsx         (STORY-03, STORY-08)
  pages/settings/TeamSettings.tsx             (STORY-03, STORY-08)
  pages/settings/BusinessHoursSettings.tsx    (STORY-03, STORY-08)
  pages/settings/ProfileSettings.tsx          (STORY-03, STORY-08)
  pages/settings/PublicBookingSettings.tsx    (STORY-03, STORY-08)
  pages/Agenda.tsx                            (STORY-03, STORY-08, STORY-09)
```

---

*Gerado por setup-wizard-squad (Atlas + Craft) — 2026-03-26*
*Pronto para: `@sm *create-story` com este documento como base*
