# SPEC: Bloqueio de agenda por colaborador

**Status:** draft
**Criado:** 2026-10-02
**Prioridade:** alta

Trava rígida. Sem motivo. Sem encaixe do dono. O servidor recusa qualquer reserva no intervalo.

---

## O que o cliente final vê

Na Agenda, o horário bloqueado de um profissional vira uma **faixa cinza hachurada** com o rótulo **Bloqueado**, visualmente distinta das listras de fora do expediente.

**Colaborador** (quando `staff_can_block_agenda` está ligado):

1. Toca o **+** da Agenda → escolhe **Novo atendimento** ou **Bloquear agenda**.
2. Toca um slot vazio **da própria coluna** → pode **Bloquear a partir daqui** (início já preenchido).
3. Toca a faixa bloqueada → resumo do intervalo + **Desbloquear**.

**Dono:** o mesmo fluxo, com seletor de profissional; slot vazio de **qualquer** coluna; em Configurações › Equipe, card **Bloqueios** (lista dos próximos + criar) e interruptor **Colaboradores podem bloquear a própria agenda** ao lado da permissão de edição, em **Permissões da equipe**.

**Cliente no booking público:** os horários bloqueados daquele profissional **simplesmente não aparecem**. Não há mensagem de “bloqueado”.

Se o intervalo já tem atendimentos Confirmado/Pendente (ou pedidos públicos pendentes), o app **lista** e pede confirmação. O bloqueio **não cancela** nada. Para marcar nesse horário, alguém com permissão **remove o bloqueio** antes.

Com a flag desligada, o colaborador **não vê** as opções de bloquear/desbloquear; a faixa só diz **Agenda bloqueada**.

---

## O que muda no sistema

- Nova tabela `agenda_blocks` (profissional + `starts_at` + `ends_at`).
- Coluna `business_settings.staff_can_block_agenda` (boolean, default `true`).
- RPCs `create_agenda_block` / `delete_agenda_block` e helper `agenda_interval_blocked`.
- Recusa no servidor: `create_secure_booking`, `create_public_booking` / `public_booking_slot_busy`, UPDATE de horário em `appointments`, `get_available_slots` (inclusive `p_is_professional = true`).
- Grade da Agenda, formulário de bloqueio, card Equipe e interruptor de permissão.

## O que NÃO muda

- Atendimentos existentes (o bloqueio não cancela, não move, não altera status).
- Horário de funcionamento da casa (`business_hours`) e hachura `agenda-slot-off-hours`.
- Permissão `staff_appointment_edit_scope` (editar/reagendar/cancelar agendamentos).
- Fila digital, clube, financeiro, CRM.

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Intervalo semanal recorrente (almoço toda terça, folga fixa) | Job diferente; este corte é bloqueio pontual com início/fim |
| Expediente individual por colaborador (override de `business_hours`) | Fora deste corte; a casa continua com um horário só |
| Cancelar / notificar automaticamente ao criar o bloqueio | Produto: o bloqueio não cancela nada |
| Motivo, aprovação, fluxo de pedido | Trava rígida, sem motivo e sem aprovação |
| Encaixe do dono por cima da trava | Hard lock: ninguém marca, nem o dono |
| Recorrência tipo “todo mês neste dia” | Fora do MVP |

---

## User Stories

### P1: Modelo de dados ⭐ MVP

**User Story:** Como sistema, preciso persistir um bloqueio como profissional + intervalo, sem motivo, para a trava valer em qualquer cliente (app, booking público, RPC).

**Acceptance Criteria:**

1. WHEN um bloqueio é gravado THEN o sistema SHALL persistir `professional_id` (= `team_members.id`), `starts_at timestamptz` e `ends_at timestamptz`, com isolamento por tenant (`user_id` = `company_id` da sessão). **BLOCK-01**
2. WHEN o intervalo é de horas, dia inteiro ou vários dias THEN o sistema SHALL aceitar desde que `ends_at > starts_at`. **BLOCK-01**
3. WHEN o schema de `agenda_blocks` é criado THEN SHALL NOT existir coluna de motivo, razão, justificativa ou status de aprovação. **BLOCK-02**
4. WHEN a migration de permissão roda THEN `business_settings.staff_can_block_agenda` SHALL ser `boolean NOT NULL DEFAULT true`. **BLOCK-03**

**Independent Test:** SQL no tenant de teste: insert válido; insert sem `company_id` da sessão falha/RLS vazio; `\d agenda_blocks` sem coluna de motivo.

---

### P1: Recusa no servidor ⭐ MVP

**User Story:** Como dono, quero que ninguém (cliente, colaborador, eu) consiga marcar o profissional enquanto o bloqueio durar, mesmo burlando a UI.

**Acceptance Criteria:**

