# SPEC — Confirmação automática de agendamentos online (toggle do dono)

> **Fase 1: mapa, critérios e telas “antes”.** Nada foi implementado nem aplicado.
> Mapa feito em 2026-10-07 a partir de `main` (`ee5502c9`) e de prod (`lcqwrngscsziysyfhpfj`, só leitura).

## 0. Pedido

Rhian: *“Precisamos de um botão nas configurações do gestor que ele consiga ativar e desativar a opção de
agendamentos online serem marcados sem precisar aceitar. Para quem quer mais controle deixa ativado, para quem
não quer deixa desativado.”*

Leitura: toggle **só do dono**, “**Aprovar agendamentos online manualmente**”.

- **Ligado** (padrão = hoje): o link público cria um **pedido** (`public_bookings.status = 'pending'`). O dono, ou o
  profissional do pedido (PR-7), aceita ou recusa na Agenda.
- **Desligado:** o agendamento online entra **confirmado** direto na Agenda (`appointments.status = 'Confirmed'`).
  Não há passo de aceite.
- Todo negócio existente continua **ligado**: nada muda para ninguém até o dono desligar.

## 1. Fluxo atual (prod)

```
Cliente (anon) — pages/PublicBooking.tsx
  services/publicBooking.submitPublicBooking
    └─ RPC create_public_booking (SECURITY DEFINER, anon+authenticated)
         valida nome/telefone/serviços/horário > now; profissional ativo do negócio
         pg_advisory_xact_lock(hashtextextended(business_id,0))
         profissional NULL → get_first_available_professional
         public_booking_slot_busy(...)  → appointments (≠Cancelled/NoShow) + public_bookings pending/confirmed
                                          (menos confirmed “liberado”) + agenda_interval_blocked
         INSERT public_bookings (status 'pending')
           BEFORE: enforce_agenda_block_on_public_bookings  (bloqueio → slot_unavailable/agenda_blocked)
           BEFORE: enforce_lead_time_on_public_bookings     (#121 → lead_time_violation)
           AFTER : notify_public_booking_requests_trg → notify_booking_recipients(kind 'new')
                     → upsert_booking_notification (dono + login do profissional), type 'new', “Novo pedido”
           AFTER : public_bookings_broadcast_trg → realtime.send topic booking:<id> (PR-3)
    (fallback se a RPC não existir: INSERT direto 'pending' — permitido pela policy public_bookings_insert_anon)
  tela "Solicitação enviada" (getPublicBookingSuccessCopy) → em seguida redireciona para a Minha Área
  (shouldLandOnClientArea) — card "Aguardando", botão "Pedir confirmação" (WhatsApp)
  status do cliente: postgres_changes + polling 5 s enquanto pending; Minha Área com broadcast (PR-3)

Dono/profissional — pages/Agenda.tsx
  fetchPendingPublicBookings → RPC list_company_pending_public_bookings (status 'pending')
  usePendingPublicBookingsLive (postgres_changes em public_bookings → refetch)
  AgendaPublicBookings: card “N solicitação online” com Aceitar / Recusar
  Aceitar → RPC accept_public_booking_v2 (auth obrigatório)
      caller_can_act_on_public_booking: dono | profissional do pedido | qualquer colaborador se edit_scope='all' (PR-7)
      exige status 'pending'; acha/cria clients (phones_match) + foto de public_clients
      nomes dos serviços; profissional NULL → primeiro ativo (dono primeiro)
      se is_edit (PR-6): client_edit_request_slot_conflict e UPDATE do appointment ligado
      senão: INSERT appointments (status 'Confirmed', public_booking_id)
             (sem nova checagem de conflito: o pending já segurava o horário; o trigger de bloqueio vale)
      UPDATE public_bookings → 'confirmed' (limpa original_*)
      copy_booking_products_to_appointment (exige auth.uid(); erro engolido)
    → diálogo "Enviar no WhatsApp" (getOwnerAcceptWhatsAppText)
  Recusar → reject_public_booking_v2
  Fallback legado (RPC ausente): cria client/appointment pelo front + confirmPublicBooking (UPDATE direto)

Depois de confirmado
  sync_public_booking_on_appointment_outcome / _cancel (triggers em appointments) mantêm public_bookings em
  confirmed/completed/no_show/cancelled; derive_client_booking_status para a Minha Área
  Cliente cancela: cancel_public_booking_by_client_v2 — pending: até o horário; confirmed: respeita
  client_cancel_cutoff_hours (PR-5)
  Cliente altera: update_public_booking_by_client_v2 — pending: substitui direto; confirmed: vira pedido
  is_edit=true/pending (PR-6), exceto troca só de serviço com service_only_edit_skip_acceptance=true
```

