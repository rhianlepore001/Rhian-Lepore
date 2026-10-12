import React from 'react';
import { Check } from 'lucide-react';
import { getPasswordRules } from '../../utils/passwordValidation';

interface PasswordRulesProps {
  password: string;
  id?: string;
}

/** Checklist ao vivo das regras de senha (as mesmas do cadastro). */
export const PasswordRules: React.FC<PasswordRulesProps> = ({ password, id }) => {
  const rules = getPasswordRules(password);
  return (
    <ul id={id} aria-label="Requisitos da senha" className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
      {rules.map((rule) => (
        <li
          key={rule.id}
          data-rule={rule.id}
          data-ok={rule.ok ? 'true' : 'false'}
          className={`flex items-center gap-2 text-[13px] transition-colors duration-150 ${
            rule.ok ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors duration-150 ${
              rule.ok
                ? 'border-[var(--color-success)] bg-[var(--color-success)] text-[var(--color-on-success)]'
                : 'border-[var(--color-border-strong)]'
            }`}
          >
            {rule.ok && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          {rule.label}
          <span className="sr-only">{rule.ok ? ' (ok)' : ' (pendente)'}</span>
        </li>
      ))}
    </ul>
  );
};
