---
id: US-006
título: Migração Completa para Clerk Auth
status: in-progress
estimativa: 6h
prioridade: high
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-006: Migração Completa para Clerk Auth

## Por Quê

O projeto está em transição de Supabase Auth para Clerk. Clerk oferece:
- Magic Links e OAuth melhores
- 2FA nativa (crítico para SaaS de salões)
- Fraud detection automático
- Integração mais robusta com multi-tenant

A migração precisa ser **completa e testada** para evitar auth breaks em produção.

## O Que

1. **Codebase:**
   - Remover referencias legadas a Supabase Auth
   - Atualizar `AuthContext.tsx` para usar Clerk
   - Verificar que `useAuth()` retorna dados corretos

2. **Supabase RLS:**
   - Validar que RLS policies usam `auth.jwt() -> 'sub'` (Clerk user ID)
   - Não depender mais de Supabase Auth Claims

3. **Testing:**
   - Testes de auth flow (login → redirect → protectedPage)
   - Testes de RLS (user A não vê dados de user B)

4. **Deployment:**
   - Validar vars de ambiente (`CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
   - Testar em staging antes de produção

## Critérios de Aceitação

- [ ] Branch `clerk-migration` mergeado em `main`
- [ ] Todas as references a Supabase Auth removidas ou deprecated
- [ ] `AuthContext.tsx` usa Clerk como source of truth
- [ ] Testes de auth passam (login, logout, protected pages)
- [ ] RLS policies validadas para Clerk JWT
- [ ] Manual: Fazer login com Clerk em staging e acessar dados pessoais
- [ ] Zero breaking changes para usuários existentes

## Arquivos Impactados

- `contexts/AuthContext.tsx` (refator para Clerk)
- `pages/Login.tsx` (integração Clerk)
- `lib/supabase.ts` (cliente RLS com Clerk JWT)
- Supabase RLS policies (validação)
- `.env.example` (adicionar CLERK_*)

## Progresso Atual

- 🔄 Branch `clerk-migration` em desenvolvimento
- ⏳ AuthContext não 100% convertida
- ⏳ RLS policies não verificadas
- ⏳ Testes de auth não rodados

## Definição de Pronto

- [ ] Lint: `npm run lint` sem erros
- [ ] Typecheck: `npm run typecheck` sem erros
- [ ] Testes: Auth flows passam (`npm test`)
- [ ] Manual: Login → Dashboard → Ver dados pessoais
- [ ] RLS: Verificado isolamento multi-tenant
