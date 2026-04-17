# Quick Task 001: Scroll bloqueado no conteúdo de Comissões

**Date:** 2026-04-17
**Status:** Pending

## Description

Container principal da lista de profissionais em `CommissionsManagement.tsx` linha 381 usa `overflow-hidden`, bloqueando o scroll vertical quando há muitos profissionais na lista.

## Files Changed

- `components/CommissionsManagement.tsx` — linha 381: `overflow-hidden` → `overflow-y-auto`

## Approach

Linha 381 atual:
```tsx
<div className="bg-neutral-900/40 border-0 md:border-2 border-neutral-800 md:rounded-3xl p-0 md:p-8 backdrop-blur-sm overflow-hidden">
```

Após fix:
```tsx
<div className="bg-neutral-900/40 border-0 md:border-2 border-neutral-800 md:rounded-3xl p-0 md:p-8 backdrop-blur-sm overflow-y-auto">
```

**MANTER** `overflow-hidden` nas linhas 355, 362, 369 — esses são os cards de métricas com orbs decorativos de fundo. O `overflow-hidden` neles é intencional para o efeito visual funcionar corretamente. Apenas o container da lista (linha 381) é o problema.

## Verification

- [ ] Com 5+ profissionais na lista de comissões, o scroll vertical funciona dentro do container
- [ ] Cards de métricas no topo (linhas 355–369) ainda cortam os orbs decorativos corretamente
- [ ] Modal de pagamento (linha 585, que já usa `overflow-y-auto`) não é afetado
- [ ] Testado em mobile (390px) — scroll funciona com touch

## Commit

`fix(commissions): enable scroll in commissions list container`
