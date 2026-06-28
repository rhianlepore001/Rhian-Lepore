# SPEC — Auditoria UI / Design System Unificado

**Data:** 2026-04-19 · **Audit O1:** 2026-06-07
**Branch:** `ui`
**Status:** IN-PROGRESS

---

## O1 — Auditoria das 5 telas críticas (2026-06-07)

> Fonte da verdade: `design-system/MASTER.md`.
> Só auditoria — sem implementação. Fix mecânico vai p/ Composer (Q2/C-tasks).
> Prioridades: **P0** quebra/acessibilidade/encoding · **P1** inconsistência visível · **P2** polish.

### Anti-padrões transversais (afetam várias telas)

| # | Anti-padrão | Regra violada | Onde | Prioridade |
|---|-------------|---------------|------|------------|
| T1 | `text-[10px]` / `text-[11px]` / `text-[9px]` | MASTER §5 (mín. `text-xs`) | Agenda, Finance, PublicBooking, Queue | P1 |
| T2 | `alert()` / `window.confirm()` nativos | identidade visual; usar toast canônico + modal | Agenda, Finance, PublicBooking, Queue | P1 |

> **⚠️ Correção T2 (2026-06-07):** o `useAlerts().showAlert` citado originalmente **não existe** — `useAlerts()` só expõe `alerts[]` (alertas do sistema), não um toast transitório. Hoje o padrão de toast está **copiado à mão** em `components/CommissionsManagement.tsx` e `pages/Products.tsx` (cores cruas `bg-green-900/90`, fora de token).
> **Pré-requisito do T2:** criar componente canônico `components/ui/Toast.tsx` + hook `useToast()` (variants success/error/warning, tokens do tema, safe-area, auto-dismiss). Só então migrar os `alert()` para ele. Corrigir também as referências erradas a `useAlerts().showAlert` em `CLAUDE.md` e `design-system/MASTER.md`.
> **Handoff:** UI especifica/cria o `ui/Toast` → Composer migra os `alert()` e os toasts locais (Products, Commissions) para o canônico.
| T3 | `shadow-lg` / `shadow-xl` / `shadow-2xl` / `hover:shadow-md` | MASTER §8 (só tokens) | Queue, PublicBooking, Dashboard, Agenda | P1/P2 |
| T4 | Copy pt-BR sem acentuação ("Voce", "diaria", "Saude"...) | qualidade de copy | Dashboard (+ strings em geral) | P2 |
| T5 | Divergência `DESIGN.md` × `MASTER.md` (cores `#0D0A08`×`#121212`, heading Inter×Chivo) | uma fonte da verdade | docs | P2 |

### AGENDA — `pages/Agenda.tsx`

- [ ] **P0** Mojibake visível ao usuário: `alert('Solicita��o recusada.')` — `Agenda.tsx:657`
- [ ] **P1** `alert()`/`confirm()` nativos (≈19 ocorrências: 453, 462, 467, 616, 648, 657, 677, 685, 688, 694, 702, 716, 735, 742, 751, 783, 804, 823) → `showAlert` + modal de confirmação reutilizável
- [ ] **P1** `text-[10px]` em massa (1072, 1094, 1137, 1144, 1227, 1263, 1269, 1315, 1441, 1452, 1457, 1562, 1569, 1582, 1594, 1621, 1753, 1758) → `text-xs`
- [ ] **P2** `border-2 border-black` em status dots (1092, 1308) → `border-brutal-card` / token de borda
- [ ] **P2** `rounded-md` em botões de ação (1398, 1408) e `rounded` cru em badges (1431, 1452, 1457, 1753, 1758) → `rounded-lg` / `rounded-full`
- [ ] **P2** `hover:shadow-md` (1386) → token (`hover:shadow-lite-glass`)

### FINANCEIRO — `pages/Finance.tsx`

- [ ] **P1** `loading` declarado (51) e setado (251) mas **nunca renderiza UI** — sem skeleton/feedback durante carga → adicionar `Skeleton`/empty
- [ ] **P1** `alert()`/`confirm()` nativos (265, 269, 273, 329, 337, 373, 378, 687, 693, 784, 790) → `showAlert` + modal *(estava P3; elevado por consistência com T2)*
- [ ] **P2** `text-[10px]` em labels de KPI e badges (446, 447, 469, 470, 493, 494, 518, 519, 540, 558, 566, 572, 664, 668, 749, 756, 762) → `text-xs`
- [ ] **P2** `rounded` cru em badges de tipo (664, 668, 749, 756) → `rounded-full` (pílula)
- [x] Header `border-b-4` → `border-b` (corrigido em audit anterior)

### BOOKING PÚBLICO — `pages/PublicBooking.tsx`

- [ ] **P1** `text-[10px]`/`text-[11px]` massivo (600, 664, 695, 703, 745, 768, 814, 819, 832, 846, 884, 1017, 1041, 1104, 1112, 1167, 1190, 1212, 1217, 1230, 1244, 1320, 1379, 1513, 1563, 1622, 1645) → `text-xs` *(página pública de conversão — leitura mobile é crítica)*
- [ ] **P1** `shadow-2xl` em modais (1406, 1660) → `shadow-promax-depth` / `shadow-soft-lg`
- [ ] **P1** `alert()`/`confirm()` nativos (443, 449, 452, 486, 549) → toast/modal temático
- [ ] **P2** `rounded-none` + `border-2` em ícone de estado (612); `border-4` decorativo (1295, 1538) → revisar p/ tokens
- [ ] **P2** `rounded-md` + `text-[9px]` em badge de total (1513-1514) → `rounded-lg` + `text-xs`
- [x] Loading state OK (`Loader2` temático + "Carregando Experiência…")

### FILA DIGITAL — `pages/QueueManagement.tsx`

