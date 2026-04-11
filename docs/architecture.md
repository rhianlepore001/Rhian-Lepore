# AGENX — Arquitetura

## Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS (glassmorphism)
- **Database:** Supabase (PostgreSQL + RLS)
- **Auth:** Supabase Auth
- **AI:** OpenRouter (Gemini Flash)
- **Deploy:** Vercel

## Multi-tenant
Cada empresa tem um `company_id`. Todas as queries filtram por `company_id`.
RLS (Row Level Security) garante isolamento no banco.

## Fluxo de Auth
1. Usuário registra → cria `profile` + `company`
2. Staff registra via link com `?company={id}` → cria `profile` com `role: staff`
3. Auth state gerenciado pelo `AuthContext`

## Rotas
HashRouter: `/#/dashboard`, `/#/agenda`, `/#/finance`, etc.
Rotas protegidas via `ProtectedLayout`.
Páginas públicas: `/#/booking/:id`, `/#/queue/:id`

## Pastas principais
- `pages/` — páginas da aplicação
- `components/` — componentes reutilizáveis
- `contexts/` — estado global (AuthContext, AlertsContext)
- `lib/` — integrações (supabase, openrouter)
- `hooks/` — custom hooks
- `utils/` — helpers
- `supabase/migrations/` — schema do banco
