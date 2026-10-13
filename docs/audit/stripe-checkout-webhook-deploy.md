# Deploy steps (after draft PR review — do not run until Rhian says go)

Secrets are collected via the **secure form**, never chat.

## 1. Stripe Dashboard (live account = Vercel prices)

1. Open the **live** Stripe account that owns `price_1UHgTEBoBv5fVrkrYEFLfgBs` (etc.).
2. Developers → Webhooks → Add endpoint  
   - URL: `https://lcqwrngscsziysyfhpfj.supabase.co/functions/v1/stripe-webhook`  
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
3. After create: reveal **Signing secret** (`whsec_…`) → paste only into the secure form as `STRIPE_WEBHOOK_SECRET`.
4. Developers → API keys: prefer a **restricted live key (RAK)** with Checkout Sessions + Customers + Subscriptions + Webhooks read as needed → form field `STRIPE_SECRET_KEY`.
5. Confirm Price IDs (or set overrides):
   - `STRIPE_PRICE_SOLO_BRL` = `price_1UHgTEBoBv5fVrkrYEFLfgBs`
   - `STRIPE_PRICE_TEAM_BRL` = `price_1UHgTFBoBv5fVrkr1pimlz7G`
   - `STRIPE_PRICE_SOLO_EUR` = `price_1UHgTGBoBv5fVrkr4GO9Qa2x`
   - `STRIPE_PRICE_TEAM_EUR` = `price_1UHgTGBoBv5fVrkrY2JCGvs5`

## 2. Supabase (project lcqwrngscsziysyfhpfj)

1. Apply migration `20261013210000_stripe_webhook_billing.sql` (after PR merge).
2. Deploy edge `create-checkout-session` (JWT verify **on**).
3. Deploy edge `stripe-webhook` with **`verify_jwt: false`** (Stripe cannot send Supabase JWT).
4. Set secrets from the secure form: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_PRICE_*`, optional `CHECKOUT_ALLOWED_ORIGINS`.
5. Smoke: authenticated checkout for Solo BRL → Checkout URL; Stripe CLI or Dashboard “Send test webhook” is **testmode-only** — for live, use a real small subscription or Stripe’s event destination retry after first live checkout.

## 3. Vercel

Keep `VITE_STRIPE_PRICE_*` aligned with the same live Price IDs (already in production bundle). No new public secrets.

## 4. Rollback

- DB: `docs/rollbacks/20261013210000_stripe_webhook_billing.rollback.sql`
- Edge: redeploy previous `create-checkout-session` version; delete/disable `stripe-webhook`; remove webhook endpoint in Stripe.
