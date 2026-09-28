import { useCallback, useEffect, useRef, useState } from 'react';

/** Duração do destaque do card recém-criado (pulso/contorno). */
export const FOCUS_HIGHLIGHT_MS = 2000;
/** Por quanto tempo esperamos o refetch trazer o card antes de desistir. */
const FOCUS_WAIT_MS = 6000;
const FOCUS_POLL_MS = 50;

export interface CreatedAppointmentTarget {
  /** booking_id devolvido pelo create_secure_booking (pode faltar). */
  id?: string | null;
  professionalId?: string | null;
  /** HH:MM local, usado como fallback (slot da grade). */
  time: string;
}

type AppointmentLike = { id: string };

function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function findTargetElement(target: CreatedAppointmentTarget, hasAppointment: boolean): Element | null {
  if (target.id) {
    // Só o card do agendamento NOVO (nunca um card antigo no mesmo horário)
    if (!hasAppointment) return null;
    return document.querySelector(`[data-appointment-id="${CSS.escape(target.id)}"]`);
  }
  if (!target.professionalId) return null;
  return document.querySelector(
    `[data-testid="agenda-col-${CSS.escape(target.professionalId)}"] [data-agenda-slot="${CSS.escape(target.time)}"]`,
  );
}

/**
 * Após criar um agendamento: espera o card aparecer na grade (refetch),
 * rola até ele (centralizado, vertical e horizontal) e destaca por ~2s.
 * Respeita prefers-reduced-motion (rolagem instantânea; o CSS tira o pulso).
 */
export function useFocusCreatedAppointment(appointments: AppointmentLike[]) {
  const [target, setTarget] = useState<CreatedAppointmentTarget | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const startedAt = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusCreated = useCallback((next: CreatedAppointmentTarget) => {
    startedAt.current = Date.now();
    setTarget(next);
  }, []);

  const hasAppointment = !!target?.id && appointments.some((a) => a.id === target.id);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    let poll: ReturnType<typeof setTimeout> | null = null;

    const attempt = () => {
      if (cancelled) return;
      const el = findTargetElement(target, hasAppointment);
      if (el) {
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        setTarget(null);
        if (target.id) {
          setHighlightId(target.id);
          if (clearTimer.current) clearTimeout(clearTimer.current);
          clearTimer.current = setTimeout(() => {
            clearTimer.current = null;
            setHighlightId(null);
          }, FOCUS_HIGHLIGHT_MS);
        }
        return;
      }
      if (Date.now() - startedAt.current >= FOCUS_WAIT_MS) {
        setTarget(null); // refetch falhou / card fora da grade: desiste em silêncio
        return;
      }
      poll = setTimeout(attempt, FOCUS_POLL_MS);
    };
    // espera o commit/paint da grade antes de medir
    poll = setTimeout(attempt, 0);
    return () => {
      cancelled = true;
      if (poll) clearTimeout(poll);
    };
  }, [target, hasAppointment]);

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  return { highlightId, focusCreated };
}

/**
 * Garante que a coluna do profissional esteja visível no filtro da agenda:
 * sem filtro (todos) ou já incluído -> mesmo array; senão adiciona.
 */
export function ensureProfessionalVisible(selectedIds: string[], professionalId?: string | null): string[] {
  if (!professionalId || selectedIds.length === 0 || selectedIds.includes(professionalId)) return selectedIds;
  return [...selectedIds, professionalId];
}
