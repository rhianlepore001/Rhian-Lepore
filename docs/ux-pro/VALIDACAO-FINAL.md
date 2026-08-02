# VALIDAÇÃO FINAL — Auditoria independente de execução (UX-pro A–E)

**Rodada: 2**  
**Auditor:** agente independente (conformidade + integridade; sem julgamento estético)  
**Data:** 2026-08-02  
**Branch auditada:** `design/ux-pro-sweep` @ `db4baf8`  
**Base de comparação:** `main...design/ux-pro-sweep`  
**Commits UX-pro nomeados:** `3e8f872` (A) · `cda1cfa` (B/C) · `b3ead27` (E) · `e9b74c8` (docs/memória) · `db4baf8` (remediação R1)  
**Plano canônico:** `docs/ux-pro/PLANO.md` (Fases A–E; F fora; E2 migration NÃO; beauty seed NÃO; C4-010 só documentar)  
**Rodada 1 arquivada:** `docs/ux-pro/VALIDACAO-FINAL-R1.md` (não copiada; reauditoria do zero)

> Método: cada item foi aberto no arquivo (ou no diff/HEAD). A palavra do implementador **não** foi aceita como prova isolada.  
> **Base de veredito = `git HEAD` (`db4baf8`).** Working tree dirty em `SettingsLayout.tsx` / `Header.tsx` / `PublicBooking.tsx` é tratado em §3(a)/§4 — não conta como entrega.

---

## 1. Contagem por veredicto

| Veredicto | Qtd |
|---|---|
| **ENTREGUE** | 25 |
| **PARCIAL** | 2 |
| **NÃO ENTREGUE** | 1 |
| **DIVERGENTE** | 0 |
| **Total itens tabelados** | 28 |

**Delta vs R1 (mesmos critérios):** PageHeader, `ui/Checkbox`, Wizard→`ui/Modal`, residual Portfolio on-accent e versionamento AFTER/forensics passaram a **ENTREGUE**. ForgotPassword e Settings `ui/Input` permanecem **PARCIAL**. C4-007 tipografia permanece **NÃO ENTREGUE** (corte F).

---

## 2. Tabela de conformidade (Fases A–E)

### Fase A — Tokens e primitivos

| Item | Veredicto | Prova |
|---|---|---|
| `--color-on-accent` nas 4 combinações | **ENTREGUE** | `design-system/tokens.css:116` (barber dark), `:181` (barber light), `:244` (beauty dark), `:307` (beauty light) |
| Recalibração accent/success light (AA sobre surface) | **ENTREGUE** | barber light accent `#6B5010` + success `#047857` (`tokens.css:177,196`); beauty light accent `#6D28D9` + success `#047857` (`:303,322`) |
| Overlay light ≥~0,70 (CONHECIDO-015) | **ENTREGUE** | `tokens.css:176` barber light `rgba(20,20,20,0.72)`; `:302` beauty light `rgba(23,19,42,0.72)` |
| `buttonPrimary` usa on-accent | **ENTREGUE** | `hooks/useBrutalTheme.ts:302` `text-[var(--color-on-accent)]`; teste `test/hooks/useBrutalTheme.test.ts:152` |
| C4-007 type/spacing tokens (parcial no plano A) | **NÃO ENTREGUE** | `ANTES-DEPOIS.md` + `forensics-after/DELTA.md`: fontes 13→13, espaçamentos 42→42 — zero delta; resto em Fase F (fora do Gate) |

### Fase B — Honesty: saves e rede

| Item | Veredicto | Prova |
|---|---|---|
| C2-001 toggles UI-only desabilitados (sem migration E2) | **ENTREGUE** | `pages/settings/PublicBookingSettings.tsx:144-161` — “Em breve”, `pointer-events-none`, `aria-disabled`, switch `checked={false}` / `onChange={() => undefined}`; commits UX sem migration de schema |
| C2-002 save usa `getMemberDisplay` / `editedMembers` | **ENTREGUE** | `pages/settings/CommissionsSettings.tsx:66-67` + `handleSaveCommissionRate` `:120-127` persiste `commission_payment_frequency` / `day` via `getMemberDisplay` |
| ErrorState Finance (abort ≠ empty) | **ENTREGUE** | `pages/Finance.tsx:597-602` |
| ErrorState Clients | **ENTREGUE** | `pages/Clients.tsx:244-249` |
| ErrorState Agenda | **ENTREGUE** | `pages/Agenda.tsx:1117-1124` |
| Loading Finance (skeleton vivo) | **ENTREGUE** | `pages/Finance.tsx:588-594` `SkeletonCard` + `role="status"` |

