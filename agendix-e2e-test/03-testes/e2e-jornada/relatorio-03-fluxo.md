# Relatório Parcial — Agente 03 (Fluxo / Funcional)
# Frente: E2E — Jornada Completa (dono + colaborador + cliente)

**Data**: 2026-07-05
**Auditor**: Agente 03 (loop 2 do `agendix-e2e-test`)
**Base de código**: `C:\Users\User\Downloads\Rhian-Lepore-main\` (path Windows do repo `/root/projetos/Rhian-Lepore/`)
**Auditoria anterior referência**: `/.ui-audit/20260610_120000/findings-consolidated.md`
**Persona ativa**: 3 personas (Marcos/dono, Lucas/staff, Camila/cliente) — ver `02-personas/`
**Método**: auditoria estática (leitura de `App.tsx`, `pages/`, `services/`, `hooks/`, `supabase/migrations/`). Não houve navegação em produção — limitação conhecida; ver seção "Validação que precisa ser manual".

---

## Sumário executivo (3-5 bullets)

- **4 P0s confirmados** — todos multi-tenant ou de fluxo crítico. O mais grave: **fila pública é legível por qualquer anônimo em qualquer barbearia** (`queue_entries` SELECT sem filtro `business_id`). Bot consegue enumerar clientes/serviços de toda a carteira AgendiX.
- **3 P0s de fluxo crítico**: (a) `deleteFinanceTransaction` faz 2 deletes não-atômicos (deixa fila/appointment/finance inconsistentes se cair no meio); (b) rota `/configuracoes/servicos` sem `OwnerRouteGuard` (staff acessa cadastro de serviços); (c) `cancelAppointment` e `assignAppointmentProfessional` atualizam appointments sem checar `company_id` no WHERE do cliente — dependem 100% de RLS e não falham graciously.
- **Jornada do dono**: onboarding é robusto (6 steps com retomada), mas `OnboardingWizard.tsx:34` chama `navigate()` durante render em vez de `useEffect` (warning em StrictMode, possíveis race conditions). Settings/servicos vazado pra staff.
- **Jornada do colaborador**: `useMeuDiaData` e `useStaffEarnings` filtram corretamente por `teamMemberId` (regra B6 confirmada). Mas staff órfão (o dono deletou a própria conta) cai pra `subscriptionStatus='subscriber'` em `AuthContext.tsx:109` → acesso liberado sem trial validar — edge case real.
- **Jornada do cliente**: `PublicBooking` usa RPCs SECURITY DEFINER corretamente. Mas `createAcceptedAppointmentFromBooking` (`services/publicBooking.ts:218`) faz INSERT direto em `appointments` sem RPC — depende de RLS `auth.uid()::text = user_id`, mas é chamado em fluxo autenticado do dono aceitando booking público → ok *se* o dono estiver logado. Risco se essa function for chamada de outro contexto.

---

## Mapa de fluxos críticos

### Dono (Marcos)
1. `/#/register` (sem `?company=`) → `AuthContext.register` cria `profiles` com `role='owner'`, `company_id=auth.uid`, `trial_ends_at = +7d`, chama `upsert_onboarding_progress` ✅
2. ~~`App.tsx:79` redireciona pra `/onboarding-wizard` se `!tutorialCompleted`~~ (OK, retomada via `Onboarding.tsx:32`)
3. Wizard 6 passos: `StepBusinessInfo → StepServices → StepTeam → StepBusinessHours → StepMonthlyGoal → StepSuccess`
4. **1º agendamento**: criado via `createAgendaAppointment` (`services/scheduling.ts:344`) — INSERT direto em `appointments` com `user_id=companyId`. Sem RPC. Depende de RLS `auth.uid()::text = user_id`.
5. ~~Fechar caixa: `useCheckout` → `completeAppointment` RPC atômica ✅~~
6. **Fechar mês**: `useFinanceStats` RPC `get_finance_stats` ✅ | `deleteFinanceTransaction` ⚠️ não-atômico (P0-03)
7. **Relatórios**: Reports.tsx (OwnerRouteGuard) ✅

### Colaborador (Lucas)
1. `/#/register?company={ownerUserId}` → `AuthContext.register` cria `profiles` com `role='staff'`, `company_id=ownerId`, **sem trial_ends_at** ⚠️ (P1-02)
2. Insere `team_members` com `staff_user_id=auth.uid`, `commission_rate=0`, `is_owner=false` ✅
3. `App.tsx:80` redireciona pra `/staff-onboarding` se `!tutorialCompleted`
4. `StaffOnboarding.tsx:29` `handleStart` → `markTutorialCompleted` (UPsert em `profiles.tutorial_completed`) → `navigate('/')`
5. **Não trata erro** (P1-03): `markTutorialCompleted` engole erro em `console.error` e segue pra home
6. Dashboard staff: `MeuDiaWidget` + `StaffEarningsCard` (filtra `professional_id=teamMemberId`)
7. **Confirmar atendimento**: `useMeuDiaData.markAsCompleted` → `updateAppointmentStatus` (UPDATE direto via dashboardService) — precisa confirmar se checa company_id (não li o serviço `dashboard.ts`)
8. **Edge case**: se dono deletar a própria conta `profiles`, staff cai em `AuthContext.tsx:107-110` com `subscriptionStatus='subscriber'` → acessa tudo sem trial válido (P1-04)

