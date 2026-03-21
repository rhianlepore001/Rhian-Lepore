# SQUAD AUDIT: Product Health & Data Consistency Investigation

**Data:** 18 Mar 2026
**Iniciado por:** @architect (Aria)
**Squads Ativados:** @po, @ux-design-expert, @analyst, @data-engineer
**Status:** ATIVO
**Duração Estimada:** 6-8 horas (paralelo)

---

## 🎯 Objetivo Geral

Auditar e diagnosticar 3 problemas críticos de **Product Health**:

1. **Muitas features sem sentido** — Quais features são essenciais vs. dead weight?
2. **Dados não mostrados de forma correta** — Por que dados aparecem inconsistentes/confusos?
3. **Primeira experiência confusa** — Por que novo usuário se confunde ao criar conta?

---

## 📊 Squad Assignments

### Squad 1: @po (Pax) — Product Owner Validation
**Mission:** Validar alinhamento de features vs. visão do produto

**Investigação:**
- [ ] Mapear TODAS as features da aplicação (pages/, components/)
- [ ] Validar quais features estão no PRD original
- [ ] Classificar cada feature: ESSENTIAL / NICE-TO-HAVE / DEAD-WEIGHT
- [ ] Identificar features que causam confusão (conflitam com core UX)
- [ ] Priorizar: Quais features remover vs. melhorar?

**Deliverable:**
- `product-feature-audit.md` — Inventário de features com classified (E/N/D)
- Top 5 features para remover imediatamente
- Priorização para refocus

**Input:** PRD original, stories docs/, pages/, components/
**Tempo Estimado:** 2-3 horas

---

### Squad 2: @ux-design-expert (Uma) — UX/Onboarding Focus
**Mission:** Diagnosticar por que primeira experiência é confusa

**Investigação:**
- [ ] Map onboarding flow (account creation → first dashboard)
- [ ] Identify confusing elements: data labels, terminology, button placement
- [ ] User testing scenarios: "New user creates account for first time"
- [ ] Compare with best practices (Stripe, Notion, Slack onboarding)
- [ ] Root cause: Is it UX design, terminology, or feature overload?

**Deliverable:**
- `onboarding-ux-audit.md` — Step-by-step flow with friction points
- Top 10 UX pain points (ranked by severity)
- Recommended redesign (quick wins + major changes)

**Input:** PublicBooking.tsx, pages/Dashboard.tsx, first-time flows
**Tempo Estimado:** 2-3 horas

---

### Squad 3: @analyst (Alex) — Data & Session Analysis
**Mission:** Analisar padrões de dados inconsistentes

**Investigação:**
- [ ] Correlate: Quais dados aparecem "errados" em qual contexto?
- [ ] Session trace: Rastrear quando dados começam a ficar inconsistentes
- [ ] User journey: Onde usuário se confunde COM DADOS?
- [ ] Data freshness: Dados desatualizados? Não sincronizam?
- [ ] Hypothesis testing: Qual layer introduz inconsistência? (frontend, backend, DB)

**Deliverable:**
- `data-consistency-analysis.md` — Root cause analysis de 5 principais inconsistências
- Hypothesis para cada problema
- Recomendações para investigação técnica

**Input:** Logs de usuário, session traces, telemetria (se disponível)
**Tempo Estimado:** 1-2 horas (requer dados)

---

### Squad 4: @data-engineer (Dara) — Data Integrity Audit
**Mission:** Auditar integridade estrutural de dados

**Investigação:**
- [ ] Schema integrity: Dados armazenados corretamente?
- [ ] Transformation bugs: Conversões frontend→backend corretas?
- [ ] RLS violations: Dados de outro tenant vazando?
- [ ] Foreign key violations: Relacionamentos intactos?
- [ ] Timestamp/versioning: Dados históricos corretos?

**Deliverable:**
- `data-integrity-audit.md` — Technical audit de 27 tabelas
- Top 5 data corruption risks
- SQL queries para detectar corrupção

**Input:** SCHEMA.md, DB audit logs, migrations
**Tempo Estimado:** 2-3 horas

---

## 🔄 Sequência de Execução

```
PARALLEL (todos ao mesmo tempo):
├─ Squad 1 (@po) — Product feature audit
├─ Squad 2 (@ux-design-expert) — Onboarding UX
├─ Squad 3 (@analyst) — Data consistency (correlate)
└─ Squad 4 (@data-engineer) — Data integrity

CONSOLIDATION (após 6-8h):
└─ @architect (Aria) — Consolidar findings em roadmap
```

---

## 📋 Consolidação Final (Aria)

**Após todos squads completarem:**
- Mapear interdependências (qual problema causa qual outro?)
- Priorizar roadmap (qual corrigir primeiro?)
- Criar épico para execução
- Estimar esforço total + timeline

**Output:** `product-health-roadmap.md` (similar a technical-debt-assessment.md)

---

## 🚀 Começando

**Proxima ação:** Ativar cada squad sequencialmente com instruções específicas.

```bash
# Será ativado via agent commands:
@po *audit-product-features
@ux-design-expert *audit-onboarding-ux
@analyst *analyze-data-consistency
@data-engineer *audit-data-integrity
```

---

**NOTAS:**
- Cada squad trabalha em paralelo — não precisa aguardar outra
- Documentação deve ser clara para consolidação
- Foco em ROOT CAUSES, não sintomas
