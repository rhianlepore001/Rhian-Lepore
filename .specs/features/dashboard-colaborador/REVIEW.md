---
feature: dashboard-colaborador
reviewed: 2026-04-17T00:00:00Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - App.tsx
  - constants.ts
  - components/BottomMobileNav.tsx
  - components/StaffEarningsCard.tsx
  - pages/Dashboard.tsx
  - supabase/migrations/20260417_staff_commission_rls.sql
  - contexts/AuthContext.tsx (contexto de suporte — lido para análise)
  - hooks/useMeuDiaData.ts (contexto de suporte — lido para análise)
  - supabase/migrations/20260216_rls_phase4_financial.sql (contexto de suporte)
  - supabase/migrations/20260307_us015b_multi_user_rls.sql (contexto de suporte)
findings:
  critical: 2
  high: 3
  medium: 4
  low: 3
  info: 4
  total: 16
status: issues_found
---

# Feature Review: dashboard-colaborador

**Revisado:** 2026-04-17
**Depth:** standard
**Arquivos revisados:** 7 arquivos principais + 4 de suporte
**Status:** Issues encontradas — publicar somente após corrigir CRITICAL e HIGH

---

## Resumo

A feature implementa o dashboard restrito para colaboradores (staff) com StaffEarningsCard, MeuDiaWidget, bloqueio de rotas via OwnerRouteGuard, e uma nova RLS no banco. A estrutura geral está correta: o guard no App.tsx protege as rotas na camada de rota, a sidebar filtra `ownerOnly: true` via constants.ts, e o BottomMobileNav oculta Financeiro e Mais para staff.

Foram identificados **2 problemas críticos de segurança**: (1) a nova RLS entra em conflito com uma policy `FOR ALL` preexistente em `finance_records`, o que pode deixar staff com acesso irrestrito à tabela financeira; (2) `useMeuDiaData` filtra agendamentos por `user.id` (o auth UID do staff), mas o campo `professional_id` nos agendamentos guarda o UUID do `team_members`, não o `auth.uid()` do staff — resultando em MeuDiaWidget sempre vazio para o staff.

---

## CRITICAL

### CR-01: RLS em `finance_records` — conflito entre a nova policy e a policy `Finance: company isolation` preexistente

**Arquivo:** `supabase/migrations/20260417_staff_commission_rls.sql:8-17`

**Issue:** A migration cria uma nova policy `SELECT` para staff sem remover (nem mencionar) a policy `"Finance: company isolation"` criada em `20260307_us015b_multi_user_rls.sql`. Essa policy concede `FOR ALL` (inclui SELECT) a qualquer usuário cujo `get_auth_company_id()` coincida com o `user_id` do registro — o que inclui staff, pois staff pertence à mesma company. Em PostgreSQL RLS com múltiplas policies, basta **uma** das policies retornar `true` para o acesso ser concedido. Logo, a nova policy `"Staff can view own commissions"` é redundante: o staff já enxergava **todos** os registros da empresa pela policy anterior.

O efeito líquido é que **a nova migration não restringe nada**: staff continua vendo todos os finance_records da empresa (receita total, pagamentos de outros profissionais, despesas). Isso constitui vazamento de dados financeiros confidenciais entre colaboradores.

**Contexto de migrations relevantes:**
- `20260216_rls_phase4_financial.sql` — criou `"Owner can manage finance_records"` com `auth.uid()::text = user_id` (só owner)
- `20260307_us015b_multi_user_rls.sql` — criou `"Finance: company isolation"` com `user_id = get_auth_company_id()` (company-wide, inclui staff)
- `20260417_staff_commission_rls.sql` — adiciona `"Staff can view own commissions"` sem remover a anterior

**Fix necessário:** A migration precisa:
1. Remover a policy permissiva de company isolation para finance_records
2. Criar policy restrita para owner com `FOR ALL`
3. Criar policy restrita para staff com `FOR SELECT` limitado às próprias comissões

```sql
-- Remover a policy que dá acesso irrestrito ao staff
DROP POLICY IF EXISTS "Finance: company isolation" ON public.finance_records;

-- Recriar acesso total apenas para o dono
DROP POLICY IF EXISTS "Owner can manage finance_records" ON public.finance_records;
CREATE POLICY "Owner can manage finance_records"
    ON public.finance_records
    FOR ALL
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Staff: apenas próprias comissões (SELECT only)
DROP POLICY IF EXISTS "Staff can view own commissions" ON public.finance_records;
CREATE POLICY "Staff can view own commissions"
    ON public.finance_records
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.id = professional_id
              AND tm.staff_user_id = auth.uid()
        )
    );
```

---

### CR-02: `useMeuDiaData` filtra por `user.id` (auth UID) mas `appointments.professional_id` contém o UUID de `team_members`