Fila (`settle_queue_ticket`, origin `queue`) não passa por `public_bookings`: fora do escopo. Em prod não há linhas
com origin queue.

### 1.1 Onde mora a configuração do negócio

- **Tabela:** `public.business_settings`. Tem uma linha por negócio (`user_id` text, UNIQUE).
  - Há só **28 linhas para 80 profiles**. Todo código lê com `COALESCE(<col>, <padrão>)` quando a linha falta.
- **RLS:**
  - "Owner can manage" (ALL, `auth.uid() = user_id`).
  - "Settings: company read" (SELECT da empresa; a equipe lê).
  - "Settings: owner update" (UPDATE só com `get_auth_role()='owner'`).
  - Escrita pelo front: `updateBusinessSettings` faz `upsert` (onConflict `user_id`).
- **Precedente idêntico:** `service_only_edit_skip_acceptance boolean NOT NULL DEFAULT false` (PR-6).
  - Fica no banco, decidido dentro de `update_public_booking_by_client_v2` e **não** vai no JSON público.
  - Na UI é um `SettingsRow` + `SettingsSwitch` em `pages/settings/PublicBookingSettings.tsx` (seção “Automação e
    Lembretes”), salvo pelo botão “Salvar Alterações”.
- **JSON público:** `get_public_business_settings_json` não expõe nada de aceite hoje.

### 1.2 Tudo que assume “o online começa pending”

| Onde | O quê |
|---|---|
| `create_public_booking` | INSERT fixo `'pending'` |
| policy `public_bookings_insert_anon` | só aceita insert `pending` (fallback do front) |
| `notify_public_booking_requests` | no INSERT só notifica se `pending`; texto “Novo pedido” |
| `accept_public_booking_v2` / `reject_public_booking_v2` | exigem `pending` |
| `list_company_pending_public_bookings`, `usePendingPublicBookingsLive`, `mergePendingPublicBooking`, `AgendaPublicBookings` | card de solicitações |
| `update_public_booking_by_client_v2` | ramo “pending: substitui direto” |
| `cancel_public_booking_by_client_v2` | pending cancela até o horário; confirmed respeita o prazo |
| `sync_public_booking_on_appointment_outcome` | ignora `pending` |
| `PublicBooking.tsx` | polling 5 s só enquanto pending; botão do contato “**Confirmar agendamento**” (mesmo sendo pedido); WhatsApp “Pode confirmar, por favor?” sempre |
| `utils/publicBookingCopy.getPublicBookingSuccessCopy` | “Solicitação enviada / AGUARDANDO CONFIRMAÇÃO DO SALÃO”; já tem ramo `confirmed` (“AGENDAMENTO CONFIRMADO”) |
| `ClientArea.tsx` / `ClientBookingCard.tsx` | aviso “A barbearia ainda não confirmou”, badge Aguardando, botão “Pedir confirmação” só p/ pending; editar livre só p/ pending |
| `Dashboard.tsx`, `AlertsContext`, `SetupCopilot` | contagens de pendentes |
| e2e `overhaul-pr1/3/4/5/6/7` | cenários baseados em pending |

## 2. Desenho proposto

### 2.1 Configuração (migration aditiva)

```sql
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS online_booking_requires_approval boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN ... IS 'true = pedido online precisa de aceite (padrão/hoje); false = confirma automaticamente.';
```

- Com `DEFAULT true` + `NOT NULL`, as 28 linhas existentes ficam `true`. As RPCs leem
  `COALESCE(bs.online_booking_requires_approval, true)`, então negócio **sem linha** também fica manual.
- A RLS existente já garante que só o dono grava. Não precisa de policy nova.
- `get_public_business_settings_json` ganha a chave `online_booking_auto_confirm` (`NOT requires_approval`).
  - Não é sensível e só serve para **copy antes de enviar**.
  - A decisão nunca vem do cliente: o RPC ignora qualquer parâmetro e lê o banco.

### 2.2 Decisão no servidor (dentro de `create_public_booking`)

Mesma assinatura, `CREATE OR REPLACE` a partir do `pg_get_functiondef` de prod. Mantém SECURITY DEFINER, search_path,
dono e ACL (anon+authenticated).

