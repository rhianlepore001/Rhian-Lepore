import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Crown, MessageCircle, X } from 'lucide-react';
import { PublicClientMembership } from '../../services/memberships';
import { MembershipBadge } from './MembershipBadge';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';
import { ConfirmModal } from '../ui';
import { buildWhatsAppLink, formatCurrency, Region } from '../../utils/formatters';
import {
  periodProgressPercent,
  validityHeadline,
} from '../../utils/membershipValidity';

interface ClientMembershipPanelProps {
  membership: PublicClientMembership | null;
  slug: string;
  isBeauty: boolean;
  region: Region;
  businessPhone: string | null;
  businessName: string;
  clientName: string;
  loading?: boolean;
  cancelling?: boolean;
  onCancel?: () => Promise<void> | void;
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo',
  pending: 'Aguardando',
  overdue: 'Atrasado',
  cancelled: 'Cancelado',
};

export const ClientMembershipPanel: React.FC<ClientMembershipPanelProps> = ({
  membership,
  slug,
  isBeauty,
  region,
  businessPhone,
  businessName,
  clientName,
  loading = false,
  cancelling = false,
  onCancel,
}) => {
  const theme: ThemeVariant = isBeauty ? 'beauty' : 'barber';
  const { colors, accent, font, radius, status } = useBrutalTheme({ override: theme });
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (loading) {
    return (
      <div className={`${colors.card} ${colors.border} border ${radius.card} p-6 animate-pulse`} data-testid="club-panel-loading">
        <div className="h-4 w-24 bg-[var(--color-surface)] rounded mb-3" />
        <div className="h-7 w-48 bg-[var(--color-surface)] rounded mb-2" />
        <div className="h-3 w-full bg-[var(--color-surface)] rounded" />
      </div>
    );
  }

  if (!membership || membership.effective_status === 'cancelled') {
    return (
      <div className={`${colors.card} ${colors.border} border ${radius.card} p-6 space-y-4`} data-testid="club-panel-empty">
        <div className="flex items-center gap-2">
          <Crown className={`w-5 h-5 ${accent.text}`} />
          <h2 className={`text-lg ${font.heading} ${colors.text} uppercase`}>Clube</h2>
        </div>
        <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
          {membership?.effective_status === 'cancelled'
            ? 'Sua assinatura foi cancelada. Você pode assinar de novo quando quiser.'
            : 'Assine um plano mensal e use os serviços inclusos sem pagar de novo a cada visita.'}
        </p>
        <Link
          to={`/clube/${slug}`}
          className={`inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 ${radius.button} text-sm font-bold ${accent.bg} text-[var(--color-on-accent)]`}
        >
          {membership?.effective_status === 'cancelled' ? 'Assinar de novo' : 'Ver planos do clube'}
        </Link>
      </div>
    );
  }

  const statusKey = membership.effective_status;
  const periodEnd = membership.current_period_end || membership.next_billing_at;
  const headline = validityHeadline(statusKey, periodEnd);
  const progress = periodProgressPercent(membership.current_period_start, periodEnd);
  const canCancel = ['active', 'pending', 'overdue'].includes(statusKey);
  const whatsappMessage =
    statusKey === 'overdue'
      ? `Olá, aqui é ${clientName.split(' ')[0]}. Minha assinatura do plano "${membership.plan_name}" venceu. Como faço para renovar?`
      : `Olá, aqui é ${clientName.split(' ')[0]}. Queria falar sobre minha solicitação do plano "${membership.plan_name}" no ${businessName}.`;

  const statusClass =
    statusKey === 'active'
      ? status.success
      : statusKey === 'overdue'
        ? 'text-[var(--color-danger)]'
        : statusKey === 'pending'
          ? 'text-[var(--color-warning)]'
          : colors.textMuted;

  return (
    <div className={`${colors.card} ${colors.border} border ${radius.card} overflow-hidden`} data-testid="club-panel">
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs uppercase tracking-widest font-semibold ${colors.textMuted} mb-1`}>Clube</p>
            <h2 className={`text-2xl ${font.heading} ${colors.text} uppercase tracking-tight truncate`}>
              {membership.plan_name}
            </h2>
            <p className={`text-sm ${colors.textSecondary} mt-1`}>
              {formatCurrency(membership.price_cents / 100, region)}
              <span className={colors.textMuted}> /mês</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <MembershipBadge color={membership.badge_color} label={membership.badge_color} />
            <span className={`text-xs font-bold uppercase tracking-wider ${statusClass}`}>
              {STATUS_LABEL[statusKey] ?? statusKey}
            </span>
          </div>
        </div>

        <p className={`text-sm font-medium ${colors.text}`} data-testid="club-validity">
          {headline}
        </p>

        {statusKey === 'active' && progress !== null && (
          <div>
            <div className="h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden">
              <div
                className={`h-full ${accent.bg}`}
                style={{ width: `${progress}%` }}
                data-testid="club-progress"
              />
            </div>
            <p className={`text-xs ${colors.textMuted} mt-1.5`}>Período atual</p>
          </div>
        )}

        {membership.plan_description && (
          <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>{membership.plan_description}</p>
        )}

        <div>
          <p className={`text-xs uppercase tracking-wider font-semibold ${colors.textMuted} mb-2`}>Incluso</p>
          {membership.service_names.length === 0 ? (
            <p className={`text-sm ${colors.textSecondary}`}>Serviços do plano.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {membership.service_names.map((name) => (
                <li
                  key={name}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium ${colors.inputBg} ${colors.text}`}
                >
                  {name}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className={`text-sm ${colors.textSecondary}`} data-testid="club-usage">
          {membership.usage_limit_per_month
            ? `${membership.usage_this_period} de ${membership.usage_limit_per_month} usos neste período`
            : 'Usos ilimitados neste período'}
        </p>

        <div className="flex flex-col gap-2 pt-1">
          {statusKey === 'active' && (
            <Link
              to={`/book/${slug}`}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 ${radius.button} text-sm font-bold ${accent.bg} text-[var(--color-on-accent)]`}
            >
              <Calendar className="w-4 h-4" />
              Agendar com o plano
            </Link>
          )}
          {(statusKey === 'pending' || statusKey === 'overdue') && businessPhone && (
            <a
              href={buildWhatsAppLink(businessPhone, region, whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 ${radius.button} text-sm font-bold border ${colors.border} ${colors.text}`}
            >
              <MessageCircle className="w-4 h-4" />
              {statusKey === 'overdue' ? 'Falar para renovar' : 'Falar com o estabelecimento'}
            </a>
          )}
          {canCancel && onCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 ${radius.button} text-sm font-medium text-[var(--color-danger)]`}
            >
              <X className="w-4 h-4" />
              Cancelar plano
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmCancel}
        title="Cancelar plano"
        message="Você perde os benefícios agora. O estabelecimento verá o cancelamento na lista de assinantes."
        confirmLabel="Cancelar plano"
        cancelLabel="Manter"
        variant="danger"
        loading={cancelling}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          void Promise.resolve(onCancel?.()).finally(() => setConfirmCancel(false));
        }}
      />
    </div>
  );
};
