#!/usr/bin/env bash
# Testa 20261011161117_auto_confirm_online_bookings num Postgres local descartável.
#   scripts/test-sql-auto-confirm-online-bookings.sh             # md5=prod → teste FALHA → migration 2x → passa
#                                                               # + concorrência + regressões
#   scripts/test-sql-auto-confirm-online-bookings.sh --rollback  # migration + rollback = estado de prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55504}"
MIG="$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
RB="$ROOT/docs/rollbacks/20261011161117_auto_confirm_online_bookings.rollback.sql"
HARNESS="$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
TEST="$ROOT/supabase/tests/auto_confirm_online_bookings.test.sql"
[ -f "$MIG" ] || { echo "faltou migration $MIG"; exit 1; }
[ -f "$RB" ] || { echo "faltou rollback $RB"; exit 1; }
export PGOPTIONS="-c client_min_messages=warning"

stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Cadeia booking_notifications (mesma do test-sql-booking-notifications.sh + #127).
chain() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" start >/dev/null
  P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
  P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
  P -f "$ROOT/supabase/tests/booking_edit_request.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004101021_client_edit_request.sql"
  P -f "$ROOT/supabase/tests/booking_notifications.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004112214_booking_notifications.sql"
  P -f "$ROOT/supabase/migrations/20261006082806_notifications_type_check_allow_used_types.sql"
}

# md5 de pg_get_functiondef em prod (lcqwrngscsziysyfhpfj, 2026-10-07; reconferido 2026-10-11).
PROD_MD5="accept_public_booking_v2(uuid) 8fdee6dbf99935532130810f5484333f
agenda_any_professional_busy(text,timestamp with time zone,timestamp with time zone) e6fafcfb9afb75e888f2d37119758c29
agenda_interval_blocked(text,uuid,timestamp with time zone,timestamp with time zone) 37fc24c18a3e92c61704a91cf99cf79c
booking_notification_service_label(text,uuid[]) 184f6a66337d03f9b562e33272eb880b
business_timezone(text) 9b39e7aaf40ad4a4d8b06a51d25f3f94
caller_can_act_on_public_booking(public_bookings) 1dbe3b8245879c6dc3702cb7d3cf8ab9
cancel_public_booking_by_client_v2(uuid,text) ea0917ffdd00fd432895dcc01a886015
client_edit_request_slot_conflict(text,timestamp with time zone,integer,uuid,uuid,boolean) 020caea5ec7ae2b0bba58d4f51580687
confirmed_booking_slot_released(text,timestamp with time zone,uuid) 2221e8af4b86ade24cf1aa7a67a9c030
copy_booking_products_to_appointment(uuid,uuid) 20af5f05cdc85dc2f90e95a39cfd0576
create_public_booking(text,text,text,uuid[],uuid,timestamp with time zone,numeric,integer,jsonb) eadd867f375290700ca2830e62c05857
derive_client_booking_status(text,uuid,text,timestamp with time zone,uuid,text) b8e03dc85f515c5e8329d51dc8c788d3
enforce_agenda_block_on_appointments() cd5760bf5b337478773d4fdef58c69ee
enforce_agenda_block_on_public_bookings() 3f1d429f1835299c5a8688a437282fb5
enforce_lead_time_on_public_bookings() 4befcd5bf439cb553cdbe528f586ef30
format_booking_notification_when(timestamp with time zone,text) 867678661eb0716ad0cb5b94d6d7b759
get_auth_company_id() 4e27234398ff92bddb5bfb359afbc677
get_auth_role() dfc2af73cfd84d3336e09f3722d592c3
get_booking_by_id_v2(uuid,text) af2d7b8457ad8b72f9d134afaee1dd26
get_client_bookings_history_v2(text,uuid) d26a0b0b5388383116647e424a752d7b
get_first_available_professional(uuid,timestamp with time zone,integer) 663c03776dcec4f39b7889125929176b
get_public_business_settings_json(uuid) 98bd5e6957196faed146c3edce6625fd
notify_booking_recipients(public_bookings,text,timestamp with time zone,uuid[]) 439b4a1b0772bc52599a5cbe02b2de3f
notify_public_booking_requests() 740795500f3612985bc6a1d3a67c0230
phones_match(text,text) a2cf8bbb8883666bdf405a6e132100f0
public_booking_lead_time_hours(text) 231aeea1ef544978c1922b6fbaa61ac5
public_booking_linked_appointments(uuid) 044f45ccd3e0236765e6a48ead91adc9
public_booking_slot_busy(text,timestamp with time zone,integer,uuid) aead583c4f271038916446139f56a6f8
public_bookings_broadcast() 854ee58f57dc92b6222978a98cfb6cf1
reject_public_booking_v2(uuid) 00b6b07e3c4fd635b24df0aa30445b2e
sync_public_booking_on_appointment_cancel() 3be211584ced2cca5419081d340fe86c
sync_public_booking_on_appointment_outcome() 13161397422b124a8afd92a133c69a9b
update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamp with time zone,timestamp with time zone,text,text,numeric,integer,jsonb) d6519cfcd1cca72e423cfa114777ab58
upsert_booking_notification(text,text,text,text,uuid,text,text) 61ab9734500220fce71c95f962e56142"

