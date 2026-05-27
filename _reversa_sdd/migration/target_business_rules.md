---
schemaVersion: 1
generatedAt: 2026-05-17T17:50:00Z
reversa:
  version: "1.0.0"
kind: target_business_rules
producedBy: curator
---

# Target Business Rules

> Regras de negocio curadas para migracao. Baseado nas specs do legado, brief e paradigm_decision.md.
> Apetite: balanced. Paradigma alvo (fluxos criticos): funcional leve + composicao de hooks.

---

## MIGRAR

### Autenticacao e Autorizacao

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-001 | Todo query filtra por `company_id` via RLS | domain.md R1 | 🟢 | Manter intacto; regra de banco |
| BR-MIGRAR-002 | `company_id` vem do session Supabase via `useAuth()`, nunca de URL/form | domain.md R2 | 🟢 | Manter intacto |
| BR-MIGRAR-003 | Rate limiting token bucket no login via RPC | domain.md R3, auth.md R3 | 🟢 | Manter RPC; hook `useLogin` encapsula |
| BR-MIGRAR-004 | Staff herda subscription/tema/business do owner em chamada unica | domain.md R4, auth.md R4 | 🟢 | Mover para service `authService.fetchProfile()` |
| BR-MIGRAR-005 | Trial de 7 dias com expiracao fixa | domain.md R7, auth.md R7 | 🟢 | Manter; validacao via Zod |
| BR-MIGRAR-006 | Assinatura ativa = `active`, `subscriber` ou `trial` valido | domain.md R8, auth.md R8 | 🟢 | Extrair para `isSubscriptionActive()` pura |
| BR-MIGRAR-007 | Registro de staff cria team_member com slug automatico | domain.md R6, auth.md R6 | 🟢 | Manter RPC |
| BR-MIGRAR-008 | Rate limit fail-open: nao bloqueia em falha de RPC | auth.md R10 | 🟢 | Manter |
| BR-MIGRAR-009 | 2FA via TOTP (Supabase MFA) | domain.md R33 | 🟢 | Manter |
| BR-MIGRAR-010 | Owner/Staff/Dev roles com guards de rota | permissions.md | 🟢 | Manter; OwnerRouteGuard, ProtectedLayout |

### Agenda

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-011 | Status de appointment: Confirmed, Pending, Completed, Cancelled | agenda.md R9 | 🟢 | Tipar com enum/union Zod |
| BR-MIGRAR-012 | Overdue com tolerancia de 15 min | agenda.md R9a, questions Q10 | 🟢 | Funcao pura `isOverdue(apt, now)` |
| BR-MIGRAR-013 | Staff nao cancela Completed (guard D-07) | agenda.md R10 | 🟢 | Manter |
| BR-MIGRAR-014 | Checkout via RPC `complete_appointment` | agenda.md R11 | 🟢 | Hook `useCheckout` com TanStack mutation |
| BR-MIGRAR-015 | Booking publico: pending ate aprovacao do owner | agenda.md R12 | 🟢 | Hook `useBookings` |
| BR-MIGRAR-016 | Edicao de booking via flag `is_edit` + `original_appointment_time` | agenda.md R13 | 🟢 | Manter |
| BR-MIGRAR-017 | Busca cliente por telefone em 3 formatos (raw, BR, PT) | agenda.md R14 | 🟢 | Extrair para `clientService.findByPhone()` |
| BR-MIGRAR-018 | Intervalos de 30 min, 8h-20h | agenda.md R15 | 🟢 | Configuravel via business_settings |
| BR-MIGRAR-019 | Desconto percentual + preco custom | agenda.md R16 | 🟢 | Manter |
| BR-MIGRAR-020 | Prevencao de duplicata de booking por telefone | agenda.md R22 | 🟢 | Manter RPC |
| BR-MIGRAR-021 | Espelhamento public_client -> CRM via RPC | agenda.md R23 | 🟢 | Manter RPC |
| BR-MIGRAR-022 | Checkout com taxa de maquininha (debito/credito) | agenda.md R25 | 🟢 | Manter |
| BR-MIGRAR-023 | Real-time via Supabase Realtime | agenda.md R26 | 🟢 | Hook `useRealtimeSubscription` |
| BR-MIGRAR-024 | Staff ve apenas seus agendamentos | agenda.md R27 | 🟢 | Manter filtro |
| BR-MIGRAR-025 | Booking via RPC `create_secure_booking` com colisao | agenda.md R29 | 🟢 | Hook `useCreateBooking` com mutation |
| BR-MIGRAR-026 | Auto-atribuicao de profissional | agenda.md R21 | 🟢 | Manter |

