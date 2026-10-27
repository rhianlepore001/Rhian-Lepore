#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55507}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
INIT_ARGS=()
if [ -n "${PG_SHAREDIR:-}" ]; then INIT_ARGS=(-L "$PG_SHAREDIR"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${INIT_ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/server.log" start >/dev/null
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
export PGOPTIONS="-c client_min_messages=warning"
P -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
P -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
P -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
P -f "$ROOT/supabase/tests/agenda_blocks.harness.sql"
P -f "$ROOT/supabase/migrations/20261002120000_agenda_blocks.sql"
P -f "$ROOT/supabase/tests/agenda_blocks_queue_settle.harness.sql"
P -f "$ROOT/supabase/migrations/20261003090000_agenda_blocks_allow_queue_completed.sql"
P -f "$ROOT/supabase/tests/agenda_blocks_followup.harness.sql"
P -f "$ROOT/supabase/migrations/20261003120000_agenda_blocks_acceptance_followup.sql"
P -f "$ROOT/supabase/tests/client_dependents.harness.sql"
if [ "${1:-}" = '--red' ]; then
  if P -f "$ROOT/supabase/tests/client_dependents.test.sql" > "$TMP/red.log" 2>&1; then
    echo 'ERRO: testes passaram sem a migration'; exit 1
  fi
  cat "$TMP/red.log"
  echo 'RED: contrato ausente antes da migration (esperado)'
  exit 0
fi
BASELINE="$(P -At -c "SELECT md5(string_agg(pg_get_functiondef(oid), '' ORDER BY oid)) FROM pg_proc WHERE pronamespace = 'public'::regnamespace")"
P -f "$ROOT/supabase/migrations/20261027083640_client_dependents_internal_booking.sql"
P -f "$ROOT/supabase/tests/client_dependents.test.sql"
P -f "$ROOT/docs/rollbacks/20261027083640_client_dependents_internal_booking.rollback.sql"
AFTER="$(P -At -c "SELECT md5(string_agg(pg_get_functiondef(oid), '' ORDER BY oid)) FROM pg_proc WHERE pronamespace = 'public'::regnamespace")"
[ "$BASELINE" = "$AFTER" ] || { echo 'Rollback alterou funções preexistentes'; exit 1; }
P -c "DO \$\$ BEGIN IF to_regclass('public.client_dependents') IS NOT NULL OR EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='appointments' AND column_name IN ('dependent_id','attendee_name')) THEN RAISE EXCEPTION 'rollback_failed'; END IF; END \$\$"
echo 'GREEN: RLS, sequência atômica e rollback; funções preexistentes preservadas'
