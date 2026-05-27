---
schemaVersion: 1
generatedAt: 2026-05-17T17:56:00Z
reversa:
  version: "1.0.0"
kind: risk_register
producedBy: strategist
---

# Risk Register

> Riscos identificados para a estrategia Strangler Fig por dominio.

---

## Riscos da estrategia

| ID | Risco | Probabilidade | Impacto | Mitigacao | Contingencia | Owner |
|---|---|---|---|---|---|---|
| RSK-001 | Coexistencia de patterns antigos e novos gera confusao e inconsistencia durante a migracao | Media | Medio | Documentar padrao por fase; lint rules para impedir import cruzado entre modulos legados e migrados | Refactor pontual se detectado em review | Dev principal |
| RSK-002 | Fase demorar mais que o previsto e atrasar v1 | Media | Alto | Fases curtas com escopo fixo; timeboxing por fase; priorizar "bom o suficiente" sobre perfeito | Cortar escopo da fase para o minimo viavel; mover extras para fase seguinte | Founder/owner |
| RSK-003 | Rollback necessario em fase ja integrada com fases posteriores | Baixa | Alto | Manter branches/commits granulares por fase; testes por dominio | Reverter commits da fase; re-rodar testes das fases afetadas | Dev principal |

## Riscos de paradigma

| ID | Risco | Probabilidade | Impacto | Mitigacao | Contingencia | Owner |
|---|---|---|---|---|---|---|
| RSK-004 | Extracao de logica de componentes gigantes introduzir regressoes | Media | Alto | Testes antes de refatorar; comparar comportamento pre/pos com Playwright | Reverter e isolar o componente problematico | Dev principal |
| RSK-005 | TanStack Query mal configurado causar cache stale ou refetch excessivo | Media | Medio | Definir staleTime/gcTime por dominio; documentar patterns; revisar queries em code review | Fallback para fetch direto enquanto ajusta | Dev principal |
| RSK-006 | Schemas Zod muito rigorosos quebrarem em dados legados existentes | Media | Medio | Usar `.passthrough()` e `.partial()` em schemas de leitura; strict apenas em escrita | Relaxar schema e logar warnings em vez de erros | Dev principal |

## Riscos de dados

| ID | Risco | Probabilidade | Impacto | Mitigacao | Contingencia | Owner |
|---|---|---|---|---|---|---|
| RSK-007 | Migrations novas quebrarem dados existentes | Baixa | Critico | Migration controlada; testar em staging com dump de producao; nunca migration destrutiva sem backup | Restaurar backup; rollback da migration | Dev principal |
| RSK-008 | RLS nova bloquear acesso legitimo silenciosamente | Media | Alto | Testar cada policy com usuario real (owner + staff + publico); script de verificacao RLS | Reverter policy/migration, desabilitar temporariamente a feature afetada ou aplicar hotfix restrito. Nunca usar RLS fail-open em producao | Dev principal |
| RSK-009 | Inconsistencia entre appointments, finance_records e comissoes durante migracao de atomicidade | Baixa | Alto | RPC atomica com transacao; parallel run local; monitorar registros orfaos | Reconciliacao manual via query; script de fix | Dev principal |

## Riscos operacionais

| ID | Risco | Probabilidade | Impacto | Mitigacao | Contingencia | Owner |
|---|---|---|---|---|---|---|
| RSK-010 | Fluxos publicos (booking, fila) quebrarem durante migracao | Baixa | Critico | Migrar fluxos publicos com cuidado extra; testar com links reais; manter URLs compativeis | Reverter deploy; redirect para versao anterior | Dev principal |
| RSK-011 | Integracao Stripe quebrar por mudanca no checkout flow | Baixa | Critico | Nao alterar Edge Function de checkout sem testar com Stripe test mode primeiro | Reverter Edge Function para versao anterior | Dev principal |
| RSK-012 | Real-time (Supabase Realtime) instavel apos mudanca de subscriptions | Media | Medio | Testar channels apos migracao; manter fallback polling | Fallback polling ate estabilizar | Dev principal |

## Riscos organizacionais

| ID | Risco | Probabilidade | Impacto | Mitigacao | Contingencia | Owner |
|---|---|---|---|---|---|---|
| RSK-013 | Time enxuto (1 dev + IA) nao dar conta do escopo | Media | Alto | Priorizar por valor comercial; cortar escopo antes de atrasar; fases curtas | Reduzir escopo da v1 para os 7 modulos mais criticos | Founder/owner |
| RSK-014 | LLMs gerarem codigo inconsistente com paradigma alvo | Media | Medio | Specs, stories e criterios de aceite claros por tarefa; review humano em fluxos criticos | Refatorar saida do LLM antes de integrar | Dev principal |
| RSK-015 | Escopo crescer durante migracao (feature creep) | Media | Alto | Lista fixa de modulos v1; qualquer adicao exige remocao de outro item; founder como gatekeeper | Congelar escopo e lancar com o que tem | Founder/owner |

---

## Resumo

| Criticidade | Quantidade |
|---|---|
| Critico | 3 (RSK-007, RSK-010, RSK-011) |
| Alto | 7 (RSK-002, RSK-003, RSK-004, RSK-008, RSK-009, RSK-013, RSK-015) |
| Medio | 6 (RSK-001, RSK-005, RSK-006, RSK-012, RSK-014) |
| **Total** | **15** |
