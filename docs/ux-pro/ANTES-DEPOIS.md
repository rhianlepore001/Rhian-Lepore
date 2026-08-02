# ANTES × DEPOIS — Fase 8

**Branch:** `design/ux-pro-sweep`  
**Antes:** `docs/ux-pro/shots/` + `docs/ux-pro/forensics/` (2026-08-02T09:18Z)  
**Depois:** `docs/ux-pro/AFTER/` + `docs/ux-pro/forensics-after/` (2026-08-02T13:08Z)  
**Escopo medido:** barber × dark/light × owner/staff × 390/1440 — **164 execuções** em ambos (beauty/slugs continua fora — Gate 0.7).

Delta bruto: `docs/ux-pro/forensics-after/DELTA.md` · RESUMO depois: `docs/ux-pro/forensics-after/RESUMO.md`.

---

## 1. Delta numérico (obrigatório)

| Dimensão | Antes | Depois | Δ | Leitura |
|---|---|---|---|---|
| Soma violações contraste AA | **598** | **242** | **−356 (−60%)** | Ganho sistêmico (on-accent + accent light) |
| Soma alvos <44px | **2494** | **1728** | **−766 (−31%)** | Chrome/settings melhoraram; Clientes ainda alto |
| Fontes distintas (produto) | 13 | 13 | 0 | Fase F (escala tipográfica) fora do corte |
| Espaçamentos distintos | 42 | 42 | 0 | Idem — 6px/10px persistem |
| Raios (sem pill) | 7 | 7 | 0 | Sem fechamento de gramática nesta leva |
| Overflow 390 | 0 rotas | 0 rotas | 0 | Mantido |

### Contraste light (onde doía)

| Rota (agregado owner+staff) | Light antes | Light depois |
|---|---|---|
| dashboard | alto (pior razão **1:1** no badge) | **3** violações no shot 390; pior razão **3,73** (Semana/Mês) — badge 1:1 **sumiu** |
| agenda | 52 | **24** |
| financeiro | (cluster alto) | **9** (soma placar) / light bem menor |
| cfg-agendamento | 26 | **6** |
| cfg-servicos | 16 | **2** |
| clientes | — | **6** (soma) / light **0** no 390 |

### Placar por rota (soma contraste AA — RESUMO §3)

| Rota | Antes | Depois |
|---|---|---|
| dashboard | 50 | **32** |
| agenda | 54 | **24** |
| financeiro | 39 | **9** |
| clientes | 28 | **6** |
| cfg-geral | 45 | **24** |
| cfg-servicos | 18 | **2** |
| insights | 36 | **20** |

---

## 2. Checklist do plano (auto-verificação)

| Item | Prova |
|---|---|
| `--color-on-accent` nas 4 combos | `design-system/tokens.css` |
| `buttonPrimary` usa on-accent | `hooks/useBrutalTheme.ts` + teste |
| Badge Header: borda `border-[var(--color-bg)]` + texto on-accent | `components/Header.tsx` · telemetria: razão 1:1 ausente |
| Toggles C2-001 desabilitados (“Em breve”) | `PublicBookingSettings.tsx` |
| Comissões salvam `getMemberDisplay` | `CommissionsSettings.tsx` |
| ErrorState Finance/Clients/Agenda | páginas respectivas |
| Wizard `role=dialog` + FocusTrap + Esc | `AppointmentWizard.tsx` |
| `shadow-heavy` removido de ServiceSettings | grep pages/ limpo no botão |
| Ring estático SubscriptionSettings | `ring-[var(--color-accent)]` |
| ClientArea CTA on-accent | páginas públicas |
| ForgotPassword no DS | sem `bg-blue-600` |
| Rating 5.0 removido | ProfessionalPortfolio |
| Register hint + mapError | Register.tsx |

**Não entregue neste corte (deliberado):** Fase F (escala type/spacing), beauty seed, mudança de IA bottom nav, migration toggles.

---

## 3. Fluxos que pagam a conta

Verificação nesta sessão: matriz forense + código HEAD. Smoke Playwright E2E dos 3 fluxos **não** foi reexecutado com seed completo nesta Fase 8 (custo/tempo da matriz 164×). Recomendação antes do merge: rodar manualmente ou e2e existente em `e2e/` se houver cobertura.

| Fluxo | Status Fase 8 |
|---|---|
| Agendar → aceitar → cobrar | Wizard a11y + Agenda ErrorState no código; **smoke E2E pendente** |
| Cadastrar cliente → histórico | Clients ErrorState; **smoke E2E pendente** |
| Abrir financeiro → conferir mês | Finance loading+ErrorState; telemetria financeiro OK |

---

## 4. Side-by-side visual (amostra)

Comparar PNGs homônimos:

| Superfície | Antes | Depois |
|---|---|---|
| Dashboard 390 owner light | `shots/barber-light/dashboard-390-owner.png` | `AFTER/barber-light/dashboard-390-owner.png` |
| Agenda 390 owner dark | `shots/barber-dark/agenda-390-owner.png` | `AFTER/barber-dark/agenda-390-owner.png` |
| Financeiro 390 owner light | `shots/barber-light/financeiro-390-owner.png` | `AFTER/barber-light/financeiro-390-owner.png` |
| cfg-agendamento 390 | `shots/.../cfg-agendamento-390-owner.png` | `AFTER/...` |
| Forgot-password | `shots/.../forgot-password-...` | `AFTER/...` |

---

## 5. O que ainda não melhorou (honesto)

1. **Inventário tipográfico/espaçamento** — 13 fontes / 42 spacings iguais; exige Fase F.  
2. **Alvos <44** — ainda 1728 somados; header ~38px em alguns modos; Clientes ~56–64.  
3. **Light residual** — chips Semana/Mês (~3,7:1), textos “Crítica”, insights/comissões.  
4. **Beauty / públicas com slug** — não medidos.

---

## 6. Placar próprio (orquestrador — não substitui Evaluator)

Estimativa pós-A–E (só barber):

| Pilar | Antes (plano) | Depois (auto) |
|---|---|---|
| Hierarquia | 5,5 | 5,8 |
| Espaçamento | 5,0 | 5,0 |
| Consistência | 4,5 | 6,0 |
| Densidade | 6,0 | 6,2 |
| Acessibilidade | 4,0 | **6,5** |
| Microcopy/feedback | 3,5 | **6,0** |
| **Média ponderada** | **~4,9** | **~5,9** |

Meta release ≥ 8,5 **não atingida** nesta auto-avaliação — Evaluator decide.
