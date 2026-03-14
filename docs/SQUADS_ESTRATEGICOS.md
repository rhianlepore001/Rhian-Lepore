# Squads Estratégicos — AgenX (AIOS)

> **Framework:** Synkra AIOS + Antigravity Kit
> **Projeto:** AgenX — AI Operating System para Barbearias e Salões
> **Criado:** 2026-02-28

---

## Visão Geral

O AIOS framework deste projeto combina dois sistemas:

- **Antigravity Kit** (`.agent/`) — 20 agentes especialistas, 36 skills, 11 workflows slash command
- **Synkra AIOS Core** (`.aiox-core/`) — constituição, story-driven development, project status, squads

Cada squad abaixo mapeia **agentes + skills + workflows + comandos concretos** para uma frente estratégica do AgenX.

```
Hierarquia de Execução AIOS
─────────────────────────────
*status                 → Contexto atual do projeto
*create-next-story      → Nova história de usuário
/develop-story          → Implementa a história com @dev
/orchestrate            → Coordena 3+ agentes em paralelo
/audit-arch             → Audita arquitetura com @architect
*ids check / /sync-squad → Verifica integridade do squad
```

---

## Squad Alpha — Core Product (Produto Central)

**Missão:** Implementar e evoluir as funcionalidades core do AgenX: agendamento, clientes, serviços e caixa.

### Composição

| Papel AIOS | Agente Antigravity | Responsabilidade |
|---|---|---|
| `@po` | `product-owner` | Backlog, priorização, user stories |
| `@dev` (frontend) | `frontend-specialist` | Componentes React, agenda, modais |
| `@dev` (backend) | `backend-specialist` | Edge Functions Supabase, regras de negócio |
| `@architect` | `database-architect` | Schema, RLS, migrações |
| `@qa` | `test-engineer` | Testes unitários e integração |

### Skills Carregadas

```
typescript-expert     → Tipagem segura dos hooks e contexts
api-patterns          → Padrão das Edge Functions e RPCs
database-design       → Schema de appointments, clients, services
nextjs-react-expert   → Otimização dos componentes React 19
testing-patterns      → Vitest + Testing Library
```

### Casos de Uso

---

#### UC-A1: Implementar Nova Funcionalidade de Agendamento

**Trigger:** O product-owner aprova uma nova feature de agendamento recorrente.

**Fluxo AIOS:**

```bash
# 1. Checar status do projeto
*status

# 2. Criar nova story
*create-next-story
# → AIOS gera: docs/stories/story-XXX-agendamento-recorrente.md

# 3. Implementar com contexto completo
/develop-story
```

**Orquestração Antigravity (Phase 2 — após aprovação do plano):**

```
Use the product-owner agent to refine acceptance criteria for recurring appointments.

Use the database-architect agent to design the recurrence schema:
  - CONTEXT: Supabase PostgreSQL, existing `appointments` table
  - TASK: Add recurrence_rule, recurrence_end_date columns with RLS policies

Use the backend-specialist agent to implement the Edge Function:
  - CONTEXT: Google Generative AI + Supabase, schema approved above
  - TASK: Create process-recurrence Edge Function

Use the frontend-specialist agent to build the UI:
  - CONTEXT: React 19 + Vite, Tailwind CSS, existing AppointmentWizard.tsx
  - TASK: Add RecurrenceSelector component inside the wizard

Use the test-engineer agent to write Vitest tests for all new logic.
```

---

#### UC-A2: Refatorar o Módulo de Comissões

**Trigger:** Bug reportado em CommissionsManagement.tsx causando cálculos incorretos.

**Fluxo AIOS:**

```bash
# Ativar modo debug
/debug CommissionsManagement.tsx - incorrect commission calculations

# Sequência de agentes
1. Use the debugger agent to identify root cause in CommissionsManagement.tsx
2. Use the backend-specialist agent to fix RPC supabase for commission calculation
3. Use the test-engineer agent to add regression tests
```

