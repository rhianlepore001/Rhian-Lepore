#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)}"
[[ -x "$PGBIN/initdb" ]] || { echo 'PGBIN local obrigatório'; exit 1; }
TMP="$(mktemp -d /tmp/agendix-sec02.XXXXXX)"
PORT=55574
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m fast -w stop >/dev/null 2>&1 || true; }
trap stop EXIT
export PGOPTIONS='-c agendix.security_fixture=on -c client_min_messages=warning'
P() { "$PGBIN/psql" -X -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
eval "$(sed -n '/^chain() {/,/^}/p' "$ROOT/scripts/test-sql-auto-confirm-online-bookings.sh")"
chain
P -f "$ROOT/supabase/tests/auto_confirm_online_bookings.harness.sql"
P -f "$ROOT/supabase/migrations/20261011161117_auto_confirm_online_bookings.sql"
P -f "$ROOT/supabase/tests/public_bookings_security.harness.sql"
P -f "$ROOT/supabase/migrations/20261011202904_public_bookings_anon_lockdown.sql"
P -f "$ROOT/supabase/migrations/20261012074447_fix_get_public_booking_by_id_type.sql"
P -f "$ROOT/supabase/migrations/20261003192135_public_bookings_realtime.sql"
P -f "$ROOT/security/tests/private-booking-fixture.sql"
P -f "$ROOT/supabase/migrations/20261013103422_public_clients_anon_lockdown.sql"
P -f "$ROOT/supabase/migrations/20260620_security_s2_mirror_crm_tenant_guard.sql"
python3 - "$ROOT" "$TMP/mirror-trigger.sql" <<'SQLPY'
from pathlib import Path
import sys
source=Path(sys.argv[1], 'supabase/migrations/20260613_security_s2_public_rls.sql').read_text()
trigger=source[source.index('CREATE OR REPLACE FUNCTION trg_mirror_public_client_to_crm()'):]
queue=Path(sys.argv[1], 'supabase/migrations/20260908180000_queue_active_scope_today.sql').read_text()
queue=queue[queue.index('CREATE OR REPLACE FUNCTION public.find_active_queue_entry_by_phone('):queue.index('CREATE OR REPLACE FUNCTION public.set_queue_mode')]
Path(sys.argv[2]).write_text(trigger+'\n'+queue+'\nGRANT EXECUTE ON FUNCTION public.find_active_queue_entry_by_phone(uuid,text) TO anon,authenticated;\n')
SQLPY
P -f "$TMP/mirror-trigger.sql"
P -f "$ROOT/supabase/migrations/20260905000001_public_client_membership.sql"
if [[ "${1:-}" == --public-access ]]; then
 P -f "$ROOT/security/tests/private-public-access-fixture.sql"
 python3 "$ROOT/security/tests/private-public-access-fixture.py" "$ROOT" > "$TMP/public-access-functions.sql"
 P -f "$TMP/public-access-functions.sql"
fi
snapshot() { P -At -c "SELECT md5(string_agg(pg_get_functiondef(p.oid)||coalesce((SELECT string_agg(a.grantee::text||':'||a.grantor::text||':'||a.privilege_type||':'||a.is_grantable::text,',' ORDER BY a.grantee,a.grantor,a.privilege_type,a.is_grantable) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a),''), E'\\n' ORDER BY p.oid::regprocedure::text)) FROM pg_proc p WHERE pronamespace='public'::regnamespace AND prokind='f' AND proname NOT IN ('create_public_booking_private','get_public_booking_with_token','cancel_public_booking_with_token','update_public_booking_with_token')"; }
BEFORE="$(snapshot)"

if P -f "$ROOT/security/attacks/private-booking-privacy.sql" >"$TMP/before.log" 2>&1; then
 echo 'ERROR baseline unexpectedly secure'; exit 1
fi
rg 'SEC02_PHONE_READS_PII' "$TMP/before.log"
echo 'PASS TDD: baseline fails for anonymous phone PII'
if P -f "$ROOT/security/attacks/public-client-preservation.sql" >"$TMP/write-before.log" 2>&1; then echo 'ERROR initial overwrite test should fail'; exit 1; fi
rg 'SEC02_OVERWRITES_CLIENT' "$TMP/write-before.log"
echo 'PASS TDD: baseline fails for existing client overwrite'
if P -f "$ROOT/supabase/tests/private_booking_access.test.sql" >"$TMP/token-before.log" 2>&1; then echo 'ERROR initial token test should fail'; exit 1; fi
rg 'function public.create_public_booking_private.*does not exist' "$TMP/token-before.log"
echo 'PASS TDD: token endpoint unavailable before migration'
if [[ "${1:-}" == --before ]]; then exit 0; fi
MIG="$(find "$ROOT/supabase/migrations" -name '*private_booking_access.sql')"
P -f "$MIG" -f "$MIG"
P -f "$ROOT/security/attacks/private-booking-privacy.sql"
P -f "$ROOT/security/attacks/public-client-preservation.sql"
P -f "$ROOT/supabase/tests/private_booking_access.test.sql"
P -f "$ROOT/supabase/tests/private_booking_crm_regression.test.sql"
P -f "$ROOT/supabase/tests/private_booking_atomicity.test.sql"
if [[ "${1:-}" == --public-access ]]; then
 ACCESS_MIG="$(find "$ROOT/supabase/migrations" -name '*private_queue_membership_tokens.sql')"
 ACCESS_TEST="$ROOT/supabase/tests/private_public_access.test.sql"
 ACCESS_BEFORE="$(snapshot)"
 if P -f "$ACCESS_TEST" >"$TMP/access-before.log" 2>&1; then echo 'ERROR baseline unexpectedly passes private access tests'; exit 1; fi
 rg 'BOOKING_EXPIRY_NOT_48H' "$TMP/access-before.log"
 echo 'PASS TDD: existing branch fails booking 48h regression'
 P -f "$ACCESS_MIG" -f "$ACCESS_MIG" -f "$ACCESS_TEST" -f "$ROOT/supabase/tests/private_public_access_atomicity.test.sql"
 P -f "$ROOT/supabase/tests/private_booking_crm_regression.test.sql" -f "$ROOT/supabase/tests/private_booking_atomicity.test.sql"
 P -f "$ROOT/docs/rollbacks/$(basename "$ACCESS_MIG" .sql).rollback.sql"
 [[ "$(snapshot)" == "$ACCESS_BEFORE" ]] || { echo 'ERROR public access rollback changed definitions/ACLs'; exit 1; }
 echo 'PASS public access rollback restores all definitions and ACLs'
 P -f "$ACCESS_MIG" -f "$ACCESS_TEST" -f "$ROOT/supabase/tests/private_public_access_atomicity.test.sql"
 P -f "$ROOT/docs/rollbacks/$(basename "$ACCESS_MIG" .sql).rollback.sql"
 echo 'PASS public access apply/test/revert/reapply/test'
fi
P -f "$ROOT/docs/rollbacks/$(basename "$MIG" .sql).rollback.sql"
[[ "$(snapshot)" == "$BEFORE" ]] || { echo 'ERROR rollback changed original function bodies or ACLs'; exit 1; }
echo 'PASS rollback restores original function definitions and equivalent ACL grants'
if P -f "$ROOT/security/attacks/private-booking-privacy.sql" >"$TMP/rollback.log" 2>&1; then echo 'ERROR rollback did not restore baseline'; exit 1; fi
rg 'SEC02_PHONE_READS_PII' "$TMP/rollback.log"
echo 'PASS rollback restores original phone behavior (unsafe by design)'
P -f "$MIG" -f "$ROOT/security/attacks/private-booking-privacy.sql" -f "$ROOT/supabase/tests/private_booking_access.test.sql"
P -f "$ROOT/supabase/tests/private_booking_crm_regression.test.sql"
P -f "$ROOT/supabase/tests/private_booking_atomicity.test.sql"
echo 'PASS apply/test/revert/test/reapply/test'
