import React from 'react';
import { Badge, Button } from '@/components/ui';
import { formatPhone } from '@/utils/formatters';
import { queuePaymentBadge, queueStaffActions } from '@/utils/queueStaffActions';
import type { QueueRecord } from '@/types/queue';
import type { Region } from '@/utils/formatters';
import { Megaphone, Play, Receipt, Check, X } from 'lucide-react';

interface QueueStaffCardProps {
  entry: QueueRecord;
  region: Region;
  highlighted?: boolean;
  lateMinutes?: number;
  busy?: boolean;
  position?: number;
  onStart: (entryId: string) => void;
  onCall: (entryId: string) => void;
  onCloseTicket: (entry: QueueRecord) => void;
  onConfirmPay: (entryId: string) => void;
  onCancelPay: (entryId: string) => void;
}

function remainingLateMinutes(calledAt: string | null | undefined, lateMinutes: number, now = Date.now()): number | null {
  if (!calledAt) return null;
  const started = Date.parse(calledAt);
  if (Number.isNaN(started)) return null;
  return Math.max(0, lateMinutes - Math.floor((now - started) / 60000));
}

function waitMinutes(joinedAt: string, now = Date.now()): number {
  const joined = Date.parse(joinedAt);
  if (Number.isNaN(joined)) return 0;
  return Math.max(0, Math.floor((now - joined) / 60000));
}

export const QueueStaffCard: React.FC<QueueStaffCardProps> = ({
  entry,
  region,
  highlighted = false,
  lateMinutes = 10,
  busy = false,
  position,
  onStart,
  onCall,
  onCloseTicket,
  onConfirmPay,
  onCancelPay,
}) => {
  const actions = queueStaffActions({
    status: entry.status,
    paymentStatus: entry.payment_status,
  });
  const badge = queuePaymentBadge(entry.payment_status);
  const lateLeft = entry.status === 'calling'
    ? remainingLateMinutes(entry.called_at, lateMinutes)
    : null;
  const waitingMin = entry.status === 'waiting' ? waitMinutes(entry.joined_at) : null;

  const isCalling = entry.status === 'calling';
  const isServing = entry.status === 'serving';

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
      {/* Header: posição + nome + badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {position != null && entry.status === 'waiting' && (
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-accent-dim)] text-theme-accent font-mono font-black text-sm shrink-0">
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

      {/* Meta: tempo de espera / chamada */}
      <div className="flex items-center gap-3 text-xs">
        {waitingMin != null && (
          <span className="text-theme-textMuted">
            há {waitingMin} min
          </span>
        )}
        {isCalling && (
          <span className={`font-semibold ${lateLeft != null && lateLeft <= 2 ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'}`}>
            {lateLeft == null
              ? 'Cliente chamado'
              : lateLeft > 0
                ? `${lateLeft} min para chegar`
                : 'Prazo encerrado'}
          </span>
        )}
        {isServing && entry.service_id && (
          <span className="text-theme-textSecondary truncate">
            Em atendimento
          </span>
        )}
      </div>

      {/* Ações de pagamento pendente */}
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
            Virar balcão
          </Button>
        </div>
      )}

      {/* Ações principais */}
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
    </article>
  );
};
