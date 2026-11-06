#!/usr/bin/env bash
# Testa 20261031160000_trial_promotion_more_slots num Postgres local descartável (não toca prod).
#   scripts/test-sql-trial-promotion-more-slots.sh             # TDD (falha antes) → migration 2x → checks
#   scripts/test-sql-trial-promotion-more-slots.sh --rollback  # migration + rollback = limite 10 (e nunca abaixo de used)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -n "$PGBIN" ] && [ -x "$PGBIN/psql" ] || { echo "Postgres local não encontrado (PGBIN)."; exit 1; }
TMP="$(mktemp -d)"; PORT="${PGPORT_TEST:-55509}"
M="$ROOT/supabase/migrations"
MIG="$M/20261031160000_trial_promotion_more_slots.sql"
RB="$ROOT/docs/rollbacks/20261031160000_trial_promotion_more_slots.rollback.sql"
TEST="$ROOT/supabase/tests/trial_promotion_more_slots.test.sql"
export PGOPTIONS="-c client_min_messages=warning"
stop() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP/data"; }
trap 'stop; rm -rf "$TMP"' EXIT
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
setup() {
  stop
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-k $TMP -p $PORT -c listen_addresses=''" -w start >/dev/null
  P -f "$ROOT/supabase/tests/owner_signup_profile.harness.sql"
  P -c "CREATE TABLE IF NOT EXISTS public.system_errors (id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY, error_message text NOT NULL, stack_trace text, component_stack text, severity varchar DEFAULT 'error', context jsonb DEFAULT '{}'::jsonb, user_id uuid, resolved boolean DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())"
  P -f "$M/20261012130157_log_signup_error.sql"; P -f "$M/20261012130203_owner_signup_profile.sql"
  P -f "$M/20261012145609_signup_trial_promotion.sql"
  P -c "UPDATE public.trial_promotions SET used = 9 WHERE id = 'signup_30d_first10'"   # estado de prod em 31/10/2026
  P -c "INSERT INTO public.trial_promotion_grants (user_id, promotion_id, trial_days) SELECT 'g' || g, 'signup_30d_first10', 30 FROM generate_series(1,9) g"
}
if [ "${1:-}" = "--rollback" ]; then
  setup
  P -f "$MIG"; P -f "$RB"
  [ "$(P -At -c "SELECT used || '/' || max_uses FROM public.trial_promotions")" = "9/10" ] || { echo "rollback não voltou a 9/10"; exit 1; }
  P -f "$MIG"; P -c "UPDATE public.trial_promotions SET used = 15"; P -f "$RB"
  [ "$(P -At -c "SELECT used || '/' || max_uses FROM public.trial_promotions")" = "15/15" ] || { echo "rollback não respeitou used"; exit 1; }
  echo "rollback ok: limite volta a 10 (ou ao usado, se maior); roda 2x sem erro"; exit 0
fi
setup
echo "--- ANTES da migração (esperado: FAIL)"
out="$(P -At -F ' ' -f "$TEST" 2>&1 || true)"; echo "$out" | head -12
echo "$out" | rg -q 'FAIL' || { echo "TDD: deveria falhar antes da migração"; exit 1; }
P -f "$MIG"; P -f "$MIG"; echo "migration aplicada 2x"
[ "$(P -At -c "SELECT used || '/' || max_uses FROM public.trial_promotions")" = "9/20" ] || { echo "2ª aplicação mexeu no limite"; exit 1; }
out="$(P -At -F ' ' -f "$TEST")"; echo "$out"
if echo "$out" | rg -q 'FAIL'; then echo "trial_promotion_more_slots: FALHOU"; exit 1; fi
echo "trial promotion more slots: testes ok"
