#!/usr/bin/env bash
# Testa a migration 20260928160000_staff_read_service_categories num Postgres
# local e descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-staff-categories.sh            # harness + migration + testes
#   scripts/test-sql-staff-categories.sh --main     # sem a migration (estado de prod hoje): deve FALHAR
#   scripts/test-sql-staff-categories.sh --rollback # migration + rollback: volta às 2 policies de prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55441}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_read_service_categories.harness.sql"
MODE="${1:-}"
MIG="$ROOT/supabase/migrations/20260928160000_staff_read_service_categories.sql"
if [ "$MODE" != "--main" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260928160000_staff_read_service_categories_rollback.sql"
  "${PSQL[@]}" -At -c "SELECT string_agg(policyname, ' | ' ORDER BY policyname) FROM pg_policies WHERE tablename='service_categories'" | {
    read -r p; echo "policies após rollback: $p"
    [ "$p" = "Users can manage their own categories | Users can view their own categories" ]; }
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_read_service_categories.test.sql"