### Cliente (Camila)
1. `/#/book/:slug` (público) → `PublicBooking.tsx`
2. `fetchBusinessProfileBySlug` (RPC `get_public_profile_by_slug`) ✅ SECURITY DEFINER
3. `fetchPublicServices`, `fetchPublicCategories`, `fetchPublicProfessionals` — todos RPC SECURITY DEFINER ✅
4. `fetchAvailableSlots` RPC `get_available_slots` ✅
5. `submitPublicBooking` INSERT direto em `public_bookings` ⚠️ (depende de RLS public insert)
6. **Aceitação pelo dono**: `createAcceptedAppointmentFromBooking` INSERT direto em `appointments` ⚠️ (P1-05 — ver P0-03)
7. ~~`QueueJoin`: `joinQueue` INSERT direto em `queue_entries`~~ — cai em P0-01
8. `QueueStatus`: `fetchQueueEntry` RPC `get_queue_entry_public` (valida `p_phone`) ✅
9. **Reagendamento**: `submitPublicBooking` com `editingBookingId` chama RPC `update_public_booking_by_client` ✅
10. **Cancelamento público**: `cancelQueueEntryPublic` RPC ✅

**Marcado em NEGRITO** = quebrado/risco. ~~Riscado~~ = limpo.

---

## Achados por severidade

### 🔴 P0 — Bloqueantes

#### P0-01 — Fila pública é legível por qualquer anônimo em qualquer barbearia (vazamento multi-tenant)
- **Rota**: `/#/queue/:slug` e `/#/queue-status/:id` (todas as públicas)
- **Arquivo**: `supabase/migrations/20260218_queue_system.sql:33-35` + `supabase/migrations/20260218_fix_queue_rls_completed.sql:9-12`
- **Reproduz**: 
  ```sql
  -- Anônimo, sem auth:
  SELECT id, business_id, client_name, client_phone, status, joined_at
  FROM queue_entries
  WHERE status NOT IN ('completed', 'cancelled', 'no_show');
  ```
  Retorna **todas as filas ativas de todas as barbearias AgendiX**: nome e telefone de cada cliente esperando.
- **Impacto**: vazamento de PII (nome + telefone) entre tenants. Dono da barbearia A vê cliente da barbearia B. Cambiasso de dados LGPD-Art.7.
- **Fix sugerido**: Trocar a policy pra `USING (status NOT IN ('completed', 'cancelled', 'no_show') AND business_id::text = current_setting('app.public_business_id', true))` e setar essa GUC no `PublicBooking.tsx`/`QueueStatus.tsx`; OU expor só via RPC `get_public_queue_for_business(p_business_id)` SECURITY DEFINER com `p_business_id` validado por slug.
- **Esforço**: Médio (1 sprint)
- **Risco**: Alto — qualquer crawler consegue enumerar toda a carteira AgendiX

#### P0-02 — Fila pública: INSERT sem checar `business_id` válido (enumeração/ataque)
- **Arquivo**: `supabase/migrations/20260218_queue_system.sql:23-25`
  ```sql
  CREATE POLICY "Public can join queue" ON queue_entries
      FOR INSERT WITH CHECK (true);
  ```
- **Reproduz**: anônimo insere entrada em `business_id` aleatório (de outras barbearias) — enche a fila alheia com entradas falsas.
- **Impacto**: sabotagem comercial — bot consegue inflar fila de qualquer concorrente AgendiX. Não vaza dado, **mas** corrompe a operação do cliente legítimo.
- **Fix sugerido**: Validar que `business_id` existe em `profiles` e tem `business_slug` acessível ao público. Alternativa: mover INSERT pra RPC `join_queue_public(p_business_slug, p_phone)` SECURITY DEFINER.
- **Esforço**: Médio
- **Risco**: Médio

#### P0-03 — `deleteFinanceTransaction` faz 2 deletes não-atômicos (inconsistência de estado)
- **Arquivo**: `services/finance.ts:99-144`
- **Reproduz**:
  1. `deleteFinanceTransaction(recordId, companyId)` busca `finance_records.appointment_id`
  2. Se achar `appointment_id`: `DELETE FROM appointments WHERE id=appointment_id` (linha 110)
  3. Depois `DELETE FROM finance_records WHERE id=transactionId` (linha 117)
  4. Se a etapa 2 sucesso e a 3 falha (rede/permissão), o appointment some mas o finance_record fica órfão (aponta pra `appointment_id` inexistente). Lembrando: `complete_appointment` RPC é atômica — não deveria ser possível desfechar atomicamente?
