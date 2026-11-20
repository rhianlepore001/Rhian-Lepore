#!/usr/bin/env bash
# Roda o teste de materiais reutilizáveis num Postgres 17 descartável.
# Nunca apontar para produção.
#   scripts/test-sql-reusable-materials.sh
#   scripts/test-sql-reusable-materials.sh --rollback
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$PWD"

run_with_pgbin() {
  local PGBIN="$1"
  local TMP PORT
  TMP="$(mktemp -d)"
  PORT="${PGPORT_TEST:-55493}"
  trap '"'"$PGBIN"'/pg_ctl" -D "'"$TMP"'/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "'"$TMP"'"' EXIT
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
  local PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
  "${PSQL[@]}" -f "$ROOT/supabase/tests/reusable_materials.harness.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261116180000_reusable_materials.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261116180000_reusable_materials.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/tests/reusable_materials.test.sql"
  if [ "${2:-}" = "--rollback" ]; then
    "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261116180000_reusable_materials.sql"
    "${PSQL[@]}" -c "DO \$\$ BEGIN IF to_regclass('public.materials') IS NOT NULL OR to_regclass('public.service_material_uses') IS NOT NULL OR to_regclass('public.service_costs_material_recalc_backup') IS NOT NULL THEN RAISE EXCEPTION 'rollback incompleto'; END IF; END \$\$;"
  fi
}

if [ -n "${PGBIN:-}" ] && [ -x "${PGBIN}/psql" ]; then
  run_with_pgbin "$PGBIN" "${1:-}"
  exit 0
fi
if [ -x /usr/lib/postgresql/17/bin/psql ]; then
  run_with_pgbin /usr/lib/postgresql/17/bin "${1:-}"
  exit 0
fi
FOUND="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
if [ -n "$FOUND" ] && [ -x "$FOUND/psql" ]; then
  run_with_pgbin "$FOUND" "${1:-}"
  exit 0
fi
if command -v docker >/dev/null 2>&1; then
  NAME="agx-materials-sqltest-$$"
  docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test -v "$PWD:/repo:ro" -w /repo postgres:17 >/dev/null
  trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
  until docker exec "$NAME" pg_isready -U postgres -q; do sleep 1; done
  sleep 1
  docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/reusable_materials.harness.sql
  docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261116180000_reusable_materials.sql
  docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/migrations/20261116180000_reusable_materials.sql
  docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/reusable_materials.test.sql
  if [ "${1:-}" = "--rollback" ]; then
    docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f docs/rollbacks/20261116180000_reusable_materials.sql
    docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -c "DO \$\$ BEGIN IF to_regclass('public.materials') IS NOT NULL THEN RAISE EXCEPTION 'rollback incompleto'; END IF; END \$\$;"
  fi
  exit 0
fi
echo "Postgres 17 não encontrado (PGBIN ou docker postgres:17). Instale e rode de novo. Nada foi aplicado em produção."
exit 1
