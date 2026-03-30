# Plan — Onboarding Wizard Guiado
> Beauty OS | Squad: onboarding-wizard-squad | Criado: 2026-03-20

## Visão Geral

Implementar um sistema de onboarding guiado step-by-step para donos de salão/barbearia
na primeira utilização do Beauty OS. O sistema inclui um overlay customizado com ponteiros
visuais (setas/spotlights) que guiam o usuário pelas ações iniciais do sistema.

---

## Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Overlay engine | Custom React | Controle total, sem dependência de libs externas |
| Ponteiro visual | SVG arrow + CSS animation | Leve, animável, responsivo |
| State machine | React Context + `useReducer` | Padrão do projeto (sem Redux/Zustand) |
| Persistência | Supabase `onboarding_progress` table | Retomar em caso de saída |
| Trigger | Detectado no primeiro login sem dados | Sem ação manual do usuário |
| Componentes | Tailwind CSS + glassmorphism | Padrão visual do Beauty OS |

---

## Arquitetura dos Componentes

```
components/onboarding/
├── WizardOverlay.tsx          ← Container principal do overlay
├── WizardPointer.tsx          ← Seta/spotlight animado
├── WizardProgress.tsx         ← Barra de progresso (Step X de 5)
├── WizardEngine.tsx           ← State machine + lógica de navegação
├── WizardContext.tsx          ← Context provider para estado global
└── steps/
    ├── Step1BusinessProfile.tsx   ← Perfil do negócio
    ├── Step2FirstService.tsx      ← Primeiro serviço
    ├── Step3FirstProfessional.tsx ← Primeiro profissional
    ├── Step4FirstAppointment.tsx  ← Primeiro agendamento
    └── Step5BookingLink.tsx       ← Link de agendamento público

pages/
└── Onboarding.tsx             ← Página wrapper (rota /#/onboarding)

supabase/migrations/
└── 20260320_onboarding_progress.sql ← Schema + RLS

lib/
└── onboarding.ts              ← Helpers de estado e persistência
```

---

## Fluxo do Wizard

```
[Primeiro Login]
      │
      ▼
[Detectar: empresa sem dados?]
      │
      ├── NÃO → App normal
      │
      └── SIM → Redirecionar para /#/onboarding
                      │
                      ▼
             [WizardOverlay ativo]
                      │
          ┌───────────┼────────────┐
          ▼           ▼            ▼
     Step 1:      Step 2:      Step 3:
     Perfil       Serviço    Profissional
          │           │            │
          └───────────┼────────────┘
                      ▼
                  Step 4:
               Agendamento
                      │
                      ▼
                  Step 5:
              Link Público
                      │
                      ▼
          [Setup completo → Dashboard]
```

---

## Schema do Banco de Dados

```sql
-- Tabela: onboarding_progress
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  current_step INT DEFAULT 1,
  completed_steps INT[] DEFAULT '{}',
  is_completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

-- RLS: cada empresa vê apenas seu progresso
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
```

---

## Fases de Execução

### Fase 1 — Design & Schema (paralelo) 🎨🗄️
**Agentes:** ux-wizard-designer + data-engineer (paralelo)

- [ ] `design-overlay-engine` → Especificação visual do overlay + pointer
- [ ] `design-wizard-flow` → Wireframes e transições entre steps
- [ ] `schema-onboarding-state` → Migration SQL + RLS policies

**Entregáveis:**
- Documento de spec do overlay com comportamentos
- Wireframes ASCII dos 5 steps
- Arquivo `.sql` de migration pronto para aplicar

---

### Fase 2 — Engine Core (sequencial) ⚙️
**Agente:** core-developer

- [ ] `implement-overlay-component` → `WizardOverlay.tsx` + `WizardPointer.tsx`
- [ ] `implement-wizard-engine` → `WizardEngine.tsx` + `WizardContext.tsx` + routing

**Entregáveis:**
- Overlay funcional com pointer animado
- Context/state machine com navegação entre steps

---

### Fase 3 — Steps (paralelo) ⚙️⚙️⚙️
**Agente:** core-developer (5 tasks paralelas)

- [ ] `implement-step-1-profile` → Configurar perfil (nome, logo, horários)
- [ ] `implement-step-2-service` → Cadastrar primeiro serviço
- [ ] `implement-step-3-professional` → Adicionar primeiro profissional
- [ ] `implement-step-4-appointment` → Criar primeiro agendamento
- [ ] `implement-step-5-booking` → Configurar link público

**Entregáveis:**
- 5 componentes `Step*.tsx` totalmente funcionais
- Integração com Supabase em cada step
- Pointer apontando para os elementos corretos em cada tela

---

### Fase 4 — QA & Validação 🔍
**Agente:** qa-validator

- [ ] `validate-wizard-flow` → Testes E2E do fluxo completo

**Checklist de validação:**
- [ ] Step 1: Salva perfil no Supabase e avança
- [ ] Step 2: Cadastra serviço e avança
- [ ] Step 3: Adiciona profissional e avança
- [ ] Step 4: Cria agendamento e avança
- [ ] Step 5: Gera link e marca onboarding como completo
- [ ] Progresso persiste ao fechar/reabrir o browser
- [ ] Overlay não quebra em mobile (responsivo)
- [ ] Acessibilidade: teclado funciona, ARIA labels presentes
- [ ] RLS: empresa A não acessa dados da empresa B

---

## Guia de Ativação dos Agentes

Para executar o squad, ative os agentes na ordem correta:

```bash
# Fase 1 (paralelo)
@ux-wizard-designer → *task design-overlay-engine
@data-engineer      → *task schema-onboarding-state

# Aguardar Fase 1 completar, depois:
# Fase 2
@core-developer → *task implement-overlay-component
@core-developer → *task implement-wizard-engine

# Fase 3 (paralelo)
@core-developer → *task implement-step-1-profile
@core-developer → *task implement-step-2-service
@core-developer → *task implement-step-3-professional
@core-developer → *task implement-step-4-appointment
@core-developer → *task implement-step-5-booking

# Fase 4
@qa-validator → *task validate-wizard-flow
```

---

## Critérios de Aceitação

- [ ] Wizard é exibido automaticamente no primeiro login sem dados configurados
- [ ] Overlay escurece o fundo e destaca o elemento atual
- [ ] Ponteiro/seta indica visualmente onde o usuário deve clicar/interagir
- [ ] Progresso é salvo a cada step completado
- [ ] Ao completar o Step 5, o usuário é redirecionado para o Dashboard
- [ ] Usuário pode fechar e retomar de onde parou
- [ ] Funciona em mobile (380px+) e desktop
- [ ] Sem dependências de libs externas de tour/onboarding

---

## Stories Futuras (fora do escopo atual)

- **Pós-onboarding chat**: Conectar ao `AIAssistantChat.tsx` existente como assistente de suporte
- **Onboarding de profissionais**: Fluxo separado para colaboradores
- **Analytics de onboarding**: Taxa de conclusão, step com maior abandono
- **Skip/replay wizard**: Opção de pular steps e rever depois nas configurações

---

## Referências do Projeto

| Arquivo | Relevância |
|---------|------------|
| `components/onboarding/StepSuccess.tsx` | Componente existente — avaliar reuso |
| `components/AIAssistantChat.tsx` | Gancho para pós-onboarding (story futura) |
| `pages/PublicBooking.tsx` | Referência para o Step 5 (link público) |
| `lib/supabase.ts` | Cliente Supabase — usar na persistência |
| `contexts/AuthContext.tsx` | Detectar primeiro login |
| `App.tsx` | Adicionar rota `/#/onboarding` |
