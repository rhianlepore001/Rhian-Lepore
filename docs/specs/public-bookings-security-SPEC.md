# SPEC — public_bookings: anon não lista nem insere direto

Status: pronto para revisão (migração NÃO aplicada em prod, PR em rascunho)
Migração: `supabase/migrations/20261011202904_public_bookings_anon_lockdown.sql`
Rollback: `docs/rollbacks/20261011202904_public_bookings_anon_lockdown.rollback.sql`
Testes: `scripts/test-sql-public-bookings-security.sh` (+ `--rollback`), `e2e/public-bookings-security.spec.ts`

## 1. Problema (prod, lido em 2026-10-11, só SELECT)

`public.public_bookings` tem RLS ligado e 5 policies. Duas valem para visitantes (anon):

| policy | comando | papéis | regra |
|---|---|---|---|
| `public_bookings_select_anon_fresh` | SELECT | anon | `status = 'pending' AND created_at IS NOT NULL AND created_at > now() - '00:02:00'` |
| `public_bookings_insert_anon` | INSERT | anon, authenticated | `business_id` não vazio `AND business_exists(business_id) AND COALESCE(status,'pending') = 'pending'` |

ACL da tabela: `anon=arwdDxtm` (todos os privilégios).

1. **Leitura:** com a chave pública do site, qualquer pessoa faz `GET /rest/v1/public_bookings?select=*` e recebe
   os pedidos pendentes dos últimos ~2 min de **todos** os negócios (nome, telefone, horário, serviços, preço).
   O mesmo vale para o realtime (`postgres_changes` de INSERT na tabela).
2. **Escrita:** `POST /rest/v1/public_bookings` cria um pedido `pending` sem passar por `create_public_booking`:
   sem checar horário ocupado (`public_booking_slot_busy`), profissional do negócio, serviços, preço ou modo
   automático. Só os triggers de bloqueio de agenda e de antecedência rodam. A policy também vale para qualquer
   usuário logado, inclusive de outro negócio.

### Por que a policy de 2 minutos existe

Migração de prod `20260918161240 p0_fix_public_bookings_insert_returning`: o front antigo fazia
`.insert().select()` (INSERT … RETURNING), e o RETURNING precisa de uma policy de SELECT. A própria migração já
dizia que era uma mitigação e criou a RPC `create_public_booking` (SECURITY DEFINER), que devolve a linha criada.

## 2. Mapeamento: quem usa o quê

**Visitante / cliente do link público (anon):** só RPCs SECURITY DEFINER, todas donas de `postgres`, que não
passam por RLS:

| tela | chamada |
|---|---|
| Link público: criar pedido (manual e auto) | `create_public_booking` (devolve a linha: é o "ler de volta") |
| Link público: pedido ativo pelo telefone | `get_active_booking_by_phone` |
| Link público: editar pedido | `get_booking_by_id_v2`, `update_public_booking_by_client_v2` |
| Tela de sucesso: polling a cada 5 s | `get_public_booking_by_id` (ver risco R1) |
| Minha Área | `get_client_bookings_history_v2`, `get_client_booking_cancellations`, `cancel_public_booking_by_client_v2` |
| Minha Área / tela de sucesso: status ao vivo | broadcast privado `booking:<id>` (trigger `public_bookings_broadcast`, policy de `realtime.messages`), não depende da tabela |

Acessos diretos à tabela no front:

- `services/publicBooking.ts` `submitPublicBooking`: `insert()` **sem** `.select()`, usado só se a RPC
  `create_public_booking` não existir (`isMissingRpcError`). Em prod a RPC existe, então esse caminho não roda.
- `pages/PublicBooking.tsx`: canal `postgres_changes` (UPDATE, `id=eq.<id>`) na tela de sucesso. Com a policy
  atual ele só receberia eventos de linha ainda `pending` com menos de 2 min. Quando o dono aceita, o pedido vira
  `confirmed`, então o canal já não recebia o aceite. Quem atualiza a tela é o polling.

**Dono / colaborador (authenticated):** policies `Owner can manage public_bookings`, `Public bookings: company read`
e `Public bookings: company update` (Agenda, alertas, realtime da agenda, remarcar, onboarding) e as RPCs
`list_company_pending_public_bookings`, `accept_public_booking_v2`, `reject_public_booking_v2`. **Nada disso muda.**

**Notificações:** trigger `notify_public_booking_requests` e `notify_booking_recipients` (SECURITY DEFINER).
**WhatsApp:** links `wa.me` montados no front a partir de dados que o dono já lê pelas policies authenticated.
Nada muda.

Tabelas ligadas: `public_booking_products` não existe (os produtos ficam em `public_bookings.product_lines`).
`public_booking_auto_confirmations` já está fechada (RLS sem policies, só `postgres`/`service_role`).

## 3. Mudança

1. `DROP POLICY public_bookings_select_anon_fresh` e `DROP POLICY public_bookings_insert_anon`.
2. `REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public_bookings FROM anon`.
   O SELECT continua concedido: sem policy, anon recebe 0 linhas, e o canal realtime antigo não passa a dar erro
   de permissão.

Nenhuma função, trigger, coluna ou dado muda. Nenhuma mudança no front.

## 4. Critérios de aceite

- [S1] anon `SELECT` em `public_bookings` devolve 0 linhas (inclusive pedido recém-criado).
- [S2] anon `INSERT`/`UPDATE`/`DELETE` direto: negado. Logado de outro negócio: INSERT negado.
- [F1] Link público, modo manual: `create_public_booking` cria `pending`, notifica dono e profissional, a tela
  mostra "Pedido enviado".
- [F2] Link público, modo automático: `create_public_booking` cria `confirmed` + appointment + notificações, a tela
  mostra "Agendamento confirmado". Mesmo horário pela RPC continua recusado (`slot_unavailable`).
- [F3] Cancelamento pelo cliente em até 15 min do auto-confirmado continua funcionando.
- [F4] Minha Área: histórico, cancelamentos e edição continuam pelas RPCs.
- [F5] Dono/colaborador: veem e atualizam os pedidos do próprio negócio, aceitam e recusam, a lista de pendentes
  funciona, e não veem outro negócio.
- [F6] Rollback devolve exatamente as policies e a ACL de prod.

## 5. Riscos e decisões

- **R1 (já existe em prod, fora do escopo):** `get_public_booking_by_id` falha sempre
  (`structure of query does not match function result type`: `business_id` é text, a função declara uuid). O
  polling de 5 s da tela de sucesso registra o erro e não atualiza o status. Esta correção não piora isso. Correção
  sugerida num PR separado: `pb.business_id::uuid` na função.
- **R2:** um cliente com o site aberto num deploy muito antigo (antes da RPC) cairia no `insert()` direto e
  receberia erro. Hoje a RPC existe, então esse caminho não roda.
- **R3:** se alguém precisar de INSERT direto de anon no futuro, o caminho é uma RPC SECURITY DEFINER e não uma
  policy.
