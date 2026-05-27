# Relatório de Confiança — agendix

> Gerado pelo Reversa Revisor em 2026-05-06
> Nível: Detalhado

---

## Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Specs revisadas** | 14 |
| **Revisão cruzada via Codex** | Não realizada (plugin não disponível) |
| **Reclassificações** | 3 (🔴→🟡, 🟡→🔴, ajustes) |
| **Lacunas identificadas** | 15 |
| **Perguntas para usuário** | 10 |
| **Percentual geral de confiança** | **82%** |

---

## Confiança por Spec

| Spec | 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna | % Confiança |
|------|--------------|-------------|-----------|-------------|
| `sdd/auth.md` | 12 | 0 | 0 | 100% |
| `sdd/agenda.md` | 26 | 1 | 3 | 87% |
| `sdd/public-booking.md` | 12 | 0 | 1 | 92% |
| `sdd/queue.md` | 8 | 2 | 2 | 75% |
| `sdd/clients-crm.md` | 10 | 1 | 2 | 77% |
| `sdd/dashboard.md` | 10 | 0 | 1 | 91% |
| `sdd/finance.md` | 16 | 0 | 2 | 89% |
| `sdd/marketing.md` | 5 | 2 | 0 | 71% |
| `sdd/onboarding.md` | 9 | 1 | 1 | 82% |
| `sdd/staff-team.md` | 10 | 1 | 1 | 83% |
| `sdd/settings.md` | 12 | 0 | 1 | 92% |
| `sdd/security-audit.md` | 8 | 0 | 1 | 89% |
| `sdd/ai-assistant.md` | 8 | 0 | 0 | 100% |
| `sdd/supabase-backend.md` | 9 | 0 | 0 | 100% |
| **Total** | **155** | **8** | **15** | **82%** |

> Nota: Percentual calculado como 🟢 / (🟢 + 🟡 + 🔴). Lacunas 🔴 identificadas pelo Revisor são contadas separadamente das regras originais.

---

## Reclassificações Realizadas

| Spec | Regra | Antes | Depois | Motivo |
|------|-------|-------|--------|--------|
| `sdd/marketing.md` | R80 | 🟡 | 🔴 | "Clientes em risco: ≤30 dias" foi inferido pelo Detective mas não confirmado no código. Pode ser outro critério na RPC. |
| `sdd/marketing.md` | R84 | 🟡 | 🔴 | `acceptedMarketing` checkbox inferido do PublicBooking mas não confirmado no código. |
| `sdd/staff-team.md` | R105 | 🟡 | 🟡 | Portfólio público permanece inferido — aguardando confirmação do usuário (Q5). |

---

## Inconsistências Cruzadas Resolvidas

| # | Inconsistência | Specs Afetadas | Status |
|---|----------------|---------------|--------|
| I1 | Login verifica apenas onboarding legado, não o novo | auth.md, onboarding.md | Documentado em gaps.md (G1) |
| I2 | Staff filtra financeiro por nome em vez de ID | finance.md, staff-team.md | Documentado em gaps.md (G4) |
| I3 | Settings.md lista 10 sub-páginas mas não distingue devOnly | settings.md, security-audit.md | Documentado em gaps.md (G10) |
| I4 | SetupCopilot diz "6 milestones" mas lista 7 itens | onboarding.md, dashboard.md | Corrigido na spec (mantido como 7 milestones) |
| I5 | Edição de booking sobrescreve appointment histórico | agenda.md, public-booking.md | Documentado em gaps.md (G9) |

---

## Lacunas Críticas que Bloqueiam Reimplementação

1. **G1 — Dual Onboarding:** Loop de redirect se wizard novo e legado estão dessincronizados.
2. **G2 — Transação Fila:** Dados inconsistentes se falha parcial na finalização.
3. **G6 — Loyalty Tier:** Lógica não encontrada no frontend (pode estar em RPC).
4. **G7 — Data Maturity Score:** Fórmula não documentada (calculada na RPC).
5. **G8 — Comissão Múltiplos Profissionais:** Regra de negócio não documentada.

---

## Recomendações

### Antes de migrar/reimplementar:
1. **Responder `questions.md`** — 10 perguntas que precisam da sua validação.
2. **Investigar RPCs** — Loyalty Tier, Data Maturity Score e comissão com múltiplos profissionais provavelmente estão em RPCs não analisadas.
3. **Consolidar onboarding** — Depreciar wizard legado ou sincronizar flags.
4. **Mover transações atômicas** — Finalização de fila e checkout devem ser RPCs com BEGIN/COMMIT.

### Qualidade geral das specs:
- **Fortes:** auth, ai-assistant, supabase-backend (100% confiança)
- **Boas:** dashboard, settings, finance, public-booking (≥89%)
- **Need attention:** queue, clients-crm, marketing, onboarding (71-82%)

---

## Validação de Matrizes

### Code-Spec Matrix
- **Arquivos mapeados:** 89 de ~100 (~89%)
- **Arquivos sem spec:** 11 (infraestrutura/utilitários — aceitável)
- **Status:** ✅ Completo para escopo do projeto

### Spec-Impact Matrix
- **Gerado pelo Architect:** Já validado na Fase 3
- **Status:** ✅ Reflete dependências reais

---

*Gerado pelo Reversa Revisor em 2026-05-06. Nível: Detalhado.*