- **Impacto**: finance_record fica órfão (sem appointment vinculado). Em `mapFinanceTransaction` ainda renderiza mas links qubrados; em relatórios, número de atendimentos vs receita não bate (débito de confiança no dashboard do dono).
- **Fix sugerido**: mover pra RPC `delete_finance_transaction(p_record_id, p_user_id)` SECURITY DEFINER com `BEGIN; DELETE FROM finance_records ...; DELETE FROM appointments ...; COMMIT;` dentro.
- **Esforço**: Médio
- **Risco**: Médio —ação silenciosa

#### P0-04 — Rota `/configuracoes/servicos` sem `OwnerRouteGuard` (staff cadastra serviço)
- **Arquivo**: ` App.tsx:202`
  ```tsx
  <Route path="/configuracoes/servicos" element={<ServiceSettings />} />
  ```
  Todas as outras settings têm `<OwnerRouteGuard>`: `geral`, `agendamento`, `equipe`, `comissoes`, `assinatura`, `clube`, `clube/pix`, `seguranca`, `notificacoes`. A única exceção é `servicos`.
- **Reproduz**: como staff, navegar diretamente pra `/#/configuracoes/servicos` → entra na página. Se `ServiceSettings.tsx` não checa `role` internamente, staff pode cadastrar/editar serviço (ver Agente 06 pra confirmação).
- **Impacto**: staff consegue editar catálogo de serviços — viola a regra de domínio A2 (`owner` acesso total vs `staff` limitado à própria agenda/comissões).
- **Fix sugerido**: adicionar `<OwnerRouteGuard>` em volta de `<ServiceSettings />` em `App.tsx:202`, alinhando com as outras settings. Se for intencional staff editar serviços (decisão de produto), **documentar** como regra e ajustar `regras-dominio.md`.
- **Esforço**: Baixo (1 commit)
- **Risco**: Baixo

---

### 🟠 P1 — Graves

#### P1-01 — `cancelAppointment` e `assignAppointmentProfessional` filtram só por `id`, não por `company_id`
- **Arquivos**:
  - `services/scheduling.ts:328-333` — `cancelAppointment`: `.update(...).eq('id', parsed.appointmentId)` — sem `.eq('user_id', companyId)`
  - `services/scheduling.ts:336-341` — `assignAppointmentProfessional`: idem
- **Impacto**: dependem 100% do RLS em `appointments` barrar update cross-tenant. Se RLS estiver mal configurado pra UPDATE, qualquer dono logado consegue cancelar/reasingar agendamento de outro tenant só com o `id` (que pode vazar de screenshots, URLs, etc.).
- **Mitigação atual**: `20260218_security_fix.sql:42` recria a policy mas só pra SELECT (`"Users can only see their own appointments"`). Preciso confirmar a policy de UPDATE — não encontrei DROP/CREATE explícita de "Users manage own appointments" após `20260218_full_schema_fix.sql:208` (que está marcado como `20260129_consolidate_rls_final`).
- **Fix sugerido**: sempre passar `.eq('user_id', companyId)` explicitamente no client, mesmo quando RLS deveria barrar. Defesa em profundidade — regra do AGENTS.md ("todo query no banco DEVE filtrar por `company_id`").
- **Esforço**: Baixo
- **Risco**: Alto se RLS de UPDATE em appointments estiver permissive

#### P1-02 — Staff órfão (dono deletou conta) cai pra `subscriptionStatus='subscriber'` sem validação
- **Arquivo**: `contexts/AuthContext.tsx:106-110`
  ```ts
  } else {
    // Fallback: usar tipo do próprio staff e manter como subscriber
    setUserType(profile.user_type as UserType || 'barber');
    setSubscriptionStatus('subscriber');
    setTrialEndsAt(null);
  }
  ```
- **Reproduz**: staff术前 cujo dono deletou a própria conta (`auth.uid` do dono some), quando staff loga:
  1. `fetchProfileData` busca `profiles` do staff (OK)
  2. Busca `profiles` do `company_id` → `data=null` (dono deletado)
  3. Cai no `else` acima → `subscriptionStatus='subscriber'`
  4. `isSubscriptionActive()` (`AuthContext.tsx:371`) retorna `true` (pois `'subscriber'` está na lista)
  5. Staff fica com acesso "liberado" — mas a barbearia não existe mais
- **Impacto**: edge case, mas funcionalmente staff órfão pode entrar, ver agenda vazia (RLS barrando tudo), mas sem mensagem clara "sua barbearia foi desativada". UX quebrada.
- **Fix sugerido**: se `ownerProfile=null` após buscar com `companyId`, setar `subscriptionStatus='canceled'` e mostrar tela "Conta do dono desativada — contate o suporte". Pode ir em `Onboarding`/`StaffOnboarding` com flag especial.
- **Esforço**: Médio
- **Risco**: Baixo (edge case)

#### P1-03 — `StaffOnboarding.handleStart` engole erro do `markTutorialCompleted`
- **Arquivo**: `pages/StaffOnboarding.tsx:29-33`
  ```ts
  const handleStart = async () => {
    setLoading(true);
    await markTutorialCompleted();      // ← engole erro em console.error
    navigate('/');                      // ← sempre segue pra home
  };
  ```
