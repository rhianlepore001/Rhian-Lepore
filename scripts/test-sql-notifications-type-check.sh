#!/usr/bin/env bash
# Testa 20261006082516_notifications_type_check_allow_used_types num Postgres local
# descartável (não usa nem toca o Supabase de prod). Usa o espelho de prod de
# public.notifications (CHECK de type, NOT NULL, FK p/ profiles, RLS, grants), que
# faltava nos harnesses antigos — por isso PR-7 e lembretes passavam local e
# falhavam em prod.
#   scripts/test-sql-notifications-type-check.sh             # antes FALHA → migration 2x → passa
#   scripts/test-sql-notifications-type-check.sh --rollback  # rollback volta o CHECK exato de prod e não apaga nada
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55495}"
MIG="$ROOT/supabase/migrations/20261006082516_notifications_type_check_allow_used_types.sql"
RB="$ROOT/docs/rollbacks/20261006082516_notifications_type_check_allow_used_types.rollback.sql"
FIDELITY="$ROOT/supabase/tests/notifications_prod_fidelity.harness.sql"
TEST="$ROOT/supabase/tests/notifications_type_check.test.sql"
PROD_CHECK="CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text])))"
NEW_CHECK="CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text, 'new'::text, 'edit'::text, 'commission_reminder'::text])))"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
for f in "$MIG" "$RB" "$FIDELITY" "$TEST"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
# Cada cenário roda num cluster novo (os harnesses criam roles globais).
fresh() {
  "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP/data"
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses='' -c timezone=UTC" -l "$TMP/log" start >/dev/null
}
# Cadeia do PR-7 (igual a scripts/test-sql-booking-notifications.sh) + espelho de prod
pr7_chain() {
  fresh
  P -f "$ROOT/supabase/tests/booking_completed_noshow.harness.sql" 2>&1 | grep -v -E 'wal_level|HINT:  Set' || true
  P -f "$ROOT/supabase/migrations/20261004072408_public_booking_completed_noshow.sql"
  P -f "$ROOT/supabase/tests/booking_cancel_cutoff.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004082633_client_cancel_cutoff.sql"
  P -f "$ROOT/supabase/tests/booking_edit_request.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004101021_client_edit_request.sql"
  P -f "$ROOT/supabase/tests/booking_notifications.harness.sql"
  P -f "$ROOT/supabase/migrations/20261004112214_booking_notifications.sql"
  P -f "$FIDELITY"
  [ "$(checkdef)" = "$PROD_CHECK" ] || { echo "espelho != prod: $(checkdef)"; exit 1; }
}
# Cadeia dos ciclos de comissão (igual a scripts/test-sql-commission-schedules.sh) + espelho de prod
commission_chain() {
  fresh
  P -f "$ROOT/supabase/tests/staff_performance.harness.sql"
  P -f "$ROOT/supabase/migrations/20261003110000_staff_performance_v1.sql"
  P -f "$ROOT/supabase/tests/commission_schedules.harness.sql"
  # Cópia congelada do core pré-PR-D (o teste de paridade usa), como no script original.
  P -c "DO \$\$ BEGIN EXECUTE replace(pg_get_functiondef('public._commission_cycle_core(text,date,timestamptz)'::regprocedure), 'public._commission_cycle_core(', 'public._legacy_commission_cycle_core('); END \$\$;"
  P -f "$ROOT/supabase/migrations/20261004182606_commission_schedules.sql"
  P -f "$FIDELITY"
  [ "$(checkdef)" = "$PROD_CHECK" ] || { echo "espelho != prod: $(checkdef)"; exit 1; }
}
checkdef() { P -At -c "SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND conname = 'notifications_type_check'"; }

if [ "${1:-}" = "--rollback" ]; then
  pr7_chain
  echo "espelho de prod ok: $(checkdef)"
  P -f "$MIG"; P -f "$MIG"
  [ "$(checkdef)" = "$NEW_CHECK" ] || { echo "migration não aplicou"; exit 1; }
  # Com linha de tipo novo: rollback aborta e NÃO apaga nada
  P -c "INSERT INTO public.notifications (user_id, title, message, type) VALUES ('00000000-0000-0000-0000-0000000000a0', 't', 'm', 'new')"
  if P -f "$RB" > "$TMP/rb1.out" 2>&1; then echo "ERRO: rollback deveria abortar com linha 'new'"; cat "$TMP/rb1.out"; exit 1; fi
  grep -o 'rollback abortado[^;]*' "$TMP/rb1.out"
  [ "$(checkdef)" = "$NEW_CHECK" ] || { echo "rollback abortado deixou CHECK diferente"; exit 1; }
  [ "$(P -At -c "SELECT count(*) FROM public.notifications WHERE type = 'new'")" = 1 ] || { echo "rollback apagou linha"; exit 1; }
  echo "rollback com linha nova: abortou, CHECK intacto, linha preservada"
  # Sem linhas de tipo novo: rollback volta o CHECK exato de prod (2x = idempotente)
  P -c "DELETE FROM public.notifications"
  P -f "$RB"; P -f "$RB"
  [ "$(checkdef)" = "$PROD_CHECK" ] || { echo "rollback != prod: $(checkdef)"; exit 1; }
  echo "rollback ok: $(checkdef)"
  exit 0
fi

fails=0
expect_fail() {
  local file="$1" label="$2"
  if P -f "$file" > "$TMP/$label.out" 2>&1; then
    echo "ERRO: $label deveria FALHAR antes da migration"; cat "$TMP/$label.out"; fails=1
  else
    echo "antes da migration — $label (esperado FAIL):"
    grep -E 'FAIL|ERROR' "$TMP/$label.out" | sed 's/^/  /' | head -14
  fi
}
pr7_chain
echo "espelho de prod ok: $(checkdef)"
expect_fail "$TEST" "notifications_type_check.test"
pr7_chain
expect_fail "$ROOT/supabase/tests/booking_notifications.test.sql" "booking_notifications.test"
commission_chain
expect_fail "$ROOT/supabase/tests/commission_schedules.test.sql" "commission_schedules.test"
[ "$fails" = 0 ] || exit 1

pr7_chain
P -f "$MIG"; P -f "$MIG"
echo "migration aplicada 2x: $(checkdef)"
[ "$(checkdef)" = "$NEW_CHECK" ] || { echo "CHECK inesperado"; exit 1; }
P -f "$TEST"
echo "notifications_type_check.test ok"
pr7_chain
P -f "$MIG"
P -f "$ROOT/supabase/tests/booking_notifications.test.sql" > "$TMP/pr7.out" 2>&1 || { cat "$TMP/pr7.out"; exit 1; }
echo "booking_notifications.test (PR-7: trigger, dedupe, RLS, grants, aceite/recusa) ok com o espelho de prod"
commission_chain
P -f "$MIG"
P -At -f "$ROOT/supabase/tests/commission_schedules.test.sql" > "$TMP/comm.out" 2>&1 || { cat "$TMP/comm.out"; exit 1; }
echo "commission_schedules.test (lembrete salvo no sino) ok com o espelho de prod"
echo "notifications type check: testes ok"