### Fila Digital

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-027 | Estados da fila: waiting, calling, serving, completed, cancelled, no_show | queue.md R17 | 🟢 | Enum Zod |
| BR-MIGRAR-028 | Som de notificacao em calling | queue.md R18 | 🟢 | Manter |
| BR-MIGRAR-029 | Finalizacao ATOMICA: deve migrar para RPC com BEGIN/COMMIT | queue.md R19, gaps G2 | 🟢 | **CORRIGIR**: mover de client-side para RPC atomica |
| BR-MIGRAR-030 | Filtro por dia atual | queue.md R20 | 🟢 | Manter |
| BR-MIGRAR-031 | Tempo estimado: posicao x 20 min | queue.md R37 | 🟢 | Manter |
| BR-MIGRAR-032 | Fallback polling 10s | queue.md R38 | 🟢 | Manter |
| BR-MIGRAR-033 | Staff nao acessa fila (OwnerRouteGuard) | queue.md R39 | 🟢 | Manter |

### Financeiro

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-034 | Staff filtra por `professional_id`, NUNCA por nome | finance.md R63, gaps G4, questions Q3 | 🟢 | **CORRIGIR**: trocar filtro de nome para ID |
| BR-MIGRAR-035 | Staff nao ve Comissoes/Historico/Insights | finance.md R64 | 🟢 | Manter |
| BR-MIGRAR-036 | Periodo de acerto configuravel; dia inexistente = ultimo dia do mes | finance.md R65, questions Q9 | 🟢 | Funcao pura `calcSettlementDate()` |
| BR-MIGRAR-037 | Comissao = taxa x base (com/sem maquininha) | finance.md R66 | 🟢 | Funcao pura `calcCommission()` |
| BR-MIGRAR-038 | Pagamento de comissoes em lote via RPC | finance.md R67 | 🟢 | Hook `usePayCommissions` |
| BR-MIGRAR-039 | Transacoes manuais sem appointment | finance.md R68 | 🟢 | Manter |
| BR-MIGRAR-040 | Deletar receita automatica = deletar appointment | finance.md R69 | 🟢 | Manter |
| BR-MIGRAR-041 | Despesas pendentes liquidaveis via RPC | finance.md R70 | 🟢 | Manter |
| BR-MIGRAR-042 | Taxa maquininha: debito vs credito | finance.md R71 | 🟢 | Manter |
| BR-MIGRAR-043 | Exportacao CSV | finance.md R72 | 🟢 | Manter |
| BR-MIGRAR-044 | Assinatura Stripe com auto-provisioning | finance.md R73 | 🟢 | Manter Edge Function |
| BR-MIGRAR-045 | Precos regionais BR/PT | finance.md R74 | 🟢 | Manter |
| BR-MIGRAR-046 | Region awareness: moeda, metodos pagamento | finance.md R77 | 🟢 | Manter |
| BR-MIGRAR-047 | Self-repair de commission records | finance.md R78 | 🟢 | Manter |

### Onboarding

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-048 | Onboarding source of truth: `onboarding_progress.is_completed` | questions Q1, gaps G1 | 🟢 | **CORRIGIR**: depreciar wizard legado; sincronizar campos na transicao |
| BR-MIGRAR-049 | Wizard 5 steps com estado persistido | domain.md R29 | 🟢 | Manter |
| BR-MIGRAR-050 | SetupCopilot 6 milestones | domain.md R31 | 🟢 | Avaliar manter ou simplificar |

### CRM/Clientes

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-051 | Loyalty tier: Bronze 0-5, Silver 6-15, Gold 16-30, Platinum 31+ | questions Q7 | 🟢 | Funcao pura `calcTier(visits)` |
| BR-MIGRAR-052 | Deduplicacao por telefone com formatos flexiveis | agenda.md R14 | 🟢 | Manter |

### Seguranca

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-053 | Audit logs via trigger em 6 tabelas | domain.md R34 | 🟢 | Manter triggers |
| BR-MIGRAR-054 | Lixeira 30 dias com restore via RPC | domain.md R35 | 🟢 | Manter |
| BR-MIGRAR-055 | Soft delete com countdown | domain.md R35 | 🟢 | Manter |

