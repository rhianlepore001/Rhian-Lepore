# VALIDAÇÃO FINAL — Auditoria independente de execução (UX-pro A–E)

**Auditor:** agente independente (conformidade + integridade; sem julgamento estético)  
**Data:** 2026-08-02  
**Branch auditada:** `design/ux-pro-sweep`  
**Base de comparação:** `main...design/ux-pro-sweep`  
**Commits UX-pro nomeados:** `3e8f872` (A) · `cda1cfa` (B/C) · `b3ead27` (E) · `e9b74c8` (docs/memória)  
**Plano canônico:** `docs/ux-pro/PLANO.md` (Fases A–E aprovadas; F fora; E2 migration NÃO; beauty seed NÃO; C4-010 só documentar)

> Método: cada item foi aberto no arquivo (ou no diff) — a palavra do implementador e o `ANTES-DEPOIS.md` **não** foram aceitos como prova isolada.

---

## 1. Contagem por veredicto

| Veredicto | Qtd |
|---|---|
| **ENTREGUE** | 21 |
| **PARCIAL** | 3 |
| **NÃO ENTREGUE** | 3 |
| **DIVERGENTE** | 2 |
| **Total itens tabelados** | 29 |

---

## 2. Tabela de conformidade (Fases A–E)

### Fase A — Tokens e primitivos

| Item | Veredicto | Prova |
|---|---|---|
| `--color-on-accent` nas 4 combinações | **ENTREGUE** | `design-system/tokens.css:116` (barber dark), `:181` (barber light), `:244` (beauty dark), `:307` (beauty light) |
| Recalibração accent/success light (AA sobre surface) | **ENTREGUE** | barber light accent `#6B5010` + success `#047857` (`tokens.css:177,196`); beauty light accent `#6D28D9` + success `#047857` (`:303,322`) |
| Overlay light ≥~0,70 (CONHECIDO-015) | **ENTREGUE** | `tokens.css:176` barber light `rgba(20,20,20,0.72)`; `:302` beauty light `rgba(23,19,42,0.72)` |
| `buttonPrimary` usa on-accent | **ENTREGUE** | `hooks/useBrutalTheme.ts:302` `text-[var(--color-on-accent)]`; teste `test/hooks/useBrutalTheme.test.ts:152` |
| C4-007 type/spacing tokens (parcial no plano A) | **NÃO ENTREGUE** | `ANTES-DEPOIS.md` + `forensics-after/DELTA.md`: fontes 13→13, espaçamentos 42→42 — zero delta; corretamente fora do corte se Gate manda para F, mas **não entregue em A** |

### Fase B — Honesty: saves e rede

| Item | Veredicto | Prova |
|---|---|---|
| C2-001 toggles UI-only desabilitados (sem migration E2) | **ENTREGUE** | `pages/settings/PublicBookingSettings.tsx:144-161` — “Em breve”, `pointer-events-none`, `aria-disabled`, switch `checked={false}` / `onChange={() => undefined}`; sem migration de schema nos commits UX |
| C2-002 save usa `getMemberDisplay` / `editedMembers` | **ENTREGUE** | `pages/settings/CommissionsSettings.tsx:66-67` + `handleSaveCommissionRate` em `:120-127` persiste `commission_payment_frequency` / `day` a partir de `getMemberDisplay` |
| ErrorState Finance (abort ≠ empty) | **ENTREGUE** | `pages/Finance.tsx:597-602` |
| ErrorState Clients | **ENTREGUE** | `pages/Clients.tsx:244-249` |
| ErrorState Agenda | **ENTREGUE** | `pages/Agenda.tsx:1117-1124` |
| Loading Finance (skeleton vivo) | **ENTREGUE** | `pages/Finance.tsx:588-594` `SkeletonCard` + `role="status"` |

### Fase C — Composição