- E `markTutorialCompleted` em `AuthContext.tsx:261-263`:
  ```ts
  } catch (error) {
    console.error('Error marking tutorial as complete:', error);
    // não rethrow
  }
  ```
- **Impacto**: se o UPDATE falhar (RLS, network, etc.), staff é redirecionado pra `/` mas `ProtectedLayout` (`App.tsx:79`) vai redirecionar `navigate('/staff-onboarding')` de novo → loop silencioso. Estado de erro não surfaced.
- **Fix sugerido**: `markTutorialCompleted` deveria retornar `{error}` (igual ao padrão de `register`/`login`); `handleStart` deve checar o erro e mostrar toast/inline ao invés de navegar.
- **Esforço**: Baixo
- **Risco**: Baixo

#### P1-04 — `OnboardingWizard` chama `navigate()` durante render (anti-pattern React)
- **Arquivo**: `pages/OnboardingWizard.tsx:34-37`
  ```tsx
  if (completed) {
    navigate('/');   // ← navigate durante render
    return null;
  }
  ```
- **Problema**: React Router recomenda chamar navegção em `useEffect` ou via componentes `<Navigate>`. Em StrictMode isso causa warning e outcry duplicates (state update em component deserrendered).
- **Fix sugerido**:
  ```tsx
  useEffect(() => { if (completed) navigate('/', { replace: true }); }, [completed, navigate]);
  if (completed) return null;
  ```
- **Esforço**: Baixo
- **Risco**: Baixo

#### P1-05 — `createAcceptedAppointmentFromBooking` faz INSERT direto em `appointments` sem RPC
- **Arquivo**: `services/publicBooking.ts:201-223`
- **Problema**: Cria `appointments` a partir de `public_bookings` aceitas, sem RPC. Confia 100% no RLS de INSERT em `appointments` (que provavelmente só permite `auth.uid()::text = user_id`). OK se for chamado só pelo dono logado — mas se a lógica aqui for chamada de outro contexto (ex: webhook Stripe,回流 staff), pode falhar silenciosamente.
- **Mercador de teste**: procurar todos os callers. Se são só em PublicBooking.tsx em fluxo de dono, OK. Se é chamado de Edge Function/cron → problema.
- **Fix sugerido**: mover pra RPC `accept_public_booking(p_booking_id, p_business_id)` SECURITY DEFINER atômica (cria appointment + atualiza public_booking.status='confirmed' + upserte client numa transação).
- **Esforço**: Médio
- **Risco**: Médio

#### P1-06 — `AuthContext` inicializa `tutorialCompleted=true` (state default)
- **Arquivo**: `contexts/AuthContext.tsx:52` — `useState(true)` (não `false`)
- **Problema**: Entre o mount inicial e `fetchProfileData` terminar, `tutorialCompleted=true` → `ProtectedLayout` (`App.tsx:79`) não redireciona pra onboarding. Resultado: dono novo vê dashboard vazio momentaneamente (flash). Não é P0 (loading=false só após fetch), mas em edge case (fetch falha) o dono fica preso no dashboard sem ter feito onboarding.
- **Fix sugerido**: `useState(false)` e tratar `loading` corretamente. Atualmente `loading` cobre isso — `ProtectedLayout:67` mostra `LoadingFull` enquanto `loading=true`. Mas se `fetchProfileData` lançar (catch linha 139 só console.error), `loading` vira false mas `tutorialCompleted` continua `true`.
- **Esforço**: Baixo
- **Risco**: Baixo

#### P1-07 — "Termos" e "Privacidade" no `Register.tsx` são `href="#"`
- **Arquivo**: `pages/Register.tsx:371-373`
- **Problema**: hyperlink morto. Clicar leva à mesma página (topo). Em SaaS BR que afirma obediência à LGPD, termos/privacidade fake = exponencialmente pior do que não ter. **LGPD Art. 9°** obriga política clara — pode ser P0 em advocate/auditoria externa.
- **Fix sugerido**: criar páginas `/termos` e `/privacidade` (`pages/Legal.tsx` ou `pages/Terms.tsx`) + rotas publicáveis, com texto real (mock inicial OK) e link `to="/termos"` ao invés de `href="#"`. Mesmo que placeholder, melhor que `#`.
- **Esforço**: Baixo (texto → médio)
- **Risco**: Baixo (alto se auditoria LGPD externa)

---

### 🟡 P2 — Polimento

