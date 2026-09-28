#!/usr/bin/env bash
# Encaixe em horário passado (D1a): prova, num Postgres local e descartável,
# que create_secure_booking (definição EXATA de prod, conferida por md5) aceita
# horários passados — vazio, cancelado e falta — para dono e colaborador, sem
# tocar na falta, e que o conflito com agendamento ativo continua valendo.
# Nenhuma migration: só verificação do comportamento atual do servidor.
#   scripts/test-sql-past-encaixe.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
TMP="$(mktemp -d)"
PORT="${PGPORT_TEST:-55459}"
cleanup() { "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
"$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
"$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=("$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f "$ROOT/supabase/tests/noshow_slots.harness.sql"
# Estado atual de prod = definições antigas (rollback) + migration da falta (já aplicada em prod)
"${PSQL[@]}" -f "$ROOT/docs/rollbacks/20260925160000_noshow_frees_slot_rollback.sql"
"${PSQL[@]}" -f "$ROOT/supabase/migrations/20260925160000_noshow_frees_slot.sql"
"${PSQL[@]}" -c "GRANT EXECUTE ON FUNCTION public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text) TO authenticated"
# md5 de pg_get_functiondef em prod (lido em 2026-09-28 via SELECT)
PROD_MD5="1a6c8588fdf8fefa7434882128c2e631"
got="$("${PSQL[@]}" -At -c "SELECT md5(pg_get_functiondef('public.create_secure_booking(uuid,uuid,text,text,text,timestamptz,text[],numeric,integer,text,uuid,text,text,text)'::regprocedure))")"
[ "$got" = "$PROD_MD5" ] || { echo "create_secure_booking local difere de prod: $got"; exit 1; }
echo "create_secure_booking = prod (md5 ok)"
"${PSQL[@]}" -f "$ROOT/supabase/tests/past_encaixe.test.sql"
