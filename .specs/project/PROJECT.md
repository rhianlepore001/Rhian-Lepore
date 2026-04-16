# PROJECT — AGENX

## Visão
SaaS de gestão para barbearias e salões de beleza (Brasil e Portugal).
Multi-tenant com isolamento por `company_id` / `user_id`.

## Stack
- Frontend: React 19, TypeScript 5.8, Vite 6, Tailwind CSS
- Backend: Supabase (Auth + PostgreSQL + RLS + RPCs)
- IA: OpenRouter (pós-MVP)
- Pagamentos: Stripe
- Deploy: Vercel (PWA)

## Tenant Model
- Owner cria conta → `profiles.role = 'owner'`
- Staff registra via link convite → `profiles.role = 'staff'`, `profiles.company_id = ownerUserId`
- RLS ativo em todas as tabelas — queries filtram por `user_id` (tenant key)

## Temas
- `barber`: dark/brutal (barbearias)
- `beauty`: claro/elegante (salões)

## Região
- `BR`: PIX, Dinheiro, Débito, Crédito (R$)
- `PT`: Dinheiro, MBWay, Cartão (€)