1. WHEN `create_secure_booking` recebe um horário que intersecta um bloqueio daquele `professional_id` THEN SHALL recusar (success=false ou exceção), **incluindo** chamada do dono. **BLOCK-04**
2. WHEN `create_public_booking` ou `public_booking_slot_busy` avalia um slot que intersecta o bloqueio THEN `public_booking_slot_busy` SHALL retornar true e `create_public_booking` SHALL falhar com `slot_unavailable` (mesmo contrato de horário ocupado). **BLOCK-05**
3. WHEN um UPDATE em `appointments` move `appointment_time` (ou `professional_id` / `duration_minutes`) para um intervalo bloqueado THEN o trigger SHALL recusar a escrita. Status Cancelled/NoShow e updates que não encostam no intervalo SHALL passar. **BLOCK-06**
4. WHEN `get_available_slots` monta a lista THEN SHALL omitir qualquer slot cujo intervalo intersecte um bloqueio daquele profissional, **também** com `p_is_professional = true` (sem encaixe). **BLOCK-07**
5. WHEN INSERT direto em `appointments` (ex. `createAgendaAppointment`) cai no intervalo THEN o trigger SHALL recusar — a trava não depende só da RPC de booking. **BLOCK-04**, **BLOCK-06**

**Independent Test:** SQL dos RPCs + UPDATE direto, autenticado como dono e como staff; anon no booking público.

---

### P1: Booking público ⭐ MVP

**User Story:** Como cliente no link público, quero só ver horários em que aquele profissional realmente atende.

**Acceptance Criteria:**

1. WHEN o booking público pede slots (`get_available_slots` / `get_full_dates`) para um profissional com bloqueio THEN os horários cobertos pelo bloqueio SHALL NOT aparecer. **BLOCK-08**
2. WHEN o cliente tenta forçar um horário bloqueado (replay da RPC) THEN o servidor SHALL recusar via `public_booking_slot_busy` / `create_public_booking`. **BLOCK-05**, **BLOCK-08**
3. WHEN a UI pública renderiza THEN SHALL NOT exibir faixa “Bloqueado” nem o motivo — o slot simplesmente não existe na lista. **BLOCK-08**

**Independent Test:** Dois profissionais no mesmo dia; só a coluna/lista do bloqueado some os horários.

---

### P1: Permissões ⭐ MVP

**User Story:** Como dono, quero decidir se o colaborador trava a própria agenda; eu sempre posso travar/destravar qualquer um. O colaborador sempre vê a faixa.

**Acceptance Criteria:**

1. WHEN `staff_can_block_agenda = true` AND o caller é staff THEN `create_agenda_block` / `delete_agenda_block` SHALL aceitar **somente** se `professional_id = teamMemberId` do caller. Tentativa na coluna de outro SHALL recusar. **BLOCK-09**
2. WHEN o caller é owner THEN create/delete SHALL valer para qualquer `team_members.id` do tenant, independente da flag. **BLOCK-10**
3. WHEN `staff_can_block_agenda = false` AND o caller é staff THEN create/delete SHALL recusar; o SELECT dos bloqueios do tenant SHALL continuar visível na grade. **BLOCK-11**
4. WHEN o dono desliga a flag THEN bloqueios já existentes SHALL permanecer válidos (grade + recusa no servidor) até alguém com permissão os remover. **BLOCK-12**
5. WHEN um anon ou de outro tenant chama as RPCs THEN SHALL recusar. **BLOCK-09**, **BLOCK-10**

**Independent Test:** três sessões (dono, staff A, staff B) + toggle on/off.

---

### P1: Pontos de entrada na Agenda ⭐ MVP

**User Story:** Como colaborador ou dono, quero bloquear a partir do + e a partir de um furo na grade, sem campo de motivo.

**Acceptance Criteria:**

1. WHEN staff com flag ligada toca o **+** da Agenda (header no desktop; no mobile, o mesmo CTA de “novo” da página — não abrir o wizard direto) THEN a UI SHALL oferecer **Novo atendimento** e **Bloquear agenda**. **BLOCK-13**
2. WHEN owner toca o **+** THEN SHALL oferecer as mesmas duas ações; em **Bloquear agenda** SHALL haver seletor de profissional. **BLOCK-13**
3. WHEN staff com flag ligada toca um slot vazio da **própria** coluna THEN SHALL poder escolher **Bloquear a partir daqui**, com `starts_at` pré-preenchido naquele horário. Slot de **outra** coluna SHALL NOT oferecer bloquear. **BLOCK-14**
4. WHEN owner toca um slot vazio de **qualquer** coluna THEN SHALL poder **Bloquear a partir daqui**, profissional = coluna, horário pré-preenchido. **BLOCK-14**
5. WHEN o formulário de bloqueio abre THEN SHALL pedir início e fim (hora, dia inteiro ou vários dias) e SHALL NOT pedir motivo. **BLOCK-02**, **BLOCK-13**

