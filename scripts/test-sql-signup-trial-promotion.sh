#!/usr/bin/env bash
# Testa 20261012150000_signup_trial_promotion num Postgres local descartável (não toca prod).
#   scripts/test-sql-signup-trial-promotion.sh             # TDD (falha antes) → migration 2x → checks → concorrência
#   scripts/test-sql-signup-trial-promotion.sh --rollback  # migration + rollback = estado de prod (md5 + ACL)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55508}"
HARNESS="$ROOT/supabase/tests/owner_signup_profile.harness.sql"
PRE1="$ROOT/supabase/migrations/20261012130157_log_signup_error.sql"
PRE2="$ROOT/supabase/migrations/20261012130203_owner_signup_profile.sql"
MIG="$ROOT/supabase/migrations/20261012150000_signup_trial_promotion.sql"
RB="$ROOT/docs/rollbacks/20261012150000_signup_trial_promotion.rollback.sql"
TEST="$ROOT/supabase/tests/signup_trial_promotion.test.sql"
for f in "$HARNESS" "$PRE1" "$PRE2" "$MIG" "$RB" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Prod (lcqwrngscsziysyfhpfj) depois do #148, lido em 2026-10-12 (só SELECT): md5(pg_get_functiondef) + ACL.
PROD_SIG="check_email_confirmed() f1a56d6e9f63acd37dcc7a0e46acf807 {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
ensure_owner_profile() 49e08d034661324a50614423d88715a2 {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
handle_new_user() 75b03967cb6677fe891bf1d784572f30 {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
protect_profile_identity() 367809f7368f4a109ca6b606fe769558 {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}"
SIGQ="SELECT string_agg(p.proname || '() ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text, ''), E'\n' ORDER BY p.proname)
      FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('check_email_confirmed','ensure_owner_profile','handle_new_user','protect_profile_identity')"
TRG="SELECT string_agg(tgname, ',' ORDER BY tgname) FROM pg_trigger WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal"

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses='' -c max_connections=60" -w start >/dev/null
  P -f "$HARNESS"
  P -c "CREATE TABLE IF NOT EXISTS public.system_errors (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, error_message text NOT NULL, stack_trace text, component_stack text, severity varchar DEFAULT 'error', context jsonb DEFAULT '{}'::jsonb, user_id uuid, resolved boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())"
  P -f "$PRE1"; P -f "$PRE2"
  got="$(P -At -c "$SIGQ")"
  [ "$got" = "$PROD_SIG" ] || { echo "harness diverge de prod:"; echo "$got"; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before_trg="$(P -At -c "$TRG")"
  P -f "$MIG"; P -f "$RB"
  got="$(P -At -c "$SIGQ")"
  [ "$got" = "$PROD_SIG" ] || { echo "rollback diverge de prod:"; echo "$got"; exit 1; }
  [ "$(P -At -c "$TRG")" = "$before_trg" ] || { echo "triggers de profiles diferentes após rollback"; exit 1; }
  n="$(P -At -c "SELECT count(*) FROM pg_proc WHERE proname = 'apply_signup_trial_promotion'")$(P -At -c "SELECT count(*) FROM pg_class WHERE relname IN ('trial_promotions','trial_promotion_grants')")"
  [ "$n" = "00" ] || { echo "rollback deixou objetos: $n"; exit 1; }
  echo "rollback ok: funções = prod (md5 + ACL), triggers de profiles iguais, promoção removida"
  exit 0
fi

setup
echo "--- ANTES da migração (esperado: FAIL)"
out="$(P -At -F ' ' -f "$TEST" 2>&1 || true)"; echo "$out" | rg 'FAIL' | head -3 || true
[ -n "${DEBUG:-}" ] && echo "$out"
echo "$out" | rg -q 'FAIL' || { echo "TDD: os testes deveriam falhar antes da migração"; exit 1; }

P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
[ "$(P -At -c "SELECT used || '/' || max_uses FROM public.trial_promotions")" = "0/10" ] || { echo "2ª aplicação mexeu na promoção"; exit 1; }
out="$(P -At -F ' ' -f "$TEST")"; echo "$out"
if echo "$out" | rg -q 'FAIL'; then echo "signup_trial_promotion: FALHOU"; exit 1; fi
[ "$(P -At -c "$SIGQ")" = "$PROD_SIG" ] || { echo "migração alterou funções existentes"; exit 1; }

# Concorrência: 25 cadastros de dono em paralelo (conexões separadas) → exatamente 10 vagas.
for i in $(seq 1 25); do
  id="0b000000-0000-4000-8000-0000000002$(printf '%02d' "$i")"
  P -c "INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES ('00000000-0000-0000-0000-000000000000', '$id', 'authenticated', 'authenticated', '$id@exemplo.invalid', 'x', '{}',
                '{\"full_name\":\"Dono\",\"business_name\":\"Conc $i $id\",\"type\":\"barber\",\"region\":\"BR\",\"role\":\"owner\"}', now(), now());
        SELECT pg_sleep(0.05);" -o /dev/null &
done
wait
res="$(P -At -c "SELECT (SELECT used FROM public.trial_promotions) || ' ' || (SELECT count(*) FROM public.trial_promotion_grants) || ' ' ||
  (SELECT count(*) FROM public.profiles WHERE id LIKE '0b000000-0000-4000-8000-0000000002%' AND trial_ends_at > now() + interval '29 days') || ' ' ||
  (SELECT count(*) FROM public.profiles WHERE id LIKE '0b000000-0000-4000-8000-0000000002%')")"
[ "$res" = "10 10 10 25" ] || { echo "concorrência falhou (used grants perfis30 perfis): $res"; exit 1; }
echo "concorrência: 25 cadastros simultâneos → 10 com 30 dias, 15 com 20; used=10"
echo "signup trial promotion: testes ok"
