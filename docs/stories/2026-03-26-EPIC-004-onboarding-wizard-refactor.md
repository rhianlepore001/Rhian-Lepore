---
id: EPIC-004
title: Onboarding Wizard Refactor — SetupCopilot como Wizard Guiado
status: Draft
sprint: 2
startDate: "TBD"
endDate: "TBD"
squad: setup-wizard-squad
branch: feature/onboarding-wizard-refactor
---

# EPIC-004: Onboarding Wizard Refactor

**Objetivo:** Simplificar o onboarding inicial (remover overlay bloqueante e dados duplicados) e transformar o `SetupCopilot` em um wizard guiado real — com seta animada, spotlight e navegação contextual — para que usuários leigos consigam configurar o sistema sem precisar de suporte.

**Activation Event:** Primeiro agendamento criado
**Squad:** setup-wizard-squad (Atlas + Craft + River)
**Handoff Base:** `docs/stories/2026-03-26-SM-HANDOFF-onboarding-wizard-refactor.md`

---

## Stories do Epic

| Story | Título | Esforço | Prioridade | Blocker |
|-------|--------|---------|-----------|---------|
| [US-0401](./4.1.simplificar-onboarding-inicial.md) | Simplificar Onboarding Inicial | 5h | P0 | — |
| [US-0402](./4.2.guided-mode-context.md) | GuidedModeContext — estado global | 4h | P0 | — |
| [US-0403](./4.3.ids-elementos-alvo.md) | IDs nos elementos-alvo | 2h | P1 | US-0402 |
| [US-0404](./4.4.wizard-pointer-standalone.md) | WizardPointer standalone | 3h | P1 | US-0402 |
| [US-0405](./4.5.setupcopilot-auto-start.md) | SetupCopilot auto-start 1ª visita | 4h | P1 | US-0402, US-0404 |
| [US-0406](./4.6.setupcopilot-guided-mode.md) | SetupCopilot guided mode por step | 8h | P1 | US-0403, US-0404, US-0405 |
| [US-0407](./4.7.retomada-sessao.md) | Retomada de sessão do wizard | 3h | P2 | US-0405, US-0406 |
| [US-0408](./4.8.completion-detection.md) | Completion detection por página | 4h | P1 | US-0406 |
| [US-0409](./4.9.activation-event-milestone.md) | Activation Event — primeiro agendamento | 3h | P2 | US-0408 |
| [US-0410](./4.10.animacoes-polish-wizard.md) | Animações e polish do wizard | 4h | P2 | US-0406, US-0408 |

**Total estimado:** 40h

---

## Ordem de Execução por Sprint

```
Sprint A (paralelas, sem blocker):
  US-0401 — Simplificar Onboarding Inicial
  US-0402 — GuidedModeContext

Sprint B (após Sprint A, paralelas):
  US-0403 — IDs nos elementos-alvo
  US-0404 — WizardPointer standalone

Sprint C (após Sprint B):
  US-0405 — SetupCopilot auto-start

Sprint D (após Sprint C):
  US-0406 — SetupCopilot guided mode por step

Sprint E (após Sprint D, paralelas):
  US-0407 — Retomada de sessão
  US-0408 — Completion detection

Sprint F (após Sprint E, paralelas):
  US-0409 — Activation Event milestone
  US-0410 — Animações e polish
```

---

## Decisões de Produto

| Decisão | Escolha confirmada pelo PO |
|---------|---------------------------|
| Activation Event | Primeiro agendamento criado |
| Wizard na 1ª visita | Inicia automaticamente (skip disponível) |
| Retomada de sessão | Retoma do último step incompleto |
| Solo vs Equipe | Step de equipe opcional para todos |

## Decisões Técnicas

| Decisão | Resolução |
|---------|-----------|
| Overflow hidden no spotlight | `position: fixed` — imune ao clip |
| Persistência guided mode | `sessionStorage` + `onboarding_progress.step_data` |
| Animação mobile | `prefers-reduced-motion` + disable em hw lento |
| Detecção de conclusão | Custom event `setup-step-completed` |

---

---

## ✅ Validação PO (Pax) — 2026-03-26

| Story | Score | Status | Notas |
|-------|-------|--------|-------|
| US-0401 | 8/10 | ✅ GO | Adicionar descrição do StepWelcome (saudação + businessName pré-preenchido) |
| US-0402 | 9/10 | ✅ GO | Adicionar AC9: graceful degradation quando Supabase falha |
| US-0403 | 9/10 | ✅ GO | Adicionar `type: technical-enabler` no frontmatter |
| US-0404 | 9/10 | ✅ GO | Adicionar AC9: cleanup/memory leak em endGuide() |
| US-0405 | 8/10 | ✅ GO | Adicionar AC9: formalizar ordem STEP_PRIORITY no critério |
| US-0406 | 8/10 | ✅ GO | Adicionar AC10: opacity 40% em steps inativos durante guided mode |
| US-0407 | 10/10 | ✅ APROVADO | Perfeito — sem notas |
| US-0408 | ✅ CORRIGIDO | ✅ GO | AC8/AC9/AC10 adicionados (permanece na página + toast de próximo step) |
| US-0409 | ✅ CORRIGIDO | ✅ GO | Pré-condição DB adicionada (verificar/criar colunas antes do dev) |
| US-0410 | 9/10 | ✅ GO | Adicionar AC10: testar CLS=0 em Chrome DevTools |

**Veredicto geral: EPIC-004 aprovado para desenvolvimento** ✅

> ⚠️ **Ação obrigatória antes de US-0409:** Verificar se colunas `activation_completed` e `activated_at` existem na tabela `profiles`. Criar migration se necessário (SQL incluído em US-0409).

---

*Criado por River (@sm) — 2026-03-26*
*Validado por Pax (@po) — 2026-03-26*
