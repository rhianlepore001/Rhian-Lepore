# User Stories — Fechamento da UI Audit

**Run:** `20260610_120000`  
**Objetivo:** encerrar 100% a remediação descrita em [UI-REMEDIATION-SPEC.md](./UI-REMEDIATION-SPEC.md)  
**Status do ciclo crítico:** S4–S8 implementados (ver [TASKBOARD arquivado](../../docs/v1/TASKBOARD.md) UI-S4…UI-S8)  
**Este documento:** backlog executável em user stories, com rastreabilidade e links.

---

## Como usar

1. Trabalhe **de cima para baixo** dentro de cada épico (dependências indicadas).
2. Ao concluir uma story, marque `[x]` nos critérios de aceite e atualize [UI-REMEDIATION-SPEC.md §10](./UI-REMEDIATION-SPEC.md#10-critérios-de-aceite-por-sprint-verificáveis).
3. Ao fechar um épico, rode: `npm run typecheck && npm run lint && npm run build && npm test -- --run`.
4. Smoke manual: 390px × 4 modos (barber/beauty × dark/light) — rota real + [UiPreview](../../pages/settings/UiPreview.tsx) (`/#/configuracoes/ui-preview`).

**Prioridade:** P0 (bloqueia fechamento) · P1 (débito SPEC) · P2 (deferred / polish)

---

## Mapa de referências

### Contratos e plano

| Documento | Papel |
|-----------|--------|
| [UI-REMEDIATION-SPEC.md](./UI-REMEDIATION-SPEC.md) | Contrato implementável (§7 telas, §10 aceite) |
| [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) | DS Lock v1.0-audit — tokens, radius, density |
| [sprints.md](./sprints.md) | Breakdown S1–S8 com checklists por feature |
| [DEFERRED-MIGRATION-PLAYBOOK.md](./DEFERRED-MIGRATION-PLAYBOOK.md) | Guia telas fora do escopo crítico |
| [priorities.md](./priorities.md) | Por que 4 telas críticas + deferred |
| [brand-decisions.md](./brand-decisions.md) | Marca fixa (gold/purple, Chivo/Inter) |
| [design-direction.md](./design-direction.md) | Direção visual por tela |

### Findings (evidência)

| Documento | Papel |
|-----------|--------|
| [findings-consolidated.md](./findings-consolidated.md) | 36 findings — índice master |
| [findings/components.md](./findings/components.md) | Dual stack Brutal* vs ui/* |
| [findings/visual-system.md](./findings/visual-system.md) | Tokens, light mode |
| [findings/heuristic.md](./findings/heuristic.md) | Nav, hierarquia |
| [findings/states.md](./findings/states.md) | Loading, empty, error |
| [findings/a11y.md](./findings/a11y.md) | Trap, touch, th |
| [findings/copy.md](./findings/copy.md) | PT-BR, sentence case |

### Referência visual (não copiar markup)

| Artefato | Tela |
|----------|------|
| [artifacts/screen-lock/login.html](./artifacts/screen-lock/login.html) | Login |
| [artifacts/screen-lock/dashboard.html](./artifacts/screen-lock/dashboard.html) | Dashboard |
| [artifacts/screen-lock/agenda.html](./artifacts/screen-lock/agenda.html) | Agenda |
| [artifacts/screen-lock/financeiro.html](./artifacts/screen-lock/financeiro.html) | Financeiro |
| [screen-lock.json](./screen-lock.json) | Metadados lock 4/4 |

### Código canônico

| Path | Papel |
|------|--------|
| [design-system/tokens.css](../../design-system/tokens.css) | Fonte única de cor/spacing |
| [hooks/useBrutalTheme.ts](../../hooks/useBrutalTheme.ts) | RADIUS_MAP, DENSITY_MAP, classes |
| [components/ui/](../../components/ui/) | Button, Card, Modal, Table, EmptyState… |
| [utils/mapError.ts](../../utils/mapError.ts) | Copy humana de erros (UI-014) |
| [pages/settings/UiPreview.tsx](../../pages/settings/UiPreview.tsx) | Matriz visual 4 temas |

### Quick wins

| Documento | Papel |
|-----------|--------|
| [quick-wins/clients-empty-state.md](./quick-wins/clients-empty-state.md) | Spec EmptyState Clients (UI-012) |

### Projeto

| Documento | Papel |
|-----------|--------|
| [docs/v1/TASKBOARD.md](../../docs/v1/TASKBOARD.md) | Status UI-S4…S8 |
| [specs/active/SPEC-ui-audit.md](../../specs/active/SPEC-ui-audit.md) | Spec O1 legada (telas críticas) |

---

## Definition of Done — audit fechada

A UI audit run `20260610_120000` considera-se **fechada** quando:

- [x] [UI-REMEDIATION-SPEC.md §10](./UI-REMEDIATION-SPEC.md#10-critérios-de-aceite-por-sprint-verificáveis) — todos os itens S1–S8 marcados `[x]` com evidência (S1 index.html paletas = defer documentado)
- [x] [DESIGN-SYSTEM.md checklist §final](./DESIGN-SYSTEM.md) — UiPreview + 4 screen-locks validados
- [x] `grep -r "BrutalCard\|BrutalButton" pages/` = 0 (exceto mocks de teste)
- [x] `grep -r "z-\[999\]\|z-\[200\]" components/` = 0 (escala semântica)
- [x] Smoke E2E manual documentado (390px × 4 modos) — [verification/SMOKE-MATRIX.md](./verification/SMOKE-MATRIX.md)
- [x] [TASKBOARD](../../docs/v1/TASKBOARD.md) — linha **UI-AUDIT-CLOSE** `done`

---

## Épico E0 — Fechar documentação da audit

> **Depende de:** nada · **Prioridade:** P0 · **Esforço:** Baixo

### US-E0-01 — Atualizar SPEC com status real pós-implementação

**Como** mantenedor da audit, **quero** que a SPEC reflita o que foi implementado, **para** não haver divergência entre contrato e código.

**Referências:** [UI-REMEDIATION-SPEC.md](./UI-REMEDIATION-SPEC.md) · [TASKBOARD UI-S4…S8](../../docs/v1/TASKBOARD.md)

**Critérios de aceite:**

- [ ] Cabeçalho: modo `implementado (S4–S8)` em vez de `design-only`
- [ ] §10: marcar `[x]` nos itens com evidência; `[ ]` só onde houver gap real (com nota)
- [ ] §13 Gate: status “ciclo crítico concluído; closeout = E1–E6”
- [ ] Link para este documento (`USER-STORIES-CLOSEOUT.md`)

---

## Épico E1 — S1 backbone (tokens + infra)

> **Depende de:** E0 · **Findings:** UI-001, UI-019, UI-020, UI-026, UI-027 · **SPEC:** [§5](./UI-REMEDIATION-SPEC.md#5-s1--backbone-tokens--hook-a-sprint-que-mata-a-genericidade)

### US-E1-01 — Limpar paletas duplicadas do index.html

**Como** dev, **quero** uma única fonte de tokens no build, **para** os 4 modos não divergirem entre CDN inline e `tokens.css`.

**Arquivos:** [index.html](../../index.html) · [design-system/tokens.css](../../design-system/tokens.css)

**Critérios de aceite:**

- [ ] Remover blocos `obsidian` / `silk` / `brutal` duplicados (~linhas 45–80) que já existem em tokens.css
- [ ] Manter CDN Tailwind + `<link>` tokens.css
- [ ] `<title>` = `AgendiX — Gestão do seu salão` (UI-035) — já ok, não regredir
- [ ] Build e smoke Login/Dashboard nos 4 modos

---

### US-E1-02 — Escala z-index semântica

**Como** dev, **quero** `--z-modal` / `--z-toast` em vez de `z-[999]`/`z-[200]`, **para** camadas previsíveis (SPEC §5.4, ban §1).

**Arquivos:** [components/ui/Modal.tsx](../../components/ui/Modal.tsx) · [components/ui/Toast.tsx](../../components/ui/Toast.tsx) · grep no repo

**Critérios de aceite:**

- [ ] Tokens `--z-modal`, `--z-toast` definidos em tokens.css (DS Lock §1.7)
- [ ] `ui/Modal` e `ui/Toast` usam tokens
- [ ] Migrar overlays legados prioritários: [AppointmentWizard.tsx](../../components/AppointmentWizard.tsx), [CheckoutModal.tsx](../../components/CheckoutModal.tsx), [Agenda.tsx](../../pages/Agenda.tsx) (wizard overlay)
- [ ] `grep -r "z-\[999\]\|z-\[200\]" components/ui/` = 0
- [ ] Modais ainda abrem/fecham; toast acima do conteúdo

---

### US-E1-03 — Validar contraste light mode (documentado)

**Como** dono de produto, **quero** evidência de contraste ≥ 4.5:1 em light, **para** cumprir Impeccable + WCAG.

**Referências:** [DESIGN-SYSTEM.md §1.2](./DESIGN-SYSTEM.md) · [findings/visual-system.md](./findings/visual-system.md)

**Critérios de aceite:**

- [ ] `--color-text-secondary` e `--color-text-muted` validados contra `--color-card` em barber-light e beauty-light
- [ ] Ajuste em tokens.css se necessário (bump ink, não intensificar beige)
- [ ] Nota de verificação anexada em `.ui-audit/20260610_120000/verification/light-contrast.md` (criar ao concluir)

---

## Épico E2 — S2 componentes base (completar DS)

> **Depende de:** E1 · **Findings:** UI-002, UI-006, UI-007, UI-022, UI-024 · **SPEC:** [§6](./UI-REMEDIATION-SPEC.md#6-s2--contratos-de-componente-state-matrix-obrigatória)

### US-E2-01 — Componente ui/Checkbox

**Como** dev, **quero** Checkbox canônico com matriz de estados §6, **para** forms consistentes.

**Referências:** SPEC §6 tabela · [UiPreview.tsx](../../pages/settings/UiPreview.tsx)

**Critérios de aceite:**

- [ ] `components/ui/Checkbox.tsx` + export em [components/ui/index.ts](../../components/ui/index.ts)
- [ ] Estados: default, focus (ring accent), disabled, error (dangerBorder)
- [ ] Entrada no UiPreview × 4 temas
- [ ] Teste smoke em [components/ui/__tests__/](../../components/ui/__tests__/)

---

### US-E2-02 — Eliminar side-stripe e ghost gradient em cards

**Como** usuário, **quero** cards sem faixa lateral decorativa, **para** interface menos genérica (ban §1).

**Referências:** [findings/components.md](./findings/components.md) · grep `border-l-4` · [PublicLinkCard.tsx](../../components/PublicLinkCard.tsx)

**Critérios de aceite:**

- [ ] `grep "border-l-4" components/ui/` = 0
- [ ] Cards em escopo migrado usam `Card outlined|elevated` apenas
- [ ] Remover ghost gradient de [BrutalCard.tsx](../../components/BrutalCard.tsx) wrapper se ainda presente
- [ ] Lista de arquivos corrigidos no PR

---

### US-E2-03 — UiPreview cobre todos os componentes × 4 temas

**Como** QA visual, **quero** preview único dos componentes DS, **para** regressão rápida.

**Referências:** [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) checklist final · [UiPreview.tsx](../../pages/settings/UiPreview.tsx)

**Critérios de aceite:**

- [ ] Renderiza: Button, Input, Select, Card, Modal, Table, EmptyState, Skeleton, Toast, Badge, Checkbox (pós E2-01)
- [ ] Toggle barber/beauty × dark/light sem erro console
- [ ] Checklist DESIGN-SYSTEM §final marcado `[x]`

---

## Épico E3 — Quick wins (baixo esforço, alto alinhamento SPEC)

> **Depende de:** E2 parcial · **Findings:** UI-012, UI-014

### US-E3-01 — EmptyState Clients (copy UI-012)

**Como** dono de salão sem clientes, **quero** mensagem clara do que fazer, **para** cadastrar o primeiro cliente.

**Referências:** [quick-wins/clients-empty-state.md](./quick-wins/clients-empty-state.md) · [pages/Clients.tsx](../../pages/Clients.tsx) · SPEC §9

**Critérios de aceite:**

- [ ] `title` exato: *Seus clientes aparecem aqui. Cadastre o primeiro ou importe da agenda.*
- [ ] Remover `description` redundante
- [ ] CTA `Adicionar cliente` abre modal existente
- [ ] 4 modos legíveis em 390px
- [ ] Critérios do quick-win doc marcados `[x]`

---

### US-E3-02 — Finance: erros via mapError (UI-014)

**Como** usuário, **quero** mensagens de erro em português, **para** não ver `error.message` técnico.

**Referências:** [utils/mapError.ts](../../utils/mapError.ts) · [pages/Finance.tsx](../../pages/Finance.tsx) · Agenda (referência)

**Critérios de aceite:**

- [ ] Toasts de create/delete/liquidar usam `mapError()` ou copy humana fixa
- [ ] `grep "error.message" pages/Finance.tsx` = 0 no JSX exposto ao usuário
- [ ] typecheck + testes verdes

---

### US-E3-03 — Checkout e Wizard → ui/Modal

**Como** barbeiro no checkout, **quero** modal acessível com focus-trap, **para** concluir atendimento com segurança.

**Referências:** SPEC §7.4 (Checkout/Commission) · [CheckoutModal.tsx](../../components/CheckoutModal.tsx) · [AppointmentWizard.tsx](../../components/AppointmentWizard.tsx)

**Critérios de aceite:**

- [ ] CheckoutModal usa `ui/Modal` (`size="lg"` ou `full` mobile)
- [ ] AppointmentWizard overlay custom → `ui/Modal`
- [ ] Focus-trap, ESC, `role="dialog"` via componente canônico
- [ ] [CheckoutModal.test.tsx](../../components/CheckoutModal.test.tsx) passa

---

## Épico E4 — Telas deferred: Clients

> **Depende de:** E3-01 · **Playbook:** [§2](./DEFERRED-MIGRATION-PLAYBOOK.md#2-clients--pagesclientstsx)

### US-E4-01 — Migrar Clients para ui/* + PageHeader

**Como** dono, **quero** a lista de clientes com o mesmo visual das telas críticas, **para** confiança no produto.

**Arquivos:** [pages/Clients.tsx](../../pages/Clients.tsx)

**Critérios de aceite:**

- [ ] `grep Brutal pages/Clients.tsx` = 0
- [ ] `PageHeader` + 1 CTA `Adicionar cliente`
- [ ] Grid de clientes: `Card variant="outlined"` + tokens (sem hardcode beauty-neon)
- [ ] Loading: `SkeletonCard` × 3
- [ ] Modal cadastro: `ui/Modal` + `Input`
- [ ] Smoke `/#/clientes` × 4 modos

---

## Épico E5 — Telas deferred: Settings

> **Depende de:** E2 · **Playbook:** [§4](./DEFERRED-MIGRATION-PLAYBOOK.md#4-settings--pagessettingstsx)

### US-E5-01 — Migrar SettingsSection (desbloqueia GeneralSettings)

**Como** dev, **quero** um wrapper de seção canônico, **para** todas as sub-páginas herdarem Card DS.

**Arquivos:** [components/SettingsSection.tsx](../../components/SettingsSection.tsx)

**Critérios de aceite:**

- [ ] `SettingsSection` compõe `ui/Card` (não `BrutalCard`)
- [ ] GeneralSettings visualmente igual ou melhor nos 4 modos
- [ ] Sem regressão em SaveFooter

---

### US-E5-02 — Lote Settings: Team + Services

**Arquivos:** [TeamSettings.tsx](../../pages/settings/TeamSettings.tsx) · [ServiceSettings.tsx](../../pages/settings/ServiceSettings.tsx)

**Critérios de aceite:**

- [ ] `grep Brutal` = 0 nos dois arquivos
- [ ] Empty team → `EmptyState`
- [ ] Botões `Salvar alterações` / `Adicionar` (copy §9)

---

### US-E5-03 — Lote Settings: Financial + Commissions + Security

**Arquivos:** [FinancialSettings.tsx](../../pages/settings/FinancialSettings.tsx) · [CommissionsSettings.tsx](../../pages/settings/CommissionsSettings.tsx) · [SecuritySettings.tsx](../../pages/settings/SecuritySettings.tsx)

**Critérios de aceite:**

- [ ] `grep Brutal` = 0
- [ ] Sem `border-l-4` side-stripe
- [ ] Tabelas densas → `ui/Table` onde aplicável

---

### US-E5-04 — Lote Settings: Subscription + Audit + Recycle + PublicBookingSettings

**Arquivos:** restantes em [pages/settings/](../../pages/settings/)

**Critérios de aceite:**

- [ ] `grep BrutalCard pages/settings/` + SettingsSection = 0
- [ ] Shell [SettingsLayout.tsx](../../components/SettingsLayout.tsx) usa tokens S3
- [ ] OwnerRouteGuard intacto

---

## Épico E6 — Telas deferred: Public Booking

> **Depende de:** E1-02 · **Playbook:** [§3](./DEFERRED-MIGRATION-PLAYBOOK.md#3-public-booking--pagespublicbookingtsx)

### US-E6-01 — Modais Public Booking → ui/Modal

**Como** cliente final, **quero** modais legíveis e acessíveis no agendamento público, **para** concluir reserva no celular.

**Arquivos:** [pages/PublicBooking.tsx](../../pages/PublicBooking.tsx) · [ClientAuthModal.tsx](../../components/ClientAuthModal.tsx)

**Critérios de aceite:**

- [ ] Policy modal + bottom sheet → `ui/Modal`
- [ ] 0 `fixed inset-0` custom sem ui/Modal
- [ ] Smoke `/#/booking/:slug` fluxo completo

---

### US-E6-02 — Tipografia mínima 12px no Public Booking

**Como** cliente mobile, **quero** texto legível, **para** ler horários e preços.

**Referências:** [SPEC-ui-audit.md](../../specs/active/SPEC-ui-audit.md) Booking · T1

**Critérios de aceite:**

- [ ] `grep "text-\[9px\]\|text-\[10px\]\|text-\[11px\]" pages/PublicBooking.tsx` = 0
- [ ] Substituir por `text-xs` + tokens `colors.textSecondary`
- [ ] Contraste ok em beauty-light e barber-light

---

## Épico E7 — Telas deferred: Onboarding

> **Depende de:** E2 · **Playbook:** [§5](./DEFERRED-MIGRATION-PLAYBOOK.md#5-onboarding--pagesonboardingwizardtsx--componentsonboarding)

### US-E7-01 — Wizard onboarding com tokens (sem accentColor string)

**Como** novo owner, **quero** onboarding coerente com o resto do app, **para** confiar no setup inicial.

**Arquivos:** [pages/OnboardingWizard.tsx](../../pages/OnboardingWizard.tsx) · [components/onboarding/](../../components/onboarding/)

**Critérios de aceite:**

- [ ] Loading screen usa tokens (sem `bg-neutral-950` hardcoded)
- [ ] Steps usam `useBrutalTheme().accent` — remover prop `accentColor: string`
- [ ] CTAs: `Continuar` / `Button primary`
- [ ] Fluxo completo nos 4 modos
- [ ] `grep "isBeauty ? 'beauty-neon'" components/onboarding/` = 0

---

## Épico E8 — Telas secundárias (pós-deferred)

> **Prioridade:** P2 · **Não bloqueia** closeout se épico E0–E7 + DoD forem cumpridos para escopo acordado

### US-E8-01 — Migrar superfícies com Brutal* restantes

**Referências:** [UISurfaceMap.md](./UISurfaceMap.md) · [legacy-design-inventory.md](./legacy-design-inventory.md)

**Arquivos típicos:** [QueueManagement.tsx](../../pages/QueueManagement.tsx) · [ClientCRM.tsx](../../pages/ClientCRM.tsx) · [Reports.tsx](../../pages/Reports.tsx) · [StaffInsights.tsx](../../pages/StaffInsights.tsx) · componentes marketing/CRM

**Critérios de aceite:**

- [ ] Inventário atualizado com contagem `Brutal*` = 0 em `pages/` e `components/` (exceto wrappers deprecated)
- [ ] Priorizar telas do [UISurfaceMap](./UISurfaceMap.md) ainda usadas diariamente

---

### US-E8-02 — Reduzir isBeauty hardcoded (R3)

**Como** dev, **quero** tema via hook/tokens, **para** 4 modos funcionarem sem ternários espalhados.

**Referências:** SPEC §2 R3 · grep `isBeauty`

**Critérios de aceite:**

- [ ] Documento `.ui-audit/20260610_120000/verification/isBeauty-reduction.md` com meta e arquivos migrados
- [ ] Meta fase 1: 0 ternários `beauty-neon|accent-gold` em `pages/` (permitido temporariamente em componentes legados não migrados)

---

## Épico E9 — Verificação final e encerramento

> **Depende de:** E0–E7 (E8 opcional)

### US-E9-01 — Smoke matrix 390px × 4 modos

**Como** QA, **quero** checklist executado e arquivado, **para** fechar a audit com evidência.

**Rotas mínimas:**

| Rota | Referência visual |
|------|-------------------|
| `/#/login` | [login.html](./artifacts/screen-lock/login.html) |
| `/#/` | [dashboard.html](./artifacts/screen-lock/dashboard.html) |
| `/#/agenda` | [agenda.html](./artifacts/screen-lock/agenda.html) |
| `/#/financeiro` | [financeiro.html](./artifacts/screen-lock/financeiro.html) |
| `/#/clientes` | playbook §2 |
| `/#/configuracoes/ui-preview` | DESIGN-SYSTEM |
| `/#/booking/:id` | playbook §3 |

**Critérios de aceite:**

- [ ] Arquivo `.ui-audit/20260610_120000/verification/SMOKE-MATRIX.md` preenchido (data, executor, pass/fail por célula)
- [ ] Zero P0 visual (texto ilegível, modal trap quebrado, CTA inacessível)

---

### US-E9-02 — Registrar encerramento no TASKBOARD

**Critérios de aceite:**

- [ ] Linha `UI-AUDIT-CLOSE` em [docs/v1/TASKBOARD.md](../../docs/v1/TASKBOARD.md) → `done`
- [ ] Link para SMOKE-MATRIX + SPEC §10 todo `[x]`
- [ ] [UI-REMEDIATION-SPEC.md §13](./UI-REMEDIATION-SPEC.md#13-gate) → status **Audit fechada**

---

## Ordem sugerida de execução

```
E0 (doc) → E3-01 (Clients copy) → E1 (index + z-index) → E3-02/03 (Finance errors + modais checkout)
  → E2 (Checkbox, UiPreview) → E5-01 (SettingsSection) → E4/E5/E6/E7 (deferred por lote)
  → E9 (smoke + close)
  → E8 (opcional, backlog pós-close)
```

---

## Rastreabilidade Finding → Story

| Finding | Story |
|---------|-------|
| UI-001 tokens triplos | US-E1-01 |
| UI-026 z-999 | US-E1-02 |
| UI-005 light mode | US-E1-03, E6-02 |
| UI-002 modal trap | US-E3-03, E6-01 |
| UI-003 dual Card | E4, E5, E8 |
| UI-012 empty clients | US-E3-01, E4-01 |
| UI-014 erros crus | US-E3-02 |
| UI-016 modais custom | US-E3-03, E6-01 |
| UI-031 onboarding/settings | E5, E7 |
| UI-033 drift UiPreview | US-E2-03 |
| UI-028 th semântico | já S7; replicar E5/E8 |

---

## Histórico

| Data | Evento |
|------|--------|
| 2026-06-10 | Run audit iniciado — screen lock 4/4 |
| 2026-06-10 | S4–S8 code implementado (telas críticas + playbook) |
| 2026-06-10 | Closeout E0–E9 executado — 241/241 testes, SMOKE-MATRIX arquivado |
