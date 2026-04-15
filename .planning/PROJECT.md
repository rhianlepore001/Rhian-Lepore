# AGENX — SaaS para Gestão de Barbearias e Salões

## What This Is

AGENX é um SaaS multi-tenant para gestão operacional de barbearias e salões de beleza no Brasil e Portugal. Proprietários agendadores acessam um dashboard com agenda em tempo real, finanças, controle de equipe e comissões. Clientes marcam seus próprios compromissos via link público. Colaboradores (barbeiros, manicures, cabeleireiros) gerenciam sua agenda pessoal, veem seus ganhos e recebem lembretes de pagamento.

**Tech Stack:** React 19 + TypeScript 5.8 + Vite 6 + Supabase (PostgreSQL + Auth) + Tailwind CSS. Hospedado em Vercel.

## Core Value

Operação simples + receita transparente para proprietários; controle de agenda + clareza financeira para equipe.

Se o sistema não agendasse compromissos com confiabilidade ou não rastreasse quanto cada pessoa ganhou, falharia completamente. Tudo mais é otimização.

## Requirements

### Validated

- ✓ **Autenticação multi-tenant** — Supabase Auth com JWT, RLS por `user_id` (tenant)
- ✓ **Dashboard do proprietário** — Stats de faturamento, agenda do dia, ações prioritárias, links rápidos
- ✓ **Agenda** — Visualizar, criar, editar, cancelar compromissos; filtrar por profissional/serviço
- ✓ **Sistema de papéis** — Owner (acesso total) e Staff (agenda pessoal + ganhos apenas)
- ✓ **Booking público** — Clientes marcam sem login via link `/#/booking/:slug`
- ✓ **Gerenciamento de serviços** — CRUD de serviços com duração, preço, categorias
- ✓ **Gerenciamento de profissionais** — CRUD de profissionais (barbeiros, manicures, etc)
- ✓ **CRM básico** — Lista de clientes com telefone, histórico de agendamentos
- ✓ **Onboarding dirigido** — Wizard de 5-7 passos pós-signup para setup inicial
- ✓ **Temas** — Tema "barber" (dark/brutal) e "beauty" (claro/elegante) via contexto
- ✓ **PWA** — Funciona offline, pode ser instalado em mobile
- ✓ **Integração com Stripe** — Checkout para assinatura + webhook

### Active

- [ ] **Checkout de atendimento** — Botão "Concluir" que abre modal com: serviço, valor, forma de pagamento obrigatória, taxa de máquina (débito/crédito), "Recebido por"
- [ ] **Configurações financeiras** — Settings > Financeiro: toggle repasse de taxa, % débito, % crédito
- [ ] **Comissões da equipe** — Tela Financeiro > Comissões: lista de colaboradores, cálculo automático, marcar como pago, relatório PDF/WhatsApp
- [ ] **Lembretes inteligentes** — Banner no Dashboard do dono: dia anterior ao pagamento de comissões, agendamentos não concluídos no final do dia
- [ ] **Testes E2E completos** — Fluxo completo testado (booking → checkout → comissão), mobile validado
- [ ] **Polimento UX** — Ajustes de copy, fluxos, dark mode em mobile, favicon, animações suaves
- [ ] **Beta + Launch** — 3-5 usuários beta, coleta de feedback, correção de bugs críticos, deploy em produção

### Out of Scope

- **Chat em tempo real** — Complexidade alta, não é core value
- **Múltiplas localizações por negócio** — Uma barbearia = um tenant por agora
- **Aplicativo mobile nativo** — Web PWA suficiente
- **Integração com redes sociais** — Instagram sync (v2+)
- **IA generativa (RAG, OpenRouter)** — Post-MVP, não priorizar agora
- **Clerk Auth** — Descartado após 3 tentativas falhas; Supabase Auth é suficiente

## Context

**Histórico:** Projeto iniciado em 2026-04-11 como brownfield. Código React/TypeScript já em produção com 20+ páginas, 50+ componentes, 94 migrations, múltiplos hooks e contexts. Repositório estava inflado (~50MB) com arquivos AIOX, RAG e fotos; limpeza iniciada.

**Estágio atual:** Fases 1-2 do MVP em andamento:
- Fase 1 (Identity) — ✅ Completa. README, CLAUDE.md, package.json atualizados.
- Fase 2 (Cleanup) — 🟡 Em progresso. 4.5MB de arquivos obsoletos para remover.
- Fases 3-7 (Feature Sprints) — Pendentes: Checkout, Comissões, E2E, Polish, Launch.

**Time:** Agentes IA em paralelo (data-engineer, ux-design-expert, architect) + usuário proprietário validando specs.

**Conhecimento técnico consolidado:**
- RLS (Row-Level Security) ativo em todas as tabelas → queries sem `company_id` retornam vazio silenciosamente
- HashRouter (`#/path` pattern) — não usar `/path` diretamente
- Lazy loading com `React.lazy()` + `Suspense` obrigatório
- Supabase RPC (Stored Procedures) para lógica complexa: `get_dashboard_stats`, `get_available_slots`, `get_client_profile`
- Multi-tenant isolation via `user_id` em contexto auth (não `company_id`)

## Constraints

- **Multi-tenant RLS**: Todo query filtra por `user_id`. Não negociável.
- **Supabase Auth exclusivamente**: Clerk foi descartado; usar apenas Supabase JWT.
- **Português (BR) obrigatório**: Todas as features, documentação, mensagens em português.
- **Mobile first**: Barbeiro usa celular. Testar sempre em Chrome Android.
- **Sem Redux**: Context API suficiente; não usar Redux.
- **Sem breaking changes no schema**: 94 migrations existentes; adicionar campos, não remover sem migration de segurança.
- **Performance**: Dashboard deve carregar < 2s, agenda < 1s (via RPC + pagination).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth (não Clerk) | Clerk 3x falhou visualmente + custo. Supabase Auth pronto. | ✓ Correto — Auth funciona. |
| HashRouter (não BrowserRouter) | Simplicidade em hosting; sem rewrite rules necessários. | ✓ Funciona. Clientes públicos precisam de `#`. |
| RLS por `user_id` (não `company_id`) | Schema herdado; `company_id` é falso. | ⚠️ Confuso — atualizar doc. Considerar UUID migration se escala exigir. |
| Context API (não Redux) | Simples. Team pequena. Contextos bem definidos. | ✓ Suficiente. Não sobrecarregar. |
| Sem IA crítica no MVP | OpenRouter/RAG pós-MVP. Foco em core. | ✓ Correto. Não distrai. |

---

## Evolution

Este documento evolui em transições de fase e milestones:

**Após cada transição de fase** (via `/gsd-transition`):
1. Requisitos invalidados → Out of Scope com razão
2. Requisitos validados → Validated com ref da fase
3. Novos requisitos emergentes → Active
4. Decisões a registrar → Key Decisions
5. "What This Is" ainda preciso? → Atualizar se divergiu

**Após cada milestone** (via `/gsd-complete-milestone`):
1. Full review de todas as seções
2. Core Value ainda é prioridade #1?
3. Out of Scope razões ainda valem?
4. Context com estado atual (usuários, feedback, métricas)

---

*Last updated: 2026-04-15 após inicialização formal em GSD*
