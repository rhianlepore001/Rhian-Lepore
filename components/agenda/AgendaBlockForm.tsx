import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { buildAgendaBlockRange, type AgendaBlockKind } from '../../utils/agendaBlockRange';
import type { AgendaBlockConflict } from '../../types/agendaBlocks';

export interface AgendaBlockFormMember {
  id: string;
  name: string;
}

export interface AgendaBlockFormProps {
  open: boolean;
  onClose: () => void;
  members: AgendaBlockFormMember[];
  /** Dono escolhe; staff envia o próprio e o campo some. */
  showProfessionalSelect: boolean;
  professionalId: string;
  onProfessionalIdChange?: (id: string) => void;
  initialDate: string;
  initialTime?: string;
  timeZone: string;
  submitting?: boolean;
  conflicts?: AgendaBlockConflict[];
  onSubmit: (input: {
    professionalId: string;
    startsAt: string;
    endsAt: string;
    acknowledgeConflicts: boolean;
  }) => void | Promise<void>;
}

const KINDS: { value: AgendaBlockKind; label: string }[] = [
  { value: 'hours', label: 'Período no dia' },
  { value: 'full_day', label: 'Dia inteiro' },
  { value: 'multi_day', label: 'Vários dias' },
];

function defaultEndTime(start?: string): string {
  if (!start || !/^\d{2}:\d{2}$/.test(start)) return '13:00';
  const [h, m] = start.split(':').map(Number);
  const endM = h * 60 + m + 60;
  const eh = Math.min(23, Math.floor(endM / 60));
  const em = endM % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export const AgendaBlockForm: React.FC<AgendaBlockFormProps> = ({
  open,
  onClose,
  members,
  showProfessionalSelect,
  professionalId,
  onProfessionalIdChange,
  initialDate,
  initialTime,
  timeZone,
  submitting = false,
  conflicts,
  onSubmit,
}) => {
  const { colors, classes } = useBrutalTheme();
  const [kind, setKind] = useState<AgendaBlockKind>(initialTime ? 'hours' : 'hours');
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime || '12:00');
  const [endTime, setEndTime] = useState(defaultEndTime(initialTime || '12:00'));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKind(initialTime ? 'hours' : 'hours');
    setStartDate(initialDate);
    setEndDate(initialDate);
    setStartTime(initialTime || '12:00');
    setEndTime(defaultEndTime(initialTime || '12:00'));
    setError(null);
  }, [open, initialDate, initialTime]);

  const pendingConflicts = conflicts && conflicts.length > 0;
  const memberOptions = useMemo(
    () => members.map((m) => ({ value: m.id, label: m.name })),
    [members],
  );

  const handleSubmit = async (acknowledge: boolean) => {
    setError(null);
    try {
      const range = buildAgendaBlockRange({
        kind,
        startDate,
        endDate,
        startTime,
        endTime,
        timeZone,
      });
      if (!professionalId) {
        setError('Escolha o profissional.');
        return;
      }
      await onSubmit({
        professionalId,
        startsAt: range.startsAt,
        endsAt: range.endsAt,
        acknowledgeConflicts: acknowledge,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('invalid_block')) setError('O fim precisa ser depois do início.');
      else setError('Não foi possível bloquear. Confira as datas.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bloquear agenda"
      size="md"
      footer={
        pendingConflicts ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button
              data-testid="agenda-block-confirm-conflicts"
              onClick={() => handleSubmit(true)}
              loading={submitting}
            >
              Bloquear mesmo assim
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
            <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancelar</Button>
            <Button
              data-testid="agenda-block-submit"
              onClick={() => handleSubmit(false)}
              loading={submitting}
            >
              Bloquear
            </Button>
          </div>
        )
      }
    >
      <div className="space-y-4" data-testid="agenda-block-form">
        {showProfessionalSelect && (
          <Select
            label="Profissional"
            options={memberOptions}
            value={professionalId}
            onChange={(e) => onProfessionalIdChange?.(e.target.value)}
            data-testid="agenda-block-professional"
          />
        )}

        <fieldset>
          <legend className={`${classes.label} mb-1.5`}>Tipo</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de bloqueio">
            {KINDS.map((k) => {
              const checked = kind === k.value;
              return (
                <label
                  key={k.value}
                  data-testid={`agenda-block-kind-${k.value}`}
                  className={`flex items-center justify-center min-h-[44px] rounded-xl border px-2 py-2 text-center text-xs font-semibold cursor-pointer ${
                    checked ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]' : colors.border
                  }`}
                >
                  <input
                    type="radio"
                    name="agenda-block-kind"
                    value={k.value}
                    checked={checked}
                    onChange={() => setKind(k.value)}
                    className="sr-only"
                  />
                  {k.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={classes.label} htmlFor="agenda-block-start-date">Início</label>
            <input
              id="agenda-block-start-date"
              data-testid="agenda-block-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-h-[44px] mt-1.5 px-3 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text"
            />
          </div>
          {kind === 'hours' && (
            <div>
              <label className={classes.label} htmlFor="agenda-block-start-time">Das</label>
              <input
                id="agenda-block-start-time"
                data-testid="agenda-block-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-h-[44px] mt-1.5 px-3 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text"
              />
            </div>
          )}
          {kind === 'multi_day' && (
            <div>
              <label className={classes.label} htmlFor="agenda-block-end-date">Até</label>
              <input
                id="agenda-block-end-date"
                data-testid="agenda-block-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full min-h-[44px] mt-1.5 px-3 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text"
              />
            </div>
          )}
          {kind === 'hours' && (
            <div>
              <label className={classes.label} htmlFor="agenda-block-end-time">Até</label>
              <input
                id="agenda-block-end-time"
                data-testid="agenda-block-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full min-h-[44px] mt-1.5 px-3 rounded-lg bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text"
              />
            </div>
          )}
        </div>

        <p className={`text-xs ${colors.textMuted}`}>
          Ninguém agenda neste período — nem pelo link, nem pela agenda. Os atendimentos já marcados continuam.
        </p>

        {error && (
          <p className="text-sm text-[var(--color-danger)]" data-testid="agenda-block-form-error">{error}</p>
        )}

        {pendingConflicts && (
          <div data-testid="agenda-block-conflicts" className={`rounded-xl border p-3 ${colors.border}`}>
            <p className={`text-sm font-semibold ${colors.text} mb-2`}>
              Já tem atendimento neste período. Bloquear mesmo assim? Nada será cancelado.
            </p>
            <ul className="space-y-1">
              {conflicts.map((c) => (
                <li key={`${c.kind}-${c.id}`} className={`text-sm ${colors.textSecondary}`}>
                  {c.client_name}
                  {c.service ? ` · ${c.service}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