**Verificação final:**
```bash
python .agent/scripts/checklist.py .
```

---

#### UC-A3: Auditoria Mensal da Arquitetura Core

**Trigger:** Após sprint de 2 semanas com novas features.

```bash
/audit-arch
# → Gera: architectural_audit.md com score de saúde
# → Agente: @architect analisa camadas (UI → Context → Supabase)
```

---

## Squad Beta — Security Shield (Escudo de Segurança)

**Missão:** Garantir isolamento multi-tenant, conformidade com RLS, hardening de autenticação Clerk e rastreabilidade via Audit Logs.

### Composição

| Papel AIOS | Agente Antigravity | Responsabilidade |
|---|---|---|
| `@architect` | `security-auditor` | Revisão de RLS, políticas, Clerk config |
| `@qa` | `penetration-tester` | Testes ativos de vulnerabilidades |
| `@devops` | `devops-engineer` | Secrets, variáveis de ambiente, deploy seguro |

### Skills Carregadas

```
vulnerability-scanner   → OWASP Top 10, SQL injection, XSS
red-team-tactics        → Testes de bypass de RLS, auth bypass
deployment-procedures   → Secrets no Vercel/Supabase, CI/CD hardening
```

### Casos de Uso

---

#### UC-B1: Auditoria de Segurança Pré-Launch

**Trigger:** Preparação para lançamento público do AgenX.

**Fluxo AIOS:**

```bash
# Verificar integridade dos squads e regras de segurança
*ids check
# → /sync-squad verifica se @devops, @qa estão ativos

# Auditoria completa
/orchestrate "Perform full security audit for AgenX multi-tenant SaaS pre-launch"
```

**Orquestração (3 fases obrigatórias):**

```
Phase 1 — Planning:
Use the project-planner agent to create docs/PLAN-security-audit.md
→ STOP, aguardar aprovação do usuário

Phase 2 — Parallel Execution (após aprovação):

[Grupo 1 - Paralelo]
Use the security-auditor agent to audit:
  - Clerk Auth configuration (2FA, rate limiting, session hardening)
  - Supabase RLS policies for multi-tenant isolation
  - Environment variables exposure (rule-13-env-isolation.md)
  - rule-01-security-isolation.md compliance

Use the penetration-tester agent to test:
  - Tenant data cross-contamination (access_token bypass)
  - Public booking endpoint (PublicClientContext) for injection attacks
  - Stripe webhook signature validation

[Grupo 2 — Sequencial após Grupo 1]
Use the devops-engineer agent to:
  - Review Vercel environment secrets
  - Validate CI/CD pipeline for secret leakage
  - Check .env files are not committed (rule-07-credential-hygiene.md)

Phase 3 — Verification:
python .agent/skills/vulnerability-scanner/scripts/security_scan.py .
```

---

#### UC-B2: Hardening de Sessão Pós-Incidente

**Trigger:** Alerta de sessão suspeita detectada nos Audit Logs.

```bash
/debug "Suspicious session detected in audit logs - user_id: XXX"

# Agentes em sequência
1. Use the security-auditor agent to analyze the audit log pattern
   - READ: rule-05-session-hardening.md
   - TASK: Identify session fixation or token reuse

2. Use the backend-specialist agent to implement additional session validation
   - CONTEXT: Clerk Auth integration in AuthContext.tsx
   - TASK: Add session fingerprinting check

3. Use the devops-engineer agent to rotate affected Clerk JWT secret
```

---

#### UC-B3: Revisão de RLS para Novo Módulo

**Trigger:** Antes de qualquer nova tabela ser adicionada ao Supabase.

```bash
/audit-arch "Review RLS policies for new financial module tables"

Use the database-architect agent to:
  - Validate RLS SELECT/INSERT/UPDATE/DELETE for new tables
  - Ensure auth.uid() isolation between tenants
  - Check triggers for soft delete pattern
  - Compliance: rule-03-multi-tenant-shield.md
```

