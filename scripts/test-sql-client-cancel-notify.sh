#!/usr/bin/env bash
# Testa 20261110090000_client_cancel_notifies_owner num Postgres local descartável.
#   scripts/test-sql-client-cancel-notify.sh --red   # sem a migration o teste FALHA
#   scripts/test-sql-client-cancel-notify.sh         # md5=prod -> migration 2x -> teste passa -> rollback = prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55532}"
INIT_ARGS=()
if [ -n "${PG_SHAREDIR:-}" ]; then INIT_ARGS=(-L "$PG_SHAREDIR"); fi
MIG="$ROOT/supabase/migrations/20261110090000_client_cancel_notifies_owner.sql"
RB="$ROOT/docs/rollbacks/20261110090000_client_cancel_notifies_owner.rollback.sql"
T="$ROOT/supabase/tests"
export PGOPTIONS="-c client_min_messages=warning"

stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Mesma cadeia de scripts/test-sql-public-group-booking.sh + migrations do grupo = estado de prod das funções.
chain() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${INIT_ARGS[@]}" >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c wal_level=logical" -l "$TMP/log" start >/dev/null
  P -f "$T/booking_completed_noshow.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
  P -f "$T/booking_cancel_cutoff.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
  P -f "$T/booking_edit_request.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004101021_client_edit_request.sql"
  P -f "$T/booking_notifications.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004112214_booking_notifications.sql"
  P -f "$ROOT/supabase/migrations/20261006082806_notifications_type_check_allow_used_types.sql"
  P -f "$T/auto_confirm_online_bookings.harness.sql"
  P -f "$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
  P -f "$ROOT/supabase/migrations/20261025160000_staff_can_edit_clients.sql"
  P -f "$T/public_group_booking.harness.sql"
  P -f "$ROOT/supabase/migrations/20261027083640_client_dependents_internal_booking.sql"
  P -f "$ROOT/supabase/migrations/20261029120000_internal_attendee_bookings_per_professional.sql"
  P -f "$ROOT/supabase/migrations/20261029121000_public_group_bookings.sql"
  P -f "$ROOT/supabase/migrations/20261029150000_group_booking_notification_names.sql"
  P -f "$ROOT/supabase/migrations/20261109203000_public_booking_origin.sql"
}

# md5 de pg_get_functiondef em prod (lcqwrngscsziysyfhpfj, 10/11/2026, antes desta migration).
PROD_MD5="cancel_public_booking_by_client_v2(uuid,text) fbc66e47ac802f971b37f935b2e3f1fe
create_public_booking(text,text,text,uuid[],uuid,timestamp with time zone,numeric,integer,jsonb) 8d10b319e61d0fa85c5eda7698d0747a
notify_booking_recipients(public_bookings,text,timestamp with time zone,uuid[]) 07c80a1333beae7ec7d5c07342a965ad
notify_public_booking_requests() 740795500f3612985bc6a1d3a67c0230
reject_public_booking_v2(uuid) 00b6b07e3c4fd635b24df0aa30445b2e
upsert_booking_notification(text,text,text,text,uuid,text,text) 61ab9734500220fce71c95f962e56142"
md5s() { P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname IN ('cancel_public_booking_by_client_v2','create_public_booking','notify_booking_recipients','notify_public_booking_requests','reject_public_booking_v2','upsert_booking_notification') ORDER BY 1"; }
others() { P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname NOT IN ('cancel_public_booking_by_client_v2','notify_booking_cancelled_by_client') ORDER BY 1"; }
attrs() { P -At -c "SELECT p.oid::regprocedure::text || ' ' || p.prosecdef::text || ' ' || COALESCE(array_to_string(p.proconfig, ','), '-') || ' ' || pg_get_userbyid(p.proowner) || ' ' || COALESCE(p.proacl::text, 'NULL') || ' ' || p.provolatile::text || ' ' || pg_get_function_result(p.oid) || ' ' || COALESCE(obj_description(p.oid, 'pg_proc'), '-') FROM pg_proc p WHERE p.pronamespace='public'::regnamespace AND p.proname = 'cancel_public_booking_by_client_v2' ORDER BY 1"; }
schema_state() {
  P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text,'NULL')
            FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
            UNION ALL
            SELECT 'col ' || table_name || '.' || column_name || ' ' || data_type || ' ' || COALESCE(column_default, '-') || ' ' || is_nullable
            FROM information_schema.columns WHERE table_schema = 'public'
            UNION ALL
            SELECT 'trg ' || tgrelid::regclass::text || ' ' || pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal
            UNION ALL
            SELECT 'pol ' || polrelid::regclass::text || ' ' || polname FROM pg_policy
            ORDER BY 1"
}

setup() {
  chain
  [ "$(md5s)" = "$PROD_MD5" ] || { echo "md5 local != prod:"; diff <(echo "$PROD_MD5") <(md5s) || true; exit 1; }
  P -f "$T/client_cancel_notify.fixtures.sql"
}

setup
echo "md5 de $(echo "$PROD_MD5" | wc -l) funções = prod"
if P -f "$T/client_cancel_notify.test.sql" > "$TMP/red.out" 2>&1; then
  echo "ERRO: o teste passou sem a migration"; exit 1
fi
echo "RED (sem a migration):"
grep -oE "(PASS|FAIL)  .*" "$TMP/red.out" | sed "s/^/  /" || tail -5 "$TMP/red.out"
[ "${1:-}" = "--red" ] && exit 0

setup
A0="$(attrs)"; O0="$(others)"; S0="$(schema_state)"
P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x (idempotente)"
[ "$(attrs)" = "$A0" ] || { echo "atributos mudaram:"; diff <(echo "$A0") <(attrs) || true; exit 1; }
[ "$(others)" = "$O0" ] || { echo "outras funções mudaram"; exit 1; }
echo "cancel_public_booking_by_client_v2: assinatura, SECURITY DEFINER, search_path, dono, grants e comentário preservados; outras funções intocadas"
P -f "$T/client_cancel_notify.test.sql" > "$TMP/green.out" 2>&1 || { grep -E "FAIL|ERROR|falharam" "$TMP/green.out"; exit 1; }
grep -oE "(PASS|FAIL)  .*" "$TMP/green.out" | sed "s/^/  /"
grep -oE "client_cancel_notify: .* checks ok" "$TMP/green.out"

# Regressões com a migration aplicada.
chain
P -f "$MIG"
P -f "$T/public_group_booking.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão public_group_booking FALHOU"; grep -E "FAIL|ERROR" "$TMP/reg.out" | head; exit 1; }
echo "regressão public_group_booking.test.sql ok com a migration"
for t in booking_notifications booking_edit_request; do
  chain
  P -f "$MIG"
  P -f "$T/$t.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão $t FALHOU"; grep -E "FAIL|ERROR" "$TMP/reg.out" | head; exit 1; }
  echo "regressão $t.test.sql ok com a migration"
done

# Rollback: funções voltam ao md5 de prod e o schema fica igual ao anterior.
chain
S0="$(schema_state)"
P -f "$MIG"; P -f "$RB"; P -f "$RB"
[ "$(md5s)" = "$PROD_MD5" ] || { echo "rollback: md5 != prod"; diff <(echo "$PROD_MD5") <(md5s) || true; exit 1; }
[ "$(schema_state)" = "$S0" ] || { echo "rollback: schema diferente"; diff <(echo "$S0") <(schema_state) || true; exit 1; }
echo "GREEN: aviso de cancelamento do cliente ao dono/profissional; Novo pedido resolvido; recusa sem aviso; falha no aviso não bloqueia; rollback idempotente = prod"
