import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import {
  type CommissionPaymentFrequency,
  type CommissionScheduleDraft,
  type PayOffsetDays,
  type ReminderOffset,
  WEEKDAY_TINY,
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
  const preview = error ? null : previewFromDraft(draft, fromIso);
  const dirty = !saved || !draftsEqual(draft, saved);
  const firstNew = preview?.closes.find((c) => currentEnd && c > currentEnd) ?? preview?.closes[1];
  const changeText = dirty && currentEnd && firstNew && firstNew !== currentEnd
    ? formatScheduleChangeNotice(currentEnd, firstNew)
    : dirty && currentEnd && preview?.closes[0] === currentEnd && preview.closes[1]
      ? formatScheduleChangeNotice(currentEnd, preview.closes[1])
      : null;

  const setFreq = (frequency: CommissionPaymentFrequency) => {
    onChange({ ...draft, frequency, closeDays: defaultCloseDays(frequency) });
  };

  const chip = (active: boolean) =>
    `min-h-[44px] min-w-[44px] px-3 text-sm font-semibold ${radius.button} border transition-colors ${
      active
        ? `${accent.bgDim} ${accent.text} ${accent.border}`
        : `${colors.surface} ${colors.textSecondary} ${colors.border} hover:border-[var(--color-border-strong)]`
    }`;

  return (
    <div className="space-y-6" data-testid="commission-schedule-editor">
      <div>
        <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${colors.textMuted}`}>Frequência</p>
        <div role="tablist" aria-label="Frequência do acerto" className={`grid grid-cols-3 gap-1 p-1 ${colors.surface} ${radius.button}`}>
          {FREQS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={draft.frequency === f.id}
              disabled={disabled}
              onClick={() => setFreq(f.id)}
              className={`min-h-[44px] text-sm font-semibold ${radius.button} ${
                draft.frequency === f.id
                  ? `${colors.card} ${colors.text} border ${colors.border}`
                  : `${colors.textMuted} border border-transparent`
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {draft.frequency === 'weekly' && (
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${colors.textMuted}`}>Dia da semana</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_TINY.map((label, dow) => (
              <button
                key={dow}
                type="button"
                disabled={disabled}
                aria-pressed={draft.closeDays[0] === dow}
                onClick={() => onChange({ ...draft, closeDays: [dow] })}
                className={chip(draft.closeDays[0] === dow)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {draft.frequency === 'monthly' && (
        <div>
          <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${colors.textMuted}`}>Dia do mês</p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                disabled={disabled}
                aria-pressed={draft.closeDays[0] === day}
                onClick={() => onChange({ ...draft, closeDays: [day] })}
                className={`min-h-[40px] text-sm font-semibold tabular-nums ${radius.button} border ${
                  draft.closeDays[0] === day
                    ? `${accent.bgDim} ${accent.text} ${accent.border}`
                    : `${colors.surface} ${colors.textSecondary} ${colors.border}`
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {draft.frequency === 'biweekly' && (
        <div className="space-y-3">
          <p className={`text-xs font-mono uppercase tracking-widest ${colors.textMuted}`}>Dois dias do mês</p>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((idx) => (
              <label key={idx} className="block">
                <span className={`text-xs ${colors.textMuted}`}>{idx === 0 ? 'Primeiro dia' : 'Segundo dia'}</span>
                <select
                  disabled={disabled}
                  value={draft.closeDays[idx] ?? (idx === 0 ? 5 : 20)}
                  onChange={(e) => {
                    const next = [...draft.closeDays];
                    next[idx] = parseInt(e.target.value, 10);
                    if (next.length < 2) next[1] = idx === 0 ? 20 : 5;
                    onChange({ ...draft, closeDays: next });
                  }}
                  className={`mt-1 w-full min-h-[44px] px-3 rounded-xl ${colors.inputBg} ${colors.text} border ${colors.border} outline-none`}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${colors.textMuted}`}>Pagar até</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PAYS.map((off) => (
            <button
              key={off}
              type="button"
              disabled={disabled}
              aria-pressed={draft.payOffsetDays === off}
              onClick={() => onChange({ ...draft, payOffsetDays: off })}
              className={`min-h-[44px] px-3 text-sm font-semibold text-left ${radius.button} border ${
                draft.payOffsetDays === off
                  ? `${accent.bgDim} ${accent.text} ${accent.border}`
                  : `${colors.surface} ${colors.textSecondary} ${colors.border}`
              }`}
            >
              {payOffsetLabel(off)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className={`text-xs font-mono uppercase tracking-widest mb-2 ${colors.textMuted}`}>Lembretes</p>
        <div className="space-y-2">
          {REMS.map((off) => {
            const on = draft.reminderOffsets.includes(off);
            return (
              <label
                key={off}
                className={`flex items-center gap-3 min-h-[44px] px-3 rounded-xl border ${colors.border} ${colors.surface}`}
              >
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={on}
                  onChange={() => {
                    const next = on
                      ? draft.reminderOffsets.filter((x) => x !== off)
                      : [...draft.reminderOffsets, off].sort((a, b) => b - a);
                    onChange({ ...draft, reminderOffsets: next as ReminderOffset[] });
                  }}
                  className="h-4 w-4 rounded border-[var(--color-border)]"
                />
                <span className={`text-sm ${colors.text}`}>{reminderOffsetLabel(off)}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">{error}</p>
      )}

      {preview && (
        <div
          data-testid="commission-schedule-preview"
          className={`p-4 rounded-xl border ${colors.border} ${colors.surface} text-sm leading-relaxed ${colors.text}`}
        >
          {preview.text}
        </div>
      )}

      {changeText && (
        <p data-testid="commission-schedule-change" className={`text-sm ${colors.textSecondary}`}>
          {changeText}
        </p>
      )}
    </div>
  );
};

export function editorPreviewText(draft: CommissionScheduleDraft, fromIso: string): string {
  return formatSchedulePreview(previewFromDraft(draft, fromIso));
}
