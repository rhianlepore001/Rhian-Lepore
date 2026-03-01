---
id: US-006
título: ❌ [DESCARTADO] Migração Completa para Clerk Auth
status: deleted
estimativa: 6h
prioridade: low
agente: N/A
assignee: N/A
blockedBy: []
---

# ❌ US-006: [DESCARTADO] Migração Completa para Clerk Auth

**STATUS: DESCARTADO EM 1 DE MARÇO DE 2026**

Este story foi cancelado. Veja `.claude-memory/CLERK_DECISION.md` para explicação completa.

## Por Quê Descartado

❌ **Tentativas anteriores: 3x quebraram completamente**
- Usuários não conseguiam fazer login
- Dados foram perdidos / configurações deletadas
- RLS ficou quebrado (vazamento de dados entre empresas)

❌ **Visual premium perdido**
- Clerk UI é genérica e não se integra com Brutal theme
- Perda de experiência visual premium dos usuários

❌ **Supabase Auth já oferece segurança suficiente**
- Clerk não é "mais seguro", é apenas diferente
- 2FA pode ser ativado no Supabase Auth
- OAuth disponível no Supabase Auth
- Custo/benefício negativo para trocar

✅ **Decisão: Continuar com Supabase Auth + melhorias**
- Manter visual Brutal theme premium
- Ativar 2FA em Supabase Auth
- Implementar rate limiting para segurança
- Zero risco de quebra

Veja decisão arquitetural em `CLERK_DECISION.md`

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