| Item | Veredicto | Prova |
|---|---|---|
| AppointmentWizard `role=dialog` + FocusTrap + Esc | **ENTREGUE** | `components/AppointmentWizard.tsx:61-72` (Escape), `:308-321` (`FocusTrap`, `role="dialog"`, `aria-modal`) |
| AppointmentWizard → `ui/Modal` (arquivo do plano) | **DIVERGENTE** | A11y entregue com casco próprio + `createPortal`; **não** migrou para `components/ui/Modal` como o mapa de arquivos do plano descreve |
| `shadow-heavy` removido de `pages/` | **ENTREGUE** | `rg shadow-heavy pages` → 0 hits; `ServiceSettings.tsx` botão Salvar usa `shadow-[var(--shadow-btn-primary)]` (diff `cda1cfa`) |
| Ring estático SubscriptionSettings (C2-012) | **ENTREGUE** | `pages/settings/SubscriptionSettings.tsx:147` `ring-2 ring-[var(--color-accent)]` — interpolação `'ring-' + accentColor` removida |
| SettingsLayout alvos ≥44px | **ENTREGUE** | `components/SettingsLayout.tsx:64,92,204` `min-h-[44px]` (NavLink, Voltar, chips) |
| PageHeader nas 5 páginas do escopo C1-010 (Agenda / Fila / CRM / StaffInsights / Products) | **NÃO ENTREGUE** | Grep `PageHeader` em `Agenda.tsx`, `QueueManagement.tsx`, `ClientCRM.tsx`, `StaffInsights.tsx`, `Products.tsx` → **zero**; Agenda ainda título ad-hoc `text-3xl md:text-4xl` (`Agenda.tsx:1135`) |
| Settings tocadas usam `ui/Input` + `SettingsRow` | **PARCIAL** | `PublicBookingSettings` usa `SettingsRow` (`:155-162`); `CommissionsSettings` **não** importa `ui/Input` / `SettingsRow` (continua formulário próprio + `alert()`) |

### Fase D — Chrome e ergonomia

| Item | Veredicto | Prova |
|---|---|---|
| Header badge C4-001 (`${colors.bg}` → borda token + on-accent) | **ENTREGUE** | `components/Header.tsx:170` `border-[var(--color-bg)]` + `text-[var(--color-on-accent)]` |
| Header min touch ≥44px | **ENTREGUE** | `components/Header.tsx:141,163` `min-h-[44px] min-w-[44px]` (modo + notificações) |
| Agenda aria-labels (ícones/ações) | **ENTREGUE** | `pages/Agenda.tsx:1144,1153,1251,1287,1516+` |
| C4-010 IA mobile só documentada | **ENTREGUE** | `components/BottomMobileNav.tsx:33-34` comentário C4-010; nav não reposicionada |

### Fase E — Públicas e auth

| Item | Veredicto | Prova |
|---|---|---|
| ClientArea CTA barber on-accent | **ENTREGUE** | `pages/ClientArea.tsx:348,394,460,632,691` `bg-theme-accent text-[var(--color-on-accent)]` no ramo barber |
| ForgotPassword no DS (C3-007) | **PARCIAL** | CTA/input focus migrados (`ForgotPassword.tsx:88,96` — sem `bg-blue-600`); **permanecem** `from-blue-500/5` (`:40`), card `border-4 border-black` + brutal (`:49`), input nativo (não `ui/Input`), botão sucesso `bg-white hover:bg-neutral-200` (`:123`) |
| Portfolio rating “5.0” removido | **ENTREGUE** | Diff `b3ead27`: bloco Star/`5.0 (Avaliações)` removido; grep atual sem `5.0` |
| Register hint + `mapError` | **ENTREGUE** | `pages/Register.tsx:12,96` `mapError`/`formatUserFacingError`; hint senha `:169,335` |
| Checkbox → `ui/Checkbox` (prova Fase E / C3-008) | **NÃO ENTREGUE** | `pages/PublicBooking.tsx:1086,1094,1604,1612` ainda `<input type="checkbox" …>` nativo; zero import de `ui/Checkbox` |
| Residuais on-accent em públicas tocadas | **PARCIAL** | Portfolio CTA ainda `text-[var(--color-bg)]` sobre accent (`ProfessionalPortfolio.tsx:145`) — inconsistente com token novo no light |