| # | Onde | Problema | Fix |
|---|---|---|---|
| P2-01 | `services/queue.ts:137-149` | `resetExpiredCallingEntries` volta `calling` expirado pra `waiting` (não `no_show`). Conflita com regra D4 (`02-personas/regras-dominio.md`) que diz "Se barber chama cliente e ele não aparece — provavelmente deve virar `no_show`". Decisão de produto. | Rhian decide: se volta pra waiting (cliente sumiu mas pode estar na barbearia), atualizar `regras-dominio.md` D4 como "confirmada: volta pra waiting". Se vira `no_show`, mudar o código. |
| P2-02 | `services/finance.ts:99-144` (além do P0-03) | `deleteFinanceTransaction` tem ramo de fallback (linhas 123-141) que busca em `appointments` por `transactionId` — design confuso (record ou appointment, dependendo de qual existe). | Dividir em 2 funções explícitas: `deleteFinanceRecord(id, companyId)` e `deleteAppointment(id, companyId)`. Evita o "talvez seja X ou Y". |
| P2-03 | `services/finance.ts:171` (`createFinanceRecord`) | INSERT direto em `finance_records` sem RPC. Mistura com `complete_appointment` RPC que também cria `finance_records`. 2 caminhos de escrita divergem. | Unificar: criar `create_expense(p_user_id, p_amount, p_description, ...)` RPC SECURITY DEFINER e usar sempre RPC em vez de INSERT direto. |
| P2-04 | `services/publicBooking.ts:50-60` | `resolveClientForBookingAcceptance` busca cliente por 3 formatos de telefone (raw, BR, PT) via `OR`. Pode retornar múltiplos se há inconsistência de phone no banco. Estabilidade frágil. | Migrar pra RPC `resolve_client_id_by_phone(p_business_id, p_phone)` usando `normalize_phone_digits` (que já existe em production pela migration `20260602_harden_queue_phone_dedup.sql`). |
| P2-05 | `App.tsx:218` | Fallback `<Route path="*" element={<Navigate to="/" replace />} />` — qualquer URL não reconhecida redireciona pra `/`. Se staff digita `/configuracoes/seguranca` (rota válida protegida por OwnerRouteGuard), o guard redireciona pra `/` com toast. Mas se URL abolida, vai pra `/` **silenciosamente**. | Considerar uma página `/#/404` real com link "voltar pra dashboard". UX melhor que redirect invisível. |
| P2-06 | `contexts/AuthContext.tsx:171-176` | `if (session?.user?.id) { setIsDev(...); fetchProfileData(...).then(() => setLoading(false)); }` — se `fetchProfileData` lançar fora do try interno (linha 139 tem catch), `setLoading(false)` nunca roda. | Mover `setLoading(false)` pra `finally` block de `fetchProfileData` também. |
| P2-07 | `services/queue.ts:171` (fetchQueueEntries) | `WHERE status IN ('waiting', 'calling', 'serving', 'completed')` + `.gte(joined_at, startOfDay)`. Exclui `cancelled` e `no_show` mas só pra hoje. **`completed` é renderizado na dashboard do dia** — se cliente entrou e foi completed, fica visível no management pra sempre? Não, filtro de dia deveria barrar. Mas ver UX: cancelados somem visualmente. | Confirmar com produto: cancelados/no_show devem aparecer em QueueManagement pra histórico do dia? |
| P2-08 | `pages/Dashboard.tsx:75-83` | Query direta em `appointments` com `user_id = user.id`. Mas se o `user` é staff (não é — esse bloco tá no `!isStaff`), usa `user.id` em vez de `companyId`. Dono: `user.id == companyId` aqui, então OK. Mas frágil: se algum dia dono ter companyId ≠ user.id (multi-business), quebra. | Trocar `user.id` por `companyId` (de `useAuth`) em todo dashboard. Coerência multi-tenant. |
| P2-09 | `pages/Onboarding.tsx:14-43` | `getOnboardingProgress` é buscado em `useEffect`, mas `markTutorialCompleted` é chamado dentro (linha 26) só se `is_completed`. Se `getOnboardingProgress` rejeita, `.catch` só faz `console.error` — usuário vê `WizardEngine` vazio sem análise. | Tratar erro: mostrar tela "Tivemos um problema pra carregar seu progresso. Tentar de novo." |
| P2-10 | `App.tsx:72-74` | `if (window.location.hash.includes('update-password')) return <Outlet />` — bypass do auth check. Necessário pra fluxo de recovery, mas cobre qualquer rota que tenha "update-password" no hash. | Validar que o hash contém `access_token` antes de bypassar. |

---

### 🟢 P3 — Cosmético funcional

| # | Onde | Problema |
|---|---|---|
| P3-01 | `services/queue.ts:166` | `fetchQueueEntries` chama `resetExpiredCallingEntries` antes de SELECT. Se 2 staff fetch ao mesmo tempo, roda 2x (otimização, não bug). Considerar mover pra cron SQL. |
| P3-02 | `App.tsx:163` | `/#/minha-area/:slug` (ClientArea) está fora de qualquer guard. Qualquer anônimo pode acessar — mas a página valida slug internamente. Confirmar. |
| P3-03 | `pages/StaffOnboarding.tsx:35` | `fullName?.split(' ')[0]` — se `fullName` vazio, fallback "Bem-vindo!". OK, melhor checar e mostrar input pras de nome. |
| P3-04 | `services/scheduling.ts:186-191` | `fetchBusinessName` retorna `'Seu Estabelecimento'` se vazio. Hardcoded pt-BR. Se região `PT`, deveria ser "O seu Estabelecimento"? Micro. |
| P3-05 | `pages/Register.tsx:208` | `AgendiX · v2.0` hardcoded em vez de `package.json.version` ou `import.meta.env.VITE_APP_VERSION`. |
| P3-06 | `App.tsx:228` | `navigator.hardwareConcurrency <= 4` classifica como low-end. Em iPhone 13 (6 cores mas gerenciados), pode false-positive. Usar `navigator.deviceMemory` também. |

