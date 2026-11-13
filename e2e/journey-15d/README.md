# Journey E2E — 15 dias virtuais

Simula um mês de operação em **15 dias virtuais** (âncora `E2E_ANCHOR_DATE`, default `2026-09-01`), cobrindo:

| Dia | Feature |
|-----|---------|
| D1 | Cadastro dono (mock) |
| D2 | Onboarding |
| D3 | Link público |
| D4–D8 | Agenda + booking + solicitações |
| D9–D10 | Fila digital |
| D11–D13 | Financeiro, comissões, relatório |
| D14 | Insights |
| D15 | Navegação SPA |

## Ambientes

- `desktop` (1280×800)
- `iphone` (390×844)
- `android` (Pixel 5)

## Comandos

```bash
npm run e2e:journey-15d
```

Com âncora e saída customizada:

```bash
E2E_ANCHOR_DATE=2026-09-01 JOURNEY_OUT_DIR=/opt/cursor/artifacts/journey-15d \
  npm run e2e:journey-15d
```

Live (Supabase real + credenciais):

```bash
E2E_OWNER_EMAIL=... E2E_OWNER_PASS=... npm run e2e:journey-15d:live
```

## Artefatos

- `artifacts/journey-15d/ledger-<ambiente>.json`
- `artifacts/journey-15d/RELATORIO.md` — nota crítica e achados

## Limitações do mock

Não grava em produção. Não exercita `complete_appointment` nem pagamento Stripe. Para isso, use `journey-live-15d.spec.ts` e o spec canônico `e2e/ciclo-de-receita.spec.ts`.

Backlog de produto (30d): [`../campaign-30d/MATRIX.md`](../campaign-30d/MATRIX.md).
