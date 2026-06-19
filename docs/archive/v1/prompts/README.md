# Prompts v1.0 — ARQUIVO HISTÓRICO

> **NÃO USE.** Ciclo v1.0 concluído em 2026-06. Papéis `/v1-ui`, `/v1-db`, `/v1-ship` encerrados.
> Fonte atual: `graphify-out/GRAPH_REPORT.md` + `specs/active/`.

---

# Prompts v1.0 — ARQUIVADO

> **Ciclo v1.0 concluído (2026-06).** Estes prompts e os papéis `/v1-ui`, `/v1-db`, `/v1-ship` não estão mais ativos. Mantido apenas como histórico. Para trabalho novo, use `graphify-out/GRAPH_REPORT.md` e `specs/active/`.

Abra um **chat novo**, escolha o **modelo** indicado, cole o prompt abaixo.

~~Atalhos de papel (com regras Cursor ativas): `/v1-ui` · `/v1-db` · `/v1-ship`~~

---

## UI — Opus 4.8

### O1 — Audit visual

```
/v1-ui

Tarefa O1: Auditar UI das páginas Agenda, Finance, PublicBooking, QueueManagement, Dashboard.
Leia DESIGN.md, design-system/ e specs/active/SPEC-ui-audit.md.
Entregue checklist por tela (problemas + prioridade P0/P1/P2). Não implemente código ainda.
Atualize specs/active/SPEC-ui-audit.md e docs/v1/TASKBOARD.md (O1 → done).
```

### O2 — Design Produtos

```
/v1-ui

Tarefa O2: Spec UI da página Produtos v1 (lista, cadastro, venda avulsa, estoque baixo).
Leia types/catalog.ts, _reversa_sdd/migration/parity_tests/10-products.feature.
Entregue: layout mobile-first, estados empty/loading/error, componentes ui/ a usar.
Salve spec em specs/active/SPEC-products-v1-ui.md. Atualize TASKBOARD O2.
```

### O3 — Dashboard colaborador

```
/v1-ui

Tarefa O3: Wireflow dashboard staff vs owner.
Leia specs/active/01-colaboradores-comissoes-pagamentos.md e pages/Dashboard.tsx.
Entregue o que staff vê/não vê e fluxos de redirect. Sem SQL.
Atualize TASKBOARD O3 → done.
```

### O5 — Mobile-first (Onda 3)

```
/v1-ui

Tarefa O5: Revisão mobile-first das telas críticas (Agenda, Finance, Booking, Fila, Dashboard).
Use o checklist de O1 como base. Entregue lista P0/P1 por tela + touch targets mínimos.
Não implemente ainda — handoff para Q2 ou Composer se for fix mecânico.
Atualize TASKBOARD O5 → done.
```

---

## DB — GPT 5.5 (+ MCP Supabase)

### G1 — Onboarding dual

```
/v1-db

Tarefa G1: Fechar gap onboarding dual (_reversa_sdd/gaps.md G1).
AuthContext já usa onboarding_progress; ainda existe business_settings.onboarding_completed em AlertsContext.
Entregue: migration ou sync, policies se necessário, nota no gaps.md.
Use MCP Supabase para validar. Handoff para C4 (Composer integrar services).
```

### G3 — Delete appointment atômico

```
/v1-db

Tarefa G3: Agenda.tsx faz delete client-side de finance_records + appointments (linhas ~457-460).
Crie RPC atômica com RLS/tenant correto. Teste cross-tenant.
Handoff: C1 usa a RPC via services/scheduling.ts.
```

### G4 — RLS Produtos

```
/v1-db

Tarefa G4: Auditar supabase/migrations/20260603_products_v1.sql — RLS products + product_sales.
Prove que staff/owner de outro tenant não acessa. Documente em docs/v1/security-products.md.
Atualize TASKBOARD G4 → done.
```

### G5 — Inventário Supabase direto (Onda 3)

```
/v1-db

Tarefa G5: Inventariar páginas com supabase.from/rpc direto restantes.
Priorize: ServiceSettings, RecycleBin, Reports, QueueStatus, CommissionsSettings, ClientArea.
Entregue tabela em docs/v1/supabase-direct-pages.md (página | chamadas | RPC/tabela | prioridade | handoff C3).
Atualize TASKBOARD G5 → done.
```

---

## Ship — Composer 2.5

### C1 — Sprint 4 Agenda

```
/v1-ship

Tarefa C1: Migrar pages/Agenda.tsx — extrair useAppointments + mutations para hooks/useScheduling.ts e services/scheduling.ts.
Meta: 0 supabase.from/rpc na página (Realtime ok).
Leia _reversa_sdd/migration/relatorio_sessao_agendix_1.0.md §5-7.
Rode typecheck, lint, test. Atualize TASKBOARD C1.
```

### C2 — Página Produtos

