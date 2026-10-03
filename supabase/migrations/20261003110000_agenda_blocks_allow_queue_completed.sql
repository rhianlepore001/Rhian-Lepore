-- =============================================================================
-- Hotfix: fila (settle_queue_ticket) durante bloqueio de agenda (B-41, C-B20)
-- =============================================================================
-- settle_queue_ticket grava o atendimento já como 'Completed' em now(). O trigger
-- de 20261002120000 só liberava Cancelled/NoShow e recusava fechar a senha com
-- bloqueio ativo. Completed não ocupa horário (ACCEPTANCE 0.6 / B-30 / B-40),
-- então passa direto. Só muda a primeira condição do trigger.
--
-- ROLLBACK: docs/rollbacks/20261003110000_agenda_blocks_allow_queue_completed_rollback.sql
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_agenda_block_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end timestamptz;
BEGIN
  IF NEW.status IN ('Cancelled', 'NoShow', 'Completed') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Atendimento que já ocupava o intervalo (bloqueio com ack) continua editável.
  -- Recusa só quem entra no bloqueio (INSERT ou mover de horário livre para travado).
  -- Cancelled/NoShow/Completed reativado no intervalo travado NÃO herda o skip.
  IF TG_OP = 'UPDATE'
     AND OLD.professional_id IS NOT NULL
     AND OLD.status NOT IN ('Cancelled', 'NoShow', 'Completed') THEN
    v_end := OLD.appointment_time + make_interval(mins => GREATEST(COALESCE(OLD.duration_minutes, 30), 1));
    IF public.agenda_interval_blocked(OLD.user_id, OLD.professional_id, OLD.appointment_time, v_end) THEN
      RETURN NEW;
    END IF;
  END IF;
  v_end := NEW.appointment_time + make_interval(mins => GREATEST(COALESCE(NEW.duration_minutes, 30), 1));
  IF public.agenda_interval_blocked(NEW.user_id, NEW.professional_id, NEW.appointment_time, v_end) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Este horário está bloqueado. Remova o bloqueio para agendar.',
      HINT = 'agenda_blocked';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.enforce_agenda_block_on_appointments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_agenda_block_on_appointments() TO service_role;

COMMIT;
