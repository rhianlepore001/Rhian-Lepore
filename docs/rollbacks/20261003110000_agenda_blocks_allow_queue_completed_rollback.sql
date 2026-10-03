-- =============================================================================
-- ROLLBACK de 20261003110000_agenda_blocks_allow_queue_completed
-- =============================================================================
-- Volta enforce_agenda_block_on_appointments() ao corpo de 20261002120000
-- (live em 2026-10-03, md5 de pg_get_functiondef 150219aaaec7688797ec0e09229d8da5).
-- Efeito: fechar senha da fila volta a falhar durante bloqueio ativo.
-- Nenhuma linha é tocada.
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
  IF NEW.status IN ('Cancelled', 'NoShow') THEN
    RETURN NEW;
  END IF;
  IF NEW.professional_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- Atendimento que já ocupava o intervalo (bloqueio com ack) continua editável.
  -- Recusa só quem entra no bloqueio (INSERT ou mover de horário livre para travado).
  -- Cancelled/NoShow reativado no intervalo travado NÃO herda o skip.
  IF TG_OP = 'UPDATE'
     AND OLD.professional_id IS NOT NULL
     AND OLD.status NOT IN ('Cancelled', 'NoShow') THEN
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