**Independent Test:** Agenda 390 e 1280; staff na própria coluna vs coluna alheia; dono em qualquer coluna.

---

### P1: Faixa, resumo e visual ⭐ MVP

**User Story:** Como quem olha a grade, quero distinguir bloqueio de “fora do expediente” e, se eu puder, desbloquear num toque.

**Acceptance Criteria:**

1. WHEN a grade renderiza um bloqueio THEN SHALL desenhar faixa cinza hachurada com rótulo **Bloqueado**, classe `agenda-block-band` (ex. 45deg, cinza mais denso), **distinta** de `agenda-slot-off-hours` (135deg, 1px/7px, muted 9%). **BLOCK-16**
2. WHEN um bloqueio e um off-hours coincidem THEN a faixa de bloqueio SHALL prevalecer naquele profissional (off-hours continua nas outras colunas). **BLOCK-16**
3. WHEN staff com flag ligada (na própria faixa) ou owner toca a faixa THEN SHALL abrir resumo (profissional, início, fim) com ação **Desbloquear**. **BLOCK-15**
4. WHEN `staff_can_block_agenda = false` AND o viewer é staff THEN as opções de bloquear ( + e slot vazio) SHALL ficar ocultas; a faixa SHALL mostrar só **Agenda bloqueada**, sem **Desbloquear**. **BLOCK-17**
5. WHEN o desbloqueio confirma THEN o servidor SHALL apagar o registro (`delete_agenda_block`) e a grade SHALL liberar os slots (sujeito a atendimentos que já existiam). **BLOCK-15**

**Independent Test:** screenshot lado a lado off-hours vs bloqueio; staff flag off não vê Desbloquear.

---

### P1: Conflitos (não cancela) ⭐ MVP

**User Story:** Como quem vai bloquear, quero ver quem já está marcado naquele intervalo e confirmar; o sistema não some com os atendimentos.

**Acceptance Criteria:**

1. WHEN o intervalo intersecta agendamentos `Confirmed` ou `Pending`, ou `public_bookings` `pending` (e `confirmed` ainda ocupando slot), daquele profissional THEN a UI SHALL listar cliente/serviço/horário e pedir confirmação explícita. **BLOCK-20**
2. WHEN a pessoa confirma THEN o bloqueio SHALL ser criado e **nenhum** appointment/public_booking SHALL ser cancelado, movido ou ter status alterado. **BLOCK-20**
3. WHEN não há conflito THEN o bloqueio SHALL gravar sem o passo extra. **BLOCK-20**
4. WHEN o bloqueio existe junto com esses atendimentos THEN a grade SHALL mostrar os cards **e** a faixa; o servidor continua recusando **novas** reservas no furo. **BLOCK-20**, **BLOCK-16**

**Independent Test:** criar bloqueio em cima de um Confirmed; o Confirmed permanece; novo booking no mesmo furo falha.

---

### P1: Equipe — card Bloqueios + toggle ⭐ MVP

**User Story:** Como dono, quero gerenciar bloqueios e a permissão da equipe sem sair de Configurações › Equipe.

**Acceptance Criteria:**

1. WHEN o dono abre Equipe THEN SHALL existir seção **Bloqueios** com lista dos próximos (profissional, início, fim) e ação de criar. **BLOCK-18**
2. WHEN o dono cria/remove pela seção THEN as mesmas RPCs e regras de conflito SHALL valer. **BLOCK-18**, **BLOCK-20**
3. WHEN o dono olha **Permissões da equipe** THEN SHALL haver interruptor **Colaboradores podem bloquear a própria agenda** junto da permissão de edição de agendamentos (`StaffAppointmentPermissionSection`). **BLOCK-19**
4. WHEN o dono desliga o interruptor THEN o valor SHALL persistir em `staff_can_block_agenda = false`; a UI de staff perde create/delete na hora (após refetch); bloqueios existentes continuam. **BLOCK-19**, **BLOCK-12**
5. WHEN staff abre Equipe THEN SHALL NOT ver o interruptor nem a gestão (página já é `OwnerRouteGuard`). **BLOCK-19**

**Independent Test:** dono liga/desliga; staff recarrega a Agenda.

---

## Edge cases

- WHEN `ends_at <= starts_at` THEN SHALL recusar na RPC (e CHECK no banco).
- WHEN dois bloqueios do mesmo profissional se sobrepõem THEN SHALL recusar o segundo (constraint ou RPC).
- WHEN o profissional é soft-deleted THEN bloqueios futuros SHALL deixar de ser criáveis; existentes: CASCADE ou bloquear delete até limpar — implementação no design; a grade não mostra coluna inativa.
- WHEN o bloqueio atravessa meia-noite / fuso (`business_timezone`) THEN `timestamptz` SHALL ser a fonte da verdade; a UI usa o fuso do negócio para “dia inteiro”.
- WHEN `create_secure_booking` é chamado pelo dono em horário bloqueado THEN SHALL falhar igual ao staff — sem caminho de encaixe.
- WHEN só o status do appointment muda (ex. Faltou) sem mudar horário THEN o trigger de bloqueio SHALL NOT impedir.
- WHEN a flag é religada THEN o staff volta a poder criar/apagar **só a própria** agenda; os bloqueios que o dono fez em outras colunas continuam visíveis, sem Desbloquear para o staff.