### Dashboard

| ID | Regra | Origem | Confianca | Notas paradigma |
|---|---|---|---|---|
| BR-MIGRAR-056 | Data Maturity Score: formula documentada em RPC | questions Q6 | 🟢 | Manter RPC; documentar formula |

---

## DESCARTAR

| ID | Regra descartada | Origem | Vinculado a paradigma | Justificativa |
|---|---|---|---|---|
| BR-DESCARTAR-001 | Fallback client-side do checkout (UPDATE+INSERT separados) | agenda.md R11, gaps G3 | Sim | No paradigma alvo, checkout e RPC atomica unica. Fallback client-side perpetua risco de inconsistencia (G3). O paradigma funcional leve exige que a operacao seja atomica no banco, nao no cliente. |
| BR-DESCARTAR-002 | Finalizacao da fila client-side (transacao manual) | queue.md R19, gaps G2 | Sim | Migra para RPC atomica (BR-MIGRAR-029). A transacao manual client-side e artefato do paradigma procedural; no alvo, hook dispara mutation que chama RPC atomica. |
| BR-DESCARTAR-003 | Filtro de staff financeiro por nome | finance.md (legado) | Nao | Substituido por filtro por `professional_id` (BR-MIGRAR-034). Bug de seguranca (G4), nao artefato de paradigma. |
| BR-DESCARTAR-004 | `isDev` por email hardcoded | auth.md R5, permissions L2 | Nao | Nao escalavel nem seguro. Substituir por flag em `profiles` ou variavel de ambiente. |
| BR-DESCARTAR-005 | Wizard legado como source of truth | gaps G1, questions Q1 | Nao | Deprecated; source of truth migra para `onboarding_progress.is_completed` (BR-MIGRAR-048). |
| BR-DESCARTAR-006 | Dev alternando user_type via localStorage | auth.md R12 | Nao | Mecanismo de debug; manter apenas em dev mode com flag explicit. Nao entra como regra de negocio na v1. |

---

## DECISAO HUMANA

| ID | Regra | Origem | Confianca | Recomendacao do Curator |
|---|---|---|---|---|
| BR-HUMANA-001 | Comissao com multiplos profissionais no mesmo agendamento | gaps G8, questions Q8 | 🔴 LACUNA | **Recomendacao: manter como 1 profissional por agendamento na v1.** Escopo excluido no brief. Se virar requisito comercial urgente, modelar `appointment_services`. |
| BR-HUMANA-002 | Portfolio publico `/pro/:slug` | gaps G11 | 🟡 INFERIDO | **Recomendacao: manter implementado mas como feature secundaria.** Nao bloqueia v1. Validar com usuarios beta se tem valor. |
| BR-HUMANA-003 | Fila sem verificacao de duplicata de cliente | gaps G14 | 🟢 | **Recomendacao: adicionar verificacao por telefone na v1.** Previne filas infladas. Baixo custo de implementacao. |
| BR-HUMANA-004 | Fila sem timeout de `calling` | gaps G15 | 🟢 | **Decisao final: adicionar timeout de 5 min.** Se nao atender em 5 min, volta para `waiting`. Nunca marca `no_show` automaticamente; `no_show` e acao manual do owner. |
| BR-HUMANA-005 | Edicao de booking sobrescreve appointment historico | gaps G9 | 🟢 | **Recomendacao: criar novo appointment e manter original como historico.** Preserva rastreabilidade. Impacto medio no fluxo de aceite de booking. |
| BR-HUMANA-006 | Permissoes de staff em RPCs nao validadas server-side | permissions L1 | 🔴 LACUNA | **Recomendacao: auditar e adicionar validacao em RPCs criticas.** Risco medio de seguranca. |
| BR-HUMANA-007 | Memoria semantica sem limite de retencao | gaps G5, questions Q4 | 🟢 | **Recomendacao: limitar a 50 por cliente, rotacionar apos 12 meses.** Mas IA e pos-v1; decidir se implementa limite agora ou depois. |
| BR-HUMANA-008 | Edição de booking com appointment soft-deleted | agenda.md B2 | 🟢 | **Recomendacao: INSERT novo appointment em vez de UPDATE.** Evita conflito com lixeira. |

---

**Total: 56 MIGRAR, 6 DESCARTAR, 8 DECISAO HUMANA = 70 regras analisadas.**
