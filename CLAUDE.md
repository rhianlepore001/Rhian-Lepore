# CLAUDE.md

Instruções para agentes de IA que trabalham neste repositório.

---

## Projeto

**AGENX** — SaaS de gestão para barbearias e salões de beleza (Brasil e Portugal).
React 19 + TypeScript + Supabase. Multi-tenant com isolamento por `company_id`.

Stack: React 19, TypeScript 5.8, Vite 6, Tailwind CSS, Supabase (auth + banco), OpenRouter (IA), Stripe, Vercel.

---

## Comandos essenciais

```bash
npm run dev          # dev server → localhost:3000
npm run build        # build produção
npm run lint         # ESLint (strict — falha em warnings)
npm run typecheck    # TypeScript check
npm test             # Vitest
```

---

## Estrutura de pastas

```
pages/          → páginas (Dashboard, Agenda, Finance, ClientCRM, etc.)
  settings/     → configurações (Team, Services, Subscriptions...)
components/     → componentes reutilizáveis
contexts/       → estado global (AuthContext, AlertsContext, UIContext)
lib/            → integrações (supabase.ts, openrouter.ts)
hooks/          → custom hooks
utils/          → helpers (date.ts, formatters.ts, Logger.ts)
supabase/
  migrations/   → schema do banco (SQL)
specs/
  active/       → specs em andamento (SDD)
  done/         → specs concluídas
```

---

## Arquitetura — regras críticas

**Multi-tenant (NUNCA violar):**
- Todo query no banco DEVE filtrar por `company_id`
- `company_id` vem SEMPRE do session Supabase — nunca de URL param ou form input
- RLS está ativo em todas as tabelas — não desabilitar sem entender o impacto

**Auth:**
- Supabase Auth (não Clerk — ignore qualquer referência a Clerk no código legado)
- `useAuth()` do `AuthContext` → acesso a `user`, `companyId`, `role`, `businessName`
- Staff registra via link `/#/register?company={ownerUserId}` → role: 'staff'

**IA:**
- OpenRouter via `lib/openrouter.ts` e hooks `useAIAssistant`, `useContentCalendar`
- Chave em `VITE_OPENROUTER_API_KEY` (variável de ambiente — nunca hardcode)
- Features de IA são pós-MVP — não priorizar no momento

**Roteamento:**
- HashRouter: rotas usam `#` → `/#/dashboard`, `/#/agenda`
- Pages com `React.lazy()` — sempre dentro de `<Suspense>`
- Rotas protegidas via `ProtectedLayout`
- Rotas públicas: `/#/booking/:id`, `/#/queue/:id`

---

## Padrões de código

- Componentes: PascalCase, um por arquivo, functional + hooks
- TypeScript interfaces para todas as props e tipos de dados
- `@/` → alias para raiz (configurado em tsconfig.json)
- Supabase client: `import { supabase } from '@/lib/supabase'`
- Alertas: `const { showAlert } = useAlerts()`
- Temas: `barber` (dark/brutal) e `beauty` (claro/elegante) — via `UIContext`

---

## Tarefas comuns

- **Nova página:** criar em `pages/`, adicionar rota em `App.tsx` com `React.lazy()`
- **Novo componente:** criar em `components/`, importar onde usar
- **Mudança no banco:** criar migration em `supabase/migrations/`
- **Nova spec de feature:** usar template em `specs/_template.md`

---

## Gotchas (leia antes de mexer em qualquer coisa)

1. **RLS quebra silenciosamente** — query sem `company_id` retorna vazio, não erro
2. **HashRouter** — links devem usar `/#/rota`, não `/rota`
3. **Lazy Loading** — `React.lazy()` sem `<Suspense>` causa crash
4. **Staff vs Owner** — `OwnerRouteGuard` bloqueia rotas pra staff; checar antes de criar página nova
5. **`@/` alias** — aponta pra raiz do projeto, não pra `src/`
6. **Mobile first** — barbeiro usa celular; testar em Chrome Android antes de qualquer deploy
7. **91 migrations** — histórico instável de RLS; ao criar policy nova, testar com usuário real