- [ ] **P1** Loading state cru e fora do tema: `<div className="p-8 text-white"><Clock animate-spin/>` (198) → `Skeleton` + cor do tema
- [ ] **P1** `shadow-xl`/`shadow-lg`/`shadow-2xl` (209, 263, 324, 383, 435, 505) → `shadow-promax-glass` / `shadow-lite-glass`
- [ ] **P1** `alert()`/`confirm()` nativos (89, 110, 152, 156, 194, 298) → `showAlert` + modal
- [ ] **P2** `text-[10px]` (268, 545) → `text-xs`
- [x] Mobile buttons → `BrutalButton` (audit anterior)

### DASHBOARD — `pages/Dashboard.tsx` (referência de qualidade)

- [ ] **P2** `shadow-lg` em toast/banner (213) → token
- [ ] **P2** Copy sem acentuação pt-BR ("esta", "diaria", "comissoes", "Amanha", "medio", "mes", "Operacao", "Saude", "negocio", "historico", "salao", "horarios", "Voce", "acao", "proximos") → corrigir strings
- [x] Bom: usa `EmptyState`, `Skeleton`, `min-h-[44px]` (touch targets), tokens `useBrutalTheme()` — **usar como padrão para as demais telas**

### Resumo de esforço / handoff

| Item | Esforço | Handoff |
|------|---------|---------|
| T1 (`text-[10px]`→`text-xs`) | Alto (find/replace por tela) | Composer (mecânico) |
| T2 (`alert/confirm`→`showAlert`/modal) | Médio (precisa modal confirm reutilizável) | Composer + decisão UX (modal) |
| T3 (sombras→token) | Baixo | Composer |
| P0 Agenda mojibake | Trivial | Composer (imediato) |
| Finance loading UI | Baixo | Composer (seguir padrão Dashboard) |
| Queue loading UI | Baixo | Composer (seguir padrão Dashboard) |
| T4/T5 copy + docs | Baixo | UI (Q2) |

---

---

## Objetivo

Transformar o AgendiX de "SaaS genérico com cara de IA" para um produto profissional e consistente, mantendo as cores originais (gold/barber, lavanda/beauty) e modernizando levemente o brutalismo.

---

## Regras Fixas (não mudar)

| Elemento | Barber | Beauty |
|----------|--------|--------|
| Cor primária | `#C29B40` (gold) | `#A78BFA` (lavanda) |
| Background | `#121212` | `#1F1B2E` |
| Fonte heading | Chivo | Chivo |
| Fonte body | Inter | Inter |

---

## Achados por Página

### ✅ CONCLUÍDO — BrutalCard + BrutalButton (base)

- `rounded-[28px]` → `rounded-2xl` em cards
- `rounded-xl` → `rounded-2xl` em botões
- Glass automático em `/configuracoes` via `useLocation()`

---

### 🔴 DASHBOARD — DashboardHero

**Arquivo:** `components/dashboard/DashboardHero.tsx`

| Problema | Localização | Solução |
|----------|-------------|---------|
| Botões com `rounded-xl` hardcoded | linha 109, 122 | → `rounded-2xl` |
| CTA mobile sem usar `BrutalButton` | linha 118-133 | Consistência de borda |
| `border-b-4 border-white/10` no hero pai | — | — |

**Prioridade:** P2 — visual, não bloqueia

---

### 🔴 FINANCEIRO — Finance.tsx

**Arquivo:** `pages/Finance.tsx`

| Problema | Localização | Solução |
|----------|-------------|---------|
| Header usa `border-b-4 border-white/10` | linha 466 | → `border-b border-white/8` |
| `text-2xl md:text-4xl uppercase` no título | linha 469 | `font-heading` já aplica, ok |
| `alert()` nativo ao excluir transação | linhas 316, 293 | → `showAlert()` (P3) |

**Prioridade:** P1 — o `border-b-4` é o sinal mais "brutalista puro" a remover

---

### 🟡 FILA DIGITAL — QueueManagement.tsx

**Arquivo:** `pages/QueueManagement.tsx`

| Problema | Localização | Solução |
|----------|-------------|---------|
| Mobile buttons: `<button>` direto sem `BrutalButton` | linhas 366, 373 | Substituir por `BrutalButton size="sm"` |
| Inline `bg-accent-gold rounded-xl` no mobile | linha 366 | Usar variante `primary` do BrutalButton |
| Header card: `bg-black/20` sem blur | linha 353 | `backdrop-blur-sm` já tem, ok |

**Prioridade:** P1 — inconsistência de botões visível

---

### 🟢 CONFIGURAÇÕES — SettingsLayout

**Status:** OK após glass automático no BrutalCard.

Efeito glass ativo automaticamente em `/configuracoes/*` para tema Barber.

---

## Checklist de Implementação

- [x] BrutalCard: `rounded-2xl` + glass em settings
- [x] BrutalButton: `rounded-2xl`
- [x] `system.md` criado em `.claude/skills/design-system/`
- [x] DashboardHero: botões `rounded-2xl` ✅
- [x] Finance: header `border-b-4` → `border-b` ✅
- [x] QueueManagement: mobile buttons → BrutalButton ✅

---

## Consistências Globais (aplicar no restante do app)

1. **Separadores de seção:** sempre `border-b border-white/8` (nunca `border-b-4`)
2. **Botões inline:** sempre `BrutalButton` ou classes compatíveis com `rounded-2xl`
3. **Labels de stat:** `font-mono text-xs uppercase tracking-widest text-text-secondary`
4. **Ícones de status financeiro:** manter `border-l-4` colorido (verde/vermelho) — é UX funcional
5. **Status de fila:** manter `border-l-4` com animação `animate-pulse` — é feedback visual necessário