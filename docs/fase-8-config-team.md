# Fase 8 - Configuracoes + Equipe

## Objetivo

Criar a camada de tipos, services e hooks para Configuracoes (business_settings + profiles) e Equipe (team_members), seguindo o paradigma funcional leve definido pelo Reversa. Isso permite que as paginas de configuracoes consumam dados via TanStack Query com validacao Zod em vez de chamadas diretas ao Supabase nos componentes.

## Entregue nesta etapa

### Infraestrutura

- `types/team.ts`
  - Schemas Zod para `TeamMember`, `TeamMemberInput`, `TeamMemberUpdate`
  - Colunas alinhadas com o schema real do banco: `active` (nao `is_active`), `is_owner`, `commission_rate`, `commission_percent`, `cpf`, `display_order`, `business_id`, `staff_user_id`, `slug`
  - Removidos campos fantasmas que pertenciam a `business_settings` (`payment_frequency`, `payment_day`)

- `types/settings.ts`
  - Schemas Zod para `BusinessSettings`, `BusinessSettingsUpdate`, `ProfileFields`
  - `businessSettingsSchema` com apenas colunas reais de `business_settings` (nao de `profiles`)
  - `profileFieldsSchema` com colunas reais de `profiles` (incluindo `booking_lead_time_hours`, nao `lead_time_hours`)
  - Schemas de `BusinessHours` com validacao de blocos de horario

- `services/team.ts`
  - `fetchTeamMembers(companyId)`: busca com filtro por `company_id` e ordenacao
  - `createTeamMember(companyId, input)`: cria com Zod parse de entrada,slug automatico
  - `updateTeamMember(memberId, companyId, input)`: atualiza com Zod parse e filtro de tenant
  - `deleteTeamMember(memberId, companyId)`: remove com filtro de tenant
  - `generateSlug()`: funcao pura para gerar slugs a partir de nomes

- `services/settings.ts`
  - `fetchBusinessSettings(companyId)`: busca com `maybeSingle()` e Zod parse
  - `updateBusinessSettings(companyId, updates)`: upsert com `onConflict: 'user_id'` e Zod parse
  - `fetchProfileFields(userId)`: busca colunas especificas de `profiles`
  - `updateProfileFields(userId, updates)`: atualiza com Zod parse

- `hooks/useTeam.ts`
  - `useTeamMembers()`: query com `enabled: !!companyId`, `staleTime: 2min`
  - `useCreateTeamMember()`, `useUpdateTeamMember()`, `useDeleteTeamMember()`: mutations com invalidacao automatica

- `hooks/useSettings.ts`
  - `useBusinessSettings()`: query com `enabled: !!companyId`
  - `useUpdateBusinessSettings()`: mutation com invalidacao de settings e dashboard
  - `useProfileFields()`: query com `enabled: !!user?.id`
  - `useUpdateProfileFields()`: mutation com invalidacao de profile e dashboard

- `supabase/migrations/20260530_team_add_is_owner.sql`
  - Adiciona `is_owner` e `commission_rate` a `team_members`
  - Backfill: `is_owner = true` onde `user_id = business_id`

### Paginas migradas para hooks TanStack Query

1. **TeamSettings.tsx** — `useTeamMembers()` + `useDeleteTeamMember()` + invalidacao de cache no `onSave`
2. **PublicBookingSettings.tsx** — `useBusinessSettings()` + `useProfileFields()` + `useUpdateBusinessSettings()` + `useUpdateProfileFields()` (sem supabase direto)
3. **CommissionsSettings.tsx** — `useTeamMembers()` + `useBusinessSettings()` + invalidacao de cache em 3 saves; RLS corrigido (`companyId` em vez de `user.id`)
4. **GeneralSettings.tsx** — `useBusinessSettings()` + `useProfileFields()` + `useUpdateBusinessSettings()` + `useUpdateProfileFields()` (mantem supabase.storage para upload e supabase.auth.updateUser)
5. **FinancialSettings.tsx** — `useBusinessSettings()` + `useUpdateBusinessSettings()` (sem supabase direto para business_settings)

### Bug fixes criticos corrigidos

1. **TeamSettings `onSave`** — invalida query cache `['team', companyId, 'members']` apos criar/editar membro
2. **CommissionsSettings saves** — 3 saves diretos agora invalidam cache TanStack Query correspondente
3. **CommissionsSettings RLS** — `user.id` substituido por `companyId` em todos os writes (staff via RLS)
4. **PublicBookingSettings profile** — supabase direto substituido por `useUpdateProfileFields()` mutation com invalidacao automatica
5. **CommissionsSettings loading** — estado manual `loading`/`setLoading` removido, derivado de `membersLoading && !settingsData`

## Fora de escopo

- Refactor de `TeamMemberForm.tsx` para usar service layer (ainda faz supabase direto, mas o parent invalida cache via `onSave`)
- Implementacao de Produtos (Fase 9+)
- Testes E2E

## Criterios Reversa cobertos

- BR-MIGRAR-007: Registro de staff cria team_member com slug automatico (service `createTeamMember`)
- BR-MIGRAR-010: Owner/Staff/Dev roles com guards de rota (mantido existente)
- Paradigma alvo: services sem React, hooks com TanStack Query, tipos Zod, `companyId` de `useAuth()`

## Criterios de aceite

- `npm run typecheck` sem erros
- `npm run build` sem erros
- 192 testes passando (1 preexistente falhando em `useDashboardData`, nao relacionado)
- Schemas Zod alinhados com colunas reais do banco (revisado por auditor)
- Migration para `is_owner` e `commission_rate` idempotente
- 5 paginas de settings migradas sem supabase direto para fetch/write (exceto storage e auth)
- RLS multi-tenant: todos os writes usam `companyId`, nunca `user.id` direto

## Proxima fase

Fase 9: Produtos. Mas a recomendacao do CTO e estabilizar o core com usuarios beta antes de adicionar Produtos.