import React from 'react';

interface Props {
  id: string;
  value: string;
  /** Tempo previsto (agenda ou serviço). Nulo quando não existe. */
  estimate: number | null | undefined;
  adjusted: boolean;
  disabled?: boolean;
  error?: string;
  source: 'agenda' | 'serviço';
  note?: string;
  onChange: (value: string) => void;
  onRestore: () => void;
}

const step = 'flex min-h-12 min-w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-card-elevated)] text-base font-semibold tabular-nums text-theme-text transition-transform duration-150 active:scale-[0.97] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] motion-reduce:transition-none';

/** Campo "Tempo de trabalho" do fechamento: ±10 min ou digitar. Sem ajuste, o tempo continua estimado. */
export function DurationField({ id, value, estimate, adjusted, disabled, error, source, note, onChange, onRestore }: Props) {
  const current = Number(value);
  const hasEstimate = typeof estimate === 'number' && estimate > 0;
  const help = adjusted
    ? 'Você informou o tempo real deste atendimento.'
    : value ? `Sem ajuste, vale o tempo ${source === 'agenda' ? 'da agenda' : 'do serviço'}. Mude só se demorou mais ou menos.`
      : `Sem tempo ${source === 'agenda' ? 'na agenda' : 'no serviço'}. Informe se souber.`;
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-theme-text">Tempo de trabalho</label>
      {value && <span className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium ${adjusted ? 'border-[var(--color-accent-border)] text-[var(--color-accent)]' : 'border-[var(--color-border-strong)] text-theme-textSecondary'}`}>
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${adjusted ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-warning)]'}`} />
        {adjusted ? 'Ajustado por você' : `Estimado ${source === 'agenda' ? 'pela agenda' : 'pelo serviço'}`}
      </span>}
    </div>
    <div className="flex items-stretch gap-2">
      <button type="button" aria-label="Diminuir 10 minutos" disabled={disabled} onClick={() => onChange(String(Math.max(1, (current || 1) - 10)))} className={step}>−10</button>
      <div className="relative min-w-0 flex-1">
        <input id={id} type="number" min="1" max="1440" step="1" inputMode="numeric" disabled={disabled} value={value} onChange={event => onChange(event.target.value)} aria-invalid={!!error} aria-describedby={`${id}-help`}
          className="h-full min-h-12 w-full rounded-xl border border-[var(--color-input-border)] bg-[var(--color-input-bg)] pl-3 pr-12 text-center text-xl font-bold tabular-nums text-theme-text focus:border-[var(--color-input-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--color-input-focus)] disabled:opacity-50" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-theme-textSecondary">min</span>
      </div>
      <button type="button" aria-label="Aumentar 10 minutos" disabled={disabled} onClick={() => onChange(String(Math.min(1440, (current || 0) + 10)))} className={step}>+10</button>
    </div>
    <p id={`${id}-help`} className="text-sm text-theme-textSecondary">{help}{note && !adjusted ? ` ${note}` : ''}</p>
    {adjusted && hasEstimate && <button type="button" disabled={disabled} onClick={onRestore} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline">Voltar para {estimate} min {source === 'agenda' ? 'da agenda' : 'do serviço'}</button>}
    {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
  </div>;
}
