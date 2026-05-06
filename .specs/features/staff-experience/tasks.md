# Staff Experience — Tasks

## Status Geral

| ID | Título | Prioridade | Depende de | Status |
|----|--------|-----------|------------|--------|
| T1 | Migration RLS: staff lê dados da empresa | P1 | — | Pending |
| T2 | Fix StaffOnboarding: botão usa markTutorialCompleted | P1 | — | Pending |
| T3 | Fix ProfileModal: ocultar Nome do Negócio para staff | P1 | — | Pending |
| T4 | Fix useDashboardData: usar effectiveUserId | P1 | T1 | Pending |
| T5 | Fix Agenda.tsx: queries com effectiveUserId | P1 | T1 | Pending |
| T6 | Nova página StaffInsights | P2 | T1 | Pending |
| T7 | Rota + Navegação sidebar para /meus-insights | P2 | T6 | Pending |

---

## T1 — Migration RLS: staff lê dados da empresa

**Req**: STAFF-02-DB

**What**: Criar migration SQL com 4 políticas SELECT para appointments, clients, services e team_members,
permitindo que staff com `profiles.company_id = tabela.user_id` acesse os dados da empresa.

**Where**: `supabase/migrations/20260420_staff_read_company_data.sql` (novo arquivo)

**Done when**:
- Arquivo SQL criado com 4 `CREATE POLICY` statements (ver design.md)
- Cada policy usa `DROP POLICY IF EXISTS` antes de criar (idempotente)
- Não quebra policies existentes (additive)

**Gate**: `npm run typecheck` passa (migration é SQL puro, sem impacto em tipos)

**Verification**: Revisar o SQL manualmente para confirmar que o padrão EXISTS está correto

---

## T2 — Fix StaffOnboarding: botão usa markTutorialCompleted

**Req**: STAFF-01

**What**: Substituir chamada direta ao Supabase em `handleStart()` por `markTutorialCompleted()`
do AuthContext, que já faz update no banco e atualiza o estado React simultaneamente.

**Where**: `pages/StaffOnboarding.tsx`

**Depends on**: — (independente)

**Changes**:
```tsx
// Adicionar ao destructuring do useAuth:
const { user, companyId, fullName, markTutorialCompleted } = useAuth();

// Substituir handleStart:
const handleStart = async () => {
  setLoading(true);
  await markTutorialCompleted();
  navigate('/');
};
// Remover: import { supabase } se não usado em outro lugar (verificar)
```

**Done when**:
- `handleStart()` chama `markTutorialCompleted()` em vez de supabase diretamente
- `setLoading` removido se desnecessário (markTutorialCompleted é rápida)
- `npm run typecheck` e `npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## T3 — Fix ProfileModal: ocultar Nome do Negócio para staff

**Req**: STAFF-03

**What**: Adicionar condicional `!isStaff` ao campo "Nome do Negócio" no ProfileModal.
Garantir que staff também não salve `business_name` no handleSave.

**Where**: `components/ProfileModal.tsx`

**Depends on**: — (independente)

**Changes**:
- Extrair `role` do `useAuth()`
- `const isStaff = role === 'staff'`
- Envolver o campo `Nome do Negócio` com `{!isStaff && (...)}`
- Em `handleSave`: só incluir `business_name` no payload se `!isStaff`
- Em `handleSave` (supabase.auth.updateUser): idem
- Remover o botão "Configurações Avançadas" (navega para `/configuracoes/geral`) para staff (já protegido por OwnerRouteGuard, mas melhor ocultar)

**Done when**:
- Staff não vê o campo "Nome do Negócio" no modal
- Owner ainda vê e edita o campo normalmente
- `npm run typecheck && npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## T4 — Fix useDashboardData: usar effectiveUserId

**Req**: STAFF-02-FE (dashboard)

**What**: Substituir todas as ocorrências de `.eq('user_id', user.id)` em `useDashboardData.ts`
por `.eq('user_id', effectiveUserId)` onde `effectiveUserId = companyId ?? user?.id`.

**Where**: `hooks/useDashboardData.ts`

**Depends on**: T1 (RLS migration deve estar aplicada no Supabase para testar)

**Changes**:
- Extrair `companyId` do `useAuth()`
- `const effectiveUserId = companyId ?? user?.id`
- Substituir todas as ocorrências de `user.id` em queries (aproximadamente 6-8)
- Query de `goal_settings` e `profiles` podem continuar com `user.id` (são dados pessoais do usuário)
- Query de `appointments`, `finance_records` (se houver), `clients` → usar `effectiveUserId`

