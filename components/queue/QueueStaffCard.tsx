import React from 'react';
import { Badge, Button } from '@/components/ui';
import { formatPhone } from '@/utils/formatters';
import { queuePaymentBadge, queueStaffActions } from '@/utils/queueStaffActions';
import { formatElapsedMinutes, minutesSince, remainingLateMinutes } from '@/utils/queueTime';
import type { QueueRecord } from '@/types/queue';
import type { Region } from '@/utils/formatters';
import { Megaphone, Play, Receipt, Check, X, UserX, Undo2 } from 'lucide-react';

interface QueueStaffCardProps {
  entry: QueueRecord;
  region: Region;
  serviceName?: string | null;
  professionalName?: string | null;
  highlighted?: boolean;
  lateMinutes?: number;
  allowLeave?: boolean;
  busy?: boolean;
  position?: number;
  onStart: (entryId: string) => void;
  onCall: (entryId: string) => void;
  onCloseTicket: (entry: QueueRecord) => void;
  onConfirmPay: (entryId: string) => void;
  onCancelPay: (entryId: string) => void;
  onNoShow?: (entry: QueueRecord) => void;
  onRequeue?: (entryId: string) => void;
}

export const QueueStaffCard: React.FC<QueueStaffCardProps> = ({
  entry,
  region,
  serviceName = null,
  professionalName = null,
  highlighted = false,
  lateMinutes = 10,
  allowLeave = true,
  busy = false,
  position,
  onStart,
  onCall,
  onCloseTicket,
  onConfirmPay,
  onCancelPay,
  onNoShow,
  onRequeue,
}) => {
  const actions = queueStaffActions({
    status: entry.status,
    paymentStatus: entry.payment_status,
  });
  const badge = queuePaymentBadge(entry.payment_status);

  const isWaiting = entry.status === 'waiting';
  const isCalling = entry.status === 'calling';
  const isServing = entry.status === 'serving';

  const lateLeft = isCalling && allowLeave ? remainingLateMinutes(entry.called_at, lateMinutes) : null;
  const waitedMin = isWaiting || isCalling ? minutesSince(entry.joined_at) : null;
  const servingMin = isServing ? minutesSince(entry.serving_at ?? entry.called_at) : null;

  const detailParts = [
    serviceName,
    entry.duration_minutes ? `${entry.duration_minutes} min` : null,
    professionalName ? `com ${professionalName}` : null,
  ].filter(Boolean);

  let statusLine: { text: string; tone: 'muted' | 'warning' | 'danger' | 'info' } | null = null;
  if (isCalling) {
    if (!allowLeave || lateLeft == null) {
      statusLine = { text: 'Chamado · aguardando o cliente', tone: 'warning' };
    } else if (lateLeft > 0) {
      statusLine = { text: `Chamado · ${lateLeft} min para chegar`, tone: lateLeft <= 2 ? 'danger' : 'warning' };
    } else {
      statusLine = { text: 'Chamado · prazo esgotado', tone: 'danger' };
    }
  } else if (isServing) {
    statusLine = {
      text: servingMin != null && servingMin > 0 ? `Em atendimento há ${formatElapsedMinutes(servingMin)}` : 'Em atendimento',
      tone: 'info',
    };
  } else if (waitedMin != null) {
    statusLine = {
      text: waitedMin < 1 ? 'Chegou agora' : `Aguardando há ${formatElapsedMinutes(waitedMin)}`,
      tone: 'muted',
    };
  }

  const toneClass = {
    muted: 'text-theme-textMuted',
    warning: 'text-[var(--color-warning)] font-semibold',
    danger: 'text-[var(--color-danger)] font-semibold',
    info: 'text-[var(--color-info)] font-semibold',
  } as const;

  return (
    <article
      className={`rounded-2xl border p-4 space-y-3 transition-all duration-200 ${
        highlighted
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)] shadow-[var(--shadow-card-accent)]'
          : isCalling
            ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] shadow-[var(--shadow-card)]'
            : isServing
              ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)] shadow-[var(--shadow-card)]'
              : 'border-theme-border bg-theme-card shadow-[var(--shadow-card)]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {position != null && isWaiting && (
            <span
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-accent-dim)] text-theme-accent font-mono font-black text-sm shrink-0"
              aria-label={`Posição ${position}`}
            >
              {position}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-bold text-theme-text truncate text-base">{entry.client_name}</h3>
            <p className="text-sm text-theme-textSecondary font-mono mt-0.5">
              {formatPhone(entry.client_phone, region)}
            </p>
          </div>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <div className="text-sm space-y-0.5">
        {detailParts.length > 0 && (
          <p className="text-theme-text truncate">{detailParts.join(' · ')}</p>
        )}
        {statusLine && (
          <p className={`text-xs ${toneClass[statusLine.tone]}`}>{statusLine.text}</p>
        )}
      </div>

      {actions.showConfirmPay && (
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            variant="success"
            size="sm"
            className="min-h-[44px]"
            disabled={busy}
            onClick={() => onConfirmPay(entry.id)}
            icon={<Check className="w-4 h-4" />}
          >
            Confirmar pagamento
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px]"
            disabled={busy}
            onClick={() => onCancelPay(entry.id)}
            icon={<X className="w-4 h-4" />}
          >
            Pagar no balcão
          </Button>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {actions.primary?.id === 'start' && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={busy}
            onClick={() => onStart(entry.id)}
            icon={<Play className="w-4 h-4" />}
          >
            Iniciar atendimento
          </Button>
        )}
        {actions.primary?.id === 'close' && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            disabled={busy}
            onClick={() => onCloseTicket(entry)}
            icon={<Receipt className="w-4 h-4" />}
          >
            Fechar comanda
          </Button>
        )}
        {actions.secondary?.id === 'call' && (
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => onCall(entry.id)}
            icon={<Megaphone className="w-4 h-4" />}
            aria-label="Chamar cliente"
          >
            Chamar
          </Button>
        )}
      </div>

      {actions.tertiary.length > 0 && (onNoShow || onRequeue) && (
        <div className="flex items-center justify-end gap-1 -mb-1">
          {actions.tertiary.map((action) => {
            if (action.id === 'requeue' && onRequeue) {
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onRequeue(entry.id)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-semibold text-theme-textSecondary hover:text-theme-text hover:bg-theme-surface disabled:opacity-50"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              );
            }
            if (action.id === 'no_show' && onNoShow) {
              return (
                <button
                  key={action.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onNoShow(entry)}
                  className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-semibold text-theme-textSecondary hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] disabled:opacity-50"
                >
                  <UserX className="w-3.5 h-3.5" />
                  {action.label}
                </button>
              );
            }
            return null;
          })}
        </div>
      )}
    </article>
  );
};
