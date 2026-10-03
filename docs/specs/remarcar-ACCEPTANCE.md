# AgendiX — Remarcar horário (PR C)

Critérios de aceite aprovados (seções B, C.2 e D de `ACCEPTANCE.md`, 29/09/2026).
Base de implementação: main `376b310`. Convenções da seção 0 valem para fuso, intervalo e overlap.

Este arquivo é a fonte de aceite **deste PR**. Não inclui bloqueio de agenda (C.1) nem o PR de segurança (E).

## 0. Convenções (valem para tudo)

- **0.1 Instante.** Todo horário é gravado como instante absoluto (`timestamptz`). O que aparece na tela é só a conversão desse instante.
- **0.2 Fuso da loja.** É o fuso de `business_timezone(empresa)`:
  - o fuso configurado em Ajustes;
  - sem configuração, PT → Europe/Lisbon; BR/desconhecido → America/Sao_Paulo.
- **0.3 Intervalo meio-aberto.** Um bloqueio ocupa **[início, fim)**: inclui o início e **não** inclui o fim. Um atendimento ocupa **[horário, horário + duração)**.
- **0.4 Sobreposição.** Bloqueio e atendimento se sobrepõem **se e somente se** `início_bloqueio < fim_atendimento` **e** `fim_bloqueio > horário_atendimento`. Encostar na borda **não** é sobreposição.
- **0.5 Duração do atendimento.** Usa `duration_minutes`. Se estiver vazio, conta 30 min.
- **0.6 Status que ocupam horário.**
  - Agendamento: `Pending` e `Confirmed`.
  - Pedido online: `pending` e `confirmed`.
  - `Completed`, `Cancelled` e `NoShow` / `cancelled` **não** são checados contra bloqueio (regra B-30).
- **0.7 Profissional ativo.** Linha em `team_members` com `active = true` e `deleted_at` vazio.

---


## B. REMARCAR HORÁRIO — regras

### B0. O que existe hoje (levantamento no código)
- **Toque no card da grade** abre "Detalhes do Agendamento" (`Agenda.tsx` ~1380-1495). Os botões ficam em `components/agenda/AppointmentDetailsActions.tsx`:
  - **Confirmar e cobrar** e **Faltou**: toda a equipe.
  - **Editar**: só quando `canEdit` e status **Confirmed** (linha 96). **Pending não tem Editar.**
  - **Cancelar**: quando `canEdit`.
  - Status NoShow mostra **"Usar este horário"** (item 5): abre um **novo** agendamento no horário liberado (`handleUseNoShowSlot`, `Agenda.tsx:1003`). Não muda o registro da falta.
- **Hoje, trocar horário só é possível pelo "Editar"** (`components/AppointmentEditModal.tsx`). Problemas encontrados:
  1. Faz UPDATE direto (linha 268) **sem nenhuma checagem de conflito**: dá para jogar em cima de outro atendimento.
  2. O horário é montado no fuso do aparelho (`combineDateAndTime`, `utils/date.ts:103`).
  3. A lista de horários é fixa, 00:00–23:30 de 30 em 30 min (`buildManualBookingTimeSlots`). Não usa o passo do wizard nem o expediente.
  4. **Não atualiza o pedido online ligado** (`public_bookings`). O cliente continua vendo o horário antigo no link dele (`get_client_bookings_history` lê `public_bookings`).
     - E o pedido `confirmed` no horário antigo continua **segurando o horário antigo** no link público: `confirmed_booking_slot_released` procura um agendamento no mesmo horário e profissional e não acha.
     - Em prod hoje: 0 casos (conferido).
  5. Não oferece WhatsApp.
  6. Não registra de onde para onde mudou; só grava `edited_at`.
