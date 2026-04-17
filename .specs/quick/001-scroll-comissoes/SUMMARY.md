# Summary — Quick Task 001

**Status:** Pending execution

## Causa raiz identificada

Linha 381 de `CommissionsManagement.tsx` tem `overflow-hidden` no container da lista de profissionais. Os três outros `overflow-hidden` nas linhas 355, 362, 369 são cards de métricas com orbs decorativos — devem ser preservados.

## Impacto

- Antes: lista de profissionais trava sem scroll quando há mais itens do que cabe na viewport
- Depois: scroll vertical funciona normalmente dentro do container da lista

## Arquivos alterados

- `components/CommissionsManagement.tsx` (1 mudança de classe CSS)

## Commit

`fix(commissions): enable scroll in commissions list container`
