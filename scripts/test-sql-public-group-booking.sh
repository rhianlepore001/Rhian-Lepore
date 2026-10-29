#!/usr/bin/env bash
# Testa as migrations de agendamento em grupo num Postgres local descartável.
#   scripts/test-sql-public-group-booking.sh --red       # sem as migrations o teste FALHA
#   scripts/test-sql-public-group-booking.sh             # migrations 2x -> teste passa -> rollback restaura o estado anterior
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55508}"
INIT_ARGS=()
if [ -n "${PG_SHAREDIR:-}" ]; then INIT_ARGS=(-L "$PG_SHAREDIR"); fi
MIGS=(
  "20261029120000_internal_attendee_bookings_per_professional"
  "20261029121000_public_group_bookings"
)
export PGOPTIONS="-c client_min_messages=warning"

stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

chain() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${INIT_ARGS[@]}" >/dev/null
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
  P -f "$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
  P -f "$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
  P -f "$ROOT/supabase/migrations/20261025160000_staff_can_edit_clients.sql"
  P -f "$ROOT/supabase/tests/public_group_booking.harness.sql"
  P -f "$ROOT/supabase/migrations/20261027083640_client_dependents_internal_booking.sql"
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


chain
BEFORE="$(schema_state)"

if [ "${1:-}" = "--red" ]; then
  if P -f "$ROOT/supabase/tests/public_group_booking.test.sql" > "$TMP/red.log" 2>&1; then
    echo "ERRO: o teste passou sem as migrations"; exit 1
  fi
  grep -E "FAIL|falharam" "$TMP/red.log" | head -60
  echo "RED: contrato ausente antes das migrations (esperado)"
  exit 0
fi

for m in "${MIGS[@]}"; do P -f "$ROOT/supabase/migrations/$m.sql"; P -f "$ROOT/supabase/migrations/$m.sql"; done
echo "migrations aplicadas 2x (idempotentes)"
P -f "$ROOT/supabase/tests/public_group_booking.test.sql" > "$TMP/green.out" 2>&1 || { grep -E "FAIL|ERROR|falharam" "$TMP/green.out"; exit 1; }
grep -E "public_group_booking: .* checks ok" "$TMP/green.out"

chain
for m in "${MIGS[@]}"; do P -f "$ROOT/supabase/migrations/$m.sql"; done
for (( i=${#MIGS[@]}-1; i>=0; i-- )); do m="${MIGS[$i]}"; P -f "$ROOT/docs/rollbacks/$m.rollback.sql"; P -f "$ROOT/docs/rollbacks/$m.rollback.sql"; done
AFTER="$(schema_state)"
if [ "$BEFORE" != "$AFTER" ]; then
  echo "rollback: estado diferente do anterior:"; diff <(echo "$BEFORE") <(echo "$AFTER") || true; exit 1
fi
echo "GREEN: grupo online, expediente, rollback do grupo, profissional por pessoa no interno; rollback restaura funções, colunas, triggers e permissões"