### Fase C — Composição

| Item | Veredicto | Prova |
|---|---|---|
| AppointmentWizard `role=dialog` + FocusTrap + Esc | **ENTREGUE** | Via `components/ui/Modal.tsx:64-71` (Escape), `:107-119` (`FocusTrap`, `role="dialog"`, `aria-modal`); wizard consome em `AppointmentWizard.tsx:275-283` |
| AppointmentWizard → `components/ui/Modal` | **ENTREGUE** | `AppointmentWizard.tsx:6` import; `:275-283` / `:502` wrapper `<Modal open …>`; sem casco próprio/`createPortal`/`FocusTrap` no wizard |
| `shadow-heavy` removido de `pages/` | **ENTREGUE** | `rg shadow-heavy pages` → 0; `ServiceSettings.tsx:209` usa `shadow-[var(--shadow-btn-primary)]` |
| Ring estático SubscriptionSettings (C2-012) | **ENTREGUE** | `pages/settings/SubscriptionSettings.tsx:147` `ring-2 ring-[var(--color-accent)]` |
| SettingsLayout alvos ≥44px | **ENTREGUE** *(HEAD)* | `components/SettingsLayout.tsx` @ HEAD: NavLink `:53` `min-h-[44px]`; Voltar sidebar `:81`; chips rail `min-h-[44px]`. **WT dirty regressa chips/voltar mobile para `min-h-10` (40px) — ver §3(a)/§4** |
| PageHeader nas 5 páginas do escopo C1-010 | **ENTREGUE** | `Agenda.tsx:1133`; `QueueManagement.tsx:245`; `ClientCRM.tsx:342`; `StaffInsights.tsx:111,128`; `Products.tsx:442` |
| Settings tocadas usam `ui/Input` + `SettingsRow` | **PARCIAL** | `PublicBookingSettings` usa `SettingsRow` (`:155-162`); `CommissionsSettings` **não** importa `ui/Input` / `SettingsRow` (formulário próprio + `alert()` em `:99-197`) |

### Fase D — Chrome e ergonomia

| Item | Veredicto | Prova |
|---|---|---|
| Header badge C4-001 (borda token + on-accent) | **ENTREGUE** | `components/Header.tsx:170` `border-[var(--color-bg)]` + `text-[var(--color-on-accent)]` |
| Header min touch ≥44px | **ENTREGUE** | `components/Header.tsx:141,163` `min-h-[44px] min-w-[44px]` (modo + notificações) — **não regressou para 40px no HEAD** |
| Agenda aria-labels (ícones/ações) | **ENTREGUE** | `pages/Agenda.tsx:1143,1152` (+ demais ações no header/grade) |
| C4-010 IA mobile só documentada | **ENTREGUE** | `components/BottomMobileNav.tsx:33-34` comentário C4-010; nav não reposicionada |

### Fase E — Públicas e auth

| Item | Veredicto | Prova |
|---|---|---|
| ClientArea CTA barber on-accent | **ENTREGUE** | `pages/ClientArea.tsx:348,394,460,632,691` `bg-theme-accent text-[var(--color-on-accent)]` no ramo barber |
| ForgotPassword no DS (C3-007) | **PARCIAL** | CTA principal usa accent/on-accent (`ForgotPassword.tsx:96`); **permanecem** `from-blue-500/5` (`:40`), card `border-4 border-black` + `shadow-brutal` + `Screw` (`:49-53`), `<input>` nativo (não `ui/Input`), botão pós-sucesso `bg-white hover:bg-neutral-200` (`:123`) |
| Portfolio rating “5.0” removido | **ENTREGUE** | Grep `5.0` / Star / Avaliações em `ProfessionalPortfolio.tsx` → 0 |
| Register hint + `mapError` | **ENTREGUE** | `pages/Register.tsx:12,96` `mapError`/`formatUserFacingError`; hint senha `:169,335` |
| Checkbox → `ui/Checkbox` (C3-008) | **ENTREGUE** | `pages/PublicBooking.tsx:20` import; `:1076,1094,1610,1622` `<Checkbox …>`; zero `type="checkbox"` nativo na página @ HEAD |
| Residuais on-accent em públicas tocadas | **ENTREGUE** | `ProfessionalPortfolio.tsx:145` agora `text-[var(--color-on-accent)]` (era `color-bg` na R1) |

