#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55483}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
ARGS=()
if [ -n "${PGSHARE:-}" ]; then ARGS=(-L "$PGSHARE"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
"${PSQL[@]}" -c "ALTER TABLE public.business_settings ADD COLUMN business_hours jsonb; CREATE TABLE public.services (id uuid PRIMARY KEY, user_id text NOT NULL, name text NOT NULL, duration_minutes integer, price numeric); CREATE TABLE public.agenda_blocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL, professional_id uuid NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL);"
"${PSQL[@]}" -c "CREATE TABLE public.queue_entries (id uuid PRIMARY KEY, business_id uuid NOT NULL, ticket_status text, settled_appointment_id uuid, duration_minutes integer, service_id uuid, professional_id uuid); CREATE FUNCTION public.complete_appointment(uuid,text,uuid,uuid,numeric,numeric,numeric) RETURNS void LANGUAGE plpgsql AS \$\$ BEGIN UPDATE public.appointments SET status='Completed' WHERE id=\$1; END \$\$; CREATE FUNCTION public.settle_queue_ticket(uuid,text,numeric,uuid,text) RETURNS void LANGUAGE plpgsql AS \$\$ BEGIN UPDATE public.queue_entries SET ticket_status='settled' WHERE id=\$1; END \$\$;"
"${PSQL[@]}" -c "ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY; CREATE POLICY team_access ON public.team_members FOR ALL TO authenticated USING (user_id=public.get_auth_company_id()) WITH CHECK (user_id=public.get_auth_company_id()); GRANT SELECT,INSERT,UPDATE ON public.team_members TO authenticated;"
"${PSQL[@]}" -c "UPDATE public.business_settings SET business_hours = '{\"sun\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"mon\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"tue\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"wed\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"thu\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"fri\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]},\"sat\":{\"isOpen\":true,\"blocks\":[{\"start\":\"09:00\",\"end\":\"17:00\"}]}}'::jsonb WHERE user_id = '10000000-0000-0000-0000-000000000001';"
if [ "${1:-}" != "--main" ]; then
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104181642_chair_hour_stage1.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104181642_chair_hour_stage1.sql"
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour.test.sql"
if [ "${1:-}" != "--main" ]; then
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261104181642_chair_hour_stage1.sql"
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261104181642_chair_hour_stage1.sql"
  "${PSQL[@]}" -c "DO \$\$ BEGIN IF to_regclass('public.fixed_costs') IS NOT NULL OR to_regprocedure('public.get_chair_hour_v1(date,uuid,date)') IS NOT NULL THEN RAISE EXCEPTION 'rollback incompleto'; END IF; END \$\$;"
fi