- **Permissão (#96)** já existe: `staff_appointment_edit_scope` = none/own/all.
  - O texto da tela já diz "editar, **reagendar** e cancelar".
  - O banco aplica a regra pelo trigger `enforce_staff_appointment_edit_scope` e por `staff_can_modify_appointment`.
- **WhatsApp:** o app só abre `wa.me` com texto pronto (`buildWhatsAppLink`, `utils/formatters.ts:141`). Não existe envio automático.
  - O nome do estabelecimento entra como `*{nome do negócio}*`. Sem nome cadastrado, usa o substituto do tipo de negócio: "Barbearia"/"Salão" (`utils/businessCopy.ts:34/62`), como em `AppointmentWizard.tsx:253` e `Agenda.tsx:734`.
  - Não existe placeholder literal "(nome do estabelecimento)"; esta spec usa `{estabelecimento}` = nome do negócio ou o substituto.

### B1. Regras
- **R-01 Onde aparece.** Botão **"Remarcar"** (ícone de relógio/calendário) no modal de detalhes. Visível quando o status é `Pending` ou `Confirmed` **e** `canEdit(profissional)` for verdadeiro.
- **R-02 Quem pode** (mesma regra do #96; o banco confere de novo):

| Quem | Escopo | Pode remarcar | Pode trocar o profissional |
|---|---|---|---|
| Dono | — | sim, qualquer | sim |
| Colaborador | `none` | **não** (botão some; o banco recusa) | — |
| Colaborador | `own` | só agendamento **em que ele é o profissional** | **não**: fica fixo nele (seletor travado, como `lockProfessionalToSelf`) |
| Colaborador | `all` | qualquer agendamento da empresa | sim |
| Ex-colaborador / anônimo | — | não | — |

- **R-03 Status.**
  - `Pending` e `Confirmed`: **sim**.
  - `Completed`, `Cancelled` e `NoShow`: **não**. Mensagem: *"Só dá para remarcar atendimentos pendentes ou confirmados."*
  - Para falta continua existindo "Usar este horário".
- **R-04 Mesmo registro.** Remarcar **altera o próprio agendamento** (mesmo `id`). Só mudam `appointment_time`, `professional_id` (se trocado) e `edited_at`. Ficam iguais: cliente, serviço, preço, duração, produtos, observação, forma de pagamento e origem.
- **R-05 Operação única no servidor.** RPC nova `reschedule_appointment(id, novo_horário, novo_profissional)`. Numa transação só, com a trava da empresa (B-54):
  1. confere empresa, status e permissão;
  2. confere o conflito;
  3. grava;
  4. sincroniza o pedido online;
  5. registra no histórico.
  - Se qualquer passo falhar, nada muda.
- **R-06 Conflito** (mesma regra do wizard):
  - Recusa se o novo intervalo [novo, novo + duração) sobrepõe outro agendamento `Pending`/`Confirmed`/`Completed` do profissional de destino, ou um pedido online que ainda segura o horário.
  - Ignora o próprio agendamento e o pedido ligado a ele.
  - Mensagem: *"Esse horário já está ocupado na agenda de {Profissional}. Escolha outro."*
- **R-07 Bloqueio.** Passa pelo trigger de bloqueio (B-39). Mensagem M1.
- **R-08 Passado.** Dono e colaborador podem remarcar para um horário já passado (encaixe lançado depois, como no #101), com o aviso *"Esse horário já passou — use para lançar um atendimento que já aconteceu."*
  - O cliente pelo link **não** remarca para o passado.
- **R-09 Sem mudança.** Mesmo horário e mesmo profissional: recusa com *"Escolha um horário ou profissional diferente do atual."* (o botão fica desabilitado antes disso).
- **R-10 Profissional de destino** precisa ser ativo e da empresa. Mensagem: *"Esse profissional não está disponível para agendamentos."* Um agendamento sem profissional exige escolher um.
- **R-11 Pedido online ligado** (`public_booking_id` preenchido):
  - o pedido recebe o mesmo novo horário e profissional **na mesma transação**, e o status continua `confirmed`;
  - `original_appointment_time` guarda o horário anterior;
  - o link do cliente passa a mostrar **o novo horário e o novo profissional**, e o horário antigo fica livre no link público.
- **R-12 Agendamento sem pedido online** (criado pelo app): não aparece no link do cliente, igual a hoje. O aviso é só pelo WhatsApp (R-13).
- **R-13 WhatsApp.** Na confirmação há a opção **"Avisar o cliente no WhatsApp"**:
  - marcada por padrão quando o cliente tem telefone; escondida quando não tem;
  - depois de salvar, abre o `wa.me` com o texto pronto. Nada é enviado sozinho.
  - Datas e horas no **fuso da loja**; o trecho do profissional só aparece se houver profissional.
  - Barbearia:
    > Fala, {cliente}! 🔁
    > Seu horário na *{estabelecimento}* foi remarcado.
    > Antes: {data_antiga} às {hora_antiga}
    > Agora: *{data_nova}* às *{hora_nova}* com {profissional}.
    > Qualquer dúvida é só responder aqui. Até lá! ✂️
  - Estética/salão:
    > Olá, {cliente}! ✨
    > Seu horário no *{estabelecimento}* foi remarcado.
    > Antes: {data_antiga} às {hora_antiga}
    > Agora: *{data_nova}* às *{hora_nova}* com {profissional}.
    > Se precisar de outro horário, é só responder. 💖
- **R-14 Tela.**
  1. [Remarcar] abre o modal "Remarcar horário".
  2. Topo: *"Atual: {dia} {data} às {hora} com {Profissional}"*.
  3. Passo de data/horário e profissional = **o mesmo componente do wizard** (`components/appointment/ScheduleSelection.tsx`), com expediente e "Fora do expediente" e com os bloqueios desabilitados (B-68).
  4. Resumo *"De … → Para …"* + opção de WhatsApp + [Confirmar remarcação].
  5. Sucesso: toast *"Horário remarcado."*, a grade vai para o novo dia/horário e destaca o card (como `useFocusCreatedAppointment`).
  6. Erro: toast com a mensagem da regra (R-03/R-06/R-07/R-09/R-10/#96), e o modal continua aberto para escolher outro horário.
  - Genérico: *"Não foi possível remarcar. Tente novamente."*
  - Permissão: *"Sua permissão não permite alterar este agendamento. Fale com o dono."* (mensagem que já existe).
- **R-15 "Editar" deixa de mudar horário e profissional.** O modal de edição passa a mostrar data, hora e profissional só para leitura, com o link "Remarcar". Assim existe **um só caminho** com as regras acima.
  - O trigger de bloqueio também protege o UPDATE direto, caso sobre algum caminho antigo.
- **R-16 Histórico.** Tabela nova `appointment_reschedules`: id, agendamento, empresa, horário antigo, horário novo, profissional antigo, profissional novo, quem fez e quando.
  - Leitura: dono e colaborador da empresa.
  - Escrita: só pela RPC.
  - No modal de detalhes aparece *"Remarcado por {nome} em {data} (antes: {data/hora})"* quando existir registro.

---

## C. CRITÉRIOS DE ACEITE (do básico ao avançado)

**Tipos de teste**
- **SQL:** harness Postgres local com as funções de prod e md5 de referência, no padrão `scripts/test-sql-*.sh`.
- **VT:** vitest.
- **PW:** Playwright local, com gravações simuladas ou em banco de teste; **nunca** grava em prod.

**Papéis:** D = dono, C = colaborador, X = ex-colaborador, A = anônimo. **Telas:** 390 = celular 390×844; 1440 = desktop.

### C.2 Remarcar

| # | Critério | Regras | Tipo | Papéis / telas |
|---|---|---|---|---|
| C-R01 | "Remarcar" aparece em Pending/Confirmed para quem tem `canEdit`; some em Completed/Cancelled/NoShow e para C com escopo `none` | R-01..R-03 | VT + PW | D, C · 390, 1440 |
| C-R02 | D remarca para outro horário livre: mesmo `id`; cliente, serviço, preço, duração e produtos iguais; card no novo lugar e destacado | R-04, R-14 | SQL + PW | D · 390, 1440 |
| C-R03 | Escopo `own`: C remarca só o próprio e o seletor de profissional fica travado; tentar trocar o profissional via API → recusa | R-02 | SQL + VT | C |
| C-R04 | Escopo `all`: C remarca qualquer um e pode trocar o profissional | R-02 | SQL | C |
| C-R05 | Conflito com outro atendimento/pedido → R-06; o próprio agendamento não conta como conflito (ex.: 14:00 → 14:15 com 60 min) | R-06 | SQL | D, C |
| C-R06 | Remarcar para dentro de bloqueio → M1; nada muda | R-07, B-39 | SQL + PW | D · 390 |
| C-R07 | Remarcar para o passado funciona para D e C, com aviso | R-08 | SQL + VT | D, C |
| C-R08 | Mesmo horário/profissional → R-09; profissional inativo → R-10 | R-09, R-10 | SQL + VT | D |
| C-R09 | Online: o pedido ligado recebe o novo horário e profissional; o link do cliente mostra o novo horário; o horário antigo volta a aparecer no link público | R-11 | SQL + PW | D + A · 390 |
| C-R10 | WhatsApp: com telefone, abre `wa.me` com o texto de R-13 (barbearia e estética), datas no fuso da loja e substituto quando falta o nome do negócio | R-13 | VT | D, C |
| C-R11 | Histórico: cada remarcação grava 1 linha com antes/depois/quem; o modal mostra "Remarcado por…" | R-16 | SQL + VT | D, C |
| C-R12 | Atomicidade: se a sincronização do pedido ou o histórico falhar, o agendamento **não** muda | R-05 | SQL | — |
| C-R13 | Concorrência: duas remarcações para o mesmo horário ao mesmo tempo → uma vence, a outra recebe R-06 | R-05, R-06 | SQL (2 conexões) | D, C |
| C-R14 | "Editar" não altera mais data, hora ou profissional (campos só leitura + link "Remarcar") | R-15 | VT + PW | D · 390 |

---

## D. LISTA TDD (escrever o teste antes, ligado ao critério)

### D.1 SQL harness
- **Bloqueio:** `scripts/test-sql-professional-blocks.sh` + `supabase/tests/professional_blocks.harness.sql`.
- **Remarcar:** `scripts/test-sql-reschedule.sh` + `supabase/tests/reschedule_appointment.harness.sql`.

| Teste | Critério |
|---|---|
| T-S01 matriz de permissão: D/C-própria/C-outro × toggle on/off × criar/remover (16 casos) | C-B04, C-B05 |
| T-S02 toggle: C faz upsert → 0 linhas; D grava; C lê | C-B07 |
| T-S03 desligar não apaga; religar devolve os poderes | C-B06 |
| T-S04 anônimo e ex-colaborador: SELECT/INSERT/DELETE negados; `has_function_privilege` falso nas funções auxiliares | C-B08 |
| T-S05 validações: fim≤início, >366 dias, início<agora−5min, início=agora−4min (aceita), profissional inativo | C-B09 |
| T-S06 conflitos: lista recalculada; `conflitos_confirmados` incompleto → `block_conflicts_changed` | C-B11, C-B19 |
| T-S07 bordas A7 (8 casos) | C-B12 |
| T-S08 caminhos internos: `create_secure_booking` (Confirmed e pending), UPDATE direto de horário/profissional/duração, aceite RPC, INSERT do fallback, atribuição, reabertura Cancelled→Confirmed | C-B13 |
| T-S09 permitidos: mudança de status, cobrança (`complete_appointment`), notas/preço, `settle_queue_ticket` | C-B13, C-B20 |
| T-S10 público: `create_public_booking`, INSERT anônimo direto, `update_public_booking_by_client` → `slot_unavailable` | C-B14 |
| T-S11 `get_available_slots` (profissional escolhido / qualquer) e `get_full_dates` com bloqueio de horas, de dia inteiro e de vários dias | C-B15, C-B16 |
| T-S12 capacidade do "qualquer": 2 profissionais, 1 bloqueado, 1 pedido sem profissional → horário some; pedido gravado atribuído | C-B16 |
| T-S13 `get_first_available_professional` sem erro e pulando bloqueados | C-B17 |
| T-S14 fusos: Lisboa 29/03 e 25/10, São Paulo, bloqueio 22:00→02:00 | C-B18 |
| T-S15 concorrência com 2 conexões (dblink ou 2 psql + `pg_sleep`), nas duas ordens | C-B19 |
| T-S16 CASCADE na exclusão definitiva; exclusão suave | C-B21 |
| T-S17 md5 das funções de prod que não mudam + suites antigas | C-B25 |
| T-R01 status e permissão (#96 none/own/all; own tentando trocar profissional) | C-R01, C-R03, C-R04 |
| T-R02 mesmo `id` e campos preservados | C-R02 |
| T-R03 conflito ignorando o próprio registro (14:00→14:15, 60 min) | C-R05 |
| T-R04 bloqueio | C-R06 |
| T-R05 passado permitido; sem mudança; profissional inativo | C-R07, C-R08 |
| T-R06 sincronização do pedido online e liberação do horário antigo no público | C-R09 |
| T-R07 histórico gravado | C-R11 |
| T-R08 atomicidade: forçar falha no histórico → nada muda | C-R12 |
| T-R09 concorrência entre duas remarcações | C-R13 |

### D.2 Vitest
| Teste | Critério |
|---|---|
| T-V01 `canBlock(role, toggle, teamMemberId, professionalId)`, incluindo coluna ausente | C-B04, C-B05 |
| T-V02 `blockRangeFromForm`: horas / dia inteiro / vários dias / hoje → agora arredondado / horário de verão (usa `zonedDateTimeToDate`) | C-B09, C-B10, C-B18 |
| T-V03 `blocksToOverlays`: recorte na janela do dia, vários dias, índice das linhas; não aumenta a janela | C-B01, C-B18 |
| T-V04 `findOverlappingBookings`, meio-aberto | C-B11, C-B12 |
| T-V05 `mapError`: `professional_blocked` → M1; no aceite → M2; `block_conflicts_changed`; mensagens da remarcação | C-B13, C-R05..R08 |
| T-V06 `AgendaResourceGrid`: linha bloqueada tem `.agenda-slot-blocked` e não tem `AgendaEmptySlotCell`; card por cima | C-B02, C-B03 |
| T-V07 horário vazio: com `canBlock` abre a escolha; sem `canBlock` abre o wizard direto | C-B22 |
| T-V08 `QuickActionsModal`: card "Bloquear agenda" só com `canBlock`; `?block=true` abre o formulário | C-B22 |
| T-V09 Ajustes: botão "Bloqueios" só para o dono; toggle salva com upsert e trata "unsupported" | C-B23 |
| T-V10 `ScheduleSelection` com bloqueios desabilitados | C-B24 |
| T-V11 `AppointmentDetailsActions`: "Remarcar" por status × `canEdit` | C-R01 |
| T-V12 `buildRescheduleWhatsAppMessage` (barbearia/estética, fuso da loja, substituto do nome, sem profissional) | C-R10 |
| T-V13 `AppointmentEditModal`: data/hora/profissional só leitura + link "Remarcar" | C-R14 |

### D.3 Playwright (local; prints em 390 e 1440 guardados em `batch-shots/block/after/`)
| Teste | Critério |
|---|---|
| T-P01 dono: criar → ver faixa → resumo → desbloquear | C-B01..C-B03 |
| T-P02 colaborador com toggle on/off | C-B04, C-B05 |
| T-P03 conflitos: lista e confirmação | C-B11 |
| T-P04 link público: horários somem e dia fica lotado | C-B14, C-B15 |
| T-P05 pontos de entrada e Ajustes | C-B22, C-B23 |
| T-P06 remarcar: sucesso, conflito, bloqueio e link do cliente | C-R02, C-R06, C-R09 |
| T-P07 Editar sem campos de horário | C-R14 |

---

