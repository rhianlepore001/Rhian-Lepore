import React from 'react';
import { Badge, Button } from '@/components/ui';
import { formatPhone } from '@/utils/formatters';
import { queuePaymentBadge, queueStaffActions } from '@/utils/queueStaffActions';
import type { QueueRecord } from '@/types/queue';
import type { Region } from '@/utils/formatters';

interface QueueStaffCardProps {
  entry: QueueRecord;
  region: Region;
  highlighted?: boolean;
  lateMinutes?: number;
  busy?: boolean;
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

export const QueueStaffCard: React.FC<QueueStaffCardProps> = ({
  entry,
  region,
  highlighted = false,
  lateMinutes = 10,
  busy = false,
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

  return (
    <article
      className={`rounded-2xl border p-4 space-y-3 shadow-[var(--shadow-card)] ${
        highlighted
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-dim)]'
          : 'border-theme-border bg-theme-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-theme-text truncate">{entry.client_name}</h3>
          <p className="text-sm text-theme-textSecondary font-mono">
            {formatPhone(entry.client_phone, region)}
          </p>
        </div>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {entry.status === 'calling' && (
        <p className="text-sm text-[var(--color-warning)]">
          {lateLeft == null
            ? 'Cliente chamado'
            : lateLeft > 0
              ? `${lateLeft} min para chegar à cadeira`
              : 'Prazo de atraso encerrado'}
        </p>
      )}

      {actions.showConfirmPay && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="success"
            className="min-h-[44px]"
            disabled={busy}
            onClick={() => onConfirmPay(entry.id)}
          >
            Confirmar pagamento
          </Button>
          <Button
            variant="ghost"
            className="min-h-[44px]"
            disabled={busy}
            onClick={() => onCancelPay(entry.id)}
          >
            Virar balcão
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {actions.primary?.id === 'start' && (
          <Button
            variant="primary"
            fullWidth
            disabled={busy}
            onClick={() => onStart(entry.id)}
          >
            Iniciar atendimento
          </Button>
        )}
        {actions.primary?.id === 'close' && (
          <Button
            variant="primary"
            fullWidth
            disabled={busy}
            onClick={() => onCloseTicket(entry)}
          >
            Fechar comanda
          </Button>
        )}
        {actions.secondary?.id === 'call' && (
          <Button
            variant="secondary"
            fullWidth
            disabled={busy}
            onClick={() => onCall(entry.id)}
          >
            Chamar cliente
          </Button>
        )}
      </div>
    </article>
  );
};
