#!/usr/bin/env bash
# Runs supabase/tests/billing_paywall.test.sql (migration + assertions + rollback)
# against a throwaway local Postgres in Docker. Never point this at production.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=agx-billing-sqltest-$$
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test -v "$PWD:/repo:ro" -w /repo postgres:17 >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1' EXIT
until docker exec "$NAME" pg_isready -U postgres -q; do sleep 1; done
sleep 1
docker exec "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f supabase/tests/billing_paywall.test.sql
