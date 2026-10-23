#!/usr/bin/env bash
set -euo pipefail
AUDIT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
if [[ -z "${PGBIN:-}" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)"
fi
[[ -x "$PGBIN/initdb" && -x "$PGBIN/psql" ]] || { echo 'Local PostgreSQL binaries required (PGBIN).'; exit 1; }
AUDIT_TMP="$(mktemp -d /tmp/agendix-security.XXXXXX)"
cleanup() { "$PGBIN/pg_ctl" -D "$AUDIT_TMP/data" -m fast -w stop > /dev/null 2>&1 || true; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$AUDIT_TMP/data" -U postgres -A trust > "$AUDIT_TMP/init.log"
"$PGBIN/pg_ctl" -D "$AUDIT_TMP/data" -o "-k $AUDIT_TMP -p 55571 -c listen_addresses=''" -w start > "$AUDIT_TMP/start.log"
export PGHOST="$AUDIT_TMP" PGPORT=55571 PGUSER=postgres PGDATABASE=postgres
unset PGSERVICE PGSERVICEFILE PGOPTIONS
P() { PGOPTIONS='-c agendix.security_fixture=on' "$PGBIN/psql" -X -v ON_ERROR_STOP=1 -q "$@"; }
P -f "$AUDIT_ROOT/supabase/tests/crit_public_clients_billing.harness.sql"
P -f "$AUDIT_ROOT/supabase/migrations/20261013103422_public_clients_anon_lockdown.sql"
P -f "$AUDIT_ROOT/supabase/migrations/20261013103427_protect_profile_billing.sql"
case "${1:-}" in
  billing-baseline) P -f "$AUDIT_ROOT/security/attacks/billing.sql" ;;
  billing-reproduce-before) P -f "$AUDIT_ROOT/security/attacks/billing-original-behavior.sql" ;;
  billing-cycle)
    AUDIT_MIG="$AUDIT_ROOT/supabase/migrations/20261018190300_server_owned_stripe_customer.sql"
    AUDIT_RB="$AUDIT_ROOT/docs/rollbacks/20261018190300_server_owned_stripe_customer.rollback.sql"
    AUDIT_TEST="$AUDIT_ROOT/security/attacks/billing.sql"
    snapshot() { P -At -c "SELECT md5(pg_get_functiondef(oid)) || ':' || proacl::text FROM pg_proc WHERE oid='public.set_stripe_customer_id_for_caller(text)'::regprocedure"; }
    AUDIT_BEFORE="$(snapshot)"
    P -f "$AUDIT_ROOT/security/attacks/billing-original-behavior.sql"
    if P -f "$AUDIT_TEST" > "$AUDIT_TMP/before.log" 2>&1; then echo 'ERROR baseline unexpectedly secure'; exit 1; fi
    rg -q 'BILLING_CLIENT_CAN_BIND_CUSTOMER' "$AUDIT_TMP/before.log"
    echo 'PASS baseline failed for expected customer-binding privilege'
    P -f "$AUDIT_MIG" -f "$AUDIT_MIG" -f "$AUDIT_TEST"
    echo 'PASS apply twice and regression'
    P -f "$AUDIT_RB"
    [[ "$(snapshot)" == "$AUDIT_BEFORE" ]] || { echo 'ERROR rollback changed legacy definition/ACL'; exit 1; }
    [[ "$(P -At -c "SELECT to_regprocedure('public.set_stripe_customer_id_for_user(uuid,text)') IS NULL")" == t ]] || { echo 'ERROR rollback left new setter'; exit 1; }
    P -f "$AUDIT_ROOT/security/attacks/billing-original-behavior.sql"
    if P -f "$AUDIT_TEST" > "$AUDIT_TMP/rollback.log" 2>&1; then echo 'ERROR rollback did not restore original behavior'; exit 1; fi
    rg -q 'BILLING_CLIENT_CAN_BIND_CUSTOMER' "$AUDIT_TMP/rollback.log"
    echo 'PASS rollback restores exact legacy definition/ACL and original behavior'
    P -f "$AUDIT_MIG" -f "$AUDIT_TEST"
    echo 'PASS reapply and regression'
    P -c "INSERT INTO profiles(id,role,company_id) VALUES ('b0000000-0000-4000-8000-0000000000b0','owner','b0000000-0000-4000-8000-0000000000b0')"
    race() {
      P -c "BEGIN; SET LOCAL ROLE service_role; SET LOCAL request.jwt.claim.role='service_role'; SELECT public.set_stripe_customer_id_for_user('b0000000-0000-4000-8000-0000000000b0','$1'); SELECT pg_sleep(0.3); COMMIT;" > "$2" 2>&1
    }
    race cus_RaceOne "$AUDIT_TMP/race1.log" & AUDIT_PID1=$!
    race cus_RaceTwo "$AUDIT_TMP/race2.log" & AUDIT_PID2=$!
    AUDIT_STATUS1=0; wait "$AUDIT_PID1" || AUDIT_STATUS1=$?
    AUDIT_STATUS2=0; wait "$AUDIT_PID2" || AUDIT_STATUS2=$?
    if [[ "$AUDIT_STATUS1" == 0 && "$AUDIT_STATUS2" != 0 ]]; then rg -q customer_binding_conflict "$AUDIT_TMP/race2.log";
    elif [[ "$AUDIT_STATUS2" == 0 && "$AUDIT_STATUS1" != 0 ]]; then rg -q customer_binding_conflict "$AUDIT_TMP/race1.log";
    else echo 'ERROR concurrent conflicting binding'; exit 1; fi
    echo 'PASS concurrent conflicting customers: exactly one commit, one conflict'
    ;;
  residual-privacy) P -f "$AUDIT_ROOT/security/attacks/residual-privacy.sql" ;;
  identity) P -f "$AUDIT_ROOT/security/attacks/identity.sql" ;;
  tenant-matrix)
    python3 "$AUDIT_ROOT/security/tests/matrix-policies.py" > "$AUDIT_TMP/policies.sql"
    P -f "$AUDIT_ROOT/security/tests/tenant-matrix.harness.sql" -f "$AUDIT_TMP/policies.sql" -f "$AUDIT_ROOT/security/attacks/tenant-matrix.sql"
    ;;
  *) echo 'Choose billing-baseline, billing-reproduce-before, billing-cycle, residual-privacy, identity or tenant-matrix'; exit 2 ;;
esac
