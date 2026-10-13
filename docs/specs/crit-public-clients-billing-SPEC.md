# Spec: fechar C-01 public_clients + C-02 auto-upgrade de billing

## Problema
1. Policies abertas em `public_clients` permitiam SELECT/UPDATE/INSERT por `anon` (PII de todos os negócios).
2. `profiles` permitia UPDATE autenticado de `subscription_status` / `subscription_plan` / `trial_ends_at` / `stripe_customer_id`.

## Solução
- Migration `20261013103422_public_clients_anon_lockdown`: remove policies abertas; tenant SELECT + owner ALL; REVOKE anon; endurece `upsert_public_client` / `get_public_client_by_phone`.
- Migration `20261013103427_protect_profile_billing`: estende `protect_profile_identity`; REVOKE column UPDATE; RPC `set_stripe_customer_id_for_caller` para o checkout.

## Front
- Público já usa RPCs (`services/publicBooking.ts`, `PublicClientContext`).
- Autenticado: `Agenda.tsx`, `crm.ts`, `resolveClientForBookingAcceptance` leem `public_clients` com sessão (tenant SELECT).
- Checkout: `create-checkout-session` passa a chamar a RPC em vez de UPDATE direto.

## Testes
`scripts/test-sql-crit-public-clients-billing.sh` (+ `--rollback`).
