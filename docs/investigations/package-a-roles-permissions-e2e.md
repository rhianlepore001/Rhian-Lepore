# Package A — Roles & Permissions (E2E readiness)

**Orchestrator:** `bc-c1eb590f-f150-5b47-bd1b-fb6184f4e056`  
**Scope:** investigação estática (código + migrations). Sem alteração de produto.  
**Prod:** https://www.agendixstudio.com  
**Data:** 2026-09-18  

---

## 1. Mapa de roles (modelo real no código)

| Persona de negócio | Identidade técnica | Onde é definida | Notas |
|---|---|---|---|
| **Dono / gestor** | `profiles.role = 'owner'` → `useAuth().role === 'owner'` | `contexts/AuthContext.tsx`, trigger `handle_new_user` em `supabase/migrations/20260918150000_lock_profile_identity_and_invite_surface.sql` | `companyId` resolve para o próprio `user.id` (tenant = owner user_id TEXT). |
| **Colaborador (barbeiro / profissional)** | `profiles.role = 'staff'` → `useAuth().role === 'staff'` | Convite `/#/register?company={ownerId}&member={teamMemberId}`, `Register.tsx`, `AuthContext` | Herda plano/tema do dono; `teamMemberId` via `team_members.staff_user_id`. |
| **Recepcionista** | **Não existe role de auth** | `team_members.role` é texto livre no formulário (`TeamMemberForm.tsx`, `businessCopy.rolePlaceholder`) | Spec ativa declara papel formal como feature futura: `specs/active/fila-digital-v2/spec.md` (“Papel recepcionista … outra feature”). **Mesmas permissões que qualquer staff.** |
| **Cliente (área pública)** | Sessão local `PublicClientContext` + `public_clients` | `contexts/PublicClientContext.tsx`, RPCs `upsert_public_client` / OTP em Minha Área | Sem Supabase Auth; prova por telefone em fila/booking. |
| **Anônimo** | Sem sessão | Rotas públicas em `App.tsx` | Pode criar booking/fila via RPCs `SECURITY DEFINER`. |

**Binário de permissão no app:** só `owner` vs `staff` (`AuthContext.tsx` L26–27, L63–64). Não há `receptionist` em `useAuth()`.

---

## 2. Perguntas obrigatórias

### Q1 — Colaborador não-dono pode aceitar/confirmar agendamento online (link público)?

| Veredito | **FAIL** (intenção parcial na UI; fluxo efetivo quebrado para staff) |

**Evidência — UI permite “Aceitar” para staff, mas esconde “Recusar”:**

- `components/agenda/AgendaPublicBookings.tsx` L116–133: botão Aceitar sempre; Recusar só se `!isStaff`.
- `pages/Agenda.tsx` L1233–1240: passa `isStaff` e handlers para o bloco de solicitações online.

**Evidência — bug de tenant: staff usa `user.id` em vez de `companyId` / `effectiveUserId`:**

- `pages/Agenda.tsx` L101: `effectiveUserId = companyId ?? user?.id` usado em vários fetches.
- `pages/Agenda.tsx` L465–473: `fetchPublicBookings` filtra `.eq('business_id', user.id)` → para staff, `user.id` ≠ `business_id` do estabelecimento → lista vazia na prática.
- `pages/Agenda.tsx` L589–720 `handleAcceptBooking`: inserts/updates com `user.id` (`clients`, `services`, `createAcceptedAppointmentFromBooking({ businessId: user.id })`, `confirmPublicBooking(booking.id, user.id)`).

**Evidência — RLS *permitiria* staff se o app usasse tenant correto:**

- `supabase/migrations/20260307_us015b_multi_user_rls.sql` L205–216: policies `Public bookings: company read` / `company update` com `business_id = get_auth_company_id()`.
- `supabase/migrations/20260307_us015b_multi_user_rls.sql` L106–111: `Appointments: company isolation` FOR ALL com `user_id = get_auth_company_id()`.
- `supabase/migrations/20260804000002_clients_staff_rls_harden.sql` L20–27: staff pode INSERT em `clients` com `user_id = get_auth_company_id()`.

