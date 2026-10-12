#!/usr/bin/env bash
# Testa 20261012130203_owner_signup_profile (+ 20261012130157_log_signup_error) num Postgres 17
# local descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-owner-signup-profile.sh             # harness = prod → testes FALHAM → migration 2x → passam
#   scripts/test-sql-owner-signup-profile.sh --rollback  # migration + rollback = prod (md5 + ACL)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55507}"
MIG="$ROOT/supabase/migrations/20261012130203_owner_signup_profile.sql"
RB="$ROOT/docs/rollbacks/20261012130203_owner_signup_profile.rollback.sql"
LOGMIG="$ROOT/supabase/migrations/20261012130157_log_signup_error.sql"
LOGRB="$ROOT/supabase/rollbacks/20261012130157_log_signup_error.rollback.sql"
HARNESS="$ROOT/supabase/tests/owner_signup_profile.harness.sql"
TEST="$ROOT/supabase/tests/owner_signup_profile.test.sql"
for f in "$MIG" "$RB" "$LOGMIG" "$LOGRB" "$HARNESS" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Lido em prod (lcqwrngscsziysyfhpfj) em 2026-10-12, só SELECT: md5(pg_get_functiondef) + ACL.
PROD_SIG="check_email_confirmed() c9d96374bdc8f8b0552d779fe1dbc94a {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
get_auth_company_id() SAME
handle_new_user() 75b03967cb6677fe891bf1d784572f30 {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
protect_profile_identity() 367809f7368f4a109ca6b606fe769558 {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"
SIGQ="SELECT string_agg(p.proname || '()' || ' ' || CASE WHEN p.proname = 'get_auth_company_id' THEN 'SAME' ELSE md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text, '') END, E'\n' ORDER BY p.proname)
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('check_email_confirmed','get_auth_company_id','handle_new_user','protect_profile_identity')"
OTHERS="SELECT string_agg(p.proname || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text, ''), E'\n' ORDER BY p.proname)
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('get_auth_company_id','handle_new_user','protect_profile_identity','sync_staff_agenda_block_scope')"

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  P -f "$HARNESS"
  got="$(P -At -c "$SIGQ")"
  [ "$got" = "$PROD_SIG" ] || { echo "harness diverge de prod:"; echo "$got"; exit 1; }
}
run_tests() { P -At -F ' ' -f "$TEST"; }

if [ "${1:-}" = "--rollback" ]; then
  setup
  P -f "$MIG"; P -f "$RB"
  got="$(P -At -c "$SIGQ")"
  [ "$got" = "$PROD_SIG" ] || { echo "rollback diverge de prod:"; echo "$got"; exit 1; }
  n="$(P -At -c "SELECT count(*) FROM pg_proc WHERE proname = 'ensure_owner_profile'")"
  [ "$n" = "0" ] || { echo "ensure_owner_profile ainda existe"; exit 1; }
  echo "rollback ok: check_email_confirmed byte a byte = prod (md5 + ACL); ensure_owner_profile removida; demais intocadas"
  exit 0
fi

setup
before="$(P -At -c "$OTHERS")"
echo "--- ANTES da migração (esperado: FAIL)"
out="$(run_tests)"; echo "$out" | rg 'FAIL' || true
echo "$out" | rg -q 'FAIL' || { echo "TDD: os testes deveriam falhar antes da migração"; exit 1; }
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
out="$(run_tests)"; echo "$out"
if echo "$out" | rg -q 'FAIL'; then echo "owner_signup_profile: FALHOU"; exit 1; fi
after="$(P -At -c "$OTHERS")"
[ "$before" = "$after" ] || { echo "migração alterou outras funções"; echo "$after"; exit 1; }
acl="$(P -At -c "SELECT proacl::text FROM pg_proc WHERE oid = 'public.check_email_confirmed()'::regprocedure")"
[ "$acl" = "{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}" ] || { echo "ACL de check_email_confirmed mudou: $acl"; exit 1; }
grants="$(P -At -c "SELECT has_table_privilege('authenticated','public.profiles','INSERT')::text || has_table_privilege('anon','public.profiles','INSERT')::text")"
[ "$grants" = "falsefalse" ] || { echo "profiles ganhou INSERT para cliente"; exit 1; }
echo "owner_signup_profile: $(echo "$out" | rg -c '^[0-9]+ ok') checks ok; handle_new_user/protect/sync/get_auth_company_id intocadas; profiles sem INSERT de cliente"

# log_signup_error (migração pendente desde 2026-09-25)
P <<'SQL'
CREATE TABLE public.system_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message text NOT NULL, stack_trace text, component_stack text,
  severity character varying DEFAULT 'error'::character varying, context jsonb DEFAULT '{}'::jsonb,
  user_id uuid, resolved boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.system_errors TO anon, authenticated, service_role;
SQL
P -f "$LOGMIG"; P -f "$LOGMIG"
res="$(P -At <<'SQL'
SET ROLE anon;
SELECT count(*) FILTER (WHERE public.log_signup_error(jsonb_build_object('ref','T'||g,'flow','owner')) IS NOT NULL) FROM generate_series(1,35) g;
SELECT COALESCE(public.log_signup_error('"x"'::jsonb)::text, 'null');
SELECT (public.log_signup_error(jsonb_build_object('big', repeat('a', 5000))) IS NULL)::text;
RESET ROLE;
SELECT count(*) || ' ' || bool_and(error_message = 'signup_unexpected_error')::text || ' ' || bool_and(context->>'source' = 'log_signup_error')::text FROM public.system_errors;
SELECT has_table_privilege('anon','public.system_errors','SELECT')::text;
SQL
)"
expected="30
null
true
30 true true
true"
[ "$res" = "$expected" ] || { echo "log_signup_error inesperado:"; echo "$res"; exit 1; }
P -f "$LOGRB"
n="$(P -At -c "SELECT count(*) FROM pg_proc WHERE proname = 'log_signup_error'")"
[ "$n" = "0" ] || { echo "rollback de log_signup_error falhou"; exit 1; }
echo "log_signup_error: anon grava, limite 30/min, payload não-objeto ignorado, 2x idempotente, rollback ok"
echo "owner signup profile: testes ok"
