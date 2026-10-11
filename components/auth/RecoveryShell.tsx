import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useColorMode } from '../../hooks/useColorMode';

/**
 * Moldura das telas públicas de senha (esqueci / nova senha).
 * Texto neutro (atende barbearia, salão e estúdio) e respeita claro/escuro:
 * preferência salva no app → preferência do sistema.
 */
export function applyRecoveryTheme(): void {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('agendix_color_mode');
  } catch {
    saved = null;
  }
  const prefersLight = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: light)').matches;
  const mode = saved === 'light' || saved === 'dark' ? saved : prefersLight ? 'light' : 'dark';
  if (!html.getAttribute('data-theme')) html.setAttribute('data-theme', 'barber');
  html.setAttribute('data-mode', mode);
}

interface RecoveryShellProps {
  children: React.ReactNode;
  testId?: string;
}

export const RecoveryShell: React.FC<RecoveryShellProps> = ({ children, testId }) => {
  const mode = useColorMode();

  useEffect(() => {
    applyRecoveryTheme();
  }, []);

  return (
    <div
      data-testid={testId}
      className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col pt-[var(--safe-top)] pb-[var(--safe-bottom)]"
    >
      <header className="w-full max-w-5xl mx-auto px-5 md:px-8 h-16 md:h-20 flex items-center">
        <Link
          to="/login"
          aria-label="AgendiX: ir para o login"
          className="inline-flex items-center gap-2.5 min-h-[44px] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          <img
            src={mode === 'light' ? '/agendix-mark-light.png' : '/agendix-mark-dark.png'}
            alt=""
            width={28}
            height={28}
            decoding="async"
            className="h-7 w-7 object-contain"
          />
          <span className="font-heading text-base font-bold tracking-tight leading-none">AgendiX</span>
        </Link>
      </header>

      <main className="flex-1 w-full flex justify-center px-5 pt-4 pb-12 md:pt-[8vh]">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>

      <footer className="px-5 pb-6 text-center">
        <p className="font-mono text-xs tracking-[0.08em] text-[var(--color-text-muted)]">
          AgendiX · agendixstudio.com
        </p>
      </footer>
    </div>
  );
};

/** Cartão com régua de acento no topo (mesma linguagem do painel de login). */
export const RecoveryCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section
    className={`relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--elevation-2)] px-6 py-7 sm:px-8 sm:py-8 ${className}`}
  >
    <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-[var(--color-accent)]/60" />
    {children}
  </section>
);

const EYEBROW_TONE = {
  neutral: 'bg-[var(--color-accent)]',
  success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]',
} as const;

/** Rótulo de etapa em mono; o ponto colorido sinaliza o estado sem ícone gigante. */
export const RecoveryEyebrow: React.FC<{ children: React.ReactNode; tone?: keyof typeof EYEBROW_TONE }> = ({ children, tone = 'neutral' }) => (
  <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${EYEBROW_TONE[tone]}`} />
    {children}
  </p>
);

export const RecoveryTitle: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <h1 id={id} tabIndex={-1} className="font-heading text-[26px] sm:text-[28px] font-bold leading-[1.1] tracking-tight text-[var(--color-text)] focus:outline-none">
    {children}
  </h1>
);

export const RecoveryLead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{children}</p>
);
