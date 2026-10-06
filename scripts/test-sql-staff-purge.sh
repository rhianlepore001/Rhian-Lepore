#!/usr/bin/env bash
# Testa 20261006071036_fix_purge_staff_refresh_tokens_cast num Postgres local
# descartável (não usa nem toca o Supabase de prod).
#   scripts/test-sql-staff-purge.sh             # harness (= prod) → teste FALHA → migration 2x → passa
#   scripts/test-sql-staff-purge.sh --rollback  # migration + rollback: função volta byte a byte à de prod
# O harness cria auth.refresh_tokens.user_id como varchar (igual a prod); por isso
# reproduz o 42883 que os testes antigos (uuid no stub) não pegavam.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "Postgres local não encontrado (PGBIN). Instale postgresql e rode de novo."
  exit 1
fi
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55491}"
HARNESS="$ROOT/supabase/tests/staff_purge_auth_user.harness.sql"
TEST="$ROOT/supabase/tests/staff_purge_auth_user.test.sql"
MIG="$ROOT/supabase/migrations/20261006071036_fix_purge_staff_refresh_tokens_cast.sql"
RB="$ROOT/docs/rollbacks/20261006071036_fix_purge_staff_refresh_tokens_cast.rollback.sql"
# Estado de prod antes da migration (2026-10-06)
PROD_SRC_MD5="0bcef78a023f3b03032af24119377b7c"
PROD_DEF_MD5="89c06105ce3faaf49878c328d941753e"
PROD_ACL="{postgres=X/postgres,service_role=X/postgres}"
DEL_SRC_MD5="04f5421a5db7f934497b11f6e92e7abf"
REL_SRC_MD5="07d4634a090c0736935ae7a94b92ff76"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
export PGOPTIONS="-c client_min_messages=warning"
P() { "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

for f in "$HARNESS" "$TEST" "$MIG" "$RB"; do [ -f "$f" ] || { echo "faltou $f"; exit 1; }; done

FN="'public.purge_staff_auth_user(uuid,text)'::regprocedure"
state() { P -At -c "SELECT md5(prosrc) || ' ' || md5(pg_get_functiondef(oid)) || ' ' || proacl::text || ' ' || prosecdef::text || ' ' || array_to_string(proconfig, ',') || ' ' || pg_get_userbyid(proowner) FROM pg_proc WHERE oid = $FN"; }
others() { P -At -c "SELECT string_agg(md5(prosrc), ' ' ORDER BY proname) FROM pg_proc WHERE oid IN ('public.delete_staff_collaborator(uuid)'::regprocedure, 'public.release_staff_email_for_reinvite(text,uuid,text)'::regprocedure)"; }

P -f "$HARNESS"
H="$(state)"
echo "harness purge: $H"
[ "$H" = "$PROD_SRC_MD5 $PROD_DEF_MD5 $PROD_ACL true search_path=public postgres" ] || { echo "harness != prod"; exit 1; }
[ "$(others)" = "$DEL_SRC_MD5 $REL_SRC_MD5" ] || { echo "harness delete/release != prod"; exit 1; }

if [ "${1:-}" = "--rollback" ]; then
  P -f "$MIG"
  P -f "$MIG"
  P -f "$RB"
  R="$(state)"
  echo "após rollback: $R"
  [ "$R" = "$H" ] || { echo "rollback não restaurou a definição de prod"; exit 1; }
  [ "$(others)" = "$DEL_SRC_MD5 $REL_SRC_MD5" ] || { echo "rollback mexeu em delete/release"; exit 1; }
  echo "rollback ok (byte a byte igual a prod)"
  exit 0
fi

if P -f "$TEST" > "$TMP/before.out" 2>&1; then
  echo "ERRO: o teste deveria falhar antes da migration"; cat "$TMP/before.out"; exit 1
fi
echo "antes da migration (esperado FAIL):"
grep -E 'FAIL' "$TMP/before.out" || true

# Banco limpo para rodar de novo com a migration
P -c "DROP SCHEMA auth CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;" >/dev/null
P -c "DROP ROLE anon; DROP ROLE authenticated; DROP ROLE service_role;" >/dev/null
P -f "$HARNESS"
P -f "$MIG"
P -f "$MIG"
echo "migration aplicada 2x"
A="$(state)"
echo "após migration: $A"
read -r a_src a_def a_acl a_secdef a_cfg a_owner <<<"$A"
[ "$a_src" != "$PROD_SRC_MD5" ] || { echo "migration não mudou o corpo"; exit 1; }
[ "$a_acl $a_secdef $a_cfg $a_owner" = "$PROD_ACL true search_path=public postgres" ] || { echo "migration mudou ACL/definer/search_path/dono"; exit 1; }
[ "$(others)" = "$DEL_SRC_MD5 $REL_SRC_MD5" ] || { echo "migration mexeu em delete/release"; exit 1; }

P -f "$TEST"
echo "staff purge: testes ok; ACL/definer/search_path/dono iguais a prod"
