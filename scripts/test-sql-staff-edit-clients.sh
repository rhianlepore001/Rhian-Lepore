#!/usr/bin/env bash
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
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_edit_clients.harness.sql"
MODE="${1:-}"
if [ "$MODE" = "--main" ]; then
  # Estado de main: sem coluna/trigger. Cria só a coluna para os testes rodarem.
  "${PSQL[@]}" -c "ALTER TABLE business_settings ADD COLUMN staff_can_edit_clients boolean NOT NULL DEFAULT false"
else
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261025160000_staff_can_edit_clients.sql"
  # idempotência
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261025160000_staff_can_edit_clients.sql"
fi
if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261025160000_staff_can_edit_clients.rollback.sql"
  "${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_trigger WHERE tgname='clients_staff_column_guard') + (SELECT count(*) FROM pg_proc WHERE proname IN ('clients_staff_column_guard','staff_can_edit_clients')) + (SELECT count(*) FROM information_schema.columns WHERE table_name='business_settings' AND column_name='staff_can_edit_clients') + (SELECT count(*) FROM pg_policies WHERE tablename='clients' AND policyname='Staff can update company clients')" | { read -r n; echo "rollback leftovers: $n"; [ "$n" = 0 ]; }
  exit 0
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_edit_clients.test.sql"
