import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const BILLING_PATH = '/configuracoes/assinatura';

export function trialRemainingLabel(days: number): string {
  if (days <= 0) return 'Termina hoje';
  if (days === 1) return 'Termina amanhã';
  return `${days} dias restantes`;
}

interface TrialStatusCardProps {
  /** Chamado depois de navegar (ex.: fechar o menu lateral no celular). */
  onNavigate?: () => void;
  className?: string;
  /** Sidebar do desktop (w-64): sem ícone, para caber em uma linha. */
  compact?: boolean;
}

/**
 * Status do período de teste, compacto, dentro do menu lateral (celular) e da sidebar (desktop).
 * Substitui o banner fixo no topo. Usa só as cores do tema (vale para barbearia e salão).
 */
export const TrialStatusCard: React.FC<TrialStatusCardProps> = ({ onNavigate, className = '', compact = false }) => {
  const { isTrial, isExpired, trialDaysRemaining, isLoading } = useSubscription();
  const { role } = useAuth();
  const { colors, accent } = useBrutalTheme();
  const navigate = useNavigate();

  if (role === 'staff' || isLoading) return null;
  if (!isTrial && !isExpired) return null;

  const tone: 'neutral' | 'warning' | 'danger' = isExpired ? 'danger' : trialDaysRemaining <= 2 ? 'warning' : 'neutral';
  const goToPlans = () => {
    navigate(BILLING_PATH);
    onNavigate?.();
  };

  const toneBox =
    tone === 'danger'
      ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]'
      : tone === 'warning'
        ? `${accent.border} ${accent.bgDim}`
        : `${colors.border} ${colors.card}`;
  const Icon = tone === 'neutral' ? Clock : AlertTriangle;
  const iconColor = tone === 'danger' ? 'text-[var(--color-danger)]' : accent.text;

  return (
    <div
      data-testid="trial-status"
      data-tone={tone}
      className={`flex items-center ${compact ? 'gap-2' : 'gap-3'} rounded-xl border px-3 py-2.5 ${toneBox} ${className}`}
    >
      {!compact && (
        <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--color-surface)]">
          <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden="true" />
        </div>
      )}
      <div className="flex-1 min-w-0 leading-tight">
        <p className={`text-xs font-medium uppercase tracking-[0.06em] whitespace-nowrap ${colors.textMuted}`}>
          {isExpired ? 'Assinatura' : 'Período de teste'}
        </p>
        <p className={`${compact ? 'text-[13px]' : 'text-sm'} font-semibold whitespace-nowrap truncate ${tone === 'danger' ? 'text-[var(--color-danger)]' : colors.text}`}>
          {isExpired ? 'Período de teste encerrado' : trialRemainingLabel(trialDaysRemaining)}
        </p>
      </div>
      <button
        type="button"
        onClick={goToPlans}
        className={`shrink-0 inline-flex items-center gap-1 rounded-full ${compact ? 'px-2.5' : 'px-3'} py-1.5 text-xs font-semibold transition-colors ${accent.bg} text-[var(--color-on-accent)] hover:opacity-90`}
      >
        {isExpired ? 'Ver planos' : 'Assinar'}
        {!compact && <ArrowRight className="w-3 h-3" aria-hidden="true" />}
      </button>
    </div>
  );
};
