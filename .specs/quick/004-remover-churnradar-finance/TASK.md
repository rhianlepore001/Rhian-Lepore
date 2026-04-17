# Quick Task 004: Remover ChurnRadar da tela de Finanças

**Date:** 2026-04-17
**Status:** Pending

## Description

A seção "Clientes para Recuperar" (componente `ChurnRadar`) deve ser removida da tela de Finanças por decisão de produto. O componente está confundindo usuários no contexto financeiro.

## Files Changed

- `pages/Finance.tsx` — remover bloco `<ChurnRadar>` (linhas ~537–542) e import correspondente (~linha 17)

## Approach

**Remover import:**
```tsx
import { ChurnRadar } from '../components/ChurnRadar'; // REMOVER esta linha
```

**Remover bloco JSX:**
```tsx
{/* ChurnRadar — apenas para donos */}
{!isStaff && (
  <div className="mb-8">
    <ChurnRadar clients={diagnostic?.at_risk_clients} loading={diagnosticLoading} />
  </div>
)}
```

**Verificar variáveis órfãs:** Após remover o bloco, verificar se `diagnostic` e `diagnosticLoading` (vindos de `useAIOSDiagnostic`) são usados em outros lugares em `Finance.tsx`. Se ChurnRadar for o único consumidor, remover também:
- A chamada ao hook `useAIOSDiagnostic`
- O import do hook

**NÃO deletar:** `ChurnRadar.tsx` permanece no projeto — o arquivo do componente não é removido.

**NÃO impactar:**
- `Reports.tsx` — usa `churn_risk_count` de forma independente
- `Dashboard.tsx` — usa `AIOSDiagnosticCard` e `ComandoDoDia` que têm dados de churn próprios, não `ChurnRadar`

## Verification

- [ ] Tela `/financeiro` carrega sem erros de console
- [ ] Seção "Clientes para Recuperar" não aparece mais na tab Overview de Finanças
- [ ] Nenhuma variável órfã (`diagnostic`, `diagnosticLoading`, `useAIOSDiagnostic`) permanece em `Finance.tsx`
- [ ] `npm run typecheck` passa sem erros
- [ ] `npm run lint` passa sem warnings de import não utilizado

## Commit

`feat(finance): remove ChurnRadar section from Finance overview`
