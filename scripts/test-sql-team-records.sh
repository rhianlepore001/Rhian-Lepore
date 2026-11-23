#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55494}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
ARGS=()
if [ -n "${PGSHARE:-}" ]; then ARGS=(-L "$PGSHARE"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
"$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -f "$ROOT/supabase/tests/team_records.test.sql"
