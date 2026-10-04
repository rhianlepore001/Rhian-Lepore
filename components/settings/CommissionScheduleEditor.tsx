import React from 'react';
import { Bell, CalendarClock, Check, Info } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import {
  type CommissionPaymentFrequency,
  type CommissionScheduleDraft,
  type PayOffsetDays,
  type ReminderOffset,
  WEEKDAY_TINY,
  addIsoDays,
  defaultCloseDays,
  draftsEqual,
  formatScheduleChangeNotice,
  formatSchedulePreview,
  payOffsetLabel,
  previewFromDraft,
  reminderOffsetLabel,
  validateScheduleDraft,
} from '../../utils/commissionSchedule';

interface CommissionScheduleEditorProps {
  draft: CommissionScheduleDraft;
  onChange: (next: CommissionScheduleDraft) => void;
  fromIso: string;
  currentEnd?: string | null;
  saved?: CommissionScheduleDraft | null;
  disabled?: boolean;
}

const FREQS: { id: CommissionPaymentFrequency; label: string }[] = [
  { id: 'weekly', label: 'Semanal' },
  { id: 'biweekly', label: 'Quinzenal' },
  { id: 'monthly', label: 'Mensal' },
];

const PAYS: PayOffsetDays[] = [0, 2, 5];
const REMS: ReminderOffset[] = [2, 1, 0];
const PAY_SHORT: Record<PayOffsetDays, string> = { 0: 'No dia', 2: '+2 dias', 5: '+5 dias' };
const reminderChipLabel = (off: ReminderOffset) => (off === 0 ? 'No dia de pagar' : off === 1 ? '1 dia antes' : '2 dias antes');

