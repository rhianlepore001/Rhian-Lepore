-- ROLLBACK de 20261002120000_agenda_blocks
-- Restaura get_available_slots / public_booking_slot_busy / create_secure_booking
-- à definição da migration 20260925160000 (NoShow libera horário).
-- Não recria get_full_dates / get_first_available_professional antigos.

DROP TRIGGER IF EXISTS enforce_agenda_block_on_appointments ON public.appointments;
DROP TRIGGER IF EXISTS enforce_agenda_block_on_public_bookings ON public.public_bookings;
DROP FUNCTION IF EXISTS public.enforce_agenda_block_on_appointments();
DROP FUNCTION IF EXISTS public.enforce_agenda_block_on_public_bookings();
DROP FUNCTION IF EXISTS public.delete_agenda_block(uuid);
DROP FUNCTION IF EXISTS public.create_agenda_block(uuid, timestamptz, timestamptz, boolean);
DROP FUNCTION IF EXISTS public.staff_can_manage_agenda_block(uuid);
DROP FUNCTION IF EXISTS public.agenda_interval_blocked(text, uuid, timestamptz, timestamptz);
DROP TABLE IF EXISTS public.agenda_blocks;

ALTER TABLE public.business_settings
  DROP COLUMN IF EXISTS staff_can_block_agenda;
