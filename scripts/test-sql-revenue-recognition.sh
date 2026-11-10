#!/usr/bin/env bash
# Receita reconhecida na conclusão: RED na definição de prod (rollback), GREEN com a migration,
# rollback 2x restaura exatamente o schema anterior, migration reaplicável.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/17/bin}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55531}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
ARGS=()
if [ -n "${PGSHARE:-}" ]; then ARGS=(-L "$PGSHARE"); fi
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust "${ARGS[@]}" >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG="$ROOT/supabase/migrations/20261110150000_revenue_recognized_on_completion.sql"
RB="$ROOT/docs/rollbacks/20261110150000_revenue_recognized_on_completion.sql"

# Mesmo esquema base do teste de hora de cadeira (cadeia versionada até 20261109103000).
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_performance.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_legacy.harness.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.queue_tenant_id()/,/^\$\$;/p' "$ROOT/supabase/migrations/20260906000001_queue_v2.sql" > "$TMP/tenant.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.normalize_phone_digits(/,/^\$\$ LANGUAGE plpgsql IMMUTABLE;/p' "$ROOT/supabase/migrations/20260602_harden_queue_phone_dedup.sql" > "$TMP/phone.sql"
"${PSQL[@]}" -f "$TMP/tenant.sql"
"${PSQL[@]}" -c 'DROP FUNCTION public.normalize_phone_digits(text);'
"${PSQL[@]}" -f "$TMP/phone.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_hardening.harness.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.sell_product(/,/^\$\$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;/p' "$ROOT/supabase/migrations/20260802000002_finance_include_product_sales.sql" > "$TMP/sell.sql"
"${PSQL[@]}" -f "$TMP/sell.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.complete_appointment(/,/^\$\$ LANGUAGE plpgsql SECURITY DEFINER;/p' "$ROOT/supabase/migrations/20260802000003_fix_complete_appointment_product_overwrite.sql" > "$TMP/complete.sql"
sed -n '/^CREATE OR REPLACE FUNCTION public.settle_queue_ticket(/,/^\$\$;/p' "$ROOT/supabase/migrations/20260910190000_queue_settle_origin_professional.sql" > "$TMP/settle.sql"
"${PSQL[@]}" -f "$TMP/complete.sql"
"${PSQL[@]}" -f "$TMP/settle.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261104181642_chair_hour_stage1.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/chair_hour_history.seed.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261108150422_chair_hour_hardening.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20261109103000_chair_hour_products_owner_only.sql"

# A cadeia do harness tem uma get_commissions_due antiga (outro RETURNS TABLE); prod já tem a nova.
"${PSQL[@]}" -c 'DROP FUNCTION IF EXISTS public.get_commissions_due();'
# Baseline = definições de prod (o rollback contém o texto verbatim de pg_get_functiondef em 10/11).
"${PSQL[@]}" -f "$RB"
"${PSQL[@]}" -f "$ROOT/supabase/tests/revenue_recognition.harness.sql"
state() { "${PSQL[@]}" -At -c "SELECT 'fn ' || p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) || ' ' || COALESCE(p.proacl::text,'NULL') || ' ' || COALESCE(p.proconfig::text,'') FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prokind='f' UNION ALL SELECT 'trg ' || tgname FROM pg_trigger WHERE tgrelid='public.appointments'::regclass AND NOT tgisinternal ORDER BY 1"; }
before="$(state)"

if "${PSQL[@]}" -f "$ROOT/supabase/tests/revenue_recognition.test.sql" > "$TMP/red.log" 2>&1; then
  echo 'FAIL: o teste deveria falhar com as definições atuais de prod (RED)'; cat "$TMP/red.log"; exit 1
fi
echo "RED (prod atual): $(grep -o 'FAIL[^\"]*' "$TMP/red.log" | head -1)"
# Desfaz efeitos parciais do RED antes do GREEN.
"${PSQL[@]}" -c "UPDATE public.appointments SET status='Confirmed', completed_at=NULL WHERE id='7e000000-0000-0000-0000-0000000000c2'; UPDATE public.appointments SET price=25 WHERE id='7e000000-0000-0000-0000-0000000000b1';"

"${PSQL[@]}" -f "$MIG"
"${PSQL[@]}" -f "$MIG"
"${PSQL[@]}" -f "$ROOT/supabase/tests/revenue_recognition.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/revenue_recognition.test.sql" >/dev/null
echo 'GREEN: migration aplicada 2x, testes passam 2x'

# ACL e search_path das 5 RPCs preservados pelo CREATE OR REPLACE; função do trigger sem EXECUTE para PUBLIC.
acl() { "${PSQL[@]}" -At -c "SELECT p.oid::regprocedure::text || ' ' || COALESCE(p.proacl::text,'NULL') || ' ' || COALESCE(p.proconfig::text,'') || ' ' || p.prosecdef FROM pg_proc p WHERE p.oid IN ('public.get_finance_stats__tenant_unsafe(text,text,text,uuid)'::regprocedure,'public.get_monthly_finance_history__tenant_unsafe(text,integer)'::regprocedure,'public.get_dashboard_stats__tenant_unsafe(text)'::regprocedure,'public.get_commissions_due()'::regprocedure,'public.get_chair_hour_v1(date,uuid,date)'::regprocedure) ORDER BY 1"; }
[ "$(echo "$before" | grep -E 'get_(finance_stats__|monthly_finance_history__|dashboard_stats__|commissions_due|chair_hour_v1)' | awk '{print $2, $4, $5}')" = "$(state | grep -E 'get_(finance_stats__|monthly_finance_history__|dashboard_stats__|commissions_due|chair_hour_v1)' | awk '{print $2, $4, $5}')" ] || { echo 'FAIL: migration mudou ACL/search_path'; exit 1; }
"${PSQL[@]}" -c "DO \$\$ BEGIN IF has_function_privilege('anon','public.appointments_stamp_completed_at()','EXECUTE') THEN RAISE EXCEPTION 'FAIL ACL trigger fn'; END IF; END \$\$;"
echo 'PASS: ACL e search_path das RPCs inalterados'

"${PSQL[@]}" -f "$RB"
"${PSQL[@]}" -f "$RB"
after="$(state)"
[ "$before" = "$after" ] || { echo 'FAIL: rollback não restaurou o schema anterior'; diff <(echo "$before") <(echo "$after"); exit 1; }
"${PSQL[@]}" -f "$MIG"
"${PSQL[@]}" -f "$ROOT/supabase/tests/revenue_recognition.test.sql" >/dev/null
echo 'PASS: rollback 2x restaura o schema de prod; migration reaplicada e testes verdes'
