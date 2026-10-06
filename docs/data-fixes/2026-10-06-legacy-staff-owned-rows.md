# Correção de dados — 2026-10-06 — linhas legadas gravadas na conta do colaborador

**Aprovado pela Rhian em 2026-10-06.** Aplicado em prod (`lcqwrngscsziysyfhpfj`) em 2026-10-06 ~10:19 BST,
depois do deploy do PR #140 (migration `20261006091119_delete_staff_block_open_appointments`).

## Por quê

Duas linhas antigas tinham `user_id` = id do **colaborador** (e não do dono/negócio). Ao excluir o
profissional, `purge_staff_auth_user` apaga o `profiles` do colaborador e a FK (NO ACTION) dessas
linhas abortava tudo com `23503`. Além disso, as linhas ficavam invisíveis para o dono (RLS por
`user_id` do negócio). A correção só move o `user_id` para o negócio dono; nenhum membro, login,
perfil ou linha foi apagado.

Cada correção rodou numa única transação (bloco `DO`) com guardas de pré-condição e checagem de
`ROW_COUNT` exatamente 1 (aborta caso contrário).

## Checagens antes (somente leitura)

- `clients`: sem triggers; único `clients_user_id_phone_unique (user_id, phone)` — o negócio
  MODERNA BARBEARIA não tinha cliente com `+5519981102024` (0).
- Referências ao cliente `4830483e…`: appointments 0, hair_records 0, client_semantic_memory 0,
  product_sales 0, queue_entries 0.
- `appointments`: nenhum UNIQUE além da PK. Triggers: `enforce_agenda_block_on_appointments` e os dois
  `sync_public_booking_*` só disparam em colunas/status que não mudam; `enforce_staff_appointment_edit_scope`
  só age para `current_user = authenticated` (não é o caso); `update_appointments_updated_at` atualiza
  `updated_at` (único efeito colateral).
- Referências ao agendamento `db947361…`: finance_records 0, appointment_reschedules 0, product_sales 0,
  appointment_product_lines 0; `public_booking_id` nulo. Cliente `9618c8ea…` e profissional `51b36953…`
  (boiola) já pertencem ao negócio Barbearia Silva.

## 1) Agendamento do "boiola" (Barbearia Silva)

- Negócio: Barbearia Silva `2310b54d-5963-4dc6-9afb-8f308116a698`
- Profissional: boiola, team_member `51b36953-d39d-4651-8811-67b0e1fefb0e`, login/profile `63d38b7b-a168-4282-a3f5-b98ef703d24f`

```sql
UPDATE public.appointments SET user_id = '2310b54d-5963-4dc6-9afb-8f308116a698'
WHERE id = 'db947361-9aab-4020-81aa-3d317da990ca' AND user_id = '63d38b7b-a168-4282-a3f5-b98ef703d24f';
-- ROW_COUNT = 1
```

| campo | antes | depois |
|---|---|---|
| user_id | `63d38b7b-a168-4282-a3f5-b98ef703d24f` | `2310b54d-5963-4dc6-9afb-8f308116a698` |
| updated_at | `2026-07-12T13:30:48.068417+00:00` | `2026-10-06T09:19:32.866984+00:00` (trigger) |

Demais campos iguais: client_id `9618c8ea-0dd3-4e7f-aeae-b9b9bd52a6cb`, service "Corte Feminino",
appointment_time `2026-04-20T08:00:00+00:00`, status `Confirmed`, price 80, professional_id
`51b36953-d39d-4651-8811-67b0e1fefb0e`, duration 60, origin `agenda`, created_at `2026-04-20T20:19:39.68147+00:00`.

Reversão exata (reintroduz o erro 23503 ao excluir o boiola):

```sql
BEGIN;
UPDATE public.appointments SET user_id = '63d38b7b-a168-4282-a3f5-b98ef703d24f'
WHERE id = 'db947361-9aab-4020-81aa-3d317da990ca' AND user_id = '2310b54d-5963-4dc6-9afb-8f308116a698';
-- conferir: exatamente 1 linha
UPDATE public.appointments SET updated_at = '2026-07-12T13:30:48.068417+00:00'
WHERE id = 'db947361-9aab-4020-81aa-3d317da990ca';
-- obs.: o trigger update_appointments_updated_at sobrescreve updated_at com now();
-- para restaurar o valor antigo é preciso desabilitar o trigger nessa transação.
COMMIT;
```

## 2) Cliente "Caíque xavier" (MODERNA BARBEARIA)

- Negócio: MODERNA BARBEARIA `6d16babf-30a1-4fb1-a533-45f3a7ff46e3`
- Colaborador: CAIQUE XAVIER, team_member `5961c8f7-3c89-4882-a23c-f4ce1abe4a4e` (já excluído em
  2026-09-11 pelo caminho antigo; `staff_user_id` ainda ligado), login/profile `05d4e8a3-d18f-4b29-9d8c-da16dddc6051`
  (mantidos — não apagados).

```sql
UPDATE public.clients SET user_id = '6d16babf-30a1-4fb1-a533-45f3a7ff46e3'
WHERE id = '4830483e-8c23-47fc-bb5a-23717dbad5b5' AND user_id = '05d4e8a3-d18f-4b29-9d8c-da16dddc6051';
-- ROW_COUNT = 1
```

| campo | antes | depois |
|---|---|---|
| user_id | `05d4e8a3-d18f-4b29-9d8c-da16dddc6051` | `6d16babf-30a1-4fb1-a533-45f3a7ff46e3` |

Demais campos iguais: name "Caíque xavier", phone `+5519981102024`, email null, created_at
`2026-07-24T16:03:52.606949+00:00`, total_visits 0, rating 0, is_active true, source `manual`.
`clients` não tem trigger de `updated_at`.

Reversão exata:

```sql
BEGIN;
UPDATE public.clients SET user_id = '05d4e8a3-d18f-4b29-9d8c-da16dddc6051'
WHERE id = '4830483e-8c23-47fc-bb5a-23717dbad5b5' AND user_id = '6d16babf-30a1-4fb1-a533-45f3a7ff46e3';
-- conferir: exatamente 1 linha
COMMIT;
```

## Verificação depois

- Nenhuma linha em tabelas com FK para `profiles` (appointments, clients, finance_records,
  notifications, public_bookings, queue_payments, services, team_members) aponta mais para
  `63d38b7b…` nem para `05d4e8a3…` (todas 0).
- Prova com rollback (bloco `DO` que sempre aborta): o dono da Barbearia Silva tentando excluir o
  boiola agora recebe `P0001 STAFF_HAS_OPEN_APPOINTMENTS open_count=12` (antes: `23503`); membro,
  profile e login intactos. Com RLS, o dono passa a ver o agendamento movido (12 em aberto na lista).
- Leitura depois: membro boiola não excluído, profile/login presentes; nada persistiu da prova.
- Pendente (não feito, decisão da Rhian): o login órfão do Caique (`05d4e8a3…`) continua existindo;
  pode ser removido pelo caminho de reconvite/purge quando quiserem.
