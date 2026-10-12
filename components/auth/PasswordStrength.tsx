import React from 'react';
import { Check } from 'lucide-react';
import { assessPassword, joinPt, type PasswordStrengthLevel } from '../../utils/passwordPolicy';

interface PasswordStrengthProps {
  password: string;
  /** id para ligar ao input via aria-describedby. */
  id?: string;
  className?: string;
}

const LEVEL_COLOR: Record<PasswordStrengthLevel, string> = {
  empty: 'var(--color-divider)',
  missing: 'var(--color-divider)',
  weak: 'var(--color-warning)',
  strong: 'var(--color-success)',
  very_strong: 'var(--color-success)',
};

/**
 * Indicador de força + o que falta para o mínimo (8 caracteres e 1 maiúscula).
 * Regras em utils/passwordPolicy.ts. Cor nunca sozinha: sempre com texto.
 */
export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, id, className = '' }) => {
  const a = assessPassword(password);
  const color = LEVEL_COLOR[a.level];
  const pending = a.level === 'empty' || a.level === 'missing';

  const announcement = pending
    ? a.level === 'empty'
      ? `A senha precisa de ${joinPt(a.requirements.map((r) => r.label))}.`
      : `Falta ${joinPt(a.missing)}.`
    : `${a.label}.${a.tip ? ` ${a.tip}` : ''}`;

  return (
    <div id={id} data-testid="password-strength" data-level={a.level} className={`mt-2.5 ${className}`}>
      <div aria-hidden="true" className="flex gap-1">
        {[1, 2, 3].map((seg) => (
          <span
            key={seg}
            className="h-1 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none"
            style={{ backgroundColor: a.score >= seg ? color : 'var(--color-divider)' }}
          />
        ))}
      </div>

      <div aria-hidden="true" className="mt-2 min-h-[20px] text-[13px] leading-5">
        {pending ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--color-text-muted)]">
            <span className="text-[var(--color-text-secondary)]">{a.level === 'empty' ? 'Precisa de:' : 'Falta:'}</span>
            {a.requirements.map((r) => (
              <span
                key={r.id}
                data-req={r.id}
                data-ok={r.ok ? 'true' : 'false'}
                className={`inline-flex items-center gap-1.5 ${r.ok ? 'text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] font-medium'}`}
              >
                <span
                  className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                    r.ok ? 'border-[var(--color-success)] bg-[var(--color-success)] text-[var(--color-on-success)]' : 'border-[var(--color-border-strong)]'
                  }`}
                >
                  {r.ok && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
                <span>{r.label}</span>
              </span>
            ))}
          </p>
        ) : (
          <p className="text-[var(--color-text-muted)]">
            <span className="font-semibold" style={{ color }} data-testid="password-strength-label">
              {a.label}
            </span>
            {a.tip && <span className="text-[var(--color-text-muted)]"> · {a.tip}</span>}
          </p>
        )}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
};
