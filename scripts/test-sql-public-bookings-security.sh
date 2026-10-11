#!/usr/bin/env bash
# Testa 20261011210000_public_bookings_anon_lockdown num Postgres 17 local descartável
# (não usa nem toca o Supabase de prod).
#   scripts/test-sql-public-bookings-security.sh             # harness = prod (policies/ACL/md5) → teste FALHA
#                                                           # → migration 2x → passa + regressão auto-confirm
#   scripts/test-sql-public-bookings-security.sh --rollback  # migration + rollback = prod (policies, ACL, funções)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55505}"
MIG="$ROOT/supabase/migrations/20261011210000_public_bookings_anon_lockdown.sql"
RB="$ROOT/docs/rollbacks/20261011210000_public_bookings_anon_lockdown.rollback.sql"
AC_HARNESS="$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
AC_MIG="$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
HARNESS="$ROOT/supabase/tests/public_bookings_security.harness.sql"
TEST="$ROOT/supabase/tests/public_bookings_security.test.sql"
for f in "$MIG" "$RB" "$AC_HARNESS" "$AC_MIG" "$HARNESS" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"

stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Lido em prod (lcqwrngscsziysyfhpfj) em 2026-10-11, só SELECT.
PROD_ACL="{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres} rls=true force=false"
PROD_POLICIES="Owner can manage public_bookings * true authenticated U:((auth.uid())::text = business_id) C:((auth.uid())::text = business_id)
Public bookings: company read r true authenticated U:(business_id = get_auth_company_id()) C:
Public bookings: company update w true authenticated U:(business_id = get_auth_company_id()) C:(business_id = get_auth_company_id())
public_bookings_insert_anon a true anon,authenticated U: C:((business_id IS NOT NULL) AND (btrim(business_id) <> ''::text) AND business_exists(business_id) AND (COALESCE(status, 'pending'::text) = 'pending'::text))
public_bookings_select_anon_fresh r true anon U:((status = 'pending'::text) AND (created_at IS NOT NULL) AND (created_at > (now() - '00:02:00'::interval))) C:"
PROD_MD5="business_exists(text) 429414f18e3e6639bc1690484cae2133
cancel_public_booking_by_client_v2(uuid,text) fbc66e47ac802f971b37f935b2e3f1fe
create_public_booking(text,text,text,uuid[],uuid,timestamp with time zone,numeric,integer,jsonb) 8d10b319e61d0fa85c5eda7698d0747a
get_active_booking_by_phone(text,uuid) 3934d1da02db7afb292d75d8458655f0
get_client_booking_cancellations(text,uuid) 887028da4bfd90a0068b6118c7d79772
get_public_booking_by_id(uuid,uuid,text) 55be6c3d5c909db060159c59a162da13
list_company_pending_public_bookings() 01651c25d942e97e112ba6654dbbcf44"

acl() { P -At -c "SELECT relacl::text || ' rls=' || relrowsecurity::text || ' force=' || relforcerowsecurity::text FROM pg_class WHERE oid = 'public.public_bookings'::regclass"; }
policies() { P -At -c "SELECT string_agg(polname || ' ' || polcmd::text || ' ' || polpermissive::text || ' ' || array_to_string(ARRAY(SELECT CASE WHEN r = 0 THEN 'public' ELSE pg_get_userbyid(r) END FROM unnest(polroles) r ORDER BY 1), ',') || ' U:' || COALESCE(pg_get_expr(polqual, polrelid), '') || ' C:' || COALESCE(pg_get_expr(polwithcheck, polrelid), ''), E'\n' ORDER BY polname) FROM pg_policy WHERE polrelid = 'public.public_bookings'::regclass"; }
md5s() { P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname IN ('business_exists','cancel_public_booking_by_client_v2','create_public_booking','get_active_booking_by_phone','get_client_booking_cancellations','get_public_booking_by_id','list_company_pending_public_bookings') ORDER BY 1"; }
all_fn_md5() { P -At -c "SELECT md5(string_agg(p.oid::regprocedure::text || md5(pg_get_functiondef(p.oid)) || COALESCE(p.proacl::text, ''), ',' ORDER BY 1)) FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind = 'f'"; }

# Cadeia do test-sql-auto-confirm-online-bookings.sh (funções de booking = prod) + harness.
eval "$(sed -n '/^chain() {/,/^}/p' "$ROOT/scripts/test-sql-auto-confirm-online-bookings.sh")"
eval "$(sed -n '/^capture_pre() {/,/^}/p' "$ROOT/scripts/test-sql-auto-confirm-online-bookings.sh")"
setup() {
  chain
  P -f "$AC_HARNESS"
  P -f "$AC_MIG"
  P -f "$HARNESS"
  [ "$(acl)" = "$PROD_ACL" ] || { echo "ACL local != prod: $(acl)"; exit 1; }
  [ "$(policies)" = "$PROD_POLICIES" ] || { echo "policies locais != prod:"; diff <(echo "$PROD_POLICIES") <(policies) || true; exit 1; }
  [ "$(md5s)" = "$PROD_MD5" ] || { echo "md5 local != prod:"; diff <(echo "$PROD_MD5") <(md5s) || true; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  F0="$(all_fn_md5)"
  P -f "$MIG"; P -f "$MIG"
  P -f "$RB"; P -f "$RB"
  [ "$(acl)" = "$PROD_ACL" ] || { echo "rollback: ACL != prod: $(acl)"; exit 1; }
  [ "$(policies)" = "$PROD_POLICIES" ] || { echo "rollback: policies != prod:"; diff <(echo "$PROD_POLICIES") <(policies) || true; exit 1; }
  [ "$(all_fn_md5)" = "$F0" ] || { echo "rollback: funções mudaram"; exit 1; }
  echo "rollback ok: ACL e as 5 policies = prod (texto de pg_policy); funções intocadas; idempotente"
  exit 0
fi

# 1) TDD: antes da migration os checks [S] falham e os [F] passam.
setup
echo "harness = prod (ACL, 5 policies, md5 de $(echo "$PROD_MD5" | wc -l) funções)"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado: só [S] falham):"
grep -oE "FAIL  .*" "$TMP/before.out" | sed 's/^/  /'
if grep -E "FAIL  F" "$TMP/before.out"; then echo "ERRO: check de fluxo [F] falhou antes da migration"; exit 1; fi
grep -oE "public_bookings_security: .* checks falharam.*" "$TMP/before.out"

# 2) Migration 2x + teste.
setup
F0="$(all_fn_md5)"
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x"
[ "$(all_fn_md5)" = "$F0" ] || { echo "migration alterou funções"; exit 1; }
echo "funções (md5 + ACL) intocadas"
echo "ACL depois: $(acl)"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { cat "$TMP/after.out"; exit 1; }
grep -oE "public_bookings_security: .* checks ok" "$TMP/after.out"

# 3) Regressão: suíte do auto-confirm (mesma preparação dela) + harness de prod + migration.
chain
P -f "$AC_HARNESS"
capture_pre
P -f "$AC_MIG"
P -f "$HARNESS"
P -f "$MIG"
P -f "$ROOT/supabase/tests/auto_confirm_online_bookings.test.sql" > "$TMP/reg.out" 2>&1 || { echo "regressão auto_confirm FALHOU"; tail -30 "$TMP/reg.out"; exit 1; }
grep -oE "auto_confirm_online_bookings: .* checks ok" "$TMP/reg.out"
echo "regressão auto_confirm_online_bookings.test.sql ok com a migration"
echo "public bookings security: testes ok"
