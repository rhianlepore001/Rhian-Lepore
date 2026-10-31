import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';
import { hasUnsavedInput, type UpdateManager } from '../lib/appUpdate';

interface UpdatePromptProps {
  /** Só para testes: gerenciador alternativo. */
  manager?: UpdateManager | null;
}

/**
 * Aviso "Nova versão disponível". Usa só os tokens do design system, então segue os dois
 * temas (barbearia/salão) nos modos claro e escuro. O texto é neutro: não cita o tipo de negócio.
 * Nunca recarrega sozinho — só depois do toque em "Atualizar".
 */
export const UpdatePrompt: React.FC<UpdatePromptProps> = ({ manager }) => {
  const { visible, applying, apply, dismiss } = useAppUpdate(manager);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    const check = () => setTyping(hasUnsavedInput(document));
    check();
    document.addEventListener('input', check, true);
    return () => document.removeEventListener('input', check, true);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      data-update-prompt
      className="pointer-events-none fixed inset-x-0 top-0 z-[var(--z-toast)] flex justify-center px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:justify-end md:px-5"
    >
      <section
        role="status"
        aria-live="polite"
        aria-labelledby="update-prompt-title"
        aria-describedby="update-prompt-description"
        className="pointer-events-auto w-full max-w-md rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-card)] p-4 text-[var(--color-text)] shadow-[var(--elevation-3)]"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]"
          >
            <RefreshCw className={`h-5 w-5 ${applying ? 'animate-spin' : ''}`} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="update-prompt-title" className="font-heading text-base font-bold leading-tight tracking-tight">
              Nova versão disponível
            </h2>
            <p id="update-prompt-description" className="mt-1 text-sm leading-snug text-[var(--color-text-secondary)]">
              {typing
                ? 'Termine e salve o que está preenchendo antes de atualizar.'
                : 'Atualize para usar as melhorias mais recentes.'}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={dismiss}
            disabled={applying}
            className="min-h-11 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-card-hover)] px-4 text-sm font-semibold text-[var(--color-text)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            Agora não
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="min-h-11 rounded-xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-on-accent)] disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            {applying ? 'Atualizando…' : 'Atualizar'}
          </button>
        </div>
      </section>
    </div>
  );
};