prod_equal() {
  local got exp
  exp="$(echo "$PROD_MD5" | sort)"
  got="$(P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace" \
         | awk 'NR==FNR{want[$0]=1; next} {sig=$0; sub(/ [0-9a-f]+$/, "", sig); if (sig in want) print}' <(echo "$PROD_MD5" | sed -E 's/ [0-9a-f]{32}$//') - | sort)"
  if [ "$got" != "$exp" ]; then
    echo "md5 local != prod:"; diff <(echo "$exp") <(echo "$got") || true
    return 1
  fi
}

capture_pre() {
  P -c "CREATE TABLE public.ac_pre_sig AS
    SELECT p.oid::regprocedure::text sig,
           p.prosecdef::text || ' ' || COALESCE(array_to_string(p.proconfig, ','), '-') || ' ' ||
           pg_get_userbyid(p.proowner) || ' ' || COALESCE(p.proacl::text, 'NULL') || ' ' ||
           p.provolatile::text || ' ' || pg_get_function_result(p.oid) attrs
    FROM pg_proc p
    WHERE p.oid IN ('public.create_public_booking(text,text,text,uuid[],uuid,timestamptz,numeric,integer,jsonb)'::regprocedure,
                    'public.notify_booking_recipients(public.public_bookings,text,timestamptz,uuid[])'::regprocedure,
                    'public.cancel_public_booking_by_client_v2(uuid,text)'::regprocedure,
                    'public.get_public_business_settings_json(uuid)'::regprocedure)"
  P -c "INSERT INTO public.profiles (id, role) VALUES ('ac000000-0000-0000-0000-0000000000ff', 'owner');
        INSERT INTO public.business_settings (user_id) VALUES ('ac000000-0000-0000-0000-0000000000ff');
        CREATE TABLE public.ac_pre_json AS SELECT string_agg(k, ',' ORDER BY k) keys
          FROM json_object_keys(public.get_public_business_settings_json('ac000000-0000-0000-0000-0000000000ff')) k;
        DELETE FROM public.business_settings WHERE user_id = 'ac000000-0000-0000-0000-0000000000ff';
        DELETE FROM public.profiles WHERE id = 'ac000000-0000-0000-0000-0000000000ff';"
}

schema_state() {
  P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text,'NULL')
            FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
            UNION ALL
            SELECT 'col ' || table_name || '.' || column_name || ' ' || data_type || ' ' || COALESCE(column_default, '-') || ' ' || is_nullable
            FROM information_schema.columns WHERE table_schema = 'public'
            UNION ALL
            SELECT 'rel ' || relname || ' ' || relkind::text || ' ' || COALESCE(relacl::text, 'NULL') || ' ' || relrowsecurity::text
            FROM pg_class WHERE relnamespace = 'public'::regnamespace
            UNION ALL
            SELECT 'trg ' || tgrelid::regclass::text || ' ' || pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
            UNION ALL
            SELECT 'pol ' || polrelid::regclass::text || ' ' || polname FROM pg_policy
            ORDER BY 1"
}

