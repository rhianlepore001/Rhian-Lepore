#!/usr/bin/env bash
# Testa a migration 20260925140000_staff_appointment_edit_scope num Postgres
# local e descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-staff-edit-scope.sh            # harness + migration + testes
#   scripts/test-sql-staff-edit-scope.sh --main     # sem a migration (estado de main): deve FALHAR
#   scripts/test-sql-staff-edit-scope.sh --rollback # migration + rollback: schema volta ao harness
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55439}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_appointment_edit_scope.harness.sql"
MODE="${1:-}"
if [ "$MODE" = "--main" ]; then
  # Estado de main: sem coluna/trigger. Cria só a coluna para os testes rodarem.
  "${PSQL[@]}" -c "ALTER TABLE business_settings ADD COLUMN staff_appointment_edit_scope text NOT NULL DEFAULT 'none'"
else
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20260925140000_staff_appointment_edit_scope.sql"
  # idempotência
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20260925140000_staff_appointment_edit_scope.sql"
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260925140000_staff_appointment_edit_scope_rollback.sql"
  "${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_trigger WHERE tgname='enforce_staff_appointment_edit_scope') + (SELECT count(*) FROM pg_proc WHERE proname IN ('enforce_staff_appointment_edit_scope','staff_can_modify_appointment')) + (SELECT count(*) FROM information_schema.columns WHERE table_name='business_settings' AND column_name='staff_appointment_edit_scope') AS leftovers" | { read -r n; echo "rollback leftovers: $n"; [ "$n" = 0 ]; }
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_appointment_edit_scope.test.sql"
