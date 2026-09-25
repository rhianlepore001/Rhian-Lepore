#!/usr/bin/env bash
# Testa a migration 20260925170000_booking_cancel_sync num Postgres local e
# descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-booking-cancel-sync.sh            # harness + prod + migration + testes
#   scripts/test-sql-booking-cancel-sync.sh --main     # só as definições atuais de prod: deve FALHAR
#   scripts/test-sql-booking-cancel-sync.sh --rollback # migration + rollback: volta às definições de prod (md5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55459}"
MIG="$ROOT/supabase/migrations/20260925170000_booking_cancel_sync.sql"
RB="$ROOT/docs/rollbacks/20260925170000_booking_cancel_sync_rollback.sql"
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
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" 2>/dev/null   # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  got="$("${PSQL[@]}" -At -c "$MD5_SQL")"
  left="$("${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_proc WHERE proname IN ('public_booking_linked_appointments','sync_public_booking_on_appointment_cancel','get_client_booking_cancellations')) + (SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel')")"
  acl="$("${PSQL[@]}" -At -c "SELECT has_function_privilege('anon','public.accept_public_booking(uuid)','EXECUTE')::text || '/' || has_function_privilege('authenticated','public.accept_public_booking(uuid)','EXECUTE')::text")"
  echo "rollback md5: $([ "$got" = "$PROD_MD5" ] && echo ok || echo "DIFF $got"); leftovers: $left; accept anon/authenticated exec: $acl"
  [ "$got" = "$PROD_MD5" ] && [ "$left" = 0 ] && [ "$acl" = false/true ]
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/booking_cancel_sync.test.sql"
