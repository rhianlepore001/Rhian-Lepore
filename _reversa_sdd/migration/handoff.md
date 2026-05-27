---
schemaVersion: 1
generatedAt: 2026-05-17T19:22:00Z
reversa:
  version: "1.0.0"
kind: handoff
producedBy: orchestrator
---

# Handoff -- Pipeline reversa-migrate concluido

## Resumo do pipeline

| Agente | Status | Artefatos |
|---|---|---|
| Paradigm Advisor | Concluido | paradigm_decision.md |
| Curator | Concluido | target_business_rules.md, discard_log.md, ambiguity_log.md |
| Strategist | Concluido | migration_strategy.md, risk_register.md, cutover_plan.md |
| Designer | Concluido | target_architecture.md, target_domain_model.md, target_data_model.md, data_migration_plan.md |
| Inspector | Concluido | parity_specs.md, parity_tests/*.feature (10 arquivos) |

## Decisoes tomadas

| Decisao | Escolha | Documento |
|---|---|---|
| Paradigma | Hibrido: funcional leve nos criticos, legado nas secundarias | paradigm_decision.md |
| Estrategia | Strangler Fig por dominio (10 fases) | migration_strategy.md |
| Fase 0 | Design System enxuto + tipos base | migration_strategy.md |
| Produtos | Paralelo a partir de Fase 5, escopo simples | migration_strategy.md |
| Correcoes v1 obrigatorias | G1 (onboarding), G2 (fila atomica), G3 (checkout atomico), G4 (filtro por ID) | target_business_rules.md |
| Decisoes humanas (8) | Todas resolvidas | ambiguity_log.md |
| Pipeline auxiliar | 9 etapas com skills/agentes para UI, arquitetura, seguranca, testes | migration_strategy.md |

## Contrato de codificacao

O agente de codificacao deve seguir:

### Paradigma (fluxos criticos)
- `services/<dominio>.ts` -- chamadas Supabase, funcoes puras
- `hooks/use<Dominio>.ts` -- TanStack Query (useQuery/useMutation)
- `types/<dominio>.ts` -- schemas Zod
- Componentes focados em renderizacao, sem fetch direto

### Paradigma (areas secundarias)
- Manter padrao atual (sem refactor forcado)

### Design System
- Componentes base obrigatorios (contrato visual)
- Nao permitir estilos avulsos sem justificativa

### Banco
- RPCs atomicas para checkout e fila
- RLS auditada por fase
- Filtro por company_id em toda query
- RPCs SECURITY DEFINER nunca aceitam tenant (`p_user_id`/`p_company_id`) vindo do frontend como fonte de verdade
- Produtos v1 usam `products` + `product_sales` para manter trilha auditavel de venda, estoque, custo e receita
- RLS nunca deve usar fail-open como contingencia

### Testes
- 10 feature files como spec de paridade
- typecheck + lint + build + test antes de cada merge
- Testes devem cobrir spoofing de tenant em RPCs criticas, especialmente fila, financeiro, staff e produtos

## Execucao com LLMs

| Tier | Uso |
|---|---|
| Frontier/CTO | Estrategia, arquitetura, revisao, seguranca, design direction |
| Subtier/Executor | Tasks pequenas com criterios claros (stories de implementacao) |
| Reversa/Inspector | Specs, paridade, migracao, documentacao |

Regra: subtier nao decide arquitetura global sem revisao.

## Proximo passo

Iniciar **Fase 0**: Design System + tipos base.
- Usar skills: `design-system`/`design-md`, `impeccable shape`, `react-components`
- Produzir: tokens, componentes base, Supabase types, padroes service/hook
- Criterio de conclusao: build passa, componentes documentados, contrato visual estabelecido