### Itens deliberadamente fora (confirmados como não feitos — correto)

| Item | Status | Nota |
|---|---|---|
| Fase F / Dashboard CONHECIDO-016/017 | Fora | Gate |
| E2 migration toggles C2-001 | Fora | Path UI-only cumprido |
| Beauty seed / Gate 0.7 | Fora | Matriz AFTER só barber |
| C4-010 mudar IA bottom nav | Fora | Só documentado |

---

## 3. Dano colateral

### (a) Regressão visual / telemetria

**Fonte:** `docs/ux-pro/forensics-after/DELTA.md` (164×164).

| Dimensão | Antes → Depois | Regressão? |
|---|---|---|
| Soma contraste AA | 598 → 242 (−60%) | Não (melhora sistêmica) |
| Soma alvos &lt;44px | 2494 → 1728 (−31%) | Não |
| Por rota × modo | Todas as linhas do DELTA melhoram ou empatam | **Nenhuma rota piorou** contraste ou alvos |
| Register contraste | 6 → 6 | Estável (sem ganho) |
| Fontes / espaçamentos | 13 / 42 estáveis | Esperado (F fora) |

**Ressalva de processo:** `docs/ux-pro/AFTER/`, `docs/ux-pro/forensics-after/` e `docs/ux-pro/ANTES-DEPOIS.md` existem no disco mas estão **untracked** (`git ls-files` → 0). Critério do plano §7.3 (“Matriz AFTER + ANTES-DEPOIS + delta forensics”) **não está versionado na branch**.

### (b) Identidade de marca / negócio / RLS / deps

| Checagem | Resultado |
|---|---|
| Dependência nova em `package.json` (diff vs main) | **Nenhuma** nos commits UX |
| Migration E2 de toggles | **Ausente** (correto) |
| RLS / migration na branch `main...HEAD` | Presente `supabase/migrations/20260724_queue_staff_rls.sql` — vem do merge **fila/colaborador**, não dos commits A–E; **risco de merge** se a branch for tratada como “só UX” |
| Escopo de negócio misturado nos commits UX | **Sim — material:** `3e8f872` (Fase A) inclui catálogo de produtos em `PublicBooking.tsx` (hooks `usePublicProducts`, UI Produtos); `cda1cfa` (B/C) reescreve `ProfessionalCommissionDetails.tsx` (+442/−153) para linhas serviço/produto. Filtros tenant (`company_id` / `user_id`) presentes no componente; não é violação RLS óbvia, mas **não é trabalho A–E** |
| Marca / fontes / novos acentos §2.1 | Sem troca de família tipográfica; accent light escurecido por AA (E1 aprovado) |

### (c) Classe Tailwind interpolada nova

- C2-012: interpolação **removida** (não introduzida).
- Diff focado: nenhuma nova `'ring-' + var` / `bg-${...}` dinâmica de utilitário Tailwind detectada nos arquivos UX tocados.
- Padrão restante = classes estáticas com `var(--token)` ou tokens de `useBrutalTheme` (já existentes).

### (d) Correção que quebra tema oposto

- Tokens on-accent / accent / overlay atualizados nas **4** combinações — beauty light não ficou órfã.
- Risco residual: superfícies que ainda usam `text-[var(--color-bg)]` sobre accent (`ProfessionalPortfolio.tsx:145`, `ServiceSettings.tsx:102`, `SubscriptionSettings` ribbon, etc.) ficam **menos corretas no light** após accent escurecer — não é regressão dark, mas incompleção do sweep on-accent.
- ClientArea beauty permanece em `bg-theme-surface` (não forçado barber) — OK.