---

## Squad Gamma — AI Brain (Cérebro de Inteligência)

**Missão:** Desenvolver e evoluir as capacidades de IA do AgenX: Motor AIOS, Doutor Financeiro, recuperação de clientes via WhatsApp e insights semânticos.

### Composição

| Papel AIOS | Agente Antigravity | Responsabilidade |
|---|---|---|
| `@po` | `product-manager` | Requisitos de IA, user stories de inteligência |
| `@dev` | `backend-specialist` | Edge Functions Gemini, prompts, pipelines |
| `@dev` | `frontend-specialist` | AISemanticInsights.tsx, ChatBubble.tsx, dashboards |
| `@qa` | `test-engineer` | Testes de prompt regression, validação de outputs |

### Skills Carregadas

```
api-patterns            → Padrão das chamadas à Gemini API (@google/generative-ai)
behavioral-modes        → Personas e modos do AIOS (Doutor Financeiro, Radar de Churn)
nodejs-best-practices   → Async patterns para Edge Functions
brainstorming           → Refinamento de prompts via questioning socrático
```

### Casos de Uso

---

#### UC-G1: Evolução do Doutor Financeiro (Financial Doctor)

**Trigger:** Adicionar capacidade de previsão de receita mensal com Gemini.

**Fluxo AIOS:**

```bash
# Discovery socrático com o PM
/brainstorm "O Doutor Financeiro precisa prever receita. Que dados ele usa? Quais insights entrega?"

# Após discovery → criar story
*create-next-story
# → docs/stories/story-XXX-financial-doctor-forecast.md

# Implementar
/develop-story
```

**Orquestração (após aprovação do plano):**

```
Use the product-manager agent to define:
  - Input: appointments históricos, serviços, meses anteriores
  - Output: previsão de receita próximos 3 meses
  - Acceptance criteria com critérios de confiança

Use the backend-specialist agent to implement:
  - Edge Function: financial-forecast
  - Prompt engineering para Gemini 1.5 Pro
  - Contexto: aios-settings.json, padrão atual em AISemanticInsights.tsx
  - Schema de resposta tipada (TypeScript)

Use the frontend-specialist agent to build:
  - Componente ForecastCard com Recharts
  - Integração com contexto existente de AISemanticInsights.tsx
  - Animações GPU-optimized (60 FPS mobile)

Use the test-engineer agent to:
  - Testar prompt regression com Vitest mocks da Gemini API
  - Validar tipos TypeScript dos outputs
```

---

#### UC-G2: Motor de Recuperação de Clientes via WhatsApp

**Trigger:** Implementar envio proativo de mensagens para clientes churn (sem agendamento há 30+ dias).

```bash
/orchestrate "Build WhatsApp churn recovery engine using Gemini + Supabase scheduled functions"
```

**Plano de orquestração:**

```
Phase 1 — Planning:
Use the project-planner agent to create PLAN.md:
  - Identificar clientes inativos (query SQL)
  - Gerar mensagem personalizada com Gemini
  - Enviar via WhatsApp Business API

Phase 2 — Implementation (paralelo):

[database-architect]:
  - Tabela: client_recovery_log (client_id, sent_at, message, status)
  - RLS: acesso restrito ao tenant (auth.uid())
  - CRON: Supabase pg_cron trigger diário

[backend-specialist]:
  - Edge Function: generate-recovery-message
  - Prompt Gemini: personaliza mensagem com histórico do cliente
  - Integração WhatsApp Business Cloud API

[frontend-specialist]:
  - Dashboard: "Clientes em Risco" em AISemanticInsights.tsx
  - Toggle: ativar/desativar recuperação automática

[test-engineer]:
  - Mock WhatsApp API para testes
  - Validar não-duplicação de mensagens
```

---

