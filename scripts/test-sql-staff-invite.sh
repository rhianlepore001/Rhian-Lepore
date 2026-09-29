#!/usr/bin/env bash
# Testa a migration 20260929120000_staff_invite_hardening num Postgres local e
# descartável (não usa nem toca o Supabase de prod). Empilhada sobre a do #105.
#   scripts/test-sql-staff-invite.sh             # harness + #105 + migration (2x) + testes do #105 + testes do convite + corrida real (I-18)
#   scripts/test-sql-staff-invite.sh --pre       # só #105 (estado depois do #105, sem esta migration): deve FALHAR
#   scripts/test-sql-staff-invite.sh --rollback  # migration + rollback (#108, depois #105): volta às definições e ACLs (md5)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55444}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
MIG105="$ROOT/supabase/migrations/20260929090000_ex_staff_access.sql"
MIG="$ROOT/supabase/migrations/20260929120000_staff_invite_hardening.sql"
RB="$ROOT/docs/rollbacks/20260929120000_staff_invite_hardening_rollback.sql"
VERIFY="$ROOT/docs/rollbacks/20260929120000_staff_invite_hardening_verify.sql"

# md5(pg_get_functiondef) em prod (29/09/2026) e do relink na versão do #105.
FNS="complete_staff_invite accept_staff_invite get_team_member_for_invite handle_new_user release_staff_email_for_reinvite relink_staff_if_unbound"
EXPECTED_MD5="accept_staff_invite(text,uuid)=1d4a305c3109970f0e004e26fa8ad025
complete_staff_invite(text,uuid,date)=a5809f9a449e6acdf373538ee31bd27c
get_team_member_for_invite(text,uuid)=344eaa113c0f5cdc29c763a5ac926c8c
handle_new_user()=75b03967cb6677fe891bf1d784572f30
release_staff_email_for_reinvite(text,uuid,text)=b06c5aa6c727be241fb73372ebd4635d
relink_staff_if_unbound()=RELINK105"
RELINK_PROD=dc16b8a430cb52bd154736a642d46104
RELINK_105=c64e25092ddda0841c28c1dee441d617
state() { # assinatura=md5 de cada função, na ordem
  "${PSQL[@]}" -At -c "SELECT string_agg(p.oid::regprocedure::text || '=' || md5(pg_get_functiondef(p.oid)), E'\n' ORDER BY 1)
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = ANY (string_to_array('$FNS', ' '))"
}
acls() {
  "${PSQL[@]}" -At -c "SELECT string_agg(p.oid::regprocedure::text || ' ' || COALESCE(p.proacl::text, '<default>'), E'\n' ORDER BY 1)
    FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = ANY (string_to_array('$FNS', ' '))"
}
extras() {
  "${PSQL[@]}" -At -c "SELECT COALESCE(to_regclass('public.staff_invites')::text, '-') || ' ' || count(*) FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace AND proname IN ('get_or_create_staff_invite', 'rotate_staff_invite', 'staff_invite_token_is_valid')"
}

"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.harness.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_invite.harness.sql"
want_prod="$(printf '%s\n' "$EXPECTED_MD5" | sed "s/RELINK105/$RELINK_PROD/")"
[ "$(state)" = "$want_prod" ] || { echo "FAIL harness: md5 diferente de prod"; diff <(state) <(echo "$want_prod"); exit 1; }
echo "PASS harness: as 6 funções com o md5 de prod"
"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.baseline.sql"

"${PSQL[@]}" -f "$MIG105"
want_105="$(printf '%s\n' "$EXPECTED_MD5" | sed "s/RELINK105/$RELINK_105/")"
[ "$(state)" = "$want_105" ] || { echo "FAIL #105: md5 inesperado"; diff <(state) <(echo "$want_105"); exit 1; }
echo "PASS #105 aplicado: relink na versão do #105 ($RELINK_105), demais funções = prod"
ACL_BEFORE="$(acls)"

MODE="${1:-}"
if [ "$MODE" != "--pre" ]; then
  "${PSQL[@]}" -f "$MIG"
  "${PSQL[@]}" -f "$MIG" # idempotência
  "${PSQL[@]}" -f "$VERIFY" >"$TMP/verify.out" 2>&1 || true
  grep -q "staff_invite verify: OK" "$TMP/verify.out" \
    && echo "PASS verificação pós-aplicação (a mesma que roda em prod)" || { echo "FAIL verificação pós-aplicação"; cat "$TMP/verify.out"; exit 1; }
else
  if "${PSQL[@]}" -f "$VERIFY" >/dev/null 2>&1; then echo "FAIL verificação aceitou o estado sem a migration"; exit 1; fi
  echo "PASS verificação pós-aplicação recusa o estado sem a migration"
