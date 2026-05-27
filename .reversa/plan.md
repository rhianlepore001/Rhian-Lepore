# Plano de Exploração — agendix

> Criado pelo Reversa em 2026-05-03
> Marque cada tarefa com ✅ quando concluída.
> Você pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessário.

---

## Fase 1: Reconhecimento 🔍

- [x] **Scout** — Mapeamento de estrutura de pastas e tecnologias
- [x] **Scout** — Análise de dependências e gerenciadores de pacotes
- [x] **Scout** — Identificação de entry points, CI/CD e configurações

## Fase 2: Escavação 🏗️

- [x] **Arqueólogo** — Análise do módulo `auth` ✅
- [x] **Arqueólogo** — Análise do módulo `agenda` (calendário, booking, fila) ✅
- [x] **Arqueólogo** — Análise do módulo `clients/crm` ✅
- [x] **Arqueólogo** — Análise do módulo `dashboard` ✅
- [x] **Arqueólogo** — Análise do módulo `finance` (financeiro, comissões, subscriptions) ✅
- [x] **Arqueólogo** — Análise do módulo `marketing` ✅
- [x] **Arqueólogo** — Análise do módulo `onboarding` ✅
- [x] **Arqueólogo** — Análise do módulo `staff/team` ✅
- [x] **Arqueólogo** — Análise do módulo `settings` ✅
- [x] **Arqueólogo** — Análise do módulo `security/audit` ✅
- [x] **Arqueólogo** — Análise do módulo `ai-assistant` ✅
- [x] **Arqueólogo** — Análise do módulo `supabase-backend` (migrations, Edge Functions, RLS) ✅

## Fase 3: Interpretação 🧠

- [x] **Detetive** — Arqueologia Git e ADRs retroativos ✅
- [x] **Detetive** — Regras de negócio implícitas e máquinas de estado ✅
- [x] **Detetive** — Matriz de permissões (RBAC/ACL) ✅
- [x] **Arquiteto** — Diagramas C4 (Contexto, Containers, Componentes) ✅
- [x] **Arquiteto** — ERD completo e integrações externas ✅
- [x] **Arquiteto** — Spec Impact Matrix ✅

## Fase 4: Geração 📝

- [x] **Redator** — Specs SDD por componente (14 specs) ✅
- [x] **Redator** — OpenAPI (supabase-api.yaml) ✅
- [x] **Redator** — User Stories (owner, staff, client) ✅
- [x] **Redator** — Code/Spec Matrix ✅

## Fase 5: Revisão ✅

- [x] **Revisor** — Revisão cruzada de specs (14 specs revisadas, 5 inconsistências cruzadas identificadas) ✅
- [x] **Revisor** — 10 perguntas geradas em `_reversa_sdd/questions.md` (aguardando respostas do usuário) ✅
- [x] **Revisor** — Relatório de confiança final gerado (`_reversa_sdd/confidence-report.md` — 82% confiança) ✅

---

## Agentes Independentes

> Execute estes agentes quando os recursos estiverem disponíveis — podem rodar em qualquer fase.

- [ ] **Visor** — Análise de interface via screenshots
- [ ] **Data Master** — Análise completa do banco de dados
- [ ] **Design System** — Extração de tokens de design
- [ ] **Tracer** — Análise dinâmica (requer sistema acessível)

---

## Próximo passo

Após o Time de Descoberta concluir e o `_reversa_sdd/` estar populado, você pode disparar um dos fluxos seguintes:

- `/reversa-migrate`: orquestrador do **Time de Migração** (Paradigm Advisor → Curator → Strategist → Designer → Inspector). Gera as specs do sistema novo. Saída em `_reversa_sdd/migration/`.
- `/reversa-reconstructor`: gera plano bottom-up para reimplementar o software a partir das specs do legado (uma tarefa por sessão).