**Conclusão Q1:** Produto **exibe** aceite para colaborador, mas **não lista** pedidos pendentes nem conclui o fluxo com `companyId`. Dono continua sendo o único caminho confiável hoje. E2E com staff deve esperar falha ou lista vazia até correção de tenant na Agenda.

---

### Q2 — Colaborador não-dono vê clientes na fila digital?

| Veredito | **PASS** (nome/telefone e operação da fila; não é o CRM) |

**Evidência — rota e UI:**

- `App.tsx` L235: `/fila` **sem** `OwnerRouteGuard` (staff acessa).
- `pages/QueueManagement.tsx` L31–32, L84–92, L302–315: staff vê fila; em modo `per_professional` vê “Sua fila” + “Outros profissionais”.
- `components/queue/QueueStaffCard.tsx` + `QueueManagement.tsx` L196–215: cards expõem `client_name` e telefone formatado.

**Evidência — RLS:**

- `supabase/migrations/20260724_queue_staff_rls.sql` L20–32: `Staff can view company queue` (SELECT no tenant).
- `supabase/migrations/20260906000001_queue_v2.sql` L82–93: policy equivalente recriada no queue v2.

**Contraste:** CRM `/clientes` bloqueado para staff (`OwnerRouteGuard` + `constants.ts` `ownerOnly: true`). Fila é canal operacional com PII — staff **vê** clientes na fila, **não** na lista CRM.

---

## 3. Recepcionista vs barbeiro (staff)

| Área | Diferença no código? | Comportamento |
|---|---|---|
| Auth / RLS | **Nenhuma** | Ambos são `profiles.role = 'staff'`. |
| `team_members.role` | Label only | Ex.: “Recepcionista” vs “Barbeiro” no convite (`Register.tsx` L100). |
| Agenda | Igual | Filtro por profissional; staff não conclui/cancela/exclui histórico (`Agenda.tsx` L564–567, L781–803). |
| Bookings públicos | Igual | Aceitar (UI); recusar só dono; fluxo accept quebrado por `user.id` (Q1). |
| Fila | Igual | Vê e opera fila; sem QR/Ajustes de fila no header (`QueueManagement.tsx` L225–241, L385–405). |
| Equipe | Bloqueado | `OwnerRouteGuard` + nav `ownerOnly`. |
| Financeiro | Igual (staff) | Rota aberta; UI só “Meu Financeiro” (`Finance.tsx` L114–116, L189–191, L612+). Nav mobile manda staff para `/meus-insights`, não `/financeiro` (`BottomMobileNav.tsx` L79–105). |
| Insights | Staff → `/meus-insights` | Owner → `/insights` (guard). `StaffInsights.tsx` L38. |

**Referência de produto:** recepcionista formal explicitamente fora de escopo — `specs/active/fila-digital-v2/spec.md`.

---

## 4. Telas por role (abrir vs bloqueado)

### Dono (`role === 'owner'`, autenticado, onboarding completo)

| Rota | Acesso |
|---|---|
| `/`, `/agenda`, `/fila`, `/fila/historico` | Aberto |
| `/clientes`, `/clientes/:id` | Aberto |
| `/produtos` | Aberto (gestão completa) |
| `/financeiro` | Aberto (visão geral + abas) |
| `/insights` | Aberto |
| `/meus-insights` | Redireciona para `/insights` se owner (`StaffInsights.tsx` L38) |
| `/configuracoes/*`, `/clube/assinantes` | Aberto |
| `/configuracoes/auditoria`, `/lixeira`, `/ui-preview` | Só `isDev` (`DevRouteGuard`) |
| Públicas (`/book/:slug`, `/queue/:slug`, …) | Aberto sem login |

**Bloqueio staff-only:** N/A (owner é superset).

### Colaborador (`role === 'staff'`)

| Rota | Acesso |
|---|---|
| `/`, `/agenda`, `/fila`, `/fila/historico` | Aberto |
| `/meus-insights` | Aberto |
| `/produtos` | Aberto (UI limita: `isOwner = false`, `Products.tsx` L117–139) |
| `/financeiro` | Aberto por rota (sem guard); experiência reduzida |
| `/staff-onboarding` | Se `!tutorialCompleted` (`App.tsx` L107–109) |
| `/clientes`, `/clientes/:id`, `/insights`, `/configuracoes/*`, `/clube/assinantes` | **Bloqueado** → redirect `/` + toast (`OwnerRouteGuard` L146–155, `App.tsx` L237–261) |
| Dev / demo routes | Bloqueado salvo `isDev` |

