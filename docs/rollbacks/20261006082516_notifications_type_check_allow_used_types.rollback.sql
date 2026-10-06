-- Rollback de 20261006082516_notifications_type_check_allow_used_types.
-- Restaura EXATAMENTE o CHECK anterior de prod (pg_get_constraintdef em 2026-10-06):
--   CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text])))
--
-- ATENÇÃO:
--   - Com o CHECK antigo o sino volta a NÃO salvar pedidos novos/alterações nem
--     lembretes de comissão (o bug volta).
--   - Se já existirem linhas com type 'new'/'edit'/'commission_reminder', o CHECK
--     antigo não pode ser validado. Este rollback NÃO apaga nada em silêncio: ele
--     aborta com erro (nada é alterado) e informa quantas linhas bloqueiam.
--     Decidir antes, explicitamente, o que fazer com elas (ex.: apagar com um
--     DELETE revisado, ou mudar o type para 'info'), e então rodar de novo.

BEGIN;

DO $$
DECLARE
  v_blocking bigint;
BEGIN
  SELECT count(*) INTO v_blocking
  FROM public.notifications
  WHERE type IS NOT NULL
    AND type <> ALL (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text]);
  IF v_blocking > 0 THEN
    RAISE EXCEPTION 'rollback abortado: % notificação(ões) com type fora do CHECK antigo; nada foi alterado', v_blocking;
  END IF;
END
$$;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK ((type = ANY (ARRAY['info'::text, 'warning'::text, 'success'::text, 'danger'::text])));
COMMIT;