### Prova §7.3 (matriz AFTER) — critério de pronto

| Item | Veredicto | Prova |
|---|---|---|
| AFTER + forensics-after + ANTES-DEPOIS versionados | **ENTREGUE** | `git ls-files`: 164 PNGs em `docs/ux-pro/AFTER/`; 29 arquivos em `docs/ux-pro/forensics-after/` (incl. `DELTA.md`, `RESUMO.md`); `docs/ux-pro/ANTES-DEPOIS.md` tracked — entraram em `db4baf8` |

### Itens deliberadamente fora (confirmados — correto)

| Item | Status | Nota |
|---|---|---|
| Fase F / Dashboard CONHECIDO-016/017 | Fora | Gate |
| E2 migration toggles C2-001 | Fora | Path UI-only cumprido |
| Beauty seed / Gate 0.7 | Fora | Matriz AFTER só barber |
| C4-010 mudar IA bottom nav | Fora | Só documentado |

---

## 3. Dano colateral

### (a) Regressão visual / telemetria

**Fonte:** `docs/ux-pro/forensics-after/DELTA.md` (164×164), versionado.

| Dimensão | Antes → Depois | Regressão? |
|---|---|---|
| Soma contraste AA | 598 → 242 (−60%) | Não (melhora) |
| Soma alvos &lt;44px | 2494 → 1728 (−31%) | Não |
| Por rota × modo | Todas as linhas do DELTA melhoram ou empatam | **Nenhuma rota piorou** contraste ou alvos |
| Fontes / espaçamentos | 13 / 42 estáveis | Esperado (F fora) |

**Risco de processo (working tree):** `git status` mostra `M components/SettingsLayout.tsx` com chips/`Voltar` mobile em `min-h-10`/`min-w-10` (**40px**), enquanto HEAD tem `min-h-[44px]`. Se esse WT for commitado/deployado, **reabre regressão D** nos alvos de Settings. Header @ HEAD permanece ≥44px.

### (b) Identidade de marca / negócio / RLS / deps

| Checagem | Resultado |
|---|---|
| Dependência nova em `package.json` (diff vs main) | **Nenhuma** |
| Migration E2 de toggles | **Ausente** (correto) |
| RLS / migration na branch `main...HEAD` | Presente via merge **fila/colaborador** (`956c067` etc.), **não** nos commits A–E/`db4baf8`; risco de merge se o PR for vendido como “só UX” |
| Escopo de negócio misturado nos commits UX | **Sim:** `3e8f872` inclui `PublicBooking.tsx` com produtos públicos; `cda1cfa` reescreve comissões (`ProfessionalCommissionDetails.tsx`). Não é violação RLS óbvia; **não é trabalho A–E** |
| Marca / fontes / novos acentos §2.1 | Sem troca de família tipográfica; accent light escurecido por AA (E1 aprovado) |

### (c) Classe Tailwind interpolada nova

- C2-012: interpolação **removida** (não reintroduzida).
- Nos arquivos UX tocados: padrão = classes estáticas com `var(--token)` / tokens de `useBrutalTheme`.
- Nenhuma nova `'ring-' + var` detectada no código de entrega HEAD.

### (d) Correção que quebra tema oposto

- Tokens on-accent / accent / overlay atualizados nas **4** combinações.
- Residuais `text-[var(--color-bg)]` sobre accent ainda existem em settings/listagens **não** cobertas como “públicas tocadas” (`ServiceSettings.tsx:102`, `SubscriptionSettings.tsx:150`, `MembershipSettings.tsx:114`, etc.) — dívida light residual, não regressão dark.
- ClientArea beauty permanece em surface (não forçado barber) — OK.

