# SPEC: Agenda v2 — Visão completa + Status visuais + Filtro por colaborador

**Status:** ready
**Criado:** 2026-06-20
**Prioridade:** alta
**Origem:** `specs/active/PRD-agenda-v2-visao-completa-e-status.md`
**Sprints:** `specs/active/SPEC-agenda-v2-sprints.md`

---

## Contexto

A tela `pages/Agenda.tsx` (1769 linhas) tem 4 fricções reais no uso diário:

1. **Grade muito aberta** — slot fixo em `min-h-[90px]`; em mobile 375px o dia não cabe na viewport, exigindo scroll vertical extenso.
2. **Dois carrosséis horizontais empilhados** — date strip (~1115-1152) + avatares de profissionais (~1154-1194) competem pelo mesmo gesto e ocupam ~160px verticais.
3. **Status sem comunicação visual** — só um dot pequeno no canto do card (1395-1398); não há cor para `Cancelled` nem `NoShow`. O dono não distingue de relance concluído/atrasado/faltou/cancelado.
4. **Privacidade quebrada para staff** — `teamMembers` é buscado sem filtro de role (`fetchTeamMembers` 333-341), `displayedMembers` (937-939) não checa `isStaff`; um barbeiro vê a agenda de todos. R27 (`_reversa_sdd/sdd/agenda.md`) documenta o filtro mas ele **não está implementado**.

### Premissas já verificadas no código (reduzem escopo de banco)

- ✅ **`appointments.duration_minutes` já existe** — a RPC `create_secure_booking` (`supabase/migrations/20260218_add_payment_method.sql`, INSERT 69-91) grava `duration_minutes`; a Agenda já lê com fallback `|| 30` (667/679). Sem migration de duração.
- ✅ **`teamMemberId` já existe no `AuthContext`** (`contexts/AuthContext.tsx:121`, mapeado de `team_members` para contas staff; exposto 381/402).
- ✅ **`status` é `TEXT DEFAULT 'Pending'` sem CHECK** (`20260218_full_schema_fix.sql:201`) — `NoShow` não exige migration de schema.
- ⚠️ **Badge "Editado" exige coluna nova** — o trigger `update_appointments_updated_at` atualiza `updated_at` em QUALQUER update (concluir/cancelar/no-show), então `updated_at > created_at` é inútil. Solução: coluna dedicada `edited_at`.
- A Agenda usa `.select('*, clients(...))` (363) → já traz `duration_minutes`, `status`, `created_at`, `updated_at`, e trará `edited_at`.
- Cards são renderizados **inline** (1360-1401); não há `AppointmentCard` separado. Modal de detalhes tem badge de status em 1448-1450.

### Decisões técnicas fechadas

1. **NoShow = novo valor de `status`** (`'NoShow'`), sem migration de schema. Disparado por ação na UI; `types.ts` passa a incluir `'Cancelled' | 'NoShow'`.
2. **"Atrasado" (amarelo)** = `now() > appointment_time + duration_minutes + 15min AND status IN ('Pending','Confirmed')`. Derivado client-side; fallback 30min.
3. **Badge "Editado"** = coluna `appointments.edited_at` dedicada, setada só na edição real (`AppointmentEditModal`).
4. **R27 implementado de fato** — staff default no próprio `teamMemberId`; "Todos" nunca aparece para staff; multi-select de colegas permitido. Owner mantém "Todos".
5. **Carrosséis unificados** — eliminar dois `overflow-x-auto` competindo na mesma área.
6. **Cor de status no card inteiro**, centralizada num util único consciente de tema (barber/beauty).

---

## O que o cliente final vê