### (e) Dívida ratchet

- `scripts/design-debt-baseline.json`: **sem diff** vs `main` → ratchet **não foi afrouxado** nem regenerado para esconder dívida.
- Nenhum sinal de crescimento deliberado do orçamento.

### (f) Teste skip / only / deletado

| Checagem | Resultado |
|---|---|
| Testes deletados no range (`--diff-filter=D` em test/hooks/e2e) | **Nenhum** |
| `test.skip` / `.only` introduzidos nos diffs UX | Não observados nos arquivos de teste alterados |
| Diff de testes | `useBrutalTheme.test.ts` (+assert on-accent); `AuthContext.test.tsx` e `useCopyInviteLink.test.ts` ligados ao merge colaborador/fila — **fora** do escopo A–E |
| Reexecução dos 367 testes nesta auditoria | **Não reexecutada** — conferência limitada a skip/delete/diff (gates alegados pelo implementador) |

### (g) Commit mensagem ≠ conteúdo

| Commit | Mensagem | Conteúdo real | Veredicto |
|---|---|---|---|
| `3e8f872` | “Fase A” tokens/contraste | Além de tokens: ErrorState Finance/Clients/Agenda, Wizard a11y, Header badge/touch, **e feature de produtos no PublicBooking** | **DIVERGENTE** (mensagem incompleta + escopo de produto) |
| `cda1cfa` | “Fase B/C” saves/dívida settings | Settings honesty OK; **+ rewrite grande de comissões com produtos** | **DIVERGENTE** |
| `b3ead27` | “Fase E” públicas/auth | Alinha com ClientArea/Forgot/Portfolio/Register | **OK** (Forgot “no DS” exagera — ver PARCIAL) |
| `e9b74c8` | plano + memória | Docs; AFTER/forensics-after **não** entram no commit | Processo incompleto |

---

## 4. O que EXIGE correção antes do release

Ordem sugerida (bloqueantes de conformidade do plano A–E / §7):

1. **Versionar** `docs/ux-pro/AFTER/`, `docs/ux-pro/forensics-after/` e `docs/ux-pro/ANTES-DEPOIS.md` (ou declarar Gate abrindo mão do §7.3). Hoje a prova AFTER **não está na branch git**.
2. **PageHeader** nas 5 páginas do escopo C1-010 (`Agenda`, `QueueManagement`, `ClientCRM`, `StaffInsights`, `Products`) — prova explícita da Fase C — **ou** aditamento escrito do Gate adiando para F.
3. **`ui/Checkbox` em `PublicBooking.tsx`** (4 checkboxes nativos) — prova da Fase E / C3-008.
4. **Fechar ForgotPassword C3-007 de verdade:** remover `from-blue-500/5`, alinhar card/sombra à família auth (`elevation-3` / `ui/Input`+`ui/Button`), corrigir CTA pós-sucesso `bg-white`.
5. **Separar ou justificar** o código de produtos/comissões embutido em `3e8f872`/`cda1cfa` antes de vender o PR como “só UX-pro” (e revisar merge junto com RLS de fila).
6. **Completar on-accent** em CTAs ainda com `text-[var(--color-bg)]` nas superfícies tocadas pelo sweep (mínimo: `ProfessionalPortfolio.tsx:145`).

Não bloqueiam release deste corte (deliberados / ok): Fase F, E2 migration, beauty seed, mudança de IA do bottom nav, C4-007 tipografia.

---

## 5. Veredito final

**Contagem:** 21 ENTREGUE · 3 PARCIAL · 3 NÃO ENTREGUE · 2 DIVERGENTE.

**Este trabalho pode ser considerado concluído?** Não — os P0/P1 sistêmicos de token, honesty de save/rede, badge e CTA ClientArea estão no código, mas faltam provas obrigatórias da Fase C (PageHeader no escopo) e E (Checkbox + Forgot completo), e a matriz AFTER/forensics não está versionada na branch.