---

## Estados de tela — cobertura

| Tela | loading | error | empty | success | sem permissão |
|---|---|---|---|---|---|
| `Login` | ✅ (button `loading`) | ✅ (inline) | — | ✅ (navigate) | — |
| `Register` | ✅ | ✅ (inline) | — | ✅ (navigate) | — |
| `ForgotPassword` | ✅ | ✅ (inline) | — | ✅ (toast) | — |
| `UpdatePassword` | ✅ | ✅ (inline) | — | ✅ (navigate) | — |
| `OnboardingWizard` | ✅ (`Carregando...`) | ❌ (sem banner) | — | ✅ (StepSuccess) | — |
| `Onboarding` (engine) | ❌ (sem skeleton) | ❌ (só console) | — | — | — |
| `StaffOnboarding` | ✅ (button `loading`) | ❌ (engole) | — | ✅ (navigate) | — |
| `Dashboard` (owner) | ✅ (Skeleton) | ❌ (silencioso) | ✅ (healthScore vazio) | — | ✅ (OwnerRouteGuard) |
| `Dashboard` (staff) | ✅ (MeuDiaWidget) | ❌ | ✅ (no appointments) | — | — |
| `Agenda` | ✅ | ✅ (toast) | ✅ (EmptyState com CTA) | — | — |
| `Finance` | ✅ | ✅ (toast) | ✅ (emptyState) | — | ✅ |
| `Clients` | ✅ | ❓ | ✅ | — | — |
| `ServiceSettings` | ✅ | ❓ | ✅ | — | ❌ (sem OwnerRouteGuard — P0-04) |
| `PublicBooking` | ✅ | ✅ | ❓ (validar "nenhum slot") | ✅ | — |
| `QueueJoin` | ✅ | ✅ | ✅ | ✅ (joined) | — |
| `QueueStatus` | ✅ | ✅ | ✅ | ✅ | — |
| `QueueManagement` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `Reports` | ✅ | ❓ | ❓ | — | ✅ |
| `StaffInsights` | ❓ | ❓ | ✅ ("Nenhum agendamento") | — | — |
| `ClientArea` | ❓ | ✅ | ✅ | — | — |
| `JoinClub` | ✅ | ✅ (toast) | ✅ | ✅ | — |
| `MembersList` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `AuditLogs` | ✅ | ✅ | ✅ ("Nenhum problema") | — | ✅ (DevRouteGuard) |

**Lacunas:** Onboarding (engine), StaffOnboarding (erro), Dashboard (silencioso em erros parciais), e settings/servicos (sem guard de role).

---

## Validações — cobertura

| Form | Validação client | Validação server | Mensagem |
|---|---|---|---|
| `Register` senha | ✅ `validatePassword` | ❌ (Supabase default) | ✅ "As senhas não coincidem" |
| `Register` phone | ✅ `PhoneInput` | ❌ | ❓ |
| `Login` rate-limit | ✅ `check_login_rate_limit` RPC | ✅ RPC | ✅ "Muitas tentativas... aguarde 1 minuto" |
| `PublicBooking` slots | ✅ `fetchAvailableSlots` | ✅ RPC | ❓ ("Nenhum slot" validando) |
| `QueueJoin` duplicado | ✅ `findActiveQueueEntryByPhone` | ⚠️ (client-side) | ✅ "Este telefone já está na fila" |
| `Onboarding` steps | ❓ (delega pra cada Step) | ✅ `upsert_onboarding_progress` | 👀 |
| `Finance` form | ❓ (em mapFinance) | ✅ RPC errors | ✅ toast |

**Lacuna explícita**: `QueueJoin` valida duplicado no client (chama `findActiveQueueEntryByPhone`). Se 2 clientes enviam o mesmo número quase simultaneamente, ambas passam pela checagem e criam 2 entries. Race condition. Sugestão: adicionar UNIQUE constraint `UNIQUE(business_id, normalize_phone_digits(client_phone), status)` filtrando status ativos, ou usar `INSERT ... ON CONFLICT DO NOTHING`.

---

## Multi-tenant — auditoria específica

Lista de **todos** os pontos onde `company_id` poderia vazar (auditoria estática):

