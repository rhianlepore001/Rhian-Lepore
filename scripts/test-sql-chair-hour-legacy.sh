#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55484}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
ARGS=()
if [ -n "${PGSHARE:-}" ]; then ARGS=(-L "$PGSHARE"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_legacy.harness.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.queue_tenant_id()/,/^\$\$;/p' "$ROOT/supabase/migrations/20260906000001_queue_v2.sql" > "$TMP/tenant.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.normalize_phone_digits(/,/^\$\$ LANGUAGE plpgsql IMMUTABLE;/p' "$ROOT/supabase/migrations/20260602_harden_queue_phone_dedup.sql" > "$TMP/phone.sql"
"${PSQL[@]}" -f "$TMP/tenant.sql"
# Remove the scaffold signatures before loading the actual versioned implementations.
"${PSQL[@]}" -c 'DROP FUNCTION public.normalize_phone_digits(text);'
"${PSQL[@]}" -f "$TMP/phone.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_hardening.harness.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.sell_product(/,/^\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;/p' "$ROOT/supabase/migrations/20260802000002_finance_include_product_sales.sql" > "$TMP/sell.sql"
"${PSQL[@]}" -f "$TMP/sell.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.get_finance_stats(/,/^GRANT EXECUTE ON FUNCTION public.get_finance_stats/p' "$ROOT/supabase/migrations/20260802000002_finance_include_product_sales.sql" > "$TMP/finance.sql"
"${PSQL[@]}" -f "$TMP/finance.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.complete_appointment(/,/^\$\$ LANGUAGE plpgsql SECURITY DEFINER;/p' "$ROOT/supabase/migrations/20260802000003_fix_complete_appointment_product_overwrite.sql" > "$TMP/complete.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.settle_queue_ticket(/,/^\$\$;/p' "$ROOT/supabase/migrations/20260910190000_queue_settle_origin_professional.sql" > "$TMP/settle.sql"
"${PSQL[@]}" -f "$TMP/complete.sql"
"${PSQL[@]}" -c "GRANT EXECUTE ON FUNCTION public.complete_appointment(uuid,text,uuid,uuid,numeric,numeric,numeric) TO authenticated;"
"${PSQL[@]}" -f "$TMP/settle.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104181642_chair_hour_stage1.sql"
if [ "${CHAIR_BASELINE:-0}" != "1" ]; then
  "${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_history.seed.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/migrations/20261108150422_chair_hour_hardening.sql"
fi
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_legacy.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_regressions.test.sql"
if [ "${CHAIR_BASELINE:-0}" != "1" ]; then
 "${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_atomic.test.sql"
 "${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_history.test.sql"
 "${PSQL[@]}" -c "CREATE FUNCTION public.test_concurrent_delay() RETURNS trigger LANGUAGE plpgsql AS \$\$ BEGIN IF OLD.status='Pending' AND NEW.status='Completed' THEN PERFORM pg_sleep(0.3); END IF; RETURN NEW; END \$\$; CREATE TRIGGER test_concurrent_delay BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.test_concurrent_delay();"
 CALL="SET request.jwt.claim.sub='10000000-0000-0000-0000-000000000001'; SET ROLE authenticated; SELECT public.complete_appointment_checkout_v1('91000000-0000-0000-0000-000000000005',p_actual_duration_minutes=>55,p_products=>'[{\"product_id\":\"94000000-0000-0000-0000-000000000001\",\"quantity\":2}]');"
 "${PSQL[@]}" -c "$CALL" > "$TMP/concurrent1.log" 2>&1 & PID1=$!
 "${PSQL[@]}" -c "$CALL" > "$TMP/concurrent2.log" 2>&1 & PID2=$!
 wait "$PID1" || { cat "$TMP/concurrent1.log"; exit 1; }
 wait "$PID2" || { cat "$TMP/concurrent2.log"; exit 1; }
 "${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_concurrent.test.sql"
 "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261108150422_chair_hour_hardening.sql"
 "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261108150422_chair_hour_hardening.sql"
 "${PSQL[@]}" -c "DO \$\$ BEGIN IF to_regclass('chair_hour_private.history') IS NOT NULL OR to_regprocedure('public.complete_appointment_checkout_v1(uuid,text,uuid,uuid,numeric,numeric,numeric,integer,jsonb)') IS NOT NULL THEN RAISE EXCEPTION 'hardening rollback incomplete'; END IF; END \$\$;"
 "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20261104181642_chair_hour_stage1.sql"
fi
