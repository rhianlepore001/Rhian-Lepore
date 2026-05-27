---
schemaVersion: 1
generatedAt: 2026-05-17T17:46:00Z
reversa:
  version: "1.0.0"
kind: paradigm_decision
producedBy: paradigm_advisor
---

# Paradigm Decision

> Decisao consciente sobre como tratar a mudanca de paradigma entre o legado e a stack alvo.
> Este artefato e leitura obrigatoria primeiro para qualquer agente posterior e para o agente de codificacao.

## Paradigma do legado detectado

- **Paradigma principal**: hibrido: procedural (frontend hooks/componentes) + procedural SQL (RPCs PostgreSQL)
- **Confianca**: 🟢 CONFIRMADO
- **Evidencias**:
  - Logica de negocio em hooks e componentes React (funcoes top-level), sem classes, sem aggregates, sem DI (`architecture.md` -- "State: React Context", sem services/repositories)
  - Fluxos lineares em componentes grandes: `Agenda.tsx`, `QueueManagement.tsx`, `Finance.tsx` executam sequencias imperativas de chamadas Supabase (`domain.md` -- R11, R19, R23)
  - Dados como objetos simples (interfaces flat em `types.ts`), sem aggregates ou entidades ricas (`domain.md`)
  - Logica critica em RPCs PostgreSQL SECURITY DEFINER, procedural por natureza (`architecture.md` -- ADR-A4, "50+ RPCs")
  - Side effects abertos: chamadas Supabase, Stripe, Gemini direto de hooks/componentes (`inventory.md` -- `lib/`)
  - Ausencia de camada de services/repositories/domain layer (`inventory.md` -- estrutura: pages, components, hooks, lib, utils)
  - Context API como "state global" sem separacao de concerns (`architecture.md` -- DT-A6)
- **Variacoes observadas** (hibrido):
  - Frontend (React): procedural com hooks, logica misturada em componentes 🟢
  - Backend (Supabase RPCs): procedural SQL puro (functions PostgreSQL) 🟢
  - Integrações (Stripe, Gemini, OpenRouter): chamadas imperativas em `lib/` 🟢

## Stack alvo declarada

- Linguagem: TypeScript
- Framework: React + Vite
- Infra: Vercel + Supabase (BaaS)

## Paradigma natural inferido

- **Paradigma**: funcional leve + composicao de hooks (React idiomatico)
- **Justificativa**: React e fundamentalmente funcional (componentes como funcoes puras de props->JSX, hooks como composicao de side effects, imutabilidade de state, unidirecionalidade de dados). TypeScript adiciona tipagem rica. TanStack Query adiciona server state reativo. Zod adiciona validacao funcional composicional.
- **Alternativas viaveis**: OO com DI nao e natural em React (sem classes, sem containers); procedural continua viavel mas desperdiça o ecossistema React moderno e perpetua acoplamento.

## Gap identificado

- **Severidade**: medio-baixo
- **Implicacoes concretas**:
  1. **Side effects abertos viram composicao controlada**: `QueueManagement.tsx` (R19) faz 4+ chamadas Supabase sequenciais no componente para finalizar atendimento. No paradigma alvo, vira service/hook dedicado com TanStack Query mutations.
  2. **Estado monolitico vira server state + local state**: 5+ contexts globais (`architecture.md` DT-A6) misturam server state e UI state. No paradigma alvo, server state vai para TanStack Query; UI state fica em context/Zustand.
  3. **Validacao implicita vira contratos Zod**: muitos `any` nos tipos. Payloads de RPCs, forms e respostas passam por schemas Zod.
  4. **Componentes gigantes viram composicao**: `Agenda.tsx`, `Finance.tsx`, `QueueManagement.tsx` com centenas de linhas. No paradigma alvo, cada responsabilidade vira hook dedicado + componentes focados.

## Opcoes apresentadas ao usuario

1. **Adotar paradigma natural da stack** (transformacional)
   - Separar toda logica em services/hooks por dominio
   - TanStack Query para todo server state
   - Zod para todos os contratos
   - Componentes puramente de apresentacao
   - Custo: refatoracao profunda de todos os modulos

2. **Forcar paradigma similar ao legado** (conservador)
   - Manter logica nos componentes e hooks grandes
   - Adicionar TanStack Query e Zod pontualmente
   - Manter contexts como estao
   - Custo: perpetua acoplamento, dificulta testes, componentes gigantes

3. **Hibrido** (equilibrado)
   - Adotar funcional leve nos fluxos criticos (agenda, fila, financeiro, booking, comissoes): services/hooks dedicados, TanStack Query, Zod
   - Manter paradigma atual em areas de baixo risco (configuracoes, marketing, areas pos-v1)
   - Migrar progressivamente por valor comercial
   - Custo: melhor custo/beneficio para v1 com time enxuto

## Decisao do usuario

- **Escolha**: 3
- **Justificativa do usuario**: opcao hibrida e a mais adequada para o contexto -- time enxuto, v1 comercial como prioridade, areas criticas precisam de solidez mas areas secundarias podem migrar depois.
- **Decidido em**: 2026-05-17T17:46:00Z

## Apetite derivado

- `derived_appetite`: balanced

## Implicacoes pendentes para proximos agentes

| Agente | Implicacao | Como honrar |
|---|---|---|
| Curator | Regras de negocio em fluxos criticos (agenda, fila, financeiro, booking, comissoes) devem ser marcadas para migracao com paradigma funcional leve; regras em areas secundarias podem manter paradigma atual | Classificar cada regra com o paradigma alvo esperado; itens de areas secundarias podem ser marcados como "manter" |
| Strategist | A estrategia deve priorizar migracao dos fluxos criticos primeiro (onde o paradigma muda) e deixar areas secundarias para fases posteriores | Planejar fases por dominio critico; areas com paradigma mantido tem menor prioridade e risco |
| Designer | Arquitetura alvo deve ter camada de services/hooks por dominio nos fluxos criticos; areas secundarias podem manter estrutura atual ate migracao futura | Projetar services, hooks, types e queries por dominio critico; nao forcar DI ou patterns pesados |
| Inspector | Testes de paridade devem cobrir especialmente os fluxos que mudam de paradigma (onde ha maior risco de regressao comportamental) | Priorizar cenarios de paridade em agenda, fila, financeiro, booking, comissoes; areas com paradigma mantido tem menor risco |

## Notas

O gap e medio-baixo porque o legado ja usa funcoes e hooks React -- a mudanca e mais de organizacao e separacao do que de modelo mental fundamental. O risco principal nao e "pensar diferente", mas sim "organizar diferente": extrair logica de componentes gigantes para services/hooks dedicados, adotar TanStack Query para server state e Zod para contratos.

Para o agente de codificacao: ao implementar um fluxo critico, SEMPRE criar:
1. `services/<dominio>.ts` -- chamadas Supabase/RPCs
2. `hooks/use<Dominio>.ts` -- TanStack Query wrapping services
3. `types/<dominio>.ts` -- tipos + schemas Zod
4. Componentes pequenos consumindo hooks

Para areas secundarias (configuracoes, marketing, etc.), manter a estrutura atual e apenas corrigir bugs/type safety conforme necessario.