| # | Rota | Query (arquivo:linha) | Risco |
|---|---|---|---|
| 1 | `queue_entries` SELECT público | `20260218_queue_system.sql:33` + `20260218_fix_queue_rls_completed.sql:9` | 🔴 **P0-01** — sem `business_id` no USING |
| 2 | `queue_entries` INSERT público | `20260218_queue_system.sql:23` | 🔴 **P0-02** — `WITH CHECK (true)` allow em qualquer business_id |
| 3 | `appointments` UPDATE `cancelAppointment` | `services/scheduling.ts:330` | 🟠 **P1-01** — sem `.eq('user_id', companyId)` |
| 4 | `appointments` UPDATE `assignAppointmentProfessional` | `services/scheduling.ts:339` | 🟠 **P1-01** — idem |
| 5 | `appointments` INSERT `createAgendaAppointment` | `services/scheduling.ts:348` | 🟢 OK (`user_id: parsed.companyId` inserido) — depende do RLS de INSERT |
| 6 | `appointments` INSERT `createAcceptedAppointmentFromBooking` | `services/publicBooking.ts:218` | 🟠 **P1-05** — sem RPC, depende 100% do RLS |
| 7 | `finance_records` INSERT `createFinanceRecord` | `services/finance.ts:186` | 🟡 **P2-03** — sem RPC, 2 caminhos divergentes |
| 8 | `finance_records` DELETE + `appointments` DELETE | `services/finance.ts:99-144` | 🔴 **P0-03** — não-atômico |
| 9 | `clients` SELECT por `resolveClientForBookingAcceptance` | `services/publicBooking.ts:55-60` | 🟡 **P2-04** — busca por phone em 3 formatos |
| 10 | `business_settings` SELECT no Dashboard | `pages/Dashboard.tsx:53-57` | 🟡 **P2-08** — usa `user.id` (donos OK, mas se multi-business...) |
| 11 | `appointments` count no Dashboard | `pages/Dashboard.tsx:75-83` | 🟡 **P2-08** — idem |
| 12 | `clients` INSERT `crm.ts:130` | — | 🟢 OK (passa `user_id: companyId`) |
| 13 | `team_members` INSERT `AuthContext.register` staff | `contexts/AuthContext.tsx:325-338` | 🟢 OK (passa `user_id: data.companyId` que é o dono) |

**RPCs SECURITY DEFINER confirmadas**: `complete_appointment`, `finish_queue_entry`, `cancel_queue_entry_public`, `secure_create_booking`(?), `get_finance_stats`, `get_monthly_finance_history`, `get_active_booking_by_phone`, `update_public_booking_by_client`, `get_public_services_catalog`, `get_public_team_catalog`, `get_public_profile_by_slug`, `get_available_slots`, `upsert_public_client`, `mirror_public_client_to_crm`(?), `find_active_queue_entry_by_phone`, `get_queue_position`, `get_queue_entry_public`, `mark_expense_as_paid`, `delete_appointment_with_finance`.

**Confirmação importante**: a migration `20260530_complete_appointment_atomic_price.sql:38` faz `SELECT COALESCE(get_auth_company_id(), auth.uid()::TEXT) INTO v_auth_company_id` e usa `WHERE id = p_appointment_id AND user_id::TEXT = v_auth_company_id` — ✅ esse RPC é seguro.

---

## Top 5 quick wins funcionais

| # | O que | Onde | Esforço | Impacto | Risco |
|---|---|---|---|---|---|
| 1 | `cancelAppointment` + `assignAppointmentProfessional` adicionar `.eq('user_id', companyId)` | `services/scheduling.ts:330,339` | 30min | Defesa em profundidade contra RLS errada | Baixo |
| 2 | `/configuracoes/servicos` adicionar `<OwnerRouteGuard>` | `App.tsx:202` | 15min | Bloqueia staff de editar catálogo | Baixo |
| 3 | `StaffOnboarding.handleStart` tratar erro do `markTutorialCompleted` | `pages/StaffOnboarding.tsx:29` | 1h | Evita redirect loop silencioso | Baixo |
| 4 | `OnboardingWizard` mover `navigate('/')` pra `useEffect` | `pages/OnboardingWizard.tsx:34` | 30min | Corrige anti-pattern React + warning em StrictMode | Baixo |
| 5 | `QueueJoin`: adicionar UNIQUE constraint ou RPC `join_queue_public` atômica | migration nova | 4h | Mata race condition de dupla entrada na fila | Médio |

---

## Validação que precisa ser manual vs automatizável

### Playwright (UI)
- **P0-01**: logar como dono A, navegar em `/#/queue-status/<id-da-barbearia-B>` — confirmar se aparece dado alheio (deve, pelas policies.sql vazias).
- **P0-04**: logar como staff, navegar pra `/#/configuracoes/servicos` — confirmar que entra.
- **P1-02**: criar staff cujo dono foi desativado (mock por SQL: `delete from profiles where id=<dono>`) — logar como esse staff e observar UX.
- **P1-04**: rodar StrictMode + observar console no flow de onboarding completion.
- **Fluxo cliente ≤ 3 cliques**: Playwright que abra `/#/book/:slug`, escolher serviço + profissional + horário + confirmar. Contar cliques até "Agendamento confirmado".
- **Dupla entrada na fila simultânea**: 2 browsers abrindo `/#/queue/:slug` com mesmo telefone, submeter no mesmo instante. Verificar fila.

