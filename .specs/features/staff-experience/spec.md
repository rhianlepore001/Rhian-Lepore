# Staff Experience — Especificação

## Problem Statement

A experiência do colaborador (role: `staff`) está quebrada em múltiplos pontos críticos:
o botão de onboarding trava num loop de redirect, o dashboard não exibe dados da empresa,
o modal de perfil expõe campo que não deveria existir para staff, e falta uma página dedicada
ao colaborador visualizar seu próprio desempenho. O resultado é um fluxo inutilizável após
o registro via link de convite.

## Goals

- [ ] Colaborador consegue completar o onboarding e acessar o app sem loop
- [ ] Colaborador vê os dados da barbearia/salão (agenda, clientes, serviços) ao logar
- [ ] Modal "Meu Perfil" exibe apenas campos relevantes para staff (sem Nome do Negócio)
- [ ] Colaborador tem página própria de insights com suas métricas individuais

## Out of Scope

| Feature | Reason |
|---------|--------|
| Staff criar/deletar agendamentos de outros profissionais | Permissão gerenciada pelo owner — não muda aqui |
| Staff acessar Financeiro do negócio | Exclusivo do owner — permanece restrito |
| Staff acessar Marketing/Insights do negócio | Exclusivo do owner — permanece restrito |
| Notificações push para staff | Feature futura |
| Staff editar configurações do negócio | Fora do escopo desta feature |

---

## User Stories

### P1: [STAFF-01] Onboarding funcional — sem loop de redirect ⭐ MVP

**User Story**: Como colaborador recém-registrado, quero clicar em "Acessar minha agenda"
e ser direcionado para o dashboard, para poder começar a trabalhar imediatamente.

**Why P1**: Sem isso, o staff fica preso em loop infinito e nunca acessa o app.

**Root Cause identificada**: `StaffOnboarding.handleStart()` persiste `tutorial_completed=true`
no banco, mas **não atualiza o estado do AuthContext**. Quando navega para `/`,
`ProtectedLayout` ainda lê `tutorialCompleted=false` e redireciona de volta.

**Fix**: Substituir a chamada direta ao Supabase por `markTutorialCompleted()` do `useAuth()`,
que já atualiza banco + estado React simultaneamente.

**Acceptance Criteria**:

1. WHEN staff clica em "Acessar minha agenda" THEN sistema SHALL chamar `markTutorialCompleted()` do AuthContext
2. WHEN `tutorialCompleted` muda para `true` no estado THEN `ProtectedLayout` SHALL renderizar o Dashboard sem redirect
3. WHEN staff faz login pela segunda vez (tutorial já concluído) THEN sistema SHALL ir direto ao Dashboard sem passar pelo `/staff-onboarding`

**Independent Test**: Registrar novo staff via link → clicar no botão → verificar que cai no Dashboard.

---

### P1: [STAFF-02] Staff visualiza dados da empresa no Dashboard e Agenda ⭐ MVP

**User Story**: Como colaborador, quero ver a agenda da barbearia e os clientes no app,
para poder gerenciar meu dia de trabalho.

**Why P1**: Sem dados, o app é inútil para o staff. É o core da jornada do colaborador.

**Root Cause identificada**: Dois problemas combinados:

1. **Frontend**: Queries usam `.eq('user_id', user.id)` (UUID do staff). Para staff, o
   correto é usar `companyId` (UUID do dono/owner). `useDashboardData.ts` ignora `companyId`.
   `Agenda.tsx` corrige parcialmente (linhas 305, 314 usam `companyId`) mas tem ~10 queries
   ainda usando `user.id` diretamente.

2. **RLS no banco**: As policies atuais permitem apenas `auth.uid() = user_id`. Staff precisa
   de policies que permitam leitura onde `user_id = profiles.company_id` do staff.

**Tabelas afetadas** (RLS + queries):
- `appointments` — leitura pela agenda e dashboard
- `clients` — leitura pelo CRM e agenda
- `services` — leitura pela agenda e wizard de agendamento
- `team_members` — leitura pelo seletor de profissional

**Approach RLS**: Policy adicional em cada tabela permitindo SELECT para staff da empresa:
```sql
-- padrão para todas as tabelas que têm user_id
EXISTS (
  SELECT 1 FROM profiles
  WHERE id = auth.uid()
    AND role = 'staff'
    AND company_id = [tabela].user_id
)
```

**Approach Frontend**: `useDashboardData` e outros hooks/páginas devem usar `companyId` como
`effectiveUserId` via `const effectiveUserId = companyId ?? user.id`.

**Acceptance Criteria**:

1. WHEN staff acessa o Dashboard THEN sistema SHALL exibir os agendamentos da empresa (mesma empresa que o owner vê)
2. WHEN staff acessa a Agenda THEN sistema SHALL listar agendamentos, clientes e serviços da empresa
3. WHEN staff acessa `/clientes` THEN sistema SHALL listar clientes da empresa
4. WHEN staff cria agendamento na Agenda THEN agendamento SHALL ser salvo com `user_id = companyId` (não staff.id)
5. WHEN owner está logado THEN queries SHALL continuar funcionando identicamente (sem regressão)

