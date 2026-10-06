#!/usr/bin/env bash
# Testa 20261006091119_delete_staff_block_open_appointments num Postgres local descartável
# (não usa nem toca o Supabase de prod).
#   scripts/test-sql-delete-staff-open-appointments.sh             # antes FALHA → migration 2x → passa (+ regressão do PR #138)
#   scripts/test-sql-delete-staff-open-appointments.sh --rollback  # migration + rollback: função volta byte a byte à de prod
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55497}"
PURGE_HARNESS="$ROOT/supabase/tests/staff_purge_auth_user.harness.sql"
PURGE_MIG="$ROOT/supabase/migrations/20261006071036_fix_purge_staff_refresh_tokens_cast.sql"
PURGE_TEST="$ROOT/supabase/tests/staff_purge_auth_user.test.sql"
HARNESS="$ROOT/supabase/tests/delete_staff_open_appointments.harness.sql"
TEST="$ROOT/supabase/tests/delete_staff_open_appointments.test.sql"
MIG="$ROOT/supabase/migrations/20261006091119_delete_staff_block_open_appointments.sql"
RB="$ROOT/docs/rollbacks/20261006091119_delete_staff_block_open_appointments.rollback.sql"
# delete_staff_collaborator em prod antes da migration (2026-10-06)
PROD_SRC_MD5="04f5421a5db7f934497b11f6e92e7abf"
PROD_DEF_MD5="bab4c05346919164cc6899dd2b0cbd9f"
PROD_SIG="{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres} true search_path=public postgres"
PURGE_SRC_MD5="bca21e308d17cbbb6015c8af629046c2"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }
for f in "$PURGE_HARNESS" "$PURGE_MIG" "$PURGE_TEST" "$HARNESS" "$TEST" "$MIG" "$RB"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done
# Cada cenário num cluster novo (os harnesses criam roles globais).
fresh() {
  "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$TMP/data"
  "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
  P -f "$PURGE_HARNESS"
  P -f "$PURGE_MIG"
  P -f "$HARNESS"
  [ "$(state)" = "$PROD_SRC_MD5 $PROD_DEF_MD5 $PROD_SIG" ] || { echo "harness != prod: $(state)"; exit 1; }
  [ "$(purge_md5)" = "$PURGE_SRC_MD5" ] || { echo "purge do harness != prod: $(purge_md5)"; exit 1; }
}
state() { P -At -c "SELECT md5(prosrc) || ' ' || md5(pg_get_functiondef(oid)) || ' ' || proacl::text || ' ' || prosecdef::text || ' ' || array_to_string(proconfig, ',') || ' ' || pg_get_userbyid(proowner) FROM pg_proc WHERE oid = 'public.delete_staff_collaborator(uuid)'::regprocedure"; }
purge_md5() { P -At -c "SELECT md5(prosrc) FROM pg_proc WHERE oid = 'public.purge_staff_auth_user(uuid,text)'::regprocedure"; }
comment() { P -At -c "SELECT obj_description('public.delete_staff_collaborator(uuid)'::regprocedure, 'pg_proc')"; }

if [ "${1:-}" = "--rollback" ]; then
  fresh
  H="$(state)"; C="$(comment)"
  P -f "$MIG"; P -f "$MIG"
  P -f "$RB"; P -f "$RB"
  R="$(state)"
  echo "após rollback: $R"
  [ "$R" = "$H" ] || { echo "rollback não restaurou a definição de prod"; exit 1; }
  [ "$(comment)" = "$C" ] || { echo "rollback mudou o COMMENT"; exit 1; }
  [ "$(purge_md5)" = "$PURGE_SRC_MD5" ] || { echo "rollback mexeu no purge"; exit 1; }
  echo "rollback ok (byte a byte igual a prod)"
  exit 0
fi

fresh
echo "harness = prod: $(state)"
if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL' "$TMP/before.out" | sed 's/^/  /' || true

fresh
C="$(comment)"
P -f "$MIG"; P -f "$MIG"
A="$(state)"
echo "migration aplicada 2x: $A"
read -r a_src a_def a_acl a_secdef a_cfg a_owner <<<"$A"
[ "$a_src" != "$PROD_SRC_MD5" ] || { echo "migration não mudou o corpo"; exit 1; }
[ "$a_acl $a_secdef $a_cfg $a_owner" = "$PROD_SIG" ] || { echo "migration mudou ACL/definer/search_path/dono"; exit 1; }
[ "$(comment)" = "$C" ] || { echo "migration mudou o COMMENT"; exit 1; }
[ "$(purge_md5)" = "$PURGE_SRC_MD5" ] || { echo "migration mexeu no purge"; exit 1; }
P -f "$TEST"
echo "delete_staff_open_appointments.test ok"

# Regressão: exclusão com/sem login, caminho EXCEPTION, notificações, reconvite (PR #138)
fresh
P -f "$MIG"
P -f "$PURGE_TEST" > "$TMP/purge.out" 2>&1 || { cat "$TMP/purge.out"; exit 1; }
echo "staff_purge_auth_user.test (PR #138) ok com a guarda"
echo "delete staff open appointments: testes ok"