1. Tudo como hoje até o `public_booking_slot_busy`. O advisory lock do negócio já está segurado, então a checagem e a
   criação ficam na mesma transação e são **atômicas**: dois clientes no mesmo horário → o segundo recebe
   `slot_unavailable`.
2. `v_auto := NOT COALESCE((SELECT online_booking_requires_approval FROM business_settings WHERE user_id = v_business_id), true)`.
3. **Manual:** INSERT `'pending'`, exatamente como hoje (byte a byte no ramo manual).
4. **Automático:** INSERT `'confirmed'`.
   - Os triggers de lead time (#121) e de bloqueio continuam valendo porque disparam para `confirmed`.
   - O broadcast de realtime dispara com `confirmed`.
   - Em seguida, `PERFORM public.materialize_public_booking_appointment(v_booking)` na mesma transação. Se falhar,
     **tudo** volta: nada de pedido confirmado sem agendamento.
5. Retorna a linha (`status` = `pending` ou `confirmed`). O front decide a copy pelo `status` devolvido.

### 2.3 Criação do agendamento reutilizando o caminho do aceite

- **Nova função interna** `public.materialize_public_booking_appointment(p_booking public_bookings) RETURNS uuid`:
  - SECURITY DEFINER, `REVOKE ALL FROM PUBLIC, anon, authenticated` (só chamada por outras funções).
  - É o trecho **não-edição** de `accept_public_booking_v2` extraído sem mudança:
    - client por `phones_match` / criação com foto de `public_clients`;
    - nomes dos serviços;
    - profissional fallback;
    - `INSERT appointments (status 'Confirmed', public_booking_id)`;
    - cópia dos produtos.
- **Atenção:** `copy_booking_products_to_appointment` exige `auth.uid()`. No contexto anon ela falha e o erro é
  engolido, ou seja, os **produtos não seriam copiados**. A função interna precisa da lógica de cópia sem a checagem
  de auth (escopo pelo `business_id` do pedido), também interna.
- **Opção A (recomendada):** `accept_public_booking_v2` passa a chamar a mesma função no ramo não-edição. Os testes SQL
  existentes (booking-*) provam que o comportamento do aceite não mudou, e as duas lógicas não ficam divergentes.
- **Opção B (menor raio):** aceite intocado e a função interna fica como cópia. Risco de divergência futura.
- Com `appointments.public_booking_id` preenchido, os triggers `sync_public_booking_on_appointment_*` funcionam como
  hoje. No INSERT o pedido já está `confirmed` e o status do appointment é `Confirmed`, então nada muda.

### 2.4 Notificações (sem alargar o CHECK)

O CHECK atual é `info, warning, success, danger, new, edit, commission_reminder`.

- No ramo automático, `create_public_booking` chama `notify_booking_recipients(v_booking, 'new', NULL, ARRAY[professional_id])`.
  - Dentro de `BEGIN … EXCEPTION WHEN OTHERS THEN RAISE WARNING`, igual ao trigger: falha de notificação nunca derruba
    o agendamento.
  - O trigger não notifica porque o INSERT não é `pending`.
- `notify_booking_recipients` passa a escolher o texto pelo status do pedido, **sem mudar a assinatura**:
  - `p_kind='new' AND status='confirmed'`: título “**Novo agendamento**”, mensagem
    “Novo agendamento online: {cliente}, {serviço}, {quando} — já está na agenda.”
  - `p_kind='new' AND status='pending'`: “Novo pedido” (hoje).
  - `type` continua `'new'`, `event_key` `new:<id>`, link `/agenda` (ou `/agenda?date=…&appointment=<id>`, reaproveitando
    o deep link do PR #140).
- Destinatários: dono + login do profissional do agendamento (como hoje).

### 2.5 Copy para o cliente por estado

A copy de tipo de negócio usa `getBusinessRemainderNoun` (barbearia / salão / estúdio / negócio). Não pode ter “salão”
fixo.

| Momento | Manual (pending) | Automático (confirmed) |
|---|---|---|
| Botão no contato | “Enviar pedido” | “Confirmar agendamento” |
| Título pós-envio | “Pedido enviado” | “Agendamento confirmado” |
| Subtítulo | “Aguardando a confirmação {da barbearia}. Acompanhe na Minha Área.” | “Seu horário está garantido. Te esperamos!” |
| CTA WhatsApp | “Pedir confirmação no WhatsApp” — texto “…Pode confirmar, por favor?” | “Falar no WhatsApp” — texto “Fiz um agendamento online … para {data} às {hora}.” (sem pedir confirmação) |
| Minha Área | badge Aguardando + aviso “{A barbearia} ainda não confirmou…” + “Pedir confirmação” | badge Confirmado, sem aviso, sem “Pedir confirmação” |

### 2.6 Permissões da equipe

- O toggle é **só do dono** (tela já protegida por OwnerRouteGuard e RLS “Settings: owner update”).
- Com aceite manual, a regra de quem aceita é a do PR-7: `caller_can_act_on_public_booking`.
- Com o automático, ninguém aceita. O profissional recebe a notificação “Novo agendamento” e vê o atendimento na
  própria coluna.

### 2.7 Quando o dono troca o toggle

- **Manual → automático:** pedidos `pending` existentes **continuam pendentes** (o dono aceita/recusa como antes).
  - Não há auto-aceite em massa: conflitos e permissões precisam de decisão humana.
  - A UI mostra o aviso “Pedidos que já chegaram continuam esperando sua resposta”.
  - Em prod hoje só existem 7 pending, todos de negócios DEMO e com horário já passado.
- **Automático → manual:** só afeta os próximos agendamentos. Os confirmados continuam confirmados.

## 3. Critérios de aceite

**Funcionais**

1. A coluna `online_booking_requires_approval` existe, é NOT NULL DEFAULT true, e as 28 linhas atuais = true.
2. Negócio sem linha em `business_settings` → comportamento manual (pedido pending).
3. Toggle ligado: `create_public_booking` cria `pending`, nenhum appointment, notificação “Novo pedido”, card na Agenda.
   É idêntico a hoje.
4. Toggle desligado:
   - `create_public_booking` cria `public_bookings.status='confirmed'` **e** 1 appointment `Confirmed` ligado
     (`public_booking_id`) na mesma transação;
   - o client é achado ou criado como no aceite;
   - os produtos são copiados;
   - nenhum card de solicitação aparece.
5. Toggle desligado, profissional “qualquer” → mesmo profissional que o aceite escolheria
   (`get_first_available_professional`).
6. Desligado: dois envios concorrentes no mesmo horário/profissional → 1 sucesso e 1 `slot_unavailable`. Nunca dois
   appointments.
7. Desligado: horário bloqueado → `slot_unavailable`/`agenda_blocked`, nada gravado. Antecedência violada →
   `lead_time_violation`, nada gravado.
8. Desligado: falha ao criar o appointment → rollback total (nem pedido confirmado sem appointment).
9. Desligado: notificação “Novo agendamento” (type `new`) para o dono e o login do profissional. Falha de notificação
   não impede o agendamento.
10. Pedidos `pending` anteriores à troca continuam aceitáveis/recusáveis depois de desligar.
11. A decisão é sempre lida no banco. Nenhum parâmetro do cliente muda o resultado (teste com payload adulterado).

**Segurança / RLS**

12. Só o dono grava o toggle (staff recebe erro de RLS; anon não tem acesso).
13. `materialize_public_booking_appointment` (e a cópia interna de produtos) não são executáveis por anon/authenticated
    (`has_function_privilege = false`).
14. `create_public_booking` mantém SECURITY DEFINER, `search_path=public`, dono postgres e ACL idênticos a prod.
15. O JSON público só ganha o booleano `online_booking_auto_confirm` (nenhum outro campo de settings novo).

**Regressão**

16. PR-3: o cliente recebe o status por broadcast/postgres_changes (INSERT confirmed e mudanças posteriores).
    Polling só enquanto pending.
17. PR-5:
    - confirmed obedece `client_cancel_cutoff_hours`;
    - pending cancela até o horário;
    - cancelar um auto-confirmado cancela o appointment ligado.
18. PR-6:
    - a alteração de um auto-confirmado vira pedido de alteração (pending/is_edit), salvo
      `service_only_edit_skip_acceptance` (ver Q1);
    - aceitar/recusar a alteração funciona.
19. PR-7: com aceite manual, `caller_can_act_on_public_booking` sem mudança (dono, profissional do pedido, ou todos com
    scope `all`).
20. #121: antecedência mínima vale nos dois modos. Dono/equipe pela Agenda continuam isentos.
21. Bloqueios (#115/#117) valem nos dois modos. Conflitos de `create_agenda_block` listam os auto-confirmados como
    appointments.
22. `accept_public_booking_v2`, `reject_public_booking_v2`, `get_available_slots*` e `public_booking_slot_busy`: todos os
    `test-sql-*.sh` atuais passam (exceto o já conhecido `agenda-blocks-queue`).

**UI**

23. O toggle fica em Configurações › Agendamento › “Reservas Online”, logo abaixo de “Ativar Reservas Online”.
    - Usa `SettingsRow` + `SettingsSwitch`, label “Aprovar agendamentos online manualmente”, texto de ajuda com o efeito
      de cada estado.
    - É salvo pelo “Salvar Alterações”. Funciona em light/dark, barber/beauty e 375 px.
24. A copy do cliente segue a tabela 2.5 nos dois modos. Nenhum “salão” fixo (barbearia/salão/estúdio/negócio
    dinâmico).
25. Mobile 375 px: tela pós-envio, Minha Área e toggle sem corte/rolagem horizontal. Botões ≥ 44 px.

## 4. Plano de testes

- **SQL** (Postgres 17 descartável, padrão `scripts/test-sql-*.sh`, md5 vs prod antes/depois):
  - `test-sql-auto-confirm-online-bookings.sh` + `supabase/tests/auto_confirm_online_bookings.{harness,test}.sql`;
  - TDD: o teste falha antes da migration e passa depois, aplicada 2x (idempotente);
  - cobre os critérios 1–15, 17–21;
  - concorrência (6) com duas sessões `psql` e `pg_sleep`/advisory;
  - modo `--rollback`;
  - re-rodar `booking-*`, `agenda-blocks*`, `staff-edit-scope`, `notifications-type-check`.
- **Vitest:**
  - `getPublicBookingSuccessCopy` / WhatsApp por status;
  - copy dinâmica por tipo de negócio;
  - `submitPublicBooking` devolvendo confirmed;
  - toggle em `PublicBookingSettings` (render, salvar, aviso dos pendentes);
  - `ClientBookingCard` confirmed sem “Pedir confirmação”.
- **Playwright** (mocks, prod só leitura com o guard, padrão `e2e/auto-confirm-before.shots.spec.ts`):
  - fluxo completo com `create_public_booking` stubado devolvendo `confirmed` e `pending`;
  - toggle;
  - telas “depois” em `/workspace/screens/auto-confirm/after/`.
- **Prova em prod com rollback** antes do apply (bloco `DO` + `RAISE` final):
  - negócio de teste com toggle desligado dentro da transação;
  - criar pedido → appointment confirmado;
  - conferir que nada persistiu.

## 5. Migration e rollback

- **Arquivo:** `supabase/migrations/<versão>_auto_confirm_online_bookings.sql` (aditivo). Contém:
  - ADD COLUMN;
  - `CREATE OR REPLACE` de `create_public_booking`, `notify_booking_recipients` e `get_public_business_settings_json`
    (sempre a partir do `pg_get_functiondef` de prod do dia);
  - nova `materialize_public_booking_appointment` (+ cópia interna de produtos);
  - opcionalmente `accept_public_booking_v2` (opção A).
  - Sem GRANT novo para anon/authenticated. `REVOKE` explícito das funções internas.
- **Rollback:** `docs/rollbacks/<versão>_auto_confirm_online_bookings.rollback.sql`. Faz:
  - restaura as funções exatas de prod;
  - `DROP FUNCTION` das internas;
  - **não** dropa a coluna por padrão (dado do dono); `DROP COLUMN` comentado e opcional.
  - Agendamentos auto-confirmados ficam: são appointments normais.
- **Ordem:** pré-checks de md5 → prova com rollback → `apply_migration` → md5/ACL → renomear para a versão de prod →
  PR → CI → merge → Vercel.
  - O front com copy nova precisa tolerar a coluna/JSON ausente (padrão manual), então pode ir antes ou depois da
    migration.

## 6. Riscos

1. **Produtos não copiados no auto-confirm** se reutilizar `copy_booking_products_to_appointment` (exige auth): tratado
   em 2.3.
2. **Prazo de cancelamento imediato:** um auto-confirmado obedece `client_cancel_cutoff_hours` desde o primeiro
   segundo. Um cliente que marca para daqui a 3 h com prazo de 24 h não consegue cancelar online (hoje, como pedido,
   conseguiria). Ver Q4.
3. **Fallback legado do front** (INSERT direto quando a RPC “não existe”) sempre cria `pending`. Isso é seguro (cai no
   manual), mas o fallback deve continuar só para RPC ausente.
4. **Policies existentes de `public_bookings`, fora do escopo mas relevantes:**
   - `public_bookings_insert_anon` permite INSERT direto `pending` por anon **sem** `public_booking_slot_busy`. Só os
     triggers de bloqueio/antecedência protegem.
   - `public_bookings_select_anon_fresh` deixa anon **listar todos os pedidos pending dos últimos 2 min de qualquer
     negócio**, com nome e telefone.
   - Recomendo revisar à parte. Com o auto-confirm, linhas confirmed não aparecem nessa policy.
5. **Notificação no ramo automático** chamada fora do trigger: precisa do mesmo `EXCEPTION` para não derrubar o
   agendamento.
6. **Advisory lock:** o automático não adiciona lock novo; reaproveita o já segurado. Os triggers de appointment
   também pegam o mesmo lock (reentrante na transação).

## 7. Perguntas para a Rhian

- **Q1.** Com aprovação manual **desligada**, os **pedidos de alteração** do cliente (Minha Área, PR-6) também devem ser
  aplicados automaticamente (se o horário estiver livre)? Proposta v1: **não**, continuam pedindo aceite (como hoje),
  e o toggle vale só para agendamentos novos.
- **Q2.** O toggle é **por negócio** (proposta) ou **por profissional** (cada um decide se aceita manualmente)? Por
  profissional exige coluna em `team_members` e UI na Equipe.
- **Q3.** Ao desligar a aprovação, o que fazer com os **pedidos já pendentes**? Proposta: continuam pendentes até o dono
  responder. Alternativa: confirmar automaticamente os que ainda cabem.
- **Q4.** Auto-confirmados devem ter uma **janela de arrependimento** (por exemplo, o cliente cancela livre nos
  primeiros X minutos, ou até o horário enquanto faltar menos que o prazo)? Ou vale o prazo normal desde o início?
- **Q5.** Nome do toggle: “Aprovar agendamentos online manualmente” (ligado = mais controle, como a Rhian descreveu) ou
  invertido, “Confirmar agendamentos online automaticamente”?
- **Q6.** Notificar o profissional também quando é automático (proposta: sim, “Novo agendamento”)?
- **Q7.** Quer aproveitar e trocar o botão “Confirmar agendamento” por “Enviar pedido” quando a aprovação for manual (o
  texto atual promete confirmação que não existe — problema antigo CAM-013)?

## 8. Bugs e observações encontrados no mapa (não corrigidos)

- **B1. “Salão” fixo:** a copy pós-envio diz “AGUARDANDO CONFIRMAÇÃO DO SALÃO” mesmo em barbearia
  (`getPublicBookingSuccessCopy`, ramos pending/edit). Ver tela `public-booking-sent-*`.
- **B2. Botão “Confirmar agendamento” para um pedido:** o botão final diz isso, mas o resultado é só um pedido
  (CAM-013).
- **B3. Tela pós-envio só pisca:** no primeiro agendamento sem `?agendar=1`, `establishClientSession` loga o cliente e
  o efeito `shouldLandOnClientArea` redireciona na hora para a Minha Área. A tela “Solicitação enviada” praticamente
  não é vista; a Minha Área mostra “Aguardando”. Pode ser intencional; vale confirmar.
- **B4. WhatsApp “Pode confirmar, por favor?”** é usado sempre, mesmo quando o status já é `confirmed`.
- **B5. Sem nova checagem de conflito no aceite** de pedido novo: depende do pending segurar o horário. Pedidos criados
  pelo INSERT direto da policy anon pulam `public_booking_slot_busy`.
- **B6. As duas policies anon de `public_bookings`** citadas no risco 4 (exposição de pedidos frescos de qualquer
  negócio).
- `public_booking_enabled` existe em `profiles` e em `business_settings`. A tela grava em `profiles`.

## 9. Telas “antes”

Em `/workspace/screens/auto-confirm/before/`. Geradas por `e2e/auto-confirm-before.shots.spec.ts`: prod só leitura,
`create_public_booking` stubado, card da Agenda com pedido **mock**.

- `settings-agendamento-{desktop-light,desktop-dark,mobile-375-dark}.png`: onde o toggle vai morar (“Reservas Online”).
- `public-booking-contact-cta-*.png`: botão “Confirmar agendamento” no passo de contato.
- `public-booking-sent-{mobile-375-dark,mobile-375-light,desktop-light}.png`: “Solicitação enviada” (com `?agendar=1`).
- `minha-area-pending-*.png`: para onde o cliente cai de fato (card Aguardando).
- `agenda-pending-request{,-card}-{desktop-light,desktop-dark,mobile-375-dark}.png`: card “1 solicitação online”.
