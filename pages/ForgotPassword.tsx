import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useScrollToError } from '../hooks/useScrollToError';
import { RecoveryCard, RecoveryEyebrow, RecoveryLead, RecoveryShell, RecoveryTitle } from '../components/auth/RecoveryShell';
import { mapRecoveryRequestError, requestPasswordReset, RESEND_COOLDOWN_SECONDS } from '../services/passwordRecovery';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);
  const errorRef = useScrollToError(error);
  const sentTitleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (sentTo) sentTitleRef.current?.focus();
  }, [sentTo]);

  const send = async (target: string, isResend: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await requestPasswordReset(supabase.auth, target, window.location.origin);
      if (resetError) throw resetError;
      setSentTo(target);
      setResent(isResend);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      console.error('Erro ao pedir redefinição de senha:', err);
      setError(mapRecoveryRequestError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setFieldError('Digite um e-mail válido, como nome@exemplo.com.');
      return;
    }
    setFieldError(undefined);
    void send(value, false);
  };

  const switchEmail = () => {
    setSentTo(null);
    setError(null);
    setResent(false);
  };

  const errorBanner = error && (
    <div
      ref={errorRef}
      role="alert"
      tabIndex={-1}
      className="mt-6 flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );

  return (
    <RecoveryShell testId="forgot-password-page">
      {!sentTo ? (
        <RecoveryCard>
          <RecoveryEyebrow>Recuperar acesso</RecoveryEyebrow>
          <RecoveryTitle>Esqueceu sua senha?</RecoveryTitle>
          <RecoveryLead>
            Informe o e-mail da sua conta. Vamos enviar um link para você criar uma senha nova.
          </RecoveryLead>

          {errorBanner}

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            <Input
              id="forgot-email"
              type="email"
              inputMode="email"
              label="E-mail"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError(undefined);
              }}
              placeholder="nome@exemplo.com"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              error={fieldError}
              size="lg"
              required
            />
            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} data-testid="forgot-submit">
              {loading ? 'Enviando link…' : 'Enviar link de redefinição'}
            </Button>
          </form>

        </RecoveryCard>
      ) : (
        <RecoveryCard>
          <div id="recovery-success-message" data-testid="forgot-sent">
            <RecoveryEyebrow tone="success">Verifique seu e-mail</RecoveryEyebrow>
            <h1 ref={sentTitleRef} tabIndex={-1} className="font-heading text-[26px] sm:text-[28px] font-bold leading-[1.1] tracking-tight focus:outline-none">
              Link enviado
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
              Se houver uma conta com este e-mail, o link para criar uma senha nova chega em alguns minutos.
            </p>
            <p
              data-testid="forgot-sent-email"
              className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-input-bg)] px-3.5 py-2.5 font-mono text-[13px] text-[var(--color-text)] [overflow-wrap:anywhere]"
            >
              {sentTo}
            </p>

            <ol className="mt-6 space-y-3 text-sm text-[var(--color-text-secondary)]">
              {[
                'Abra o e-mail no celular ou no computador.',
                'Toque em “Criar nova senha”. O link funciona uma única vez.',
                'Não chegou? Confira as pastas de spam e promoções.',
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="font-mono text-xs leading-5 text-[var(--color-accent)] tabular-nums">0{i + 1}</span>
                  <span className="leading-5">{step}</span>
                </li>
              ))}
            </ol>

            <div aria-live="polite" className="sr-only">
              {resent ? 'Enviamos um novo link.' : ''}
            </div>

            {errorBanner}

            <div className="mt-7 space-y-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={cooldown > 0}
                onClick={() => void send(sentTo, true)}
                data-testid="forgot-resend"
              >
                {cooldown > 0 ? `Reenviar em ${formatCountdown(cooldown)}` : resent ? 'Reenviar outra vez' : 'Reenviar link'}
              </Button>
              <button
                type="button"
                onClick={switchEmail}
                className="w-full min-h-[44px] text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                Usar outro e-mail
              </button>
            </div>
          </div>
        </RecoveryCard>
      )}

      <Link
        to="/login"
        className="mt-6 mx-auto flex w-fit min-h-[44px] items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Voltar ao login
      </Link>
    </RecoveryShell>
  );
};
