import React, { useEffect, useRef } from 'react';
import { AgendiXLogo } from '../AgendiXLogo';
import { Button } from '../ui/Button';
import { applyPublicAuthTheme } from '../../utils/publicAuthTheme';
import { accessRemovedMessage } from '../../utils/staffAccess';

interface AccessRemovedScreenProps {
  companyName: string | null;
  onExit: () => void;
}

/**
 * Tela do ex-colaborador (ACCEPTANCE.md E2.3): a sessão já foi encerrada;
 * mostra o motivo e leva de volta ao login. Usa a identidade das telas
 * públicas de auth (mesmo tema do gateway de login).
 */
export const AccessRemovedScreen: React.FC<AccessRemovedScreenProps> = ({ companyName, onExit }) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    applyPublicAuthTheme();
    headingRef.current?.focus();
  }, []);

  return (
    <main
      data-testid="access-removed"
      className="min-h-screen bg-theme-bg flex items-center justify-center p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]"
    >
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <AgendiXLogo size={28} isBeauty={false} showText />
        </div>

        <section
          aria-labelledby="access-removed-title"
          className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--elevation-3)] px-6 pt-9 pb-7 sm:px-8 text-center"
        >
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-theme-accent/40" aria-hidden="true" />
          <h1
            id="access-removed-title"
            ref={headingRef}
            tabIndex={-1}
            className="font-heading text-2xl uppercase tracking-tight text-[var(--color-text)] outline-none"
          >
            Acesso removido
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-secondary,var(--color-text-muted))]">
            {accessRemovedMessage(companyName)}
          </p>
          <Button variant="primary" size="lg" className="mt-7 w-full" onClick={onExit} forceTheme="barber">
            Voltar para o login
          </Button>
        </section>
      </div>
    </main>
  );
};
