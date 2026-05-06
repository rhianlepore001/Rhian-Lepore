# Staff Experience — Design Técnico

## Arquitetura da Solução

### Princípio Central
O `companyId` no `AuthContext` já é o "ID efetivo da empresa" para qualquer usuário:
- **Owner**: `companyId === user.id` (aponta para si mesmo)
- **Staff**: `companyId === owner.id` (aponta para o dono)

Logo, `effectiveUserId = companyId ?? user.id` é seguro para ambos os roles.

---

## STAFF-01 — Fix: StaffOnboarding loop

### Problema
```
handleStart() → supabase.update(tutorial_completed=true) → navigate('/')
                                ↑ apenas no banco, NÃO no React state
ProtectedLayout vê tutorialCompleted=false → Navigate to /staff-onboarding → LOOP
```

### Solução
```tsx
// ANTES (StaffOnboarding.tsx)
const handleStart = async () => {
  setLoading(true);
  if (user?.id) {
    await supabase.from('profiles').update({ tutorial_completed: true }).eq('id', user.id);
  }
  navigate('/');
};

// DEPOIS
const { markTutorialCompleted } = useAuth(); // já existe no AuthContext

const handleStart = async () => {
  setLoading(true);
  await markTutorialCompleted(); // atualiza banco + estado React
  navigate('/');
};
```

### Arquivos
- `pages/StaffOnboarding.tsx` — única mudança: 3 linhas

---

## STAFF-02 — Fix: Staff vê dados da empresa

### Parte A: Frontend — effectiveUserId

**Padrão a adotar** (sem criar helper, inline onde necessário):
```ts
const { user, companyId, role } = useAuth();
const effectiveUserId = companyId ?? user?.id;
```

**Arquivos a corrigir**:

| Arquivo | Problema | Fix |
|---------|----------|-----|
| `hooks/useDashboardData.ts` | `user.id` em todas as queries | Extrair `companyId` e usar `effectiveUserId` |
| `pages/Agenda.tsx` | ~10 queries com `user.id` direto (linhas 198, 324, 342, 350, 387, 394, 436, 446, 457, 481, 488, etc.) | Substituir por `effectiveUserId` |
| `pages/Clients.tsx` | `user.id` nas queries de clientes | `effectiveUserId` |

**Importante para Agenda**: Staff NÃO deve poder criar agendamentos com `user_id = staff.id`.
Já existe: linha 305 usa `companyId || user.id` — confirmar que criação de agendamento usa esse padrão.

### Parte B: Database — RLS Migrations

**Nova migration**: `supabase/migrations/[timestamp]_staff_read_company_data.sql`

Política padrão reutilizada para 4 tabelas:

```sql
-- Função helper para reusar a lógica (mais limpo que repetir EXISTS)
-- NÃO criar função — usar EXISTS inline (mais seguro com RLS, sem SECURITY DEFINER)

-- appointments
CREATE POLICY "Staff can read company appointments"
  ON public.appointments FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'staff'
        AND company_id = appointments.user_id
    )
  );

-- clients
CREATE POLICY "Staff can read company clients"
  ON public.clients FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'staff'
        AND company_id = clients.user_id
    )
  );

-- services
CREATE POLICY "Staff can read company services"
  ON public.services FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'staff'
        AND company_id = services.user_id
    )
  );

-- team_members
CREATE POLICY "Staff can read company team members"
  ON public.team_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR staff_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'staff'
        AND company_id = team_members.user_id
    )
  );
```

**Nomenclatura migration**: `20260420_staff_read_company_data.sql`

**Verificação de conflicts**: Checar policies existentes com `DROP POLICY IF EXISTS` antes de criar.

---

## STAFF-03 — Fix: ProfileModal sem "Nome do Negócio" para staff

### Solução

```tsx
// ProfileModal.tsx — extrair role do useAuth
const { user, businessName, fullName, userType, region, avatarUrl, role } = useAuth();
const isStaff = role === 'staff';

// No formulário: condicional no campo
{!isStaff && (
  <div>
    <label htmlFor="profile-business-name">Nome do Negócio</label>
    <input value={newBusinessName} ... />
  </div>
)}

// No handleSave: não enviar businessName se staff
const updatePayload: Record<string, any> = {
  full_name: newFullName,
  photo_url: newPhotoUrl
};
if (!isStaff) {
  updatePayload.business_name = newBusinessName;
}
```

**Arquivos**: `components/ProfileModal.tsx` — ~10 linhas de mudança

---

## STAFF-04 — Nova Página: /meus-insights

### Estrutura da Página

```
pages/StaffInsights.tsx
├── Header: "Meus Resultados — [fullName]"
├── Período selector (Hoje / Esta semana / Este mês)
├── Hero Cards Row
│   ├── Atendimentos [período]
│   ├── Clientes únicos [período]
│   └── Comissões [período]
├── Próximos agendamentos (hoje)
└── Top serviços realizados (este mês)
```

### Data Fetching

```ts
// Agendamentos pessoais — usa professional_id (não precisa de RLS novo)
supabase
  .from('appointments')
  .select('*, clients(name)')
  .eq('professional_id', teamMemberId)  // teamMemberId do AuthContext
  .gte('appointment_time', startDate)
  .lte('appointment_time', endDate)

// Comissões — já tem RLS (20260417_staff_commission_rls.sql)
supabase
  .from('finance_records')
  .select('amount, created_at, description')
  .gte('created_at', startDate)
```

### Rota no App.tsx

```tsx
const StaffInsights = React.lazy(() => import('./pages/StaffInsights').then(m => ({ default: m.StaffInsights })));

// Na ProtectedLayout (routes):
<Route path="/meus-insights" element={
  role === 'owner'
    ? <Navigate to="/insights" replace />
    : <StaffInsights />
} />
```

### Navegação no Sidebar (constants.ts + Sidebar.tsx)

Estratégia: adicionar `Meus Insights` na lista de itens visíveis para staff, junto com `Serviços` (já existente).

```tsx
// Sidebar.tsx — bloco extra para staff
{isStaff && renderLink('/meus-insights', TrendingUp, 'Meus Insights')}
```

### Design System

Seguir o padrão brutal existente:
- `BrutalCard` para os cards de métricas
- `font-heading uppercase` para títulos
- `text-accent-gold` para números de destaque
- `bg-brutal-card border-4 border-black` para containers

---

## Ordem de Implementação (Tasks)

```
T1: Migration RLS (STAFF-02-DB)         ← sem dependência, pode ir primeiro
T2: Fix StaffOnboarding (STAFF-01)      ← 3 linhas, rápido
T3: Fix ProfileModal (STAFF-03)         ← 10 linhas
T4: Fix useDashboardData (STAFF-02-FE)  ← depende de T1
T5: Fix Agenda.tsx queries (STAFF-02-FE) ← depende de T1
T6: Página StaffInsights (STAFF-04)     ← pode rodar em paralelo com T4/T5
T7: Rota + Navegação (STAFF-04-NAV)     ← depende de T6
```