---

## Teste E2E

```
1. Dono liga staff_can_block_agenda (default já true).
2. Staff abre Agenda, toca +, escolhe Bloquear agenda, define 14:00–16:00 na própria coluna.
3. Grade mostra faixa Bloqueado; booking público daquele profissional não lista 14:00–15:30.
4. Staff tenta Novo atendimento às 14:30 → servidor recusa.
5. Dono tenta o mesmo horário na mesma coluna → servidor recusa.
6. Staff toca a faixa → Desbloquear → faixa some; slot volta a aparecer no público.
7. Dono desliga a flag. Staff não vê Bloquear / Desbloquear; faixa de um bloqueio do dono continua visível como "Agenda bloqueada".
8. Dono bloqueia em cima de um Confirmed: lista o conflito, confirma, Confirmed permanece, novo booking no furo falha.
9. Mobile 390: slot vazio da própria coluna oferece Bloquear a partir daqui com horário preenchido.
```

---

## Arquivos envolvidos

- `supabase/migrations/` — tabela, coluna, helper, RPCs, trigger, patch das funções de slot/booking
- `pages/Agenda.tsx` — CTA +, wizard vs bloqueio, fetch das faixas
- `components/agenda/AgendaResourceGrid.tsx` — faixa `agenda-block-band`
- `components/agenda/AgendaEmptySlotCell.tsx` — menu Novo / Bloquear a partir daqui
- `components/settings/StaffAppointmentPermissionSection.tsx` — toggle
- `pages/settings/TeamSettings.tsx` — seção Bloqueios
- `styles/tailwind.css` — classe `agenda-block-band`
- `types/settings.ts`, `hooks/useSettings.ts`, `services/settings.ts` — flag
- `services/publicBooking.ts` — já consome `get_available_slots` (sem lista extra na UI pública)
- Testes Vitest + `supabase/tests/` dos RPCs

Detalhe no `design.md`.

---

## Requirement Traceability

| ID | Tema | Story |
|----|------|--------|
| BLOCK-01 | Modelo | profissional + starts_at + ends_at; horas / dia / multi-dia |
| BLOCK-02 | Modelo | sem motivo / aprovação |
| BLOCK-03 | Toggle | `staff_can_block_agenda` default true |
| BLOCK-04 | Recusa | `create_secure_booking` (+ INSERT appointments) |
| BLOCK-05 | Recusa | `create_public_booking` / `public_booking_slot_busy` |
| BLOCK-06 | Recusa | UPDATE de horário em `appointments` (trigger) |
| BLOCK-07 | Recusa | `get_available_slots` sem encaixe |
| BLOCK-08 | Público | slots bloqueados não aparecem |
| BLOCK-09 | Permissão | staff só a própria agenda (flag on) |
| BLOCK-10 | Permissão | dono qualquer profissional |
| BLOCK-11 | Permissão | flag off: staff não cria/apaga, ainda vê |
| BLOCK-12 | Toggle | bloqueios existentes seguem válidos |
| BLOCK-13 | UI | + Novo atendimento / Bloquear agenda (+ picker do dono) |
| BLOCK-14 | UI | slot vazio: Bloquear a partir daqui (própria / qualquer) |
| BLOCK-15 | UI | toque na faixa → resumo + Desbloquear |
| BLOCK-16 | Visual | `agenda-block-band` ≠ off-hours |
| BLOCK-17 | UI | flag off: staff sem ações; copy Agenda bloqueada |
| BLOCK-18 | Equipe | card Bloqueios (lista + criar) |
| BLOCK-19 | Equipe | toggle em Permissões da equipe |
| BLOCK-20 | Conflitos | lista + confirma; não cancela |

---

## Done when

- [ ] BLOCK-01 … BLOCK-20 implementados e rastreáveis
- [ ] Servidor recusa booking interno, público, UPDATE de horário e slots disponíveis durante o bloqueio (dono incluso)
- [ ] Booking público omite os horários; UI interna mostra faixa distinta de off-hours
- [ ] Flag on/off altera só create/delete do staff; grade e trava permanecem
- [ ] Conflito lista e confirma; nenhum cancelamento automático
- [ ] Sem campo de motivo e sem encaixe do dono
- [ ] Testado em mobile (~390) e desktop
- [ ] typecheck, lint, build e testes passam