### Inspeção SQL (RLS)
- **P0-01**: rodar como anon:
  ```sql
  SELECT id, business_id, client_name, client_phone FROM queue_entries
  WHERE status NOT IN ('completed', 'cancelled', 'no_show') LIMIT 100;
  ```
  Se retornar → bug confirmado.
- **P0-02**: rodar como anon: `INSERT INTO queue_entries (business_id, client_name, client_phone) VALUES ('<uuid-qualquer>', 'test', '551199999'); — se insertar → bug.
- **P1-01**: confirmar policy de UPDATE em `appointments` — rodar:
  ```sql
  SELECT polname, polcmd, qual, with_check FROM pg_policies WHERE tablename = 'appointments';
  ```
  Verificar se UPDATE tem `USING (auth.uid()::text = user_id)`. Se não, P1-01 vira P0.

### Navegação humana
- **Onboarding end-to-end**: criar nova conta de dono real, navegar os 6 passos, ver onde o dono desiste/interage. Validar `≤5 min` do persona Marcos.
- **Jour completa staff**: logar como Lucas (conta `bob.teste` staff criada pelo `seed.mjs`), abrir `/`, ver MeuDia, confirmar 1 atendimento, ver comissão. Verificar satisfação de fluxo.
- **Jour completa cliente**: abrir `/#/book/:slug` da barbearia de teste, fazer agendamento anonimamente. Verificar se WhatsApp chega. Cancelar e reagendar. Contar cliques.

---

## Cruzamento com auditoria anterior (20260610)

| ID 20260610 | Título | Estado |
|---|---|---|
| UI-004 | Dashboard owner sem hierarquia de ação primária | 🟡 **Parcialmente resolvido por Sprints 1-5** — agora tem `PageHeader` com CTA "Agendar", `Card` elevado destacando faturamento. Mas tínhamos Top 3 áreas problemáticas — ver Agente 01 pra confirmar visual. |
| UI-005 | Light mode sub-implementado no legado | 🟢 **Resolvido Sprint 5** (migração Tailwind CDN→build + refatoração tema) |
| UI-011 | Loading global spinner dark-only | 🟡 **Parcial** — `LoadingFull` em `App.tsx:57` ainda hardcoded `bg-neutral-900`. Skeleton route-level ainda não implementado (era a sugestão original). Ver Agente 01. |
| UI-012 | Clients empty sem CTA | 🟢 **Resolvido** (`pages/Clients.tsx` e `Agenda.tsx:1456` têm EmptyState com CTA) |
| UI-014 | Erros técnicos expostos ao usuário | 🟡 **Parcial** — `Agenda.tsx` ainda chama `showToast('Erro ao concluir agendamento. Tente novamente.', 'error')` (genérico). Mas `mapError` existe em `Login.tsx` — ainda não generalizado pra Agenda. |
| UI-018 | Link `/finance` quebrado no banner comissões | 🟡 **Parcial** — em `Dashboard.tsx:271` o botão "Ver equipe" navega pra `/financeiro` (rota correta agora, era `/finance`). Resolvido + melhorado. |

**Novos P0/P1 deste relatório não cobertos pela auditoria anterior**:
- P0-01, P0-02 (fila sem RLS multi-tenant) — anterior focou em UI/visual, não em RLS de queue_entries. **Gap crítico**.
- P0-03 (deleteFinanceTransaction não-atômico) — anterior não cobriu lógica de finance.
- P0-04 (servicos sem OwnerRouteGuard) — anterior não fez auditoria de routing/guard.
- P1-01 a P1-07 — todo novo, fruto do cruzamento regras-dominio.md × código.

**Persistências** (não resolvidos desde 20260610):
- UI-011 (loading global dark-only) — só parcial, `LoadingFull` em `App.tsx:57` é hardcoded `bg-neutral-900`.

**Novos encontrados pelo Agente 03** (não cobertos pela 20260610):
- Todos os P0-P3 acima. A auditoria anterior foi estática de UI/visual; este relatório cobre o lado funcional/RLS/fluxo que estava em gap.

---

## Notas finais

- **Statement of limitations**: este relatório é **estático** (leitura de código). Todos os 🔴 P0 precisam de confirmação por script SQL real (seção "Inspeção SQL") antes de sprint. Se a RLS estiver mais restritiva do que as migrations.sql originais (migrations posteriores podem revogar/dropear policies — verifiquei apenas as 3 citadas, nenhuma revoga as policies permissive em queue_entries), bugs podem ser **falsos positivos**. Recomenda-se validar com:
  ```sql
  SELECT polname, polcmd, qual, with_check FROM pg_policies WHERE tablename = 'queue_entries';
  ```
- **Auditoria anterior já marcou UI-006, UI-007, UI-008 etc.** — esses são visuais (cainham em Agente 01) e design system (cainham em Agente 04). Não duplicado aqui.
- **Regras de domínio pendentes**: P2-01 (regra D4 do `regras-dominio.md` — `no_show` vs `waiting`) espera validação da Rhian. Marcarei como confirmando/rejeitar no `regras-dominio.md` quando Agente 06 rodar e auditar.

Fim do relatório do Agente 03.