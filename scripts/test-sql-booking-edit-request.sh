#!/usr/bin/env bash
# Testa 20261004084454_client_edit_request num Postgres local descartável.
#   scripts/test-sql-booking-edit-request.sh             # harness → teste FALHA → migration 2x → passa
#   scripts/test-sql-booking-edit-request.sh --rollback  # migration + rollback: some v2/colunas novas
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55484}"
MIG="$ROOT/supabase/migrations/20261004084454_client_edit_request.sql"
RB="$ROOT/docs/rollbacks/20261004084454_client_edit_request.rollback.sql"
MIG123="$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
MIG125="$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

[ -f "$MIG" ] || { echo "faltou migration $MIG"; exit 1; }
[ -f "$RB" ] || { echo "faltou rollback $RB"; exit 1; }

LEAD_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'enforce_lead_time_on_public_bookings'"
RESCHED="SELECT to_regprocedure('public.reschedule_appointment(uuid,timestamptz,uuid)') IS NOT NULL"
BCAST_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'public_bookings_broadcast_trg'"
CANCEL_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_cancel'"
OUTCOME_TRG="SELECT count(*) FROM pg_trigger WHERE tgname = 'sync_public_booking_on_appointment_outcome'"
V1="SELECT to_regprocedure('public.get_client_bookings_history(text,uuid)') IS NOT NULL"
V1C="SELECT to_regprocedure('public.cancel_public_booking_by_client(uuid,text)') IS NOT NULL"
V2H="SELECT to_regprocedure('public.get_client_bookings_history_v2(text,uuid)') IS NOT NULL"
V1U="SELECT to_regprocedure('public.update_public_booking_by_client(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)') IS NOT NULL"

P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql"
P -f "$MIG123"
P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"
P -f "$MIG125"
P -f "$ROOT/supabase/tests/booking_edit_request.harness.sql"

intact() {
  lead="$(P -At -c "$LEAD_TRG")"
  rpc="$(P -At -c "$RESCHED")"
  bcast="$(P -At -c "$BCAST_TRG")"
  cancel="$(P -At -c "$CANCEL_TRG")"
  outcome="$(P -At -c "$OUTCOME_TRG")"
  v1="$(P -At -c "$V1")"
  v1c="$(P -At -c "$V1C")"
  v2h="$(P -At -c "$V2H")"
  v1u="$(P -At -c "$V1U")"
  echo "intact #121 lead:$lead #120 reschedule:$rpc #122 bcast:$bcast #98 cancel:$cancel #123 outcome:$outcome v1hist:$v1 v1cancel:$v1c v2hist:$v2h v1update:$v1u"
  [ "$lead" = 1 ] && [ "$rpc" = t ] && [ "$bcast" = 1 ] && [ "$cancel" = 1 ]
  [ "$outcome" = 1 ] && [ "$v1" = t ] && [ "$v1c" = t ] && [ "$v2h" = t ] && [ "$v1u" = t ]
}

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$MIG"
  P -f "$RB"
  v2u="$(P -At -c "SELECT to_regprocedure('public.update_public_booking_by_client_v2(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)') IS NULL")"
  v2a="$(P -At -c "SELECT to_regprocedure('public.accept_public_booking_v2(uuid)') IS NULL")"
  v2r="$(P -At -c "SELECT to_regprocedure('public.reject_public_booking_v2(uuid)') IS NULL")"
  v2g="$(P -At -c "SELECT to_regprocedure('public.get_booking_by_id_v2(uuid,text)') IS NULL")"
  col="$(P -At -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='business_settings' AND column_name='service_only_edit_skip_acceptance'")"
  col2="$(P -At -c "SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='public_bookings' AND column_name='original_professional_id'")"
  echo "rollback v2_gone u:$v2u a:$v2a r:$v2r g:$v2g skip_col:$col orig_pro:$col2"
  [ "$v2u" = t ] && [ "$v2a" = t ] && [ "$v2r" = t ] && [ "$v2g" = t ] && [ "$col" = 0 ] && [ "$col2" = 0 ]
  json="$(P -At -c "SELECT pg_get_functiondef('public.get_public_business_settings_json(uuid)'::regprocedure)")"
  echo "$json" | grep -q service_only_edit && { echo "JSON ainda expõe skip"; exit 1; }
  udef="$(P -At -c "SELECT pg_get_functiondef('public.update_public_booking_by_client(uuid,text,uuid[],uuid,timestamptz,timestamptz,text,text,numeric,integer,jsonb)'::regprocedure)")"
  echo "$udef" | grep -q phones_match || { echo "rollback: update v1 sem phones_match"; exit 1; }
  echo "$udef" | grep -q update_public_booking_by_client_v2 && { echo "rollback: update v1 ainda aponta para v2"; exit 1; }
  rdef="$(P -At -c "SELECT pg_get_functiondef('public.reject_public_booking(uuid)'::regprocedure)")"
  echo "$rdef" | grep -q "status = 'cancelled'" || { echo "rollback: reject v1 não cancela"; exit 1; }
  echo "$rdef" | grep -q reject_public_booking_v2 && { echo "rollback: reject v1 ainda aponta para v2"; exit 1; }
  c2def="$(P -At -c "SELECT pg_get_functiondef('public.cancel_public_booking_by_client_v2(uuid,text)'::regprocedure)")"
  echo "$c2def" | grep -q "v_booking.status = 'confirmed'" || { echo "rollback: cancel v2 sem ramo confirmed"; exit 1; }
  echo "$c2def" | grep -q is_edit && { echo "rollback: cancel v2 ainda tem is_edit"; exit 1; }
  echo "$c2def" | grep -q original_appointment_time && { echo "rollback: cancel v2 ainda usa original_appointment_time"; exit 1; }
  gdef="$(P -At -c "SELECT pg_get_functiondef('public.get_booking_by_id(uuid,text)'::regprocedure)")"
  echo "$gdef" | grep -q phones_match || { echo "rollback: get_booking v1 sem phones_match"; exit 1; }
  echo "$gdef" | grep -q get_booking_by_id_v2 && { echo "rollback: get_booking v1 ainda aponta para v2"; exit 1; }
  adef="$(P -At -c "SELECT pg_get_functiondef('public.accept_public_booking(uuid)'::regprocedure)")"
  echo "$adef" | grep -q "INSERT INTO public.appointments" || { echo "rollback: accept v1 sem INSERT"; exit 1; }
  echo "$adef" | grep -q is_edit && { echo "rollback: accept v1 ainda tem is_edit"; exit 1; }
  echo "$adef" | grep -q accept_public_booking_v2 && { echo "rollback: accept v1 ainda aponta para v2"; exit 1; }
  intact
  echo "rollback ok"
  exit 0
fi

if P -f "$ROOT/supabase/tests/booking_edit_request.test.sql" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL|ERROR|does not exist' "$TMP/before.out" | head -20 || true

P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"

P -f "$ROOT/supabase/tests/booking_edit_request.test.sql"
intact
echo "edit request idempotente; testes ok; #98/#120/#121/#122/#123 intactos; v1 encaminha v2"
