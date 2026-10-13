#!/usr/bin/env bash
# TDD A-01 client_photos tenant isolation
#   scripts/test-sql-alto-a01-client-photos.sh
#   scripts/test-sql-alto-a01-client-photos.sh --rollback
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55521}"
HARNESS="$ROOT/supabase/tests/alto_a01_client_photos.harness.sql"
MIG="$ROOT/supabase/migrations/20261013123000_client_photos_tenant_isolation.sql"
RB="$ROOT/docs/rollbacks/20261013123000_client_photos_tenant_isolation.rollback.sql"
TEST="$ROOT/supabase/tests/alto_a01_client_photos.test.sql"
for f in "$HARNESS" "$MIG" "$RB" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

prod_pols() {
  P -At -c "SELECT string_agg(policyname, E'\n' ORDER BY policyname)
            FROM pg_policies
            WHERE schemaname='storage' AND tablename='objects'
              AND (policyname ILIKE '%client_photos%' OR policyname ILIKE '%client photos%')"
}
PROD_POLS="Allow authenticated users to view their own client photos
Authenticated users manage client_photos
Public read access for client_photos"

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  P -f "$HARNESS"
  [ "$(prod_pols)" = "$PROD_POLS" ] || { echo "policies != prod:"; prod_pols; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before="$(prod_pols)"
  P -f "$MIG"
  P -f "$RB"
  [ "$(prod_pols)" = "$before" ] || { echo "rollback: policies diverge"; prod_pols; exit 1; }
  echo "rollback ok: client_photos policies = prod"
  exit 0
fi

setup
echo "harness = prod client_photos policies"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes (esperado: [S] falham):"
rg -o 'S [^|]+' "$TMP/before.out" | head -20 || true
if rg -q 'F [^|]+ → got=fail' "$TMP/before.out"; then
  echo "ERRO: [F] falhou antes:"; rg -o 'F [^|]+ → got=[^|]+' "$TMP/before.out" || true
  cat "$TMP/before.out"; exit 1
fi

setup
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { echo "AFTER FAIL:"; cat "$TMP/after.out"; exit 1; }
rg -o 'alto_a01_client_photos: .* checks ok' "$TMP/after.out" || { echo "AFTER: sem summary"; cat "$TMP/after.out"; exit 1; }
echo "alto a01 client_photos: testes ok"