**Done when**:
- Todas as queries de dados da empresa usam `effectiveUserId`
- Queries de dados do usuário (perfil, goals) continuam com `user.id`
- `npm run typecheck && npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## T5 — Fix Agenda.tsx: queries com effectiveUserId

**Req**: STAFF-02-FE (agenda)

**What**: Substituir queries de `user.id` que acessam dados da empresa na `Agenda.tsx`
por `effectiveUserId`. Confirmar que criação de agendamento usa `companyId` (não staff.id).

**Where**: `pages/Agenda.tsx`

**Depends on**: T1

**Queries a corrigir** (linhas com `.eq('user_id', user.id)` que devem usar effectiveUserId):
- Linha 198: busca de agendamentos → `effectiveUserId`
- Linhas 324, 342, 350: operações de update/delete → verificar se staff deve poder fazer (manter lógica de permissão existente, só trocar o filtro de leitura)
- Linhas 387, 394, 436, 446, 457, 481, 488: leituras de serviços, clientes, team_members → `effectiveUserId`

**Linhas já corretas** (não mexer): 305, 314 (já usam `companyId || user.id`)

**Atenção**: Na criação de agendamentos, confirmar que `user_id` é salvo como `companyId`
(não `user.id` do staff), para o agendamento ficar associado à empresa correta.

**Done when**:
- Staff vê agendamentos da empresa na Agenda
- Criação de agendamento salva `user_id = companyId`
- `npm run typecheck && npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## T6 — Nova página StaffInsights

**Req**: STAFF-04-PAGE

**What**: Criar componente `pages/StaffInsights.tsx` com métricas pessoais do colaborador.

**Where**: `pages/StaffInsights.tsx` (novo arquivo)

**Depends on**: T1 (para queries funcionarem)

**Layout** (seguir design system brutal existente):

```
┌─────────────────────────────────────────────┐
│  MEUS RESULTADOS — [NOME DO COLABORADOR]    │
│  [HOJE] [SEMANA] [MÊS]  ← período selector │
├──────────────┬──────────────┬───────────────┤
│  Atendimentos│ Clientes     │  Comissões    │
│     [N]      │    [N]       │   R$ [N]      │
├──────────────┴──────────────┴───────────────┤
│  PRÓXIMOS HOJE                              │
│  [Lista de agendamentos do dia]             │
├─────────────────────────────────────────────┤
│  TOP SERVIÇOS DO MÊS                        │
│  1. [Serviço] — [N] vezes                   │
│  2. [Serviço] — [N] vezes                   │
└─────────────────────────────────────────────┘
```

**Data queries**:
```ts
// Agendamentos — filtrar por professional_id
supabase.from('appointments')
  .select('id, service, appointment_time, status, clients(name)')
  .eq('professional_id', teamMemberId)  // teamMemberId do AuthContext
  .gte('appointment_time', periodStart)
  .order('appointment_time', { ascending: true })

// Comissões — RLS já configurada
supabase.from('finance_records')
  .select('amount, created_at, description')
  .gte('created_at', periodStart)
```

**Estado vazio**: Quando `!teamMemberId` ou sem dados → card com mensagem
"Você ainda não tem agendamentos registrados. Aguarde o owner vincular seu perfil."

**Done when**:
- Componente criado e exportado como named export
- 3 métricas hero cards funcionais
- Lista de próximos agendamentos do dia
- Estado vazio tratado
- `npm run typecheck && npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## T7 — Rota + Navegação sidebar para /meus-insights

**Req**: STAFF-04-NAV

**What**: Registrar rota `/meus-insights` em `App.tsx` com redirect para owner. Adicionar
item no Sidebar para staff.

**Where**: `App.tsx`, `components/Sidebar.tsx`

**Depends on**: T6

**App.tsx**:
```tsx
const StaffInsights = React.lazy(() => import('./pages/StaffInsights').then(m => ({ default: m.StaffInsights })));

// Na ProtectedLayout routes, antes do fallback:
<Route path="/meus-insights" element={
  <StaffInsightsRoute />
} />

// Componente guard inline ou StaffInsightsRoute component:
const StaffInsightsRoute = () => {
  const { role } = useAuth();
  if (role === 'owner') return <Navigate to="/insights" replace />;
  return <StaffInsights />;
};
```

**Sidebar.tsx**: Após o bloco `{isStaff && renderLink('/configuracoes/servicos', Package, 'Serviços')}`, adicionar:
```tsx
{isStaff && renderLink('/meus-insights', TrendingUp, 'Meus Insights')}
```

**Done when**:
- Rota `/meus-insights` renderiza StaffInsights para staff
- Owner em `/meus-insights` é redirecionado para `/insights`
- Sidebar mostra "Meus Insights" para staff com highlight ativo correto
- `npm run typecheck && npm run lint` passam

**Gate**: `npm run typecheck && npm run lint`

---

## Verificação Final

Após todas as tasks:

```bash
npm run typecheck   # zero erros
npm run lint        # zero warnings
npm test            # testes existentes passam
```

**Checklist manual**:
- [ ] Staff registra via link → completa onboarding → acessa Dashboard (sem loop)
- [ ] Staff no Dashboard vê agendamentos da empresa
- [ ] Staff na Agenda vê e interage com agendamentos da empresa
- [ ] Staff em "Meu Perfil" não vê "Nome do Negócio"
- [ ] Staff em `/meus-insights` vê suas métricas
- [ ] Owner em Dashboard/Agenda/Perfil funciona identicamente a antes
