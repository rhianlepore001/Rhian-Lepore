#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"; PORT="${PGPORT_TEST:-55522}"
HARNESS="$ROOT/supabase/tests/alto_a02_storage_writes.harness.sql"
MIG="$ROOT/supabase/migrations/20261013123100_storage_drop_broad_writes.sql"
RB="$ROOT/docs/rollbacks/20261013123100_storage_drop_broad_writes.rollback.sql"
TEST="$ROOT/supabase/tests/alto_a02_storage_writes.test.sql"
for f in "$HARNESS" "$MIG" "$RB" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }; trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

broad() {
  P -At -c "SELECT string_agg(policyname, E'\n' ORDER BY policyname) FROM pg_policies
            WHERE schemaname='storage' AND tablename='objects'
              AND policyname IN (
                'Authenticated Delete',
                'Authenticated delete marketing images',
                'Authenticated update marketing images',
                'Authenticated upload marketing images'
              )"
}
PROD_BROAD="Authenticated Delete
Authenticated delete marketing images
Authenticated update marketing images
Authenticated upload marketing images"

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  P -f "$HARNESS"
  [ "$(broad)" = "$PROD_BROAD" ] || { echo "broad != prod:"; broad; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup; before="$(broad)"; P -f "$MIG"; P -f "$RB"
  [ "$(broad)" = "$before" ] || { echo "rollback diverge"; broad; exit 1; }
  echo "rollback ok: broad storage writes = prod"; exit 0
fi

setup
echo "harness = prod broad storage writes"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: deveria falhar antes"; cat "$TMP/before.out"; exit 1
fi
echo "antes:"; rg -o 'S [^|]+' "$TMP/before.out" | head -20 || true
if rg -q 'F [^|]+ → got=fail' "$TMP/before.out"; then
  echo "ERRO [F] antes:"; cat "$TMP/before.out"; exit 1
fi
setup
P -f "$MIG"; P -f "$MIG"
echo "migration 2x"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { echo "AFTER FAIL"; cat "$TMP/after.out"; exit 1; }
rg -o 'alto_a02_storage_writes: .* checks ok' "$TMP/after.out" || { echo "sem summary"; cat "$TMP/after.out"; exit 1; }
# broad gone
[ -z "$(broad)" ] || { echo "broad ainda existe: $(broad)"; exit 1; }
echo "alto a02 storage writes: testes ok"
