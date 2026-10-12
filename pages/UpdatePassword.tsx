import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useScrollToError } from '../hooks/useScrollToError';
import { PasswordStrength } from '../components/auth/PasswordStrength';
import { RecoveryCard, RecoveryEyebrow, RecoveryLead, RecoveryShell, RecoveryTitle } from '../components/auth/RecoveryShell';
import { passwordPolicyError } from '../utils/passwordPolicy';
import { takeRecoveryCallback } from '../utils/authRecoveryLink';
import {
  isSessionExpiredError,
  mapUpdatePasswordError,
  RECOVERY_INVALID_COPY,
  resolveRecoverySession,
  type RecoveryInvalidReason,
  type RecoverySessionResult,
} from '../services/passwordRecovery';

type Phase =
  | { name: 'checking' }
  | { name: 'invalid'; reason: RecoveryInvalidReason }
  | { name: 'form' }
  | { name: 'success' };

export const REDIRECT_AFTER_SUCCESS_MS = 2500;

// O token do e-mail é de uso único: em StrictMode o efeito roda 2x, então a
// validação é compartilhada entre as montagens.
let resolving: Promise<RecoverySessionResult> | null = null;
function resolveOnce(): Promise<RecoverySessionResult> {
  if (!resolving) {
    resolving = resolveRecoverySession(supabase.auth, takeRecoveryCallback()).finally(() => {
      setTimeout(() => {
        resolving = null;
      }, 0);
    });
  }
  return resolving;
}

export const UpdatePassword: React.FC = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>({ name: 'checking' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const errorRef = useScrollToError(error);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let active = true;
    resolveOnce()
      .then((result) => {
        if (!active) return;
        setPhase(result.status === 'ready' ? { name: 'form' } : { name: 'invalid', reason: result.reason });
      })
      .catch((err) => {
        console.error('Erro ao validar link de redefinição:', err);
        if (active) setPhase({ name: 'invalid', reason: 'invalid' });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (phase.name === 'invalid' || phase.name === 'success') titleRef.current?.focus();
    if (phase.name !== 'success') return;
    const t = window.setTimeout(() => navigate('/', { replace: true }), REDIRECT_AFTER_SUCCESS_MS);
    return () => window.clearTimeout(t);
  }, [phase.name, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const policyProblem = passwordPolicyError(password);
    if (policyProblem) {
      setError(policyProblem);
      return;
    }
    if (password !== confirm) {
      setConfirmError('As senhas não são iguais.');
      setError(null);
      return;
    }
    setConfirmError(undefined);
    setError(null);
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPhase({ name: 'success' });
    } catch (err: unknown) {
      console.error('Erro ao salvar nova senha:', err);
      if (isSessionExpiredError(err)) {
        setPhase({ name: 'invalid', reason: 'expired' });
      } else {
        setError(mapUpdatePasswordError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
      aria-pressed={showPassword}
      className="pointer-events-auto -mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <RecoveryShell testId="update-password-page">
      {phase.name === 'checking' && (
        <RecoveryCard>
          <div role="status" aria-live="polite" className="flex items-center gap-3 py-6" data-testid="recovery-checking">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--color-accent)] motion-reduce:animate-none" aria-hidden="true" />
            <span className="text-[15px] text-[var(--color-text-secondary)]">Validando seu link…</span>
          </div>
        </RecoveryCard>
      )}

      {phase.name === 'invalid' && (
        <RecoveryCard>
          <div data-testid="recovery-invalid" data-reason={phase.reason}>
            <RecoveryEyebrow tone="warning">Link de redefinição</RecoveryEyebrow>
            <h1 ref={titleRef} tabIndex={-1} className="font-heading text-[26px] sm:text-[28px] font-bold leading-[1.1] tracking-tight focus:outline-none">
              {RECOVERY_INVALID_COPY[phase.reason].title}
            </h1>
            <RecoveryLead>{RECOVERY_INVALID_COPY[phase.reason].body}</RecoveryLead>
            <div className="mt-7 space-y-3">
              <Button type="button" variant="primary" size="lg" fullWidth onClick={() => navigate('/forgot-password')} data-testid="recovery-request-new">
                Pedir novo link
              </Button>
              <Link
                to="/login"
                className="flex w-full min-h-[44px] items-center justify-center text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
              >
                Voltar ao login
              </Link>
            </div>
          </div>
        </RecoveryCard>
      )}

      {phase.name === 'form' && (
        <RecoveryCard>
          <RecoveryEyebrow>Nova senha</RecoveryEyebrow>
          <RecoveryTitle>Crie sua nova senha</RecoveryTitle>
          <RecoveryLead>Escolha uma senha que você não usa em outros sites.</RecoveryLead>

          {error && (
            <div
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="mt-6 flex items-start gap-2.5 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] px-3.5 py-3 text-sm text-[var(--color-danger)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5" data-testid="update-password-form">
            <div>
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                label="Nova senha"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoComplete="new-password"
                aria-describedby="new-password-strength"
                size="lg"
                iconRight={toggle}
                required
              />
              <PasswordStrength id="new-password-strength" password={password} />
            </div>

            <Input
              id="confirm-password"
              type={showPassword ? 'text' : 'password'}
              label="Confirmar nova senha"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                if (confirmError) setConfirmError(undefined);
              }}
              autoComplete="new-password"
              error={confirmError}
              size="lg"
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={saving} data-testid="update-password-submit">
              {saving ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>
        </RecoveryCard>
      )}

      {phase.name === 'success' && (
        <RecoveryCard>
          <div data-testid="recovery-success" role="status">
            <RecoveryEyebrow tone="success">Tudo certo</RecoveryEyebrow>
            <h1 ref={titleRef} tabIndex={-1} className="font-heading text-[26px] sm:text-[28px] font-bold leading-[1.1] tracking-tight focus:outline-none">
              Senha atualizada
            </h1>
            <RecoveryLead>Você já está conectado. Vamos abrir o seu painel em instantes.</RecoveryLead>
            <Button type="button" variant="primary" size="lg" fullWidth className="mt-6" onClick={() => navigate('/', { replace: true })}>
              Ir para o painel agora
            </Button>
          </div>
        </RecoveryCard>
      )}
    </RecoveryShell>
  );
};
