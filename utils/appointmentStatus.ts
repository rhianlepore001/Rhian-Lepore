import { parseDate } from './date';

/**
 * Estado VISUAL de um agendamento (derivado), independente do tema.
 * - completed: concluído (status Completed)
 * - cancelled: cancelado (status Cancelled)
 * - noshow: não compareceu (status NoShow)
 * - overdue: passou do horário + duração + tolerância sem confirmar/concluir
 * - normal: confirmado/pendente dentro do prazo
 */
export type VisualStatus = 'completed' | 'overdue' | 'normal' | 'noshow' | 'cancelled';

export interface AppointmentLike {
  status: string;
  appointment_time: string;
  duration_minutes?: number | null;
}

/** Tolerância antes de marcar como atrasado (PRD §2 / regra R9a). */
export const OVERDUE_TOLERANCE_MIN = 15;

/** Duração assumida quando o agendamento não tem duration_minutes (registros antigos). */
export const DEFAULT_DURATION_MIN = 30;

/**
 * Deriva o estado visual de um agendamento.
 * Estados terminais (completed/cancelled/noshow) têm precedência sobre overdue/normal.
 */
export function getVisualStatus(apt: AppointmentLike, now: Date = new Date()): VisualStatus {
  // Normaliza (trim + lowercase) para resistir a variações de origem dos dados.
  const status = (apt.status ?? '').trim().toLowerCase();
  switch (status) {
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'noshow':
    case 'no_show':
      return 'noshow';
    case 'pending':
    case 'confirmed': {
      const start = parseDate(apt.appointment_time);
      if (!start) return 'normal';
      // Duração negativa (dado inválido) não deve antecipar o atraso.
      const duration = Math.max(0, apt.duration_minutes ?? DEFAULT_DURATION_MIN);
      const deadline = new Date(start.getTime() + (duration + OVERDUE_TOLERANCE_MIN) * 60_000);
      return now.getTime() > deadline.getTime() ? 'overdue' : 'normal';
    }
    default:
      return 'normal';
  }
}

/** Rótulo PT-BR por estado visual. */
export const VISUAL_STATUS_LABEL: Record<VisualStatus, string> = {
  completed: 'Concluído',
  overdue: 'A confirmar',
  normal: 'Confirmado',
  noshow: 'Não compareceu',
  cancelled: 'Cancelado',
};

export interface VisualStatusClasses {
  /** Realce do corpo do card (fundo + borda). */
  card: string;
  /** Cor sólida do indicador (dot/barra). */
  dot: string;
  /** Cor do texto/label do estado. */
  text: string;
}

/**
 * Classes Tailwind por estado visual.
 * As cores semânticas usam CSS vars do design-system (--color-success/warning/danger),
 * que já se ajustam aos 4 temas (barber/beauty × dark/light) automaticamente.
 * NoShow usa stone (#57534E, PRD); normal usa o card/tema padrão.
 */
export const VISUAL_STATUS_CLASSES: Record<VisualStatus, VisualStatusClasses> = {
  completed: {
    card: 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]',
    dot: 'bg-[var(--color-success)]',
    text: 'text-[var(--color-success)]',
  },
  overdue: {
    card: 'bg-[var(--color-warning-bg)] border-[var(--color-warning-border)]',
    dot: 'bg-[var(--color-warning)]',
    text: 'text-[var(--color-warning)]',
  },
  normal: {
    card: 'bg-theme-card border-theme-border',
    dot: 'bg-theme-accent',
    text: 'text-theme-accent',
  },
  noshow: {
    // stone-500 (cinza médio) tem contraste em ambos os temas. O projeto controla modo via data-mode
    // (não a classe .dark), então a variante `dark:` do Tailwind não funciona aqui — usamos um valor único.
    card: 'bg-stone-500/15 border-stone-500/40',
    dot: 'bg-stone-500',
    text: 'text-stone-500',
  },
  cancelled: {
    card: 'bg-[var(--color-danger-bg)] border-[var(--color-danger-border)]',
    dot: 'bg-[var(--color-danger)]',
    text: 'text-[var(--color-danger)]',
  },
};