**Independent Test**: Logar como staff → acessar Agenda → ver agendamentos que o owner também vê.

---

### P1: [STAFF-03] Modal "Meu Perfil" sem campo "Nome do Negócio" para staff ⭐ MVP

**User Story**: Como colaborador, quero editar apenas meu nome e foto no perfil,
sem ver o campo "Nome do Negócio" que não me pertence.

**Why P1**: Permitir que staff edite o `business_name` quebraria a identidade do negócio do owner.
É um bug de dados + confusão de UX.

**Root Cause identificada**: `ProfileModal.tsx` renderiza o campo `Nome do Negócio` para todos
os usuários. Para staff, `businessName` é herdado do owner — não deve ser editável.

**Fix**: Condicional `role !== 'staff'` para ocultar o campo `newBusinessName` e remover
o campo do `handleSave` quando role = staff.

**Acceptance Criteria**:

1. WHEN staff abre "Meu Perfil" THEN modal SHALL exibir apenas: foto, nome completo, e informações da conta
2. WHEN staff abre "Meu Perfil" THEN modal SHALL NOT exibir o campo "Nome do Negócio"
3. WHEN staff salva o perfil THEN sistema SHALL atualizar apenas `full_name` e `photo_url` no banco
4. WHEN owner abre "Meu Perfil" THEN modal SHALL continuar exibindo ambos os campos (sem regressão)

**Independent Test**: Logar como staff → abrir Meu Perfil → confirmar que só aparece nome + foto.

---

### P2: [STAFF-04] Página de Insights do Colaborador

**User Story**: Como colaborador, quero ver minhas métricas pessoais de desempenho
(agendamentos, serviços realizados, comissões), para acompanhar minha evolução e ganhos.

**Why P2**: Alta valor percebido pelo colaborador — motiva engajamento. Não é blocker mas
é diferencial importante.

**Rota**: `/meus-insights` — acessível apenas para staff (redireciona owner para `/insights`)

**Navegação**: Adicionar no Sidebar para staff (substituindo ou complementando os itens atuais)

**Métricas da página**:
- Agendamentos hoje / esta semana / este mês (filtrados por `professional_id = teamMemberId`)
- Serviços mais realizados (top 3-5)
- Comissões do mês atual (via `finance_records` — já tem RLS para staff: `20260417_staff_commission_rls.sql`)
- Comparativo semana anterior vs atual (variação %)
- Lista de próximos agendamentos do dia

**Data source**:
- `appointments` filtrado por `professional_id = teamMemberId` (não precisa de RLS novo — filtra pelo campo professional_id)
- `finance_records` filtrado pela RLS já existente (`staff_commission_rls`)

**Acceptance Criteria**:

1. WHEN staff acessa `/meus-insights` THEN sistema SHALL exibir métricas pessoais do colaborador
2. WHEN staff não tem agendamentos THEN sistema SHALL exibir estado vazio com mensagem encorajadora
3. WHEN owner acessa `/meus-insights` THEN sistema SHALL redirecionar para `/insights`
4. WHEN staff acessa a página THEN Sidebar SHALL destacar o item ativo corretamente
5. WHEN sistema calcula agendamentos THEN SHALL filtrar por `professional_id = teamMemberId` do auth context

**Independent Test**: Logar como staff com agendamentos vinculados → ver métricas corretas na página.

---

## Edge Cases

- WHEN staff não tem `teamMemberId` (vínculo com team_members não encontrado) THEN insights SHALL mostrar dados vazios + mensagem "Vinculação pendente"
- WHEN `companyId` é null no contexto de staff THEN queries SHALL fazer fallback para `user.id` (evita crash)
- WHEN staff sem `tutorial_completed` acessa rota protegida THEN ProtectedLayout SHALL redirecionar para `/staff-onboarding` (comportamento atual preservado)
- WHEN RLS migration falha na tabela appointments THEN aplicação SHALL continuar funcionando sem quebrar (queries retornam vazio, não erro 500)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| STAFF-01 | P1: Onboarding loop fix | Tasks | Pending |
| STAFF-02-FE | P1: Frontend effectiveUserId | Tasks | Pending |
| STAFF-02-DB | P1: RLS migrations (4 tabelas) | Tasks | Pending |
| STAFF-03 | P1: ProfileModal staff mode | Tasks | Pending |
| STAFF-04-PAGE | P2: Página /meus-insights | Tasks | Pending |
| STAFF-04-NAV | P2: Sidebar nav para staff | Tasks | Pending |

**Coverage:** 6 requisitos, 0 mapeados para tasks ⚠️ (próxima fase)

---

## Success Criteria

- [ ] Staff completa onboarding e acessa Dashboard sem loop (zero redirects desnecessários)
- [ ] Staff vê agendamentos da empresa na Agenda (mesmos dados que o owner)
- [ ] Modal "Meu Perfil" não exibe "Nome do Negócio" para staff
- [ ] Página `/meus-insights` carrega sem erros e exibe métricas do colaborador
- [ ] Zero regressão para o fluxo do owner (todos os testes existentes passam)
