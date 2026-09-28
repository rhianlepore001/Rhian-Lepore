#!/usr/bin/env bash
# Testa a migration 20260925170000_booking_cancel_sync num Postgres local e
# descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-booking-cancel-sync.sh            # harness + prod + migrations 5b e N3 + testes
#   scripts/test-sql-booking-cancel-sync.sh --main     # prod atual (5b aplicada, sem N3): deve FALHAR só nos checks N3
#   scripts/test-sql-booking-cancel-sync.sh --pre-5b   # prod antes do 5b: deve FALHAR
#   scripts/test-sql-booking-cancel-sync.sh --rollback # migrations + rollbacks (N3, depois 5b): volta às definições de prod (md5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55459}"
MIG="$ROOT/supabase/migrations/20260925170000_booking_cancel_sync.sql"
RB="$ROOT/docs/rollbacks/20260925170000_booking_cancel_sync_rollback.sql"
MIG2="$ROOT/supabase/migrations/20260928130000_booking_cancel_sync_lock_timeout.sql"
RB2="$ROOT/docs/rollbacks/20260928130000_booking_cancel_sync_lock_timeout_rollback.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/booking_cancel_sync.harness.sql"
# Item 4 (já em prod): trigger de escopo de edição do colaborador
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20260925140000_staff_appointment_edit_scope.sql" 2>/dev/null

# RPCs de booking de prod: fonte = última migration de cada uma. Em prod, parte
# delas foi gravada com CRLF no corpo; o md5 abaixo confere que ficou idêntico.
python3 - "$ROOT/supabase/migrations" > "$TMP/prod_fns.sql" <<'PY'
import re, sys
root = sys.argv[1]
def extract(fname, name, crlf):
    src = open(f"{root}/{fname}", newline='').read()
    pat = re.compile(r'CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+(public\.)?' + re.escape(name) + r'\s*\(', re.I)
    last = None
    for m in pat.finditer(src):
        am = re.compile(r'\bAS\s+(\$[A-Za-z_]*\$)', re.I).search(src, m.end())
        tag = am.group(1)
        end = src.index(tag, am.end())
        body = src[am.end():end]
        if crlf:
            body = body.replace('\r\n', '\n').replace('\n', '\r\n')
        semi = src.index(';', end + len(tag))
        last = src[m.start():am.end()] + body + src[end:semi + 1]
    return last
for fname, name, crlf in [
    ("20260613_security_s2_public_rls.sql", "phones_match", True),
    ("20260918190000_p0_public_booking_staff_atomicity.sql", "reject_public_booking", False),
    ("20260918190000_p0_public_booking_staff_atomicity.sql", "cancel_public_booking_by_client", False),
    ("20260802000001_products_v2.sql", "update_public_booking_by_client", True),
    ("20260615_fix_active_booking_phone_text_cast.sql", "get_active_booking_by_phone", True),
    ("20260613_security_s2_public_rls.sql", "get_booking_by_id", True),
    ("20260613_security_s2_public_rls.sql", "get_public_booking_by_id", True),
    ("20260306_fix_public_rpc_grants.sql", "get_client_bookings_history", False),
]:
    sys.stdout.write(extract(fname, name, crlf) + "\n\n")