**Arquivo:** `hooks/useMeuDiaData.ts:46`

**Issue:** A query filtra `.eq('professional_id', user.id)` onde `user.id` é o `auth.uid()` do staff logado (UUID da tabela `auth.users`). Porém, o campo `professional_id` na tabela `appointments` armazena o `team_members.id` — conforme confirmado no `AuthContext` (`teamMemberId` = `team_members.id`, distinto de `user.id`). O `auth.uid()` do staff nunca vai bater com um `professional_id` que é um ID de `team_members`.

**Consequência:** Para staff, `MeuDiaWidget` sempre exibe "Nenhum agendamento para hoje" independente dos agendamentos reais. A feature central do dashboard do colaborador está quebrada funcionalmente.

```typescript
// ERRADO — user.id é o auth UID, não o team_member UUID
.eq('professional_id', user.id)

// CORRETO — usar teamMemberId do AuthContext
const { user, teamMemberId } = useAuth();
// ...
if (!teamMemberId) { setLoading(false); return; }
// ...
.eq('professional_id', teamMemberId)
```

---

## HIGH

### HR-01: `markAsCompleted` em `useMeuDiaData` não filtra por `company_id` / `user_id` — staff pode completar agendamentos de outras empresas

**Arquivo:** `hooks/useMeuDiaData.ts:104-106`

