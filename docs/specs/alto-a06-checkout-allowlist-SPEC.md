# A-06 — Checkout Stripe allowlist (priceId + return URLs)

## Problema
`create-checkout-session` aceitava `priceId`, `successUrl`, `cancelUrl`, `mode` do body sem validação.

## Correção (menor)
- Allowlist de `priceId` (4 fallbacks oficiais + envs `STRIPE_PRICE_*` / `VITE_STRIPE_PRICE_*`).
- Allowlist de origins para `successUrl`/`cancelUrl` (prod, localhost, previews `*rhian-lepore*.vercel.app`).
- `mode` forçado a `subscription`.

## Não faz (neste PR)
- Webhook Stripe (status sync) — residual; requer secret + handler separado.
- CORS `*` — residual.

## Deploy
Redeploy da edge function `create-checkout-session` (não é migration SQL).
Envs opcionais: `CHECKOUT_ALLOWED_ORIGINS` (CSV), `STRIPE_PRICE_*` live.