#### UC-G3: Radar de Receita Recuperável

**Trigger:** Feature que calcula receita potencial de clientes inativos.

```bash
/create "Radar de Receita Recuperável - widget no dashboard financeiro"

Use the backend-specialist agent to:
  - Implementar RPC Supabase: get_recoverable_revenue(tenant_id)
  - Query: clientes sem agendamento há 30d × ticket_médio × frequência_histórica

Use the frontend-specialist agent to:
  - Widget RadarCard com valor em destaque (R$ XX,XXX)
  - Integrar ao contexto financeiro existente
  - Animação de "pulso" para urgência visual
```

---

## Squad Delta — Growth & Design (Crescimento e Design)

**Missão:** Elevar a experiência visual do AgenX com os temas Brutalist/Beauty, otimizar para SEO/GEO, e maximizar conversão na landing page pública.

### Composição

| Papel AIOS | Agente Antigravity | Responsabilidade |
|---|---|---|
| `@dev` | `frontend-specialist` | Temas premium, componentes UI, PWA |
| `@qa` | `seo-specialist` | SEO, meta tags, Core Web Vitals |
| `@qa` | `performance-optimizer` | Lighthouse, GPU, bundle size |

### Skills Carregadas

```
ui-ux-pro-max           → 50 estilos, 21 paletas, 50 fontes (para temas Brutalist/Beauty)
seo-fundamentals        → E-E-A-T, Core Web Vitals, Schema.org
geo-fundamentals        → Otimização para GenAI (Google AI Overviews)
performance-profiling   → Web Vitals, GPU animations, bundle analysis
tailwind-patterns       → Tailwind CSS v4 utilities
```

### Casos de Uso

---

#### UC-D1: Novo Tema Premium "Luxury Gold"

**Trigger:** Cliente solicita tema dourado para salão de alto padrão.

```bash
/ui-ux-pro-max "Create Luxury Gold theme for beauty salon — premium feel, gold accents, dark background"

# O skill carrega: ui-ux-pro-max (50 estilos, 21 paletas)
# Seleciona: paleta dourada + tipografia serif + glassmorphism avançado

Use the frontend-specialist agent to:
  - Criar: TEMAS_PREMIUM_COMPLETO.md entry para "Luxury Gold"
  - Implementar: BrutalCard.tsx e BrutalButton.tsx variantes
  - Tokens Tailwind: gold-primary, gold-accent, dark-surface
  - Seguir: BEAUTY_THEME_APLICADO.md como referência
```

---

#### UC-D2: Auditoria de Performance Mobile (60 FPS)

**Trigger:** Relatório de usuários reportando lentidão no mobile.

```bash
/orchestrate "Audit and optimize AgenX mobile performance for 60 FPS target"

Use the performance-optimizer agent to:
  - Analisar: BottomMobileNav.tsx, CalendarPicker.tsx, AppointmentWizard.tsx
  - Skill: performance-profiling (Web Vitals, GPU animations)
  - Identificar: repaint/reflow causas, will-change candidates

Use the frontend-specialist agent to:
  - Implementar fixes: CSS containment, transform3d, lazy loading
  - Skill: nextjs-react-expert (React.memo, useMemo, useCallback)
  - Verificar: BrutalBackground.tsx (animações CSS pesadas)

Use the seo-specialist agent to:
  - Validar Core Web Vitals após otimizações (LCP, CLS, FID)
  - Skill: seo-fundamentals

# Verificação final
python .agent/scripts/verify_all.py . --url http://localhost:5173
```

---

#### UC-D3: SEO da Página Pública de Agendamento

**Trigger:** Melhorar visibilidade orgânica da página pública `/booking/:slug`.