### (e) Dívida ratchet

- `scripts/design-debt-baseline.json`: **sem diff** vs `main` → ratchet não afrouxado.

### (f) Teste skip / only / deletado

| Checagem | Resultado |
|---|---|
| Testes deletados no range (`--diff-filter=D` em test/e2e/hooks) | **Nenhum** |
| `test.skip` / `.only` nos diffs de teste | Não observados |
| Diff de testes UX | `useBrutalTheme.test.ts` (+assert on-accent) |
| Reexecução typecheck/lint/test/build nesta auditoria | **Não reexecutada** — gates `db4baf8` aceitos como registro do orquestrador (367/367) |

### (g) Commit mensagem ≠ conteúdo

| Commit | Mensagem | Conteúdo real | Veredicto |
|---|---|---|---|
| `3e8f872` | “Fase A” tokens/contraste | Tokens + Honesty rede (ErrorState) + Header + **produtos em PublicBooking** | **DIVERGENTE** (escopo) |
| `cda1cfa` | “Fase B/C” saves/dívida settings | Settings honesty OK + **rewrite comissões/produtos** | **DIVERGENTE** |
| `b3ead27` | “Fase E” públicas/auth | Alinha ClientArea/Forgot/Portfolio/Register; Forgot “no DS” ainda parcial | **OK com ressalva** |
| `e9b74c8` | plano + memória | Docs | OK |
| `db4baf8` | “fecha lacunas… (PageHeader, Checkbox, Modal)” + body versiona AFTER/forensics | Arquivos batem com a mensagem (wizard, Checkbox, PageHeader, AFTER, forensics, ajustes ui/*) | **OK** — **não** alegou fechar ForgotPassword |

---

## 4. O que EXIGE correção antes do release

1. **ForgotPassword C3-007 de verdade:** remover `from-blue-500/5`, alinhar card à família auth (`elevation-3` / sem brutal alienígena), migrar para `ui/Input`+`ui/Button` (ou equivalente DS), corrigir CTA pós-sucesso `bg-white` → tokens on-accent/surface. Continua **PARCIAL** e é prova explícita da Fase E.
2. **Descartar ou reverter o working tree dirty de `SettingsLayout.tsx`** antes de qualquer commit/deploy — o WT atual **regride** chips e Voltar mobile de 44px → 40px (`min-h-10`), desfazendo prova da Fase D.
3. **Separar ou justificar** (no PR) o código de produtos/comissões embutido em `3e8f872`/`cda1cfa` e o merge RLS de fila — não bloqueará se o Gate aceitar o PR composto, mas não pode ser omitido.

Não bloqueiam este corte (deliberados / ok no HEAD): Fase F, E2 migration, beauty seed, mudança de IA bottom nav, C4-007 tipografia, PageHeader/Checkbox/Modal/AFTER (fechados em `db4baf8`), Header ≥44px.

Opcional / não bloqueante: completar `ui/Input`+`SettingsRow` em `CommissionsSettings`; limpar `text-[var(--color-bg)]` residual em settings; smoke E2E dos 3 fluxos (§7.4) ainda pendente no `ANTES-DEPOIS.md`.

---

## 5. Veredito final

**Contagem:** 25 ENTREGUE · 2 PARCIAL · 1 NÃO ENTREGUE · 0 DIVERGENTE (28 itens A–E) + prova §7.3 AFTER **ENTREGUE**.

**Lacunas R1 que a remediação `db4baf8` alegou fechar — resultado:**

| Lacuna R1 | Status R2 |
|---|---|
| PageHeader nas 5 páginas | **ENTREGUE** |
| PublicBooking `ui/Checkbox` | **ENTREGUE** |
| AppointmentWizard → `ui/Modal` | **ENTREGUE** |
| AFTER / forensics-after / ANTES-DEPOIS versionados | **ENTREGUE** |
| Header touch ≥44px (não regressar) | **ENTREGUE** @ HEAD |

**Este trabalho pode ser considerado concluído?** Não — as lacunas alegadas por `db4baf8` estão no HEAD, mas a prova da Fase E (ForgotPassword no DS) permanece parcial e o working tree dirty de SettingsLayout ameaça reabrir a regressão de alvos 40px.