setup() {
  chain
  P -f "$HARNESS"
  prod_equal
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before="$(schema_state)"
  P -f "$MIG"
  P -f "$MIG"
  P -f "$RB"
  P -f "$RB"
  after="$(schema_state)"
  if [ "$before" != "$after" ]; then
    echo "rollback: estado diferente de prod:"; diff <(echo "$before") <(echo "$after") || true; exit 1
  fi
  prod_equal
  echo "rollback ok: funções (md5 + ACL), colunas, tabelas, triggers e policies = prod; rollback idempotente"
  exit 0
fi

# 1) TDD: antes da migration o teste falha (modo manual passa; automático não existe).
setup
echo "md5 de $(echo "$PROD_MD5" | wc -l) funções = prod"
capture_pre
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -oE "(PASS|FAIL)  .*" "$TMP/before.out" | sed "s/^/  /"
grep -E "auto_confirm_online_bookings: .* checks falharam" "$TMP/before.out" || tail -5 "$TMP/before.out"

# 2) Migration 2x + teste.
setup
capture_pre
P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"
for f in accept_public_booking_v2 reject_public_booking_v2 update_public_booking_by_client_v2 caller_can_act_on_public_booking \
         public_booking_slot_busy get_first_available_professional enforce_agenda_block_on_public_bookings \
         enforce_lead_time_on_public_bookings notify_public_booking_requests copy_booking_products_to_appointment; do
  exp="$(echo "$PROD_MD5" | grep "^$f(" )"
  got="$(P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname = '$f'")"
  [ "$exp" = "$got" ] || { echo "migration alterou $f: $got"; exit 1; }
done
echo "funções fora do escopo intocadas (md5 = prod)"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { cat "$TMP/after.out"; exit 1; }
grep -E 'auto_confirm_online_bookings: .* checks ok' "$TMP/after.out"

# 3) Concorrência: duas sessões anônimas no mesmo horário/profissional com o modo automático.
P -c "UPDATE public.business_settings SET online_booking_requires_approval = false WHERE user_id = 'ac000000-0000-0000-0000-0000000000a0'"
SLOT="$(P -At -c "SELECT date_trunc('day', now()) + interval '20 days 15 hours'")"
CALL="SELECT status FROM public.create_public_booking('ac000000-0000-0000-0000-0000000000a0', 'Corrida', '55119555%s', ARRAY['ac000000-0000-0000-0002-0000000000a0']::uuid[], 'ac000000-0000-0000-0001-0000000000a1'::uuid, '$SLOT'::timestamptz, 40, 30, '[]'::jsonb)"
( "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
    -c "BEGIN; SET LOCAL ROLE anon; $(printf "$CALL" 1); SELECT pg_sleep(2); COMMIT;" > "$TMP/s1.out" 2>&1; echo "exit=$?" >> "$TMP/s1.out" ) &
S1=$!
sleep 0.7
( "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -At -v ON_ERROR_STOP=1 \
    -c "BEGIN; SET LOCAL ROLE anon; $(printf "$CALL" 2); COMMIT;" > "$TMP/s2.out" 2>&1; echo "exit=$?" >> "$TMP/s2.out" ) &
S2=$!
wait $S1 $S2 || true
s1="$(tr '\n' ' ' < "$TMP/s1.out")"; s2="$(tr '\n' ' ' < "$TMP/s2.out")"
echo "concorrência sessão 1: $s1"
echo "concorrência sessão 2: $s2"
cnt="$(P -At -c "SELECT (SELECT count(*) FROM public.public_bookings WHERE business_id='ac000000-0000-0000-0000-0000000000a0' AND appointment_time='$SLOT') || '/' || (SELECT count(*) FROM public.appointments WHERE user_id='ac000000-0000-0000-0000-0000000000a0' AND appointment_time='$SLOT')")"
echo "concorrência: pedidos/appointments no horário = $cnt"
echo "$s1" | grep -q "confirmed" || { echo "sessão 1 deveria confirmar"; exit 1; }
echo "$s2" | grep -q "slot_unavailable" || { echo "sessão 2 deveria receber slot_unavailable"; exit 1; }
[ "$cnt" = "1/1" ] || { echo "concorrência gerou duplicidade"; exit 1; }
echo "concorrência ok: 1 sucesso, 1 slot_unavailable, nunca dois appointments"

# 4) Regressão: testes existentes da cadeia com a migration aplicada (sem o harness novo).
for t in booking_notifications; do
  chain
  P -f "$MIG"
  P -f "$ROOT/supabase/tests/$t.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão $t FALHOU"; tail -20 "$TMP/reg.out"; exit 1; }
  echo "regressão $t.test.sql ok com a migration"
done
# Cadeia de bloqueios igual a prod (#113/#117, create_public_booking real) + migration:
# no modo manual (padrão) nada muda para os testes de bloqueio e de antecedência.
blocks_chain() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" start >/dev/null
  P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
  P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
  P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
  P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
  P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
  if [ "${1:-}" = queue ]; then
    P -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.harness.sql"
    P -f "$ROOT/supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql"
  fi
  P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
  P -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
}
for t in agenda_blocks agenda_blocks_followup; do
  blocks_chain queue
  P -f "$MIG"
  P -f "$ROOT/supabase/tests/$t.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão $t FALHOU"; tail -20 "$TMP/reg.out"; exit 1; }
  echo "regressão $t.test.sql ok com a migration"
done
blocks_chain
P -f "$ROOT/supabase/tests/booking_lead_time.harness.sql"
P -f "$ROOT/supabase/migrations/20261003152759_public_booking_lead_time.sql"
P -f "$MIG"
P -f "$ROOT/supabase/tests/booking_lead_time.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão booking_lead_time FALHOU"; tail -20 "$TMP/reg.out"; exit 1; }
echo "regressão booking_lead_time.test.sql ok com a migration"

echo "auto-confirm: md5=prod; TDD (falha antes, passa depois); idempotente; concorrência e regressões ok"