- **Dia inteiro (8h–20h) em mobile 375×667** com scroll vertical mínimo — slot mais compacto, densidade por tema. Em desktop 1280×800, 12h visíveis.
- **Carrossel horizontal único** (data + profissionais) — um só gesto, sem competição.
- **Cards com cor de status no corpo inteiro:**

  | Estado visual | Cor | Significado |
  |---|---|---|
  | Verde `#10B981` | emerald | Concluído (`Completed`) |
  | Amarelo `#F59E0B` | amber | Atrasado sem confirmação (regra decisão #2) |
  | Cor padrão | tema | Normal (`Confirmed`/`Pending` dentro do prazo) |
  | Cinza/marrom `#57534E` | stone | Não compareceu (`NoShow`) |
  | Vermelho `#EF4444` | red | Cancelado (`Cancelled`) |

  Badge pequeno **"Editado"** no card quando `edited_at` não nulo.
- **Staff** abre e vê só os seus agendamentos; pode incluir colegas via multi-select nos avatares; **nunca** vê o botão "Todos". **Owner** vê todos por padrão e mantém "Todos".
- **Histórico** = navegar a dias passados na mesma grade (via date strip), com as mesmas cores de status. Nada some, nada "arquiva".

---

## O que muda no sistema

### Banco
- Migration aditiva: `ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;`
- Atualizar comentário da coluna `status` documentando os 5 valores (incl. `NoShow`) — documental, opcional.

### Tipos
- `types.ts`: `Appointment.status` → `'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'NoShow'`; adicionar `edited_at?: string | null`; garantir `duration_minutes?: number`.

### Novo util — `utils/appointmentStatus.ts`
- `getVisualStatus(apt, now): 'completed' | 'overdue' | 'normal' | 'noshow' | 'cancelled'` — precedência: `cancelled`/`noshow`/`completed` (estado terminal) antes de `overdue`/`normal`.
- Regra do amarelo (decisão #2): `now > appointment_time + (duration_minutes ?? 30)min + 15min AND status IN ('Pending','Confirmed')`.
- Mapa de cores/classes por tema (barber dark/light, beauty dark/light) + label PT-BR por estado. Fonte única de verdade para Agenda + modal + AllAppointmentsModal.

### `pages/Agenda.tsx`
- **Grid (1310-1410):** reduzir altura do slot (densidade por tema), mantendo legibilidade (cliente/serviço/hora/status) e touch ≥44px.
- **Carrossel (1115-1194):** unificar date strip + avatares numa única área de scroll horizontal.
- **Card (1360-1401):** cor de status no corpo inteiro via `getVisualStatus`; badge "Editado" se `edited_at`.
- **Filtro de role (101, 333-341, 937-939):** estado inicial e `displayedMembers` conscientes de `role` + `teamMemberId`; "Todos" só para owner; multi-select de profissionais (array de IDs em vez de string única).
- **Ação "Não compareceu"** (seta `status='NoShow'`) no modal de detalhes e/ou no card, respeitando guard D-07 (staff não mexe em `Completed`).
- **`handleAcceptBooking`:** garantir que o INSERT/UPDATE de appointment popule `duration_minutes` (somando serviços), igual à RPC.

### Outros consumidores
- `components/AppointmentEditModal.tsx`: ao salvar edição real, setar `edited_at = now()`.
- `components/dashboard/modals/AllAppointmentsModal.tsx` e badge do modal de detalhes (1448-1450): reusar a paleta de `getVisualStatus`.

---

## O que NÃO muda

- Sem refatorar RLS/RPC/schema além da coluna `edited_at`.
- Sem mexer em AppointmentWizard, CheckoutModal (como componentes), real-time, i18n, notificações.
- `status` continua `TEXT`; sem enum formal.
- Multi-tenant por `company_id` intocado.
- Não corrigir o débito legado de `SPEC-ui-audit` (`text-[10px]`, `alert()`), mas **código novo** usa tokens corretos.

---

## Edge cases

- **Agendamento antigo sem `duration_minutes`** → fallback 30min no cálculo do amarelo.
- **Concluído antes do prazo** → verde tem precedência sobre amarelo (estado terminal vence).
- **Staff sem `teamMemberId`** (conta mal provisionada) → fallback seguro: mostra vazio + aviso, nunca "todos".
- **Dia com >8 profissionais** → largura mínima de coluna + scroll horizontal único mantido.
- **Cancelado/NoShow no passado** → cor persiste na navegação histórica; nada some do banco.
- **Tema beauty (claro)** → cores ajustadas por contraste no util (mesma família).
- **Staff tenta marcar NoShow em `Completed`** → bloqueado pelo guard D-07 com toast.

---

## Teste E2E

```
1. Em viewport 375×667, abrir agenda de um dia com 5+ profissionais
   → pelo menos 8h visíveis sem scroll vertical; um único carrossel horizontal
2. Criar agendamento e deixar passar horário+duração+15min sem concluir
   → card fica amarelo
3. Concluir um agendamento → verde; cancelar outro → vermelho; marcar NoShow → cinza/marrom
   → cores consistentes no card, no modal de detalhes e no AllAppointmentsModal
4. Logar como staff → vê só os seus; não existe botão "Todos"
5. Staff inclui um colega via multi-select nos avatares → vê os dois
6. Navegar para o dia anterior via date strip → blocos com as mesmas cores de status
7. Editar um agendamento (horário/serviço) e salvar → badge "Editado" aparece
8. Concluir/cancelar/NoShow um agendamento → badge "Editado" NÃO aparece por causa disso
```

---

## Arquivos envolvidos

- `supabase/migrations/<nova>.sql` — `ADD COLUMN edited_at` + comentário de `status`.
- `types.ts` — union de status + `edited_at?` + `duration_minutes?`.
- `utils/appointmentStatus.ts` — **novo**: `getVisualStatus` + paleta por tema + labels.
- `pages/Agenda.tsx` — grid, carrossel, card, filtro de role, ação NoShow, `handleAcceptBooking`.
- `components/AppointmentEditModal.tsx` — setar `edited_at` na edição real.
- `components/dashboard/modals/AllAppointmentsModal.tsx` — reuso da paleta.

---

## Done when

- [ ] Em 375×667 com 5+ profissionais, ≥8h visíveis sem scroll vertical
- [ ] Carrossel horizontal único (não dois empilhados)
- [ ] Cada status com cor distinta e consistente em agenda + modal de detalhes + AllAppointmentsModal
- [ ] Staff sem filtro vê só os seus; "Todos" nunca disponível para staff
- [ ] Staff pode adicionar colegas via multi-select
- [ ] Owner mantém "Todos" e comportamento atual
- [ ] Dia anterior visível com cores de status (nada some)
- [ ] Badge "Editado" via `edited_at` — aparece só após edição real, não após concluir/cancelar/NoShow
- [ ] Cálculo do amarelo respeita `duration_minutes` (fallback 30) + 15min
- [ ] Sem regressão em booking público, fila digital, checkout, wizard
- [ ] Gates verdes: `npm run typecheck && npm run lint && npm run build` (+ `npm test`)
- [ ] Validado em Chrome Android 375px nos 4 temas (barber/beauty × dark/light)
