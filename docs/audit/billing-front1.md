# Frente 1 — Billing Stripe (diagnóstico + plano de ativação)

## Causa raiz do `No such price: price_1UHgTEBoBv5fVrkrYEFLfgBs`
- O front (Vercel) injeta `VITE_STRIPE_PRICE_*` = IDs `price_1UHgT…` (fragmento de conta `BoBv5fVrkr`) e envia `priceId` ao edge.
- O edge `create-checkout-session` aceitava o ID (allowlist hard-coded) e chamava o Stripe com `STRIPE_SECRET_KEY`,
  que pertence a outro modo/conta (os fallbacks testmode `price_1UHfu…` têm fragmento `PUPmLLh2qE`). Uma chave não enxerga
  preços de outra conta/modo → `No such price`.
- Defeito secundário: `automatic_payment_methods` não é parâmetro válido de Checkout Session.

## O que este PR muda
- Preço resolvido no servidor a partir de `planId` + `currency` e dos secrets `STRIPE_PRICE_{SOLO,TEAM}_{BRL,EUR}`. Nenhum ID hard-coded no edge.
- `stripe-webhook` (novo): assinatura verificada (HMAC v1, tolerância 300 s), idempotente (`stripe_webhook_events`), proteção contra eventos fora de ordem (`stripe_billing_event_at`).
- Paywall server-side: `billing_has_access`, `get_my_billing_access`, `tenant_has_active_access` (staff herdam o status do dono).
- Checkout preserva o trial restante (`trial_end`) para quem assina durante o trial (7 dias padrão ou 30 dias promo).

## Follow-up opt-in (NÃO incluído)
Aplicar `tenant_has_active_access()` como policy RESTRICTIVE em escritas (ex.: `appointments` INSERT) e trocar o
`isSubscriptionActive` do front por `get_my_billing_access()` depois que a migration estiver aplicada.
