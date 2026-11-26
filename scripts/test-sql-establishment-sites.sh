#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TASK_TMP="$(mktemp -d)"
TASK_PORT="${PGPORT_TEST:-55567}"
cleanup() { "$PGBIN/pg_ctl" -D "$TASK_TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TASK_TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TASK_TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TASK_TMP/data" -o "-p $TASK_PORT -k $TASK_TMP -c listen_addresses=''" -l "$TASK_TMP/log" start >/dev/null
PSQL="${PSQL:-$PGBIN/psql}"
P() { "$PSQL" -h "$TASK_TMP" -p "$TASK_PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

P -f "$ROOT/supabase/tests/establishment_sites.harness.sql"
P -f "$ROOT/supabase/migrations/20261124133813_establishment_sites.sql"
P -f "$ROOT/supabase/migrations/20261125180000_establishment_sites_v2.sql"
P -f "$ROOT/supabase/tests/establishment_sites.verify.sql"
P -f "$ROOT/supabase/tests/establishment_sites.test.sql"

# Rollback v2 2x -> rollback v1 2x -> verify clean
P -f "$ROOT/docs/rollbacks/20261125180000_establishment_sites_v2.rollback.sql"
P -f "$ROOT/docs/rollbacks/20261125180000_establishment_sites_v2.rollback.sql"
P -f "$ROOT/docs/rollbacks/20261124133813_establishment_sites.rollback.sql"
P -f "$ROOT/docs/rollbacks/20261124133813_establishment_sites.rollback.sql"
P -At -c "select case when to_regclass('public.establishment_sites') is null and to_regprocedure('public.get_public_establishment_site(text)') is null and to_regprocedure('public.list_published_site_slugs()') is null then 'PASS: rollback 2x removed only feature objects' else 'FAIL' end" | tee "$TASK_TMP/rollback-result"
! rg -q '^FAIL$' "$TASK_TMP/rollback-result"

# Reapply v1 + v2 -> verify
P -f "$ROOT/supabase/migrations/20261124133813_establishment_sites.sql"
P -f "$ROOT/supabase/migrations/20261125180000_establishment_sites_v2.sql"
P -f "$ROOT/supabase/tests/establishment_sites.verify.sql"
echo 'PASS: PostgreSQL 17 migration v1+v2, verify, behavior, rollback 2x and reapply'