fi

if [ "$MODE" = "--rollback" ]; then
  "${PSQL[@]}" -f "$RB"
  [ "$(state)" = "$want_105" ] || { echo "FAIL rollback: md5"; diff <(state) <(echo "$want_105"); exit 1; }
  [ "$(acls)" = "$ACL_BEFORE" ] || { echo "FAIL rollback: ACL"; diff <(acls) <(echo "$ACL_BEFORE"); exit 1; }
  [ "$(extras)" = "- 0" ] || { echo "FAIL rollback: sobrou $(extras)"; exit 1; }
  if "${PSQL[@]}" -f "$VERIFY" >/dev/null 2>&1; then echo "FAIL verificação aceitou o estado revertido"; exit 1; fi
  echo "PASS rollback: md5 e ACL das 6 funções idênticos (5 de prod + relink do #105); staff_invites e RPCs novas removidas"
  "${PSQL[@]}" -f "$RB" >/dev/null 2>&1 && echo "PASS rollback idempotente (2ª execução)" || { echo "FAIL rollback 2ª execução"; exit 1; }
  # Ordem documentada: rollback do #108 (acima) e só depois o do #105 -> tudo = prod.
  "${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260929090000_ex_staff_access_rollback.sql" >/dev/null
  [ "$(state)" = "$want_prod" ] || { echo "FAIL rollback #108 -> #105: md5"; diff <(state) <(echo "$want_prod"); exit 1; }
  [ "$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public.get_auth_company_id()'::regprocedure))")" = 4e27234398ff92bddb5bfb359afbc677 ] \
    || { echo "FAIL rollback #108 -> #105: get_auth_company_id"; exit 1; }
  echo "PASS rollback na ordem #108 -> #105: as 6 funções e get_auth_company_id com o md5 de prod"
  exit 0
fi

# Testes do #105 continuam passando (com o convite do a8 carregando o token).
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_invite.fixture_ex_staff.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/ex_staff_access.test.sql"
"${PSQL[@]}" -f "$ROOT/supabase/tests/staff_invite.test.sql"

# I-18: corrida real entre duas conexões com o MESMO token (dc na empresa A).
# A 1ª conta vincula e segura a transação; a 2ª fica esperando o lock e, depois
# do commit da 1ª, recebe invalid_invite. Um único vínculo no fim.
A=00000000-0000-0000-0000-0000000000a0; DC=20000000-0000-0000-0000-0000000000dc
CD=30000000-0000-0000-0000-0000000000cd; CE=30000000-0000-0000-0000-0000000000ce
as_sql() { printf "BEGIN; SELECT public._as('%s'); SET LOCAL ROLE authenticated; %s COMMIT;" "$1" "$2"; }
TOKEN="$("${PSQL[@]}" -At -c "$(as_sql "$A" "SELECT public.get_or_create_staff_invite('$DC');")" | grep -E '^[0-9a-f]{64}$')"
CLAIM="SELECT public.complete_staff_invite('$A', '$DC', '1990-01-01', '$TOKEN');"
"${PSQL[@]}" -At -c "$(as_sql "$CD" "$CLAIM SELECT pg_sleep(3);")" >"$TMP/race1" 2>&1 &
P1=$!
for _ in $(seq 50); do [ "$("${PSQL[@]}" -At -c "SELECT count(*) FROM pg_stat_activity WHERE query LIKE '%pg_sleep(3)%' AND pid <> pg_backend_pid()")" = 1 ] && break; sleep 0.1; done
"${PSQL[@]}" -At -c "$(as_sql "$CE" "$CLAIM")" >"$TMP/race2" 2>&1 &
P2=$!
WAITED=0
for _ in $(seq 25); do
  [ "$("${PSQL[@]}" -At -c "SELECT count(*) FROM pg_locks WHERE NOT granted")" != 0 ] && { WAITED=1; break; }
  sleep 0.1
done
wait $P1 || true; wait $P2 || true
LINKED="$("${PSQL[@]}" -At -c "SELECT COALESCE(staff_user_id::text, 'NULL') FROM public.team_members WHERE id = '$DC'")"
if [ "$WAITED" = 1 ] && grep -q "$DC" "$TMP/race1" && grep -q "invalid_invite" "$TMP/race2" && [ "$LINKED" = "$CD" ]; then
  echo "PASS I-18 corrida real com o mesmo token: 2ª conexão esperou o lock e recebeu invalid_invite; vínculo único ($LINKED)"
else
  echo "FAIL I-18 corrida: waited=$WAITED linked=$LINKED"; echo "--- 1:"; cat "$TMP/race1"; echo "--- 2:"; cat "$TMP/race2"; exit 1
fi