```
/v1-ship

Tarefa C2: Implementar pages/Products.tsx + rota em App.tsx.
Use hooks/useCatalog.ts. Siga spec specs/active/SPEC-products-v1-ui.md (quando O2 done).
Paridade: 10-products.feature. Atualize TASKBOARD C2.
```

### C4 — Onboarding service

```
/v1-ship

Tarefa C4: Consolidar lib/onboarding.ts em services/onboarding.ts (single path).
Atualize imports (Login, useOnboardingState). Testes verdes. TASKBOARD C4 → done.
```

### C3 — Settings + reports cleanup (Onda 3)

```
/v1-ship

Tarefa C3: Migrar Supabase direto → hooks/services nestas páginas:
- pages/settings/ServiceSettings.tsx
- pages/settings/RecycleBin.tsx
- pages/settings/CommissionsSettings.tsx
- pages/Reports.tsx
- pages/QueueStatus.tsx
Use docs/v1/supabase-direct-pages.md (G5) como guia. Meta: 0 supabase.from/rpc nessas páginas.
Rode typecheck, lint, test. Atualize TASKBOARD C3 → done.
```

### C5 — Testes de hooks (Onda 3)

```
/v1-ship

Tarefa C5: Adicionar testes de hook no padrão test/hooks/useOnboardingState.test.ts para:
- useQueue (queries adicionadas na sprint fila)
- usePublicBooking
- useScheduling (useAppointments se C1 concluído)
Mock QueryClientProvider. Atualize TASKBOARD C5 → done.
```

### C6 — Doc migration story (Fase 10)

```
/v1-ship

Tarefa C6: Atualizar docs/stories/v1-hooks-migration-completion.md com status real pós C1–C5.
Marque o que saiu de Draft, o que ficou pendente, links para arquivos migrados.
Atualize TASKBOARD C6 → done.
```

---

## QA — Fase 10 (Launch)

### Q1 — Paridade Gherkin

```
/v1-ship

Tarefa Q1: Validar paridade dos 10 arquivos em _reversa_sdd/migration/parity_tests/*.feature.
Para cada .feature: status pass/fail/manual, evidência (teste ou checklist).
Salve docs/v1/PARITY-REPORT.md. Atualize TASKBOARD Q1 → done.
```

### Q2 — Polish final UI

```
/v1-ui

Tarefa Q2: Polish final pós Q1 e audits O1/O5.
Implemente apenas P0 visuais nas telas críticas ou produza handoff itemizado para Composer.
Atualize TASKBOARD Q2 → done.
```

---

## Kickoff por onda (opcional — colar no início de cada sprint)

### Onda 1

```
Leia @docs/v1/TASKBOARD.md seção Onda 1.
Execute em paralelo conforme seu papel: O1 (Opus) | G1 (GPT) | C4 após G1 (Composer).
Não avance para Onda 2 até marcar dependências done.
```

### Onda 2

```
Leia @docs/v1/TASKBOARD.md seção Onda 2.
G3 (GPT) → C1 (Composer) | O2 e O3 (Opus) em paralelo.
```

### Onda 3

```
Leia @docs/v1/TASKBOARD.md seção Onda 3.
G5 (GPT) → C3 (Composer) | G4 após O2 | C2 após O2+G4 | C5 após C1 | O5 após O1.
```

### Fase 10 — Launch

```
Leia @docs/v1/TASKBOARD.md seção Fase 10.
C6 → Q1 → Q2. Critério v1.0: checklist no final do TASKBOARD.md.
```

---

## Fluxo manual rápido (3 chats fixos)

| Chat | Modelo | Nome sugerido | Quando abrir |
|------|--------|---------------|--------------|
| 1 | Opus 4.8 | `AgendiX UI` | O1, O2, O3, O5 |
| 2 | GPT 5.5 | `AgendiX DB` | G1, G3, G4, G5 |
| 3 | Composer 2.5 | `AgendiX Ship` | C1–C6, C5, Q1 |

Pinne os 3 chats no Cursor. Cole o prompt da tarefa + `@docs/v1/TASKBOARD.md`.

## Cobertura de prompts

| Onda | Tarefas no TASKBOARD | Prompts prontos |
|------|----------------------|-----------------|
| Onda 1 | O1, G1, C4 | O1, G1, C4 + kickoff |
| Onda 2 | G3, C1, O2, O3 | G3, C1, O2, O3 + kickoff |
| Onda 3 | G4, C2, C3, G5, C5, O5 | todos + kickoff |
| Fase 10 | C6, Q1, Q2 | todos + kickoff |

---

## Cursor Automations (opcional)

Para auditoria semanal: Automation com trigger cron → Composer roda `npm test` + grep supabase em pages/ → comenta no PR ou gera issue.

Não roteia modelos automaticamente; use os 3 chats acima.
