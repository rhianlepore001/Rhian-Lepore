# Summary — Quick Task 004

**Status:** Pending execution

## O que foi descoberto no planejamento

- `ChurnRadar` referenciado em `Finance.tsx` em apenas 1 lugar (~linha 540) dentro de `{!isStaff && (...)}`
- Import na ~linha 17 de `Finance.tsx` também precisa ser removido
- `diagnostic` e `diagnosticLoading` vêm de `useAIOSDiagnostic` — verificar outros usos em `Finance.tsx` antes de remover o hook
- O arquivo `ChurnRadar.tsx` NÃO deve ser deletado
- `Reports.tsx`, `BusinessHealthCard.tsx`, `ComandoDoDia.tsx` não são afetados

## Impacto

- Antes: seção "Clientes para Recuperar" aparece no Overview de Finanças para donos
- Depois: seção removida; tela de Finanças mais enxuta e focada em dados financeiros

## Arquivos alterados

- `pages/Finance.tsx` (remoção de import + bloco JSX ~6 linhas + possivelmente hook órfão)

## Nota sobre tipo de commit

Usa `feat` com sentido de remoção deliberada de feature por decisão de produto (não é `fix` pois o ChurnRadar não era um bug — era uma decisão de produto de remover a seção).

## Commit

`feat(finance): remove ChurnRadar section from Finance overview`
