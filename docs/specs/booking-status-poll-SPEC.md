# Tela de sucesso do link público: status ao vivo (get_public_booking_by_id)

Status: PR em rascunho. Migração NÃO aplicada em prod (aguarda OK do Rhian).

## Problema
Depois de enviar um pedido manual, a cliente vê "Pedido enviado". A tela faz polling a cada 5 s
(`pages/PublicBooking.tsx` → `fetchFreshActiveBooking` → `services/publicBooking.ts`
`fetchPublicBookingById` → RPC `get_public_booking_by_id(p_booking_id uuid, p_business_id uuid, p_phone text)`)
para trocar para "Agendamento confirmado" quando o dono aceita.

Em prod a função declara `business_id uuid` no `RETURNS TABLE`, mas faz `SELECT pb.business_id` (coluna `text`).
Toda chamada falha com `42804 structure of query does not match function result type`; o front
engole o erro (logger) e o status nunca muda. Só recarregando a página (outra RPC) a cliente via o aceite.

## Quem chama
- Só `fetchPublicBookingById` (services/publicBooking.ts), usada só por `fetchFreshActiveBooking`
  em pages/PublicBooking.tsx: no polling (enquanto `status === 'pending'`) e no callback do canal
  `postgres_changes` (que com o lockdown do #144 não entrega nada para anon).
- `hooks/usePublicBooking.ts` reexporta a função; nenhum outro chamador.

## O que a função devolve / exposição
- Filtro: `id = p_booking_id AND business_id = p_business_id::text AND phones_match(customer_phone, p_phone)`.
  Precisa do uuid do pedido (aleatório, não adivinhável), do negócio e do telefone da cliente.
- Colunas: id, customer_name, customer_phone, appointment_time, service_ids, status, business_id,
  professional_id, total_price, duration_minutes. Só do próprio pedido; nome/telefone são os que a
  própria cliente digitou. Não lista nem devolve outros pedidos (id inventado, telefone errado ou
  negócio errado → 0 linhas; testado local e em prod).
- Observação (não muda aqui): `phones_match` compara de forma tolerante (formatos/sufixo), mas
  continua exigindo o uuid exato do pedido, então não abre enumeração.

## Mudança
1. Migração `20261011213000_fix_get_public_booking_by_id_type.sql`: `CREATE OR REPLACE` com o corpo
   exato de prod e uma única troca: `pb.business_id` → `pb.business_id::uuid`. Mesma assinatura,
   mesmo retorno, dono, ACL, SECURITY DEFINER e search_path.
   Rollback: `docs/rollbacks/20261011213000_fix_get_public_booking_by_id_type.rollback.sql` (corpo de prod exato).
2. Front: `utils/publicBookingFresh.ts` `mergeFreshPublicBooking(prev, fresh)`. O polling passa a
   juntar a resposta ao pedido atual em vez de substituí-lo. Sem isso, quando a função voltar a
   funcionar, campos que ela não devolve (`is_edit`, `original_appointment_time`, `created_at`,
   `product_lines`) sumiriam a cada 5 s (ex.: "alteração enviada" viraria a cópia de pedido novo).
   Só junta se o id bater e ignora null/undefined.

## Testes
- SQL: `scripts/test-sql-booking-status-poll.sh` (Postgres 17 local; schema com auto-confirm + #144).
  Antes da migração 8 checks falham com o 42804 (TDD); depois 13/13 (pending → confirmed após
  `accept_public_booking_v2`, auto-confirm = confirmed, telefone em outro formato acha, telefone/
  negócio/id errados = nada, retorno/ACL/definer inalterados, anon sem SELECT direto). Migração 2x
  idempotente; demais funções intocadas. `--rollback` volta byte a byte a prod.
- Vitest: `test/utils/publicBookingFresh.test.ts` (5).
- Playwright: `e2e/booking-status-poll.spec.ts` (375 px, barbearia/salão, claro/escuro; prod só
  leitura, escritas stubadas). "Antes": a RPC responde o erro de prod → continua "Pedido enviado"
  mesmo após o aceite. "Depois": a RPC responde o pedido → muda para "Agendamento confirmado"
  sozinho, sem recarregar, e o polling para. Prints em `/workspace/screens/booking-status-poll/`.
- Prova em prod com rollback forçado (DO block + `NO_ERROR_FORCED_ROLLBACK`): antes = erro 42804;
  depois = anon recebe `pending`, dono aceita, anon recebe `confirmed`; telefone/id/negócio errado = 0;
  contagens iguais (pb/ap/nt/cl = 95/388/0/232), md5 de prod inalterado depois da prova.

## Deploy (quando aprovado)
Pré-check: md5 de `pg_get_functiondef` = `55be6c3d5c909db060159c59a162da13`, ACL
`{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
Aplicar via MCP; depois md5 esperado `98f253bcc93a7ff36bf4bf63e70d57da` (o MCP converte o CRLF do
corpo em LF; com psql seria `9c4d508e27ecee75d36c33c9d2df70cb`). Rollback via MCP → `92c572ae72cd3550abb31191130332ab`
(corpo de prod com LF). Renomear migração + rollback para a versão registrada em prod.
