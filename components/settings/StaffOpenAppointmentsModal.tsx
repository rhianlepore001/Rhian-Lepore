import React from 'react';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { BusinessRemainderNoun } from '../../utils/businessCopy';
import {
  formatOpenAppointmentWhen,
  isOpenAppointmentLate,
  moreAppointmentsLabel,
  openAppointmentsCopy,
  type OpenAppointment,
} from '../../utils/staffDelete';

/** Quantos atendimentos listar antes do "e mais X". */
export const OPEN_APPOINTMENTS_PREVIEW = 3;

export interface StaffOpenAppointmentsModalProps {
  open: boolean;
  memberName: string;
  /** Total em aberto (lista do dono; cai para a contagem do servidor se a lista falhar). */
  total: number;
  items: OpenAppointment[];
  status: 'loading' | 'ready' | 'error';
  timeZone: string;
  remainder: Pick<BusinessRemainderNoun, 'article' | 'noun'>;
  now?: Date;
  onClose: () => void;
  onOpenAppointment: (appointment: OpenAppointment) => void;
  onOpenAgenda: () => void;
}

export const StaffOpenAppointmentsModal: React.FC<StaffOpenAppointmentsModalProps> = ({
  open,
  memberName,
  total,
  items,
  status,
  timeZone,
  remainder,
  now,
  onClose,
  onOpenAppointment,
  onOpenAgenda,
}) => {
  const { colors } = useBrutalTheme();
  const count = Math.max(total, items.length, 1);
  const copy = openAppointmentsCopy(count, memberName, remainder);
  const preview = items.slice(0, OPEN_APPOINTMENTS_PREVIEW);
  const rest = count - preview.length;
  const first = preview[0];
  const reference = now ?? new Date();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      size="md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
          <Button variant="ghost" size="md" onClick={onClose} data-testid="staff-open-appointments-close">
            Fechar
          </Button>
          {status === 'error' || (status === 'ready' && !first) ? (
            <Button variant="primary" size="md" onClick={onOpenAgenda} data-testid="staff-open-appointments-agenda">
              Abrir agenda
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              disabled={!first}
              loading={status === 'loading'}
              onClick={() => first && onOpenAppointment(first)}
              data-testid="staff-open-appointments-view"
            >
              Ver atendimento
            </Button>
          )}
        </div>
      }
    >
      <div data-testid="staff-open-appointments-modal" className="space-y-4">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full border"
            style={{
              color: 'var(--color-warning)',
              background: 'var(--color-warning-bg)',
              borderColor: 'var(--color-warning-border)',
            }}
          >
            <CalendarClock className="h-5 w-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <p className={`text-sm font-semibold leading-snug ${colors.text}`} data-testid="staff-open-appointments-lead">
              {copy.lead}
            </p>
            <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{copy.action}</p>
          </div>
        </div>

        {status === 'loading' && (
          <div className="space-y-2" data-testid="staff-open-appointments-loading">
            <Skeleton height={60} />
            <Skeleton height={60} />
          </div>
        )}

        {status === 'error' && (
          <p className={`text-sm ${colors.textMuted}`} role="status" data-testid="staff-open-appointments-error">
            Não conseguimos carregar a lista agora. Abra a agenda para ver os atendimentos.
          </p>
        )}

        {status === 'ready' && preview.length > 0 && (
          <div>
            <ul className="space-y-2" aria-label="Atendimentos em aberto">
              {preview.map((apt) => {
                const late = isOpenAppointmentLate(apt, reference);
                const when = formatOpenAppointmentWhen(apt.appointment_time, timeZone, reference);
                const client = apt.client_name?.trim() || 'Cliente sem nome';
                return (
                  <li key={apt.id}>
                    <button
                      type="button"
                      onClick={() => onOpenAppointment(apt)}
                      data-testid="staff-open-appointment-row"
                      aria-label={`Ver atendimento de ${client}, ${when}${late ? ', atrasado' : ''}`}
                      className={[
                        'w-full min-h-[60px] flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left',
                        'transition-colors duration-150 hover:bg-[var(--color-card-hover)]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]',
                        colors.border,
                      ].join(' ')}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className={`truncate text-sm font-semibold ${colors.text}`}>{client}</span>
                          {late && (
                            <Badge variant="warning" className="shrink-0">
                              <span data-testid="staff-open-appointment-late">Atrasado</span>
                            </Badge>
                          )}
                        </span>
                        <span className={`mt-0.5 block truncate text-xs ${colors.textMuted}`}>
                          <time dateTime={apt.appointment_time}>{when}</time>
                          {apt.service ? ` · ${apt.service}` : ''}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className={`h-4 w-4 shrink-0 ${colors.textMuted}`} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {rest > 0 && (
              <p className={`mt-2 px-1 text-xs ${colors.textMuted}`} data-testid="staff-open-appointments-more">
                {moreAppointmentsLabel(rest)}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
