#!/usr/bin/env bash
# Testa 20261031120000_signup_attribution num Postgres local descartável (não toca o Supabase de prod).
#   scripts/test-sql-signup-attribution.sh             # antes da migration os testes FALHAM → migration 2x → passam
#   scripts/test-sql-signup-attribution.sh --rollback  # migration + rollback = banco sem tabela/função
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55531}"
MIG="$ROOT/supabase/migrations/20261031120000_signup_attribution.sql"
RB="$ROOT/docs/rollbacks/20261031120000_signup_attribution.rollback.sql"
HARNESS="$ROOT/supabase/tests/owner_signup_profile.harness.sql"
TEST="$ROOT/supabase/tests/signup_attribution.test.sql"
for f in "$MIG" "$RB" "$HARNESS" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
trap 'stop; rm -rf "$TMP"' EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
stop
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
P -f "$HARNESS"

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"; P -f "$RB"; P -f "$RB"
  n="$(P -At -c "SELECT (SELECT count(*) FROM pg_proc WHERE proname='save_signup_attribution') + (SELECT count(*) FROM pg_class WHERE relname='signup_attribution')")"
  [ "$n" = "0" ] || { echo "rollback deixou resíduos"; exit 1; }
  echo "rollback ok: tabela e função removidas (roda 2x sem erro)"
  exit 0
fi

echo "--- ANTES da migração (esperado: erro/FAIL)"
if out="$(P -At -F ' ' -f "$TEST" 2>&1)"; then echo "$out" | rg -q 'FAIL' || { echo "TDD: deveria falhar antes da migração"; exit 1; }; else echo "falhou como esperado (tabela inexistente)"; fi
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
out="$(P -At -F ' ' -f "$TEST")"; echo "$out"
if echo "$out" | rg -q 'FAIL'; then echo "signup_attribution: FALHOU"; exit 1; fi
echo "signup_attribution: $(echo "$out" | rg -c '^[0-9]+ ok') checks ok"