**Issue:** O update é feito apenas com `.eq('id', id)` sem nenhum filtro adicional de tenant. Se o RLS de `appointments` estiver com falha silenciosa (cenário documentado no CLAUDE.md como gotcha #1), qualquer staff logado que conheça um `id` de appointment de outra empresa consegue marcar como concluído. O padrão do projeto exige filtro explícito de `company_id` / `user_id` em toda operação de escrita.

```typescript
// Adicionar filtro explícito de tenant
const { error } = await supabase
    .from('appointments')
    .update({ status: 'Completed' })
    .eq('id', id)
    .eq('user_id', companyId); // companyId = owner's user_id, vem do AuthContext
```

---

### HR-02: Toast "Acesso restrito" depende de sessionStorage ser lido antes de ser limpo — race condition com React StrictMode

**Arquivo:** `pages/Dashboard.tsx:43-50` + `App.tsx:106`

**Issue:** O mecanismo de toast via `sessionStorage` tem duas vulnerabilidades:

1. **Race condition em StrictMode:** React 19 com StrictMode executa `useEffect` duas vezes em desenvolvimento. Na segunda execução, `sessionStorage.getItem('ownerRouteToast')` retorna `null` pois o item já foi removido na primeira execução. O toast nunca aparece em dev.

2. **Falha silenciosa em produção:** Se o usuário for redirecionado via `OwnerRouteGuard` mas o Dashboard não for o componente que renderiza, ou se ele fechar e reabrir a aba (sessionStorage persiste entre reloads da mesma aba), a mensagem pode reaparecer de forma inesperada ou nunca aparecer.

O projeto já tem `AlertsContext` com `showAlert` — esse é o padrão correto documentado no CLAUDE.md.

**Fix:** Passar o motivo do redirect como query param e consumir no Dashboard, ou melhor, usar o `AlertsContext` diretamente via navegação programática dentro de um wrapper que tenha acesso ao context.

---

### HR-03: `BottomMobileNav` — quando staff acessa `/`, o layout mobile fica quebrado por ausência de botões 3 e 4

**Arquivo:** `components/BottomMobileNav.tsx:85-108`

**Issue:** Para o staff, os botões "Financeiro" e "Mais" são ocultados com `{!isStaff && (...)}`. O layout usa `flex items-center justify-between` com 5 slots (Agenda, Clientes, botão central +, Financeiro, Mais). Com apenas 3 itens visíveis (Agenda, Clientes, botão +), o `justify-between` distribui os 3 itens ao longo de toda a barra, criando espaçamento desproporcional e UX quebrada no mobile — o caso de uso primário desta feature (barbeiro usa celular, conforme CLAUDE.md).

**Fix:** Quando `isStaff`, renderizar a barra com apenas os itens disponíveis e considerar adicionar um placeholder ou reorganizar o layout com `justify-around` / `justify-center` para o modo staff.

---

## MEDIUM

### MD-01: Wrong route em banner de comissões — `/finance` não existe, deveria ser `/financeiro`

**Arquivo:** `pages/Dashboard.tsx:135`

**Issue:** O banner de véspera de pagamento de comissões tem um link `navigate('/finance')`. A rota correta no App.tsx é `/financeiro`. Com HashRouter, isso gera um redirect para `/` pelo fallback `*`, sem nenhum feedback de erro para o usuário.

```typescript
// ERRADO
onClick={() => navigate('/finance')}

// CORRETO
onClick={() => navigate('/financeiro')}
```

---

### MD-02: `StaffEarningsCard` — erro silencioso: `setEarnings(0)` ao falhar a query esconde o problema do usuário

**Arquivo:** `components/StaffEarningsCard.tsx:33-35`

**Issue:** Quando a query retorna erro, o componente exibe "R$ 0,00" como se fosse um valor real. O usuário não tem como distinguir entre "sem comissões pendentes" e "erro ao buscar". Isso é especialmente problemático com a situação de RLS descrita em CR-01 — em produção, após a correção do CR-01, se a RLS não estiver corretamente configurada, o staff vai ver R$ 0,00 sem saber que houve erro.

**Fix:** Adicionar um estado de erro e renderizar mensagem distinta:

```typescript
const [error, setError] = useState(false);

// no catch:
setError(true);
setEarnings(null);

// no render:
{error ? (
    <p className="text-xs text-red-400">Erro ao carregar comissões.</p>
) : (
    <p className={`text-2xl font-bold font-heading ${accentText}`}>
        {formatCurrency(earnings ?? 0, currencyRegion)}
    </p>
)}
```

---

### MD-03: `OwnerRouteGuard` — `/clientes/:id` e `/clientes` acessíveis para staff sem bloqueio intencional — verificar se é spec correta

**Arquivo:** `App.tsx:157-158`

**Issue:** As rotas `/clientes` e `/clientes/:id` (CRM completo) não têm `OwnerRouteGuard`. Pela spec, staff deveria ser bloqueado apenas de `/financeiro`, `/insights`, `/marketing` e todas as `Settings` exceto `/configuracoes/servicos`. Portanto, acesso a clientes parece intencional. Porém, a tela `ClientCRM` exibe receita total do cliente, histórico de serviços e possivelmente dados financeiros — isso precisa ser verificado contra a spec para confirmar que não expõe dados que o staff não deveria ver.

**Ação recomendada:** Confirmar com o produto se staff deve ter acesso ao CRM completo. Se sim, a `ClientCRM` precisa ser revisada para ocultar campos financeiros do cliente para usuários `role === 'staff'`.

---

### MD-04: `useMeuDiaData` — `markAsCompleted` re-executa `fetchTodayAppointments` após o update, duplicando o loading state

**Arquivo:** `hooks/useMeuDiaData.ts:116`

**Issue:** Após o `update` otimista bem-sucedido, o hook chama `fetchTodayAppointments()` que seta `setLoading(true)` novamente, causando um flash de skeleton na tela do staff depois de marcar um atendimento como concluído — UX ruim no mobile (caso principal de uso). O refetch completo é necessário para atualizar os totais, mas o `setLoading(true)` não deveria ser chamado num refetch silencioso.

**Fix:** Separar o loading inicial do loading de refresh:

```typescript
const [initialLoading, setInitialLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
// usar initialLoading para mostrar skeleton; refreshing para indicador discreto
```

---

## LOW

### LW-01: `StaffEarningsCard` — label "Seu faturamento líquido" é impreciso

**Arquivo:** `components/StaffEarningsCard.tsx:55`

**Issue:** O card exibe comissões com `commission_paid = false`, que são **comissões pendentes** de pagamento. O label "Seu faturamento líquido" induz o colaborador a entender que já recebeu esse valor. O subtítulo "Comissões pendentes de recebimento" está correto, mas o título principal contradiz. Isso pode gerar conflitos com o dono quando o colaborador exigir o "faturamento" que ainda não foi pago.

**Fix:** Alterar o label para "Comissões a receber" ou "Saldo pendente de pagamento".

---

### LW-02: `Dashboard.tsx` — `useDashboardData()` é chamado incondicionalmente mesmo para staff

**Arquivo:** `pages/Dashboard.tsx:89-101`

**Issue:** `useDashboardData()` busca métricas de faturamento, metas, histórico de lucro e dados de saúde do negócio — dados exclusivos do dono. Para staff, esses dados nunca são renderizados (branch `isStaff ? ... : ...`), mas o hook executa as queries de qualquer forma, gerando requests desnecessários ao banco que podem retornar vazio (RLS) ou dados irrelevantes.

**Fix:** Mover `useDashboardData()` para dentro do branch de owner ou condicioná-lo ao role:

```typescript
const dashboardData = useDashboardData({ enabled: !isStaff });
```

---

### LW-03: `BottomMobileNav` — importa `DollarSign` mas não usa quando `isStaff = true`; não é erro mas aumenta bundle sem necessidade

**Arquivo:** `components/BottomMobileNav.tsx:3`

**Issue:** `DollarSign` é importado do Lucide mas quando `isStaff = true`, o ícone nunca é renderizado. Em si não causa bug, mas é dead import condicional. Lucide faz tree-shake, então o impacto no bundle é mínimo — registrado como info.

---

## INFO

### IN-01: `constants.ts` — `SETTINGS_ITEMS` não tem campo `ownerOnly` — sidebar de settings não filtra por role

**Arquivo:** `constants.ts:16-28`

**Issue:** `NAVIGATION_ITEMS` tem `ownerOnly` e é filtrado na Sidebar. `SETTINGS_ITEMS` não tem campo equivalente. Porém a rota `/configuracoes/servicos` não tem `OwnerRouteGuard` em App.tsx (intencional), e as demais settings têm o guard na rota. A inconsistência não é um bug dado que as rotas estão protegidas por guarda de rota, mas ao adicionar novos itens de settings no futuro, o desenvolvedor pode criar um link para rota protegida sem guard por não seguir o padrão.

**Recomendação:** Adicionar `ownerOnly: boolean` em `SETTINGS_ITEMS` e filtrar o menu de configurações, mesmo que redundante com o guard de rota — defesa em profundidade.

---

### IN-02: `App.tsx` — comentário em linha 97 diz "toast" mas o mecanismo usa sessionStorage — documentar o padrão

**Arquivo:** `App.tsx:99`

**Issue:** O comentário `// Guard para rotas exclusivas do dono: redireciona staff para / com toast` está correto funcionalmente mas pode confundir futuros desenvolvedores que esperariam ver `showAlert` ou um sistema de toast padrão. O padrão do projeto (CLAUDE.md) usa `useAlerts()`. Documentar por que sessionStorage foi escolhido (ou substituir pelo padrão).

---

### IN-03: `Dashboard.tsx` — constantes `currencySymbol` e `currencyRegion` calculadas antes do branch `isStaff` mas usadas apenas no branch de owner

**Arquivo:** `pages/Dashboard.tsx:110-111`

**Issue:** Para staff, as linhas `const currencyRegion = ...` e `const currencySymbol = ...` calculam valores que nunca são usados no branch `isStaff`. Não é bug (StaffEarningsCard e MeuDiaWidget têm seus próprios cálculos de region), mas gera confusão de leitura.

---

### IN-04: `MeuDiaWidget` — emoji no título ("Bom dia, {firstName}! ☀️") — verificar política do projeto

**Arquivo:** `components/dashboard/MeuDiaWidget.tsx:91`

**Issue:** CLAUDE.md instrui explicitamente a evitar emojis em código a menos que solicitado pelo usuário ("Only use emojis if the user explicitly requests it. Avoid writing emojis to files unless asked."). O emoji ☀️ está hardcoded no componente de produção.

---

## Resumo de Priorização

| ID | Severidade | Arquivo | Ação |
|----|-----------|---------|------|
| CR-01 | CRITICAL | `20260417_staff_commission_rls.sql` | Corrigir antes de deploy — staff vê todos os dados financeiros da empresa |
| CR-02 | CRITICAL | `hooks/useMeuDiaData.ts` | Corrigir antes de deploy — MeuDiaWidget sempre vazio para staff |
| HR-01 | HIGH | `hooks/useMeuDiaData.ts` | Adicionar filtro de tenant no update |
| HR-02 | HIGH | `pages/Dashboard.tsx` + `App.tsx` | Substituir sessionStorage toast por AlertsContext |
| HR-03 | HIGH | `components/BottomMobileNav.tsx` | Corrigir layout quebrado para staff no mobile |
| MD-01 | MEDIUM | `pages/Dashboard.tsx:135` | Corrigir rota `/finance` → `/financeiro` |
| MD-02 | MEDIUM | `components/StaffEarningsCard.tsx` | Adicionar estado de erro distinto de zero |
| MD-03 | MEDIUM | `App.tsx:157-158` | Confirmar com produto acesso staff ao CRM financeiro |
| MD-04 | MEDIUM | `hooks/useMeuDiaData.ts:116` | Separar loading inicial de refresh silencioso |
| LW-01 | LOW | `components/StaffEarningsCard.tsx:55` | Corrigir label enganoso |
| LW-02 | LOW | `pages/Dashboard.tsx:89` | Não executar useDashboardData para staff |
| LW-03 | LOW | `components/BottomMobileNav.tsx:3` | Import não utilizado para staff |
| IN-01 | INFO | `constants.ts` | Adicionar `ownerOnly` em SETTINGS_ITEMS |
| IN-02 | INFO | `App.tsx:99` | Documentar padrão sessionStorage |
| IN-03 | INFO | `pages/Dashboard.tsx:110` | Mover cálculos para branch correto |
| IN-04 | INFO | `components/dashboard/MeuDiaWidget.tsx:91` | Remover emoji conforme política |

---

_Revisado em: 2026-04-17_
_Revisor: Claude Code (gsd-code-reviewer)_
_Depth: standard_
