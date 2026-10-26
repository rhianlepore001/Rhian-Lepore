#!/usr/bin/env bash
# Testa 20261013210000_stripe_webhook_billing em Postgres local descartável.
#   scripts/test-sql-stripe-webhook-billing.sh
#   scripts/test-sql-stripe-webhook-billing.sh --rollback
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55521}"
HARNESS="$ROOT/supabase/tests/stripe_webhook_billing.harness.sql"
MIG="$ROOT/supabase/migrations/20261013210000_stripe_webhook_billing.sql"
RB="$ROOT/docs/rollbacks/20261013210000_stripe_webhook_billing.rollback.sql"
TEST="$ROOT/supabase/tests/stripe_webhook_billing.test.sql"
for f in "$HARNESS" "$MIG" "$RB" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  if ! P -f "$HARNESS"; then
    # PG < 14 may need EXECUTE PROCEDURE
    sed 's/EXECUTE FUNCTION/EXECUTE PROCEDURE/g' "$HARNESS" | P -f -
  fi
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before_cols="$(P -At -c "SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_name='profiles'")"
  before_fn="$(P -At -c "SELECT md5(pg_get_functiondef('public.protect_profile_identity()'::regprocedure))")"
  P -f "$MIG"
  P -f "$RB"
  after_cols="$(P -At -c "SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_name='profiles'")"
  after_fn="$(P -At -c "SELECT md5(pg_get_functiondef('public.protect_profile_identity()'::regprocedure))")"
  [ "$before_cols" = "$after_cols" ] || { echo "rollback: cols diverge"; echo "$before_cols"; echo "$after_cols"; exit 1; }
  [ "$before_fn" = "$after_fn" ] || { echo "rollback: protect_profile_identity md5 diverge"; exit 1; }
  n="$(P -At -c "SELECT count(*) FROM pg_class WHERE relname='stripe_webhook_events'")"
  [ "$n" = "0" ] || { echo "rollback left stripe_webhook_events"; exit 1; }
  echo "rollback ok"
  exit 0
fi

setup
echo "harness ready"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes: falhou como esperado"
setup
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { echo "AFTER FAIL:"; cat "$TMP/after.out"; exit 1; }
fail="$(P -At -c "SELECT count(*) FROM swb_result WHERE NOT ok" 2>/dev/null || true)"
# swb_result is TEMP — re-check via output instead
rg -q 'got=.*expected=' "$TMP/after.out" || { echo "AFTER: sem rows"; cat "$TMP/after.out"; exit 1; }
if rg -q '\| f  \|' "$TMP/after.out"; then echo "AFTER: failed row"; cat "$TMP/after.out"; exit 1; fi
echo "stripe_webhook_billing: testes ok"
