import React, { useEffect, useId, useRef, useState } from 'react';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { ProfilePasswords } from '../../services/profilePassword';
import { PASSWORD_RULE_HINT } from '../../utils/passwordPolicy';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select, type SelectOption } from '../ui/Select';
import { PasswordStrength } from './PasswordStrength';

interface ProfilePasswordFormProps {
  onBack: () => void;
  onSavingChange: (saving: boolean) => void;
}

interface PasswordFieldProps {
  name: keyof ProfilePasswords;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly: boolean;
  visible: boolean;
  onToggleVisibility: () => void;
  error?: string;
}

const emptyPasswords: ProfilePasswords = { currentPassword: '', newPassword: '', confirmation: '' };

function PasswordField({ name, label, value, onChange, readOnly, visible, onToggleVisibility, error }: PasswordFieldProps) {
  const id = useId();
  const { colors } = useBrutalTheme();
  const visibilityLabel = name === 'confirmation' ? 'confirmação da nova senha' : label.toLowerCase();
  return (
    <Input
      id={id}
      name={name}
      label={label}
      type={visible && !readOnly ? 'text' : 'password'}
      autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      required
      readOnly={readOnly}
      value={value}
      onChange={onChange}
      error={error}
      hint={name === 'newPassword' && !error ? PASSWORD_RULE_HINT : undefined}
      className="pr-14"
      iconRight={
        <button
          type="button"
          disabled={readOnly}
          onClick={onToggleVisibility}
          aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${visibilityLabel}`}
          className={`pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-theme-accent ${colors.textMuted} hover:text-theme-text`}
        >
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      }
    />
  );
}

export function ProfilePasswordForm({ onBack, onSavingChange }: ProfilePasswordFormProps) {
  const { changePassword } = useAuth();
  const { colors } = useBrutalTheme();
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [visibleField, setVisibleField] = useState<keyof ProfilePasswords | null>(null);
  const [error, setError] = useState<Awaited<ReturnType<typeof changePassword>>>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mfaOptions, setMfaOptions] = useState<SelectOption[]>([]);
  const [factorId, setFactorId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const submitting = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (form?.parentElement) form.parentElement.scrollTop = 0;
    form?.querySelector<HTMLInputElement>('[name="currentPassword"]')?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const fieldName = error?.mfaOptions ? 'mfaCode' : error?.field;
    if (fieldName) {
      const field = formRef.current?.elements.namedItem(fieldName);
      if (field instanceof HTMLInputElement) field.focus();
    } else if (error || success) {
      feedbackRef.current?.focus();
    }
  }, [error, success]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.currentTarget;
    setPasswords(previous => ({ ...previous, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    setVisibleField(null);
    setSaving(true);
    onSavingChange(true);

    try {
      const result = mfaOptions.length
        ? await changePassword(passwords, { code: mfaCode, factorId })
        : await changePassword(passwords);
      setMfaCode('');
      if (result) {
        setError(result);
        const options = result.mfaOptions;
        if (options?.length) {
          setMfaOptions(options);
          setFactorId(current => options.some(option => option.value === current) ? current : options[0].value);
        }
        if ((!result.field && !result.mfaOptions) || result.field === 'currentPassword') {
          setPasswords(previous => ({ ...previous, currentPassword: '' }));
        }
      } else {
        setPasswords(emptyPasswords);
        setSuccess(true);
      }
    } finally {
      submitting.current = false;
      setSaving(false);
      onSavingChange(false);
    }
  };

  const fieldProps = (name: keyof ProfilePasswords): Omit<PasswordFieldProps, 'label'> => ({
    name,
    value: passwords[name],
    onChange: handleChange,
    readOnly: saving,
    visible: visibleField === name,
    onToggleVisibility: () => setVisibleField(current => current === name ? null : name),
    error: error?.field === name ? error.message : undefined,
  });

  if (success) {
    return (
      <div className="space-y-5">
        <div ref={feedbackRef} tabIndex={-1} role="status" className="flex gap-3 rounded-xl border border-[var(--color-success)] bg-[var(--color-success-bg)] p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-success)]" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className={`font-semibold ${colors.text}`}>Senha alterada</h3>
            <p className={`text-sm ${colors.textSecondary}`}>Você continua conectado aqui. Nos outros dispositivos, entre novamente com a nova senha.</p>
          </div>
        </div>
        <Button fullWidth onClick={onBack}>Voltar ao perfil</Button>
      </div>
    );
  }

  return (
    <form ref={formRef} className="space-y-4" onSubmit={handleSubmit} noValidate aria-busy={saving}>
      <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>
        Após a troca, você precisará entrar de novo nos outros dispositivos.
      </p>
      {error && !error.field && !error.mfaOptions && (
        <div ref={feedbackRef} tabIndex={-1} role="alert" className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3 text-sm text-theme-text">
          {error.message}
        </div>
      )}
      <PasswordField {...fieldProps('currentPassword')} label="Senha atual" />
      <div>
        <PasswordField {...fieldProps('newPassword')} label="Nova senha" />
        {passwords.newPassword && <PasswordStrength password={passwords.newPassword} />}
      </div>
      <PasswordField {...fieldProps('confirmation')} label="Confirme a nova senha" />
      {mfaOptions.length > 0 && (
        <div className={`space-y-3 border-t pt-4 ${colors.divider}`}>
          {mfaOptions.length > 1 && (
            <Select label="Aplicativo autenticador" value={factorId} onChange={event => setFactorId(event.target.value)} options={mfaOptions} disabled={saving} />
          )}
          <Input
            name="mfaCode"
            label="Código de verificação"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={mfaCode}
            readOnly={saving}
            onChange={event => {
              setMfaCode(event.target.value);
              if (error?.field === 'mfaCode') setError(null);
            }}
            error={error?.field === 'mfaCode' ? error.message : undefined}
            hint={error?.field === 'mfaCode' ? undefined : 'Use o código de 6 dígitos do seu aplicativo autenticador.'}
          />
        </div>
      )}
      <div className="grid gap-2 pt-1 sm:grid-cols-2">
        <Button type="submit" fullWidth loading={saving}>{saving ? 'Alterando senha…' : 'Salvar nova senha'}</Button>
        <Button variant="ghost" fullWidth onClick={onBack} disabled={saving}>Voltar ao perfil</Button>
      </div>
    </form>
  );
}