**Nav:** itens com `ownerOnly: true` filtrados (`constants.ts` L32–42, `Sidebar.tsx` L21–22, `MoreOptionsDrawer.tsx` L119–132).

### Cliente / anônimo (sem auth de equipe)

| Rota | Acesso |
|---|---|
| `/book/:slug`, `/queue/:slug`, `/queue-status/:id`, `/minha-area/:slug`, `/pro/:slug`, `/clube/:slug` | Público |
| `/login`, `/register`, `/termos`, `/privacidade`, … | Público |
| Rotas autenticadas do painel | Redirect login (`ProtectedLayout` L99–103) |

---

## 5. Findings (formato A-xx)

| ID | Severidade | Resumo | Evidência |
|---|---|---|---|
| **A-01** | **P0** | Staff não vê nem confirma bookings públicos de forma confiável (`user.id` vs `companyId`). | `pages/Agenda.tsx` L465–473, L589–720; Q1 **FAIL** |
| **A-02** | **P2** | UI promete “Aceitar” ao staff sem alinhar RLS/app tenant; recusa só para dono. | `AgendaPublicBookings.tsx` L124–133 |
| **A-03** | **P1** | “Recepcionista” não é role — E2E não deve assumir permissões extras vs barbeiro. | `AuthContext.tsx` L26; `specs/active/fila-digital-v2/spec.md` |
| **A-04** | **P2** | Staff vê PII na fila (nome/telefone) — esperado operacionalmente; distinto do CRM bloqueado. | `QueueManagement.tsx`, `20260724_queue_staff_rls.sql`; Q2 **PASS** |
| **A-05** | **P2** | `/financeiro` sem `OwnerRouteGuard`; staff pode abrir via URL direta apesar do nav mobile ir para insights. | `App.tsx` L240; `BottomMobileNav.tsx` L79–105 |
| **A-06** | **P3** | Staff acessa `/produtos` (nav não é `ownerOnly`) com capacidades reduzidas. | `constants.ts` L38; `Products.tsx` L117 |
| **A-07** | **P2** | Políticas duplicadas/históricas em `public_bookings` (owner FOR ALL + company read/update + insert anon); risco de drift entre migrations e prod. | `20260321_fix_public_bookings_rls_definitive.sql`, `20260307_us015b_multi_user_rls.sql` |
| **A-08** | **P3** | Domínio documentado F6 (“staff só própria agenda e comissões”) parcialmente diverge: fila = tenant inteiro, financeiro parcial via URL. | `agendix-e2e-test/02-personas/regras-dominio.md` F6 vs código atual |

---

## 6. Residual risks (E2E)

1. **Assertions de staff em booking público** falharão até `fetchPublicBookings` / `handleAcceptBooking` usarem `effectiveUserId` / `companyId` de forma consistente com o restante da Agenda.
2. **RLS silencioso:** queries com tenant errado retornam vazio, não erro (`AGENTS.md` / regras F3).
3. **Fila manual:** `add_manual_queue_entry` usa `queue_tenant_id()` (`20260906000001_queue_v2.sql` L326–360) — staff pode adicionar via RPC DEFINER mesmo com comentário antigo em `20260724_queue_staff_rls.sql` negando INSERT direto em tabela.
4. **Validação em produção:** este relatório não executou RPC/RLS no Supabase remoto; políticas efetivas dependem do conjunto de migrations aplicado em prod.

---

## 7. Checklist E2E sugerido (Package A only)

| Caso | Role | Expectativa atual (código) |
|---|---|---|
| Aceitar booking pendente na Agenda | staff | Lista vazia ou erro ao aceitar — **FAIL** |
| Ver fila com cliente na senha | staff | Vê nome/telefone — **PASS** |
| Abrir `/clientes` | staff | Redirect `/` — **PASS** (bloqueio) |
| Abrir `/configuracoes/equipe` | staff | Redirect `/` — **PASS** |
| Recepcionista vs barbeiro | ambos staff | Mesmo resultado — **N/A (sem split)** |

---

*Fim do Package A — não duplica Packages B–F.*
