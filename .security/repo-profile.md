# Repo Profile — AgendiX Security Audit

## Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind, HashRouter
- **Backend:** Supabase (Auth, Postgres, RLS, Realtime, Edge Functions)
- **Integrações:** Stripe, OpenRouter, Resend (reminders)

## Arquitetura de segurança conhecida
- Multi-tenant por `company_id` — RLS ativo em todas as tabelas
- Auth via Supabase Auth (`useAuth()` → `companyId`, `role`)
- Guards de rota: `ProtectedLayout`, `OwnerRouteGuard`, `DevRouteGuard`
- Rotas públicas: `/#/booking/:id`, `/#/queue/:id`
- RPCs `SECURITY DEFINER` para fluxos públicos (booking)
- ADR-007: rate limit no login

## Superfícies de ataque prioritárias
1. Queries sem filtro `company_id` (RLS silencioso)
2. RPCs SECURITY DEFINER com validação insuficiente
3. Chaves `VITE_*` expostas no bundle do cliente
4. Edge Functions (Stripe, reminders) — CORS, auth, secrets
5. IDOR em rotas públicas e páginas com params de URL
6. Histórico instável de RLS (91+ migrations)

## Estrutura relevante
```
contexts/AuthContext.tsx     — sessão, companyId, role
lib/supabase.ts              — client Supabase
lib/openrouter.ts            — IA (VITE_OPENROUTER_API_KEY)
supabase/migrations/         — schema + RLS
supabase/functions/          — checkout Stripe, reminders
pages/                       — rotas da aplicação
services/ + hooks/           — queries ao banco
```

## O que NÃO foi verificado ainda
- Runtime do app em browser
- Supabase dashboard (policies live vs migrations)
- Dependências com CVEs (npm audit)