PY
"${PSQL[@]}" -f "$TMP/prod_fns.sql"
# accept_public_booking = definição exata de prod (está no arquivo de rollback)
"${PSQL[@]}" -f "$RB" 2>/dev/null
# ACL de prod
"${PSQL[@]}" <<'SQL'
REVOKE ALL ON FUNCTION public.accept_public_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_public_booking(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_public_booking(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_public_booking(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.cancel_public_booking_by_client(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_public_booking_by_client(uuid, text) TO anon, authenticated, service_role;
SQL
MD5_SQL="SELECT string_agg(p.proname || '=' || md5(pg_get_functiondef(p.oid)), ' ' ORDER BY p.proname) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('accept_public_booking','reject_public_booking','cancel_public_booking_by_client','update_public_booking_by_client','get_active_booking_by_phone','get_booking_by_id','get_public_booking_by_id','get_client_bookings_history','phones_match','get_auth_company_id','get_auth_role','enforce_staff_appointment_edit_scope','staff_can_modify_appointment')"
PROD_MD5="accept_public_booking=b98f18bf7fb7dec61a548ac67ecf2bc6 cancel_public_booking_by_client=7adafd457dc4644bca2bae6dcba5f36e enforce_staff_appointment_edit_scope=f31188aa32bade9349bcb4fb556a4374 get_active_booking_by_phone=3934d1da02db7afb292d75d8458655f0 get_auth_company_id=4e27234398ff92bddb5bfb359afbc677 get_auth_role=dfc2af73cfd84d3336e09f3722d592c3 get_booking_by_id=a71621b39ef9163c9c15accc99802d5d get_client_bookings_history=39b6c725e5d1e1d509a5ebe6a3c126df get_public_booking_by_id=55be6c3d5c909db060159c59a162da13 phones_match=a2cf8bbb8883666bdf405a6e132100f0 reject_public_booking=f678cc4db27b5f05b52dee4503835fbe staff_can_modify_appointment=5f944078baf67a313fc126cc87b784fa update_public_booking_by_client=2ab14f23edd7f9c82f5596f4bd652835"
got="$("${PSQL[@]}" -At -c "$MD5_SQL")"
[ "$got" = "$PROD_MD5" ] || { echo "baseline difere de prod: $got"; exit 1; }
echo "baseline = prod (md5 ok, 13 funções)"
MODE="${1:-}"
if [ "$MODE" != "--pre-5b" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" 2>/dev/null   # idempotência
fi
if [ "$MODE" != "--pre-5b" ] && [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG2"
  "${PSQL[@]}" -f "$MIG2"              # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB2"
  n3="$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public.sync_public_booking_on_appointment_cancel()'::regprocedure)) || ' ' || array_to_string(proconfig, ',') FROM pg_proc WHERE oid = 'public.sync_public_booking_on_appointment_cancel()'::regprocedure")"
  echo "rollback N3: $n3 (esperado: 6fcada5455bdc97472ccd9be5b846c51 search_path=public)"
  [ "$n3" = "6fcada5455bdc97472ccd9be5b846c51 search_path=public" ]
  "${PSQL[@]}" -f "$RB"
  got="$("${PSQL[@]}" -At -c "$MD5_SQL")"
  left="$("${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_proc WHERE proname IN ('public_booking_linked_appointments','sync_public_booking_on_appointment_cancel','get_client_booking_cancellations')) + (SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel')")"
  acl="$("${PSQL[@]}" -At -c "SELECT has_function_privilege('anon','public.accept_public_booking(uuid)','EXECUTE')::text || '/' || has_function_privilege('authenticated','public.accept_public_booking(uuid)','EXECUTE')::text")"
  echo "rollback md5: $([ "$got" = "$PROD_MD5" ] && echo ok || echo "DIFF $got"); leftovers: $left; accept anon/authenticated exec: $acl"
  [ "$got" = "$PROD_MD5" ] && [ "$left" = 0 ] && [ "$acl" = false/true ]
  exit 0
fi
set +e
"${PSQL[@]}" -f "$ROOT/supabase/tests/booking_cancel_sync.test.sql"
sql_rc=$?
set -e

# N3: pedido travado por outra transação -> o cancelamento do agendamento
# termina em ~2s (lock_timeout dentro do EXCEPTION da função) e o pedido fica
# como estava; sem N3 o UPDATE esperaria o lock inteiro (6s).
"${PSQL[@]}" <<'SQL'
INSERT INTO public.public_bookings (id, business_id, customer_phone, customer_name, service_ids, professional_id, appointment_time, total_price, status)
VALUES ('5000000f-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000a0', '351912345678', 'Ana', ARRAY['20000000-0000-0000-0000-000000000001'::uuid],
        '10000000-0000-0000-0000-0000000000a0', now() + interval '9 days', 35, 'confirmed');
INSERT INTO public.appointments (id, user_id, client_id, professional_id, service, appointment_time, price, status, public_booking_id)
VALUES ('4000000f-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-0000000000a0', '30000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-0000000000a0', 'Barba', (SELECT appointment_time FROM public.public_bookings WHERE id = '5000000f-0000-0000-0000-00000000000f'),
        35, 'Confirmed', '5000000f-0000-0000-0000-00000000000f');
SQL
"${PSQL[@]}" -c "BEGIN; SELECT 1 FROM public.public_bookings WHERE id = '5000000f-0000-0000-0000-00000000000f' FOR UPDATE; SELECT pg_sleep(6); COMMIT;" >/dev/null &
locker=$!
for _ in $(seq 1 50); do
  held="$("${PSQL[@]}" -At -c "SELECT count(*) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(6)%' AND state = 'active' AND pid <> pg_backend_pid()")"
  [ "$held" = 1 ] && break; sleep 0.1
done
t0=$(date +%s.%N)
set +e
cancel_out="$("${PSQL[@]}" -At -c "UPDATE public.appointments SET status = 'Cancelled' WHERE id = '4000000f-0000-0000-0000-00000000000f' RETURNING status" 2>&1)"
cancel_rc=$?
set -e
elapsed=$(python3 -c "import sys; print(round(float(sys.argv[2]) - float(sys.argv[1]), 1))" "$t0" "$(date +%s.%N)")
wait "$locker"
state="$("${PSQL[@]}" -At -c "SELECT (SELECT status FROM public.appointments WHERE id = '4000000f-0000-0000-0000-00000000000f') || '/' || (SELECT status FROM public.public_bookings WHERE id = '5000000f-0000-0000-0000-00000000000f')")"
fail=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; else echo "FAIL  $1: got=$2 expected=$3"; fail=$((fail + 1)); fi; }
check "N3: cancel with the booking row locked succeeds" "$cancel_rc" "0"
check "N3: cancel returns without waiting the whole lock (<4s)" "$(python3 -c "print('yes' if $elapsed < 4 else 'no ($elapsed s)')")" "yes"
check "N3: lock wait becomes a WARNING inside the trigger" "$(echo "$cancel_out" | grep -c 'lock timeout')" "1"
check "N3: appointment Cancelled; booking untouched while locked" "$state" "Cancelled/confirmed"
echo "N3 lock tests: 4 total, $fail failures (cancel took ${elapsed}s)"
n3_fail=$fail

# S1 (review do #98): limpeza de dados demo/seed com pedido aceito (agendamento
# SEM marcador, com public_booking_id). Apagar os pedidos direto quebra na FK;
# soltar o vínculo antes (seed-demo.mjs / snippet do SEED.md) funciona.
"${PSQL[@]}" <<'SQL'
INSERT INTO public.public_bookings (id, business_id, customer_phone, customer_name, service_ids, appointment_time, total_price, status, notes)
VALUES ('5000000e-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000b0', '351912345678', 'Ana', ARRAY['20000000-0000-0000-0000-000000000001'::uuid],
        now() + interval '10 days', 35, 'confirmed', '[UXPRO-SEED] pedido');
INSERT INTO public.appointments (id, user_id, client_id, service, appointment_time, price, status, public_booking_id)
VALUES ('4000000e-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000b0', '30000000-0000-0000-0000-00000000000b', 'Barba',
        now() + interval '10 days', 35, 'Confirmed', '5000000e-0000-0000-0000-00000000000e');
SQL
set +e
direct="$("${PSQL[@]}" -c "DELETE FROM public.public_bookings WHERE business_id = '00000000-0000-0000-0000-0000000000b0'" 2>&1)"
direct_rc=$?
seed_rc=0
sed -n '/^UPDATE appointments SET public_booking_id = NULL/,/^DELETE FROM public_bookings/p' "$ROOT/docs/ux-pro/SEED.md" \
  | sed "s/'<tenant>'/'00000000-0000-0000-0000-0000000000b0'/g; s/\bappointments\b/public.appointments/g; s/\bpublic_bookings\b/public.public_bookings/g" > "$TMP/seed_snippet.sql"
"${PSQL[@]}" -f "$TMP/seed_snippet.sql" >/dev/null 2>&1 || seed_rc=$?
set -e
after="$("${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM public.public_bookings WHERE id = '5000000e-0000-0000-0000-00000000000e') || '/' || (SELECT COALESCE(public_booking_id::text, 'null') FROM public.appointments WHERE id = '4000000e-0000-0000-0000-00000000000e')")"
check "S1: deleting a linked public_booking directly fails on the FK" "$direct_rc/$(echo "$direct" | grep -c appointments_public_booking_id_fkey)" "1/1"
check "S1: SEED.md snippet (unlink, then delete) runs" "$seed_rc/$(grep -c . "$TMP/seed_snippet.sql")" "0/4"
check "S1: booking deleted, accepted appointment kept with NULL link" "$after" "0/null"
echo "S1 seed FK tests: 3 total, $((fail - n3_fail)) failures"
[ "$sql_rc" = 0 ] && [ "$fail" = 0 ]