```bash
/enhance "Public booking page SEO for local barbershops"

Use the seo-specialist agent to:
  - Skill: seo-fundamentals (E-E-A-T, Local SEO, Schema.org)
  - Implementar: LocalBusiness schema no PublicClientContext.tsx
  - Meta tags dinâmicas: title, description, og:image por estabelecimento
  - Skill: geo-fundamentals (GenAI optimization para Google AI Overviews)

Use the frontend-specialist agent to:
  - Adicionar: DynamicBranding.tsx suporte a og:image dinâmico
  - Implementar: sitemap.xml gerado via Edge Function
  - PWA manifest dinâmico por slug de estabelecimento
```

---

## Squad Epsilon — Quality & DevOps (Qualidade e Confiabilidade)

**Missão:** Garantir cobertura de testes, pipeline CI/CD, deploy confiável e monitoring do AgenX em produção.

### Composição

| Papel AIOS | Agente Antigravity | Responsabilidade |
|---|---|---|
| `@qa` | `test-engineer` | Vitest, Testing Library, cobertura |
| `@qa` | `qa-automation-engineer` | E2E Playwright, CI pipelines |
| `@devops` | `devops-engineer` | Vercel deploy, Supabase migrations, secrets |
| `@dev` | `debugger` | Root cause analysis de bugs em produção |

### Skills Carregadas

```
testing-patterns        → Vitest, Jest, estratégias de mock
webapp-testing          → Playwright E2E, visual regression
tdd-workflow            → Test-driven development
deployment-procedures   → CI/CD Vercel + Supabase
lint-and-validate       → ESLint, TypeScript strict
```

### Casos de Uso

---

#### UC-E1: Pipeline de CI/CD Completo

**Trigger:** Configurar pipeline automático para PRs.

```bash
/deploy "Configure full CI/CD pipeline for AgenX — Vercel + Supabase + GitHub Actions"

Use the devops-engineer agent to:
  - GitHub Actions workflow: lint → typecheck → test → build → deploy
  - Supabase migration run automático em staging
  - Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, CLERK_PUBLISHABLE_KEY no Vercel
  - Skill: deployment-procedures
  - Seguir: rule-07-credential-hygiene.md (nunca secrets no código)

Use the qa-automation-engineer agent to:
  - Playwright E2E: fluxo crítico (login → agendar → confirmar)
  - Skill: webapp-testing
  - Integrar E2E no GitHub Actions (staging only)

Use the test-engineer agent to:
  - Coverage report mínimo 70%
  - Vitest --coverage com threshold no CI
```

---

#### UC-E2: Testes para o Módulo de IA

**Trigger:** Garantir que Gemini API integrations não quebrem em deploys.

```bash
/test "AI module — Gemini integration regression tests"

Use the test-engineer agent to:
  - Mock: @google/generative-ai completo no Vitest
  - Testes: AISemanticInsights, financial-doctor outputs
  - Skill: testing-patterns (snapshot tests para UI de IA)
  - Validar: TypeScript types dos responses Gemini

Use the qa-automation-engineer agent to:
  - E2E: usuário acessa "Doutor Financeiro" e recebe insights
  - Visual regression: dashboard de IA não quebra em diferentes viewports
```

---

#### UC-E3: Debug de Produção — Incident Response

**Trigger:** Erro crítico reportado em produção por cliente.

```bash
/debug "Production: appointments not saving for tenant X - 500 error"

# Sequência AIOS
1. Use the explorer-agent to map affected files:
   - AppointmentWizard.tsx, AppointmentEditModal.tsx
   - Supabase RLS policies for appointments table

2. Use the debugger agent to:
   - Skill: systematic-debugging
   - Analisar: stack trace, audit_logs, .ai/debug-log.md
   - Hipótese: RLS policy rejeitando insert por clock skew no JWT

3. Use the backend-specialist agent to implement fix:
   - Correção na Edge Function ou política RLS
   - Adicionar error logging estruturado

4. Use the test-engineer agent to:
   - Escrever teste de regressão para o cenário
   - Garantir não-regressão no deploy

# Verificar antes de deploy
python .agent/scripts/checklist.py .
```

