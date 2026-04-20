# SPEC — Auditoria UI / Design System Unificado

**Data:** 2026-04-19
**Branch:** `ui`
**Status:** IN-PROGRESS

---

## Objetivo

Transformar o AgenX de "SaaS genérico com cara de IA" para um produto profissional e consistente, mantendo as cores originais (gold/barber, lavanda/beauty) e modernizando levemente o brutalismo.

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