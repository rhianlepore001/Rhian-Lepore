#!/usr/bin/env bash
# Runs supabase/tests/billing_paywall.test.sql (migration + assertions + rollback)
# against a throwaway local Postgres. Never point this at production.
# - With PGBIN=/path/to/pg17/bin (or without Docker): isolated initdb in a temp dir.
# - Otherwise: postgres:17 in Docker.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "${PGBIN:-}" ] || ! command -v docker >/dev/null 2>&1; then
  PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
  TMP="$(mktemp -d)"; PORT="${PGPORT_TEST:-55491}"
  trap '"$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
  "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/billing_paywall.test.sql
  exit 0
fi
NAME=agx-billing-sqltest-$$
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test -v "$PWD:/repo:ro" -w /repo postgres:17 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
until docker exec "$NAME" pg_isready -U postgres -q; do sleep 1; done
sleep 1
docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/billing_paywall.test.sql