---

## Matriz de Squads × Módulos do AgenX

| Módulo AgenX | Squad Alpha | Squad Beta | Squad Gamma | Squad Delta | Squad Epsilon |
|---|:---:|:---:|:---:|:---:|:---:|
| Agendamento (Core) | ✅ Principal | ✅ RLS | — | — | ✅ Testes |
| Autenticação Clerk | — | ✅ Principal | — | — | ✅ E2E |
| Módulo Financeiro | ✅ UI | ✅ Audit | ✅ AI | — | ✅ Testes |
| Doutor Financeiro | — | — | ✅ Principal | — | ✅ Mocks IA |
| Temas Brutalist/Beauty | ✅ Componentes | — | — | ✅ Principal | ✅ Visual |
| WhatsApp Recovery | ✅ API | ✅ Segurança | ✅ Principal | — | ✅ Mocks |
| Booking Público | ✅ UI | ✅ Isolamento | — | ✅ SEO | ✅ E2E |
| Multi-tenant RLS | — | ✅ Principal | — | — | ✅ Integração |
| PWA / Mobile UX | ✅ UI | — | — | ✅ Performance | ✅ Mobile E2E |
| CI/CD / Deploy | — | ✅ Secrets | — | — | ✅ Principal |

---

## Como Ativar um Squad no AIOS

### Ativação Rápida (qualquer squad)

```bash
# 1. Checar contexto atual
*status

# 2. Escolher o workflow adequado
/orchestrate    → Multi-agent (3+ agentes, tarefas complexas)
/develop-story  → Story individual (agente @dev)
/create         → Feature nova simples
/debug          → Bug / incident response
/enhance        → Melhorar feature existente
/audit-arch     → Revisão arquitetural (@architect)

# 3. Verificar integridade do squad
*ids check

# 4. Validação pré-deploy
python .agent/scripts/checklist.py .      # Desenvolvimento
python .agent/scripts/verify_all.py . --url http://localhost:5173  # Pre-deploy
```

### Regras AIOS Críticas (Constitution)

```
✅ CLI First          → Toda funcionalidade funciona no CLI antes da UI
✅ Agent Authority    → Apenas @devops faz git push e cria PRs
✅ Story-Driven       → Nenhum código sem story associada
✅ No Invention       → Specs derivam apenas dos requisitos (PRD.md)
✅ No Overwrite       → Nunca sobrescrever .aiox-core/ sem autorização
```

### Hierarquia de Autoridade por Squad

```
Squad Alpha (Core Product)
  └── @po cria stories → @dev implementa → @qa valida → @devops push

Squad Beta (Security)
  └── @architect decide → @qa testa → @devops aplica em produção

Squad Gamma (AI Brain)
  └── @po define prompts → @dev implementa Edge Functions → @qa testa mocks

Squad Delta (Growth)
  └── @dev implementa → @qa audita performance/SEO → aprovação visual

Squad Epsilon (Quality)
  └── @qa define gates → @dev implementa testes → @devops integra no CI
```

---

## Referências

- [ARCHITECTURE.md](.agent/ARCHITECTURE.md) — Antigravity Kit (agentes, skills, workflows)
- [AIOS.md](.agent/rules/AIOS.md) — Protocolo de compatibilidade AIOS ↔ Antigravity
- [constitution.md](.aiox-core/constitution.md) — Princípios inegociáveis do Synkra AIOS
- [core-config.yaml](.aiox-core/core-config.yaml) — Configurações do projeto (squadsLocation, devStoryLocation)
- [PRD.md](PRD.md) — Product Requirements Document v3.0 (fonte da verdade de requisitos)
- [orchestrate.md](.agent/workflows/orchestrate.md) — Protocolo de orquestração multi-agente
- [build-saas.md](.agent/workflows/build-saas.md) — Workflow de construção SaaS end-to-end