const Field: React.FC<{ label: string; hint?: string; id: string; children: React.ReactNode }> = ({ label, hint, id, children }) => {
  const { colors } = useBrutalTheme();
  return (
    <div role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className={`text-sm font-semibold ${colors.text}`}>{label}</p>
      {hint && <p className={`mt-1 text-xs leading-relaxed ${colors.textMuted}`}>{hint}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
};

export const CommissionScheduleEditor: React.FC<CommissionScheduleEditorProps> = ({
  draft,
  onChange,
  fromIso,
  currentEnd,
  saved,
  disabled = false,
}) => {
  const { colors, accent, radius } = useBrutalTheme();
  const error = validateScheduleDraft(draft);
  const dirty = !saved || !draftsEqual(draft, saved);
  // A mudança só vale depois do fechamento atual: a prévia mostra os fechamentos da regra
  // nova a partir do dia seguinte a ele (igual ao servidor, set_commission_schedule_v1).
  const previewFrom = dirty && currentEnd && currentEnd >= fromIso ? addIsoDays(currentEnd, 1) : fromIso;
  const preview = error ? null : previewFromDraft(draft, previewFrom);
  const firstNew = preview?.closes[0];
  const changeText = dirty && currentEnd && firstNew
    ? formatScheduleChangeNotice(currentEnd, firstNew)
    : null;

  const setFreq = (frequency: CommissionPaymentFrequency) => {
    if (frequency === draft.frequency) return;
    onChange({ ...draft, frequency, closeDays: defaultCloseDays(frequency) });
  };

  const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-input-focus)]';
  // Opção de escolha única/múltipla: neutra em repouso, accent sólido quando escolhida.
  const option = (active: boolean, extra = '') =>
    `min-h-[44px] text-sm font-semibold tabular-nums ${radius.button} border transition-colors duration-150 ${focusRing} disabled:opacity-50 disabled:cursor-not-allowed ${
      active
        ? 'bg-theme-accent text-[var(--color-on-accent)] border-transparent'
        : `${colors.card} ${colors.text} ${colors.border} hover:bg-[var(--color-card-hover)]`
    } ${extra}`;

  const sortedBiweekly = [...draft.closeDays].sort((a, b) => a - b);
  const clampHint = draft.frequency === 'monthly'
    ? (draft.closeDays[0] ?? 0) >= 29
    : draft.frequency === 'biweekly' && draft.closeDays.some((d) => d >= 29);

  return (
    <div className="space-y-8 max-w-xl" data-testid="commission-schedule-editor">
      <Field id="cs-freq" label="Frequência">
        <div
          role="tablist"
          aria-label="Frequência do acerto"
          className={`grid grid-cols-3 gap-1 p-1 ${colors.surface} border ${colors.border} ${radius.button}`}
        >
          {FREQS.map((f) => {
            const active = draft.frequency === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => setFreq(f.id)}
                className={`min-h-[40px] text-sm font-semibold ${radius.button} transition-colors duration-150 ${focusRing} ${
                  active
                    ? `${colors.card} ${colors.text} shadow-[0_1px_3px_rgba(0,0,0,0.12)]`
                    : `${colors.textSecondary} hover:text-theme-text`
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </Field>

      {draft.frequency === 'weekly' && (
        <Field id="cs-weekday" label="Fecha toda" hint="O ciclo vai do dia seguinte ao fechamento até o próximo.">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAY_TINY.map((label, dow) => (
              <button
                key={dow}
                type="button"
                disabled={disabled}
                aria-pressed={draft.closeDays[0] === dow}
                onClick={() => onChange({ ...draft, closeDays: [dow] })}
                className={option(draft.closeDays[0] === dow, 'px-0')}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
      )}

      {draft.frequency === 'monthly' && (
        <Field
          id="cs-monthday"
          label="Fecha todo dia"
          hint={clampHint ? 'Em meses mais curtos, o fechamento vai para o último dia do mês.' : undefined}
        >
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                disabled={disabled}
                aria-pressed={draft.closeDays[0] === day}
                aria-label={`Dia ${day}`}
                onClick={() => onChange({ ...draft, closeDays: [day] })}
                className={option(draft.closeDays[0] === day, 'min-h-[44px] px-0')}
              >
                {day}
              </button>
            ))}
          </div>
        </Field>
      )}

      {draft.frequency === 'biweekly' && (
        <Field
          id="cs-biweekly"
          label="Fecha nos dias"
          hint={`Dois dias do mês, com pelo menos 7 dias entre eles.${clampHint ? ' Em meses mais curtos, 29–31 vira o último dia.' : ''}`}
        >
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((idx) => (
              <label key={idx} className="block min-w-0">
                <span className={`block text-xs font-medium mb-1.5 ${colors.textSecondary}`}>{idx === 0 ? '1º fechamento' : '2º fechamento'}</span>
                <select
                  disabled={disabled}
                  value={sortedBiweekly[idx] ?? (idx === 0 ? 5 : 20)}
                  onChange={(e) => {
                    const next = [...sortedBiweekly];
                    next[idx] = parseInt(e.target.value, 10);
                    if (next.length < 2) next[1] = idx === 0 ? 20 : 5;
                    onChange({ ...draft, closeDays: next });
                  }}
                  className={`w-full min-h-[44px] px-3 ${radius.button} ${colors.inputBg} ${colors.text} border ${colors.border} tabular-nums ${focusRing}`}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Field>
      )}

      <Field id="cs-pay" label="Prazo para pagar" hint="Contado a partir do fechamento.">
        <div className="grid grid-cols-3 gap-1.5">
          {PAYS.map((off) => (
            <button
              key={off}
              type="button"
              disabled={disabled}
              aria-pressed={draft.payOffsetDays === off}
              aria-label={payOffsetLabel(off)}
              onClick={() => onChange({ ...draft, payOffsetDays: off })}
              className={option(draft.payOffsetDays === off, 'px-2')}
            >
              {PAY_SHORT[off]}
            </button>
          ))}
        </div>
      </Field>

      <Field id="cs-rem" label="Lembretes" hint="Chegam no sino e no Início.">
        <div className="flex flex-wrap gap-2">
          {REMS.map((off) => {
            const on = draft.reminderOffsets.includes(off);
            return (
              <button
                key={off}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={disabled}
                onClick={() => {
                  const next = on
                    ? draft.reminderOffsets.filter((x) => x !== off)
                    : [...draft.reminderOffsets, off].sort((a, b) => b - a);
                  onChange({ ...draft, reminderOffsets: next as ReminderOffset[] });
                }}
                className={option(on, 'inline-flex items-center gap-2 px-3')}
              >
                {on ? <Check className="w-4 h-4" aria-hidden="true" /> : <Bell className="w-4 h-4 opacity-60" aria-hidden="true" />}
                {reminderChipLabel(off)}
              </button>
            );
          })}
        </div>
      </Field>

      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">{error}</p>
      )}

      {preview && (
        <div className={`${radius.button} border ${accent.borderDim} ${accent.bgDim} p-4 space-y-3`}>
          <div className="flex items-start gap-3">
            <CalendarClock className={`w-5 h-5 mt-0.5 shrink-0 ${accent.text}`} aria-hidden="true" />
            <p data-testid="commission-schedule-preview" className={`text-sm leading-relaxed ${colors.text} tabular-nums`}>
              {preview.text}
            </p>
          </div>
          {changeText && (
            <div className={`flex items-start gap-3 pt-3 border-t ${accent.borderDim}`}>
              <Info className={`w-5 h-5 mt-0.5 shrink-0 ${colors.textSecondary}`} aria-hidden="true" />
              <p data-testid="commission-schedule-change" className={`text-sm leading-relaxed ${colors.textSecondary} tabular-nums`}>
                {changeText}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export function editorPreviewText(draft: CommissionScheduleDraft, fromIso: string): string {
  return formatSchedulePreview(previewFromDraft(draft, fromIso));
}
