# Stripe checkout + webhook — diagnosis (2026-10-13, Europe/London)

## Account / mode mismatch

| Source | What we see | Mode / account signal |
| --- | --- | --- |
| Vercel live bundle `VITE_STRIPE_PRICE_*` | `price_1UHgTEBoBv5fVrkr…` / `price_1UHgTF…` / `price_1UHgTG…` (×2) | **Live** Price IDs (account fragment `BoBv5fVrkr`) |
| Edge `create-checkout-session` smoke (post A-06 v7) | Live Solo BRL → Stripe **"No such price"**; testmode fallback Solo BRL → past allowlist, then **"Received unknown parameter: automatic_payment_methods"** | Edge `STRIPE_SECRET_KEY` is **testmode** (knows `price_1UHfu…` / `PUPmLLh2qE`) and does **not** see live prices |
| Stripe MCP (`user-Stripe`) | `needsAuth` — no read-only Dashboard/API from agent | Cannot confirm account id / key fingerprint via plugin |
| Box env | No `STRIPE_*` secrets present | Cannot call Stripe API from this agent without Rhian-supplied key |

**Intended production account:** the **live** Stripe account that owns the Vercel `price_1UHgT…` Price IDs (www.agendixstudio.com). Edge secrets must use that account’s **live** secret/RAK + matching `STRIPE_PRICE_*` (or rely on server live defaults once the live key is set).

**If Rhian must verify in Dashboard (no agent key):**

1. Stripe Dashboard → Developers → API keys: confirm which account is open; note live vs test toggle.
2. Products → Prices: search `price_1UHgTEBoBv5fVrkrYEFLfgBs` — must exist in **live** mode of the intended account.
3. Supabase → Project `lcqwrngscsziysyfhpfj` → Edge Functions → Secrets: `STRIPE_SECRET_KEY` prefix should be `sk_live_` or `rk_live_` (never paste the value into chat).
4. Same secret’s account must be the one where those live prices exist (Dashboard account switcher).

## Code defects fixed in this PR

1. Remove invalid `automatic_payment_methods` from Checkout Session create (PaymentIntents-only).
2. Resolve Price IDs server-side from `planId` + env (`STRIPE_PRICE_*` / `VITE_STRIPE_PRICE_*`), keep A-06 allowlist; legacy `priceId` remapped via plan then re-resolved.
3. Auto-select testmode price defaults only when the secret key is `sk_test`/`rk_test` (so a still-test edge key does not request live price IDs).
4. New `stripe-webhook` edge function: signature verify, idempotency table, billing event → `profiles` via `service_role` (compatible with `PROFILE_BILLING_IMMUTABLE`).

## Out of scope / do not touch

- PR #158 booking policy / lead-time files and migrations `20261013200000` / `20261013200100`.
