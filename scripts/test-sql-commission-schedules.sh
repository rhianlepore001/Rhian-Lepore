#!/usr/bin/env bash
# Ciclo de comissão versionado num Postgres local descartável (nunca o de prod).
#   scripts/test-sql-commission-schedules.sh             # harness + 2x migration + testes
#   scripts/test-sql-commission-schedules.sh --rollback  # migration + rollback: md5 de _commission_cycle_core volta
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55491}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG_P1="$ROOT/supabase/migrations/20261003110000_staff_performance_v1.sql"
MIG="$ROOT/supabase/migrations/20261004123000_commission_schedules.sql"
RB="$ROOT/docs/rollbacks/20261004123000_commission_schedules.rollback.sql"
[ -f "$MIG" ] || { echo "faltou $MIG"; exit 1; }
[ -f "$RB" ] || { echo "faltou $RB"; exit 1; }

"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
"${PSQL[@]}" -f "$MIG_P1"
"${PSQL[@]}" -f "$ROOT/supabase/tests/commission_schedules.harness.sql"
OLD_MD5="$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public._commission_cycle_core(text,date,timestamptz)'::regprocedure))")"
echo "cycle_core md5 pré-PR-D: $OLD_MD5"

MODE="${1:-}"
"${PSQL[@]}" -f "$MIG"
"${PSQL[@]}" -f "$MIG"
echo "PASS migration aplicada 2× (idempotente)"

if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  NEW_MD5="$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public._commission_cycle_core(text,date,timestamptz)'::regprocedure))")"
  [ "$NEW_MD5" = "$OLD_MD5" ] || { echo "FAIL rollback md5 $NEW_MD5 != $OLD_MD5"; exit 1; }
  LEFT="$("${PSQL[@]}" -At -c "SELECT (SELECT count(*) FROM pg_class WHERE relname = 'commission_schedules') + (SELECT count(*) FROM pg_proc WHERE proname = 'set_commission_schedule_v1')")"
  [ "$LEFT" = "0" ] || { echo "FAIL rollback deixou $LEFT objetos"; exit 1; }
  echo "PASS rollback: cycle_core md5 restaurado e objetos novos removidos"
  exit 0
fi

"${PSQL[@]}" -At -f "$ROOT/supabase/tests/commission_schedules.test.sql" 2>&1 | sed 's/^psql:[^ ]* NOTICE:  /  /; s/^NOTICE:  /  /'
