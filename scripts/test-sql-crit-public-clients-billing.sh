#!/usr/bin/env bash
# Testa 20261013103422 + 20261013103427 (C-01 public_clients + C-02 billing) em Postgres 17 local.
#   scripts/test-sql-crit-public-clients-billing.sh             # TDD → migrations 2x → passa
#   scripts/test-sql-crit-public-clients-billing.sh --rollback  # volta md5/ACL de prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55511}"
HARNESS="$ROOT/supabase/tests/crit_public_clients_billing.harness.sql"
MIG1="$ROOT/supabase/migrations/20261013103422_public_clients_anon_lockdown.sql"
MIG2="$ROOT/supabase/migrations/20261013103427_protect_profile_billing.sql"
RB1="$ROOT/docs/rollbacks/20261013103422_public_clients_anon_lockdown.rollback.sql"
RB2="$ROOT/docs/rollbacks/20261013103427_protect_profile_billing.rollback.sql"
TEST="$ROOT/supabase/tests/crit_public_clients_billing.test.sql"
for f in "$HARNESS" "$MIG1" "$MIG2" "$RB1" "$RB2" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
cleanup() { stop; rm -rf "$TMP"; }
trap cleanup EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

# Prod lcqwrngscsziysyfhpfj, 2026-10-13 (só SELECT).
PROD_MD5="get_public_client_by_phone(uuid,text) 6c02fd38fc02ad5f6f4c42e4111b0132
protect_profile_identity() 367809f7368f4a109ca6b606fe769558
upsert_public_client(uuid,text,text,text,text) 1cf77ca889c71705adb09d770f8c8209"
PROD_PC_POLICIES="Owner can manage public_clients
Public can register as client
Public can select client data
Public can update client data"
LAST_MIG_PROD="20261013103427"

md5s() {
  P -At -c "SELECT p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid))
            FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
              AND p.proname IN ('get_public_client_by_phone','upsert_public_client','protect_profile_identity')
            ORDER BY 1"
}
pc_policies() {
  P -At -c "SELECT string_agg(policyname, E'\n' ORDER BY policyname) FROM pg_policies WHERE tablename='public_clients'"
}

setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  P -f "$HARNESS"
  got="$(md5s)"
  [ "$got" = "$PROD_MD5" ] || { echo "harness md5 != prod:"; echo "$got"; diff <(echo "$PROD_MD5") <(echo "$got") || true; exit 1; }
  [ "$(pc_policies)" = "$PROD_PC_POLICIES" ] || { echo "policies != prod: $(pc_policies)"; exit 1; }
}

if [ "${1:-}" = "--rollback" ]; then
  setup
  before="$(md5s)"
  before_pol="$(pc_policies)"
  P -f "$MIG1"; P -f "$MIG2"
  P -f "$RB2"; P -f "$RB1"
  [ "$(md5s)" = "$before" ] || { echo "rollback: md5 diverge"; diff <(echo "$before") <(md5s) || true; exit 1; }
  [ "$(pc_policies)" = "$before_pol" ] || { echo "rollback: policies diverge"; exit 1; }
  n="$(P -At -c "SELECT count(*) FROM pg_proc WHERE proname='set_stripe_customer_id_for_caller'")"
  [ "$n" = "0" ] || { echo "rollback deixou set_stripe_customer_id_for_caller"; exit 1; }
  echo "rollback ok: md5/funções/policies = prod; last_mig_prod_ref=$LAST_MIG_PROD"
  exit 0
fi

setup
echo "harness = prod (md5 3 funções + 4 policies public_clients); last_mig_prod=$LAST_MIG_PROD"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes das migrations"; cat "$TMP/before.out"; exit 1
fi
echo "antes (esperado: só [S] falham):"
grep -oE 'S [^|]+' "$TMP/before.out" | head -20 || true
grep -E 'crit_public_clients_billing: .* checks falharam' "$TMP/before.out" || true
if grep -E 'F [a-z_]+ →' "$TMP/before.out" | grep -v skip; then
  # show F fails if any
  echo "$TMP/before.out" | rg 'F .*→' || true
fi
# Garantir que nenhum [F] falhou (só [S])
if rg -q 'F [^|]+ → got=fail' "$TMP/before.out"; then
  echo "ERRO: check de fluxo [F] falhou antes da migration:"
  rg -o 'F [^|]+ → got=[^|]+' "$TMP/before.out" || true
  cat "$TMP/before.out"; exit 1
fi

setup
P -f "$MIG1"; P -f "$MIG1"
P -f "$MIG2"; P -f "$MIG2"
echo "migrations aplicadas 2x cada"
P -f "$TEST" > "$TMP/after.out" 2>&1 || { echo "AFTER FAIL:"; cat "$TMP/after.out"; exit 1; }
rg -o 'crit_public_clients_billing: .* checks ok' "$TMP/after.out" || { echo "AFTER: sem summary"; cat "$TMP/after.out"; exit 1; }
# status trial intacto no seed owner
st="$(P -At -c "SELECT subscription_status FROM profiles WHERE id='a0000000-0000-4000-8000-0000000000a0'")"
[ "$st" = "trial" ] || { echo "self-upgrade vazou: $st"; exit 1; }
echo "crit public_clients + billing: testes ok"
