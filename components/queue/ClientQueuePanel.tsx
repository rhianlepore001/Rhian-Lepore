import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui';
import { useQueueBoard } from '@/hooks/useQueueBoard';
import {
  cancelQueueEntryPublic,
  clearQueueTicket,
  resolveClientQueueEntry,
} from '@/services/queue';
import { queuePaymentBadge } from '@/utils/queueStaffActions';
import { formatFirstName } from '@/utils/formatters';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, QrCode, RefreshCw } from 'lucide-react';

function waitMinutes(joinedAt: string, now = Date.now()): number {
  const joined = Date.parse(joinedAt);
  if (Number.isNaN(joined)) return 0;
  return Math.max(0, Math.floor((now - joined) / 60000));
}

interface ClientQueuePanelProps {
  businessId: string;
  phone: string | null;
  slug?: string | null;
  clientName?: string | null;
  cameFromQr?: boolean;
}

export const ClientQueuePanel: React.FC<ClientQueuePanelProps> = ({
  businessId,
  phone,
  slug = null,
  clientName = null,
  cameFromQr = false,
}) => {
  const queryClient = useQueryClient();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const firstName = clientName ? formatFirstName(clientName) : '';

  const activeQuery = useQuery({
    queryKey: ['queue', 'client-active', businessId, phone, slug],
    queryFn: () => resolveClientQueueEntry({ businessId, phone, slug }),
    enabled: Boolean(businessId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'calling' || status === 'serving') return 4000;
      if (status === 'waiting') return 8000;
      return 12_000;
    },
    staleTime: 0,
  });

  const entry = activeQuery.data ?? null;
  const lookupPhone = phone || entry?.client_phone || null;
  const board = useQueueBoard(entry?.id, lookupPhone, entry?.status);
  const joinHref = slug ? `/queue/${slug}` : null;

  if (activeQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5">
        <p className="text-sm text-theme-textSecondary">Abrindo sua senha…</p>
      </div>
    );
  }

  if (activeQuery.isError && !entry) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-theme-text">Não foi possível abrir a senha</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            Tente de novo. No balcão a fila continua.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-4 text-sm font-semibold text-theme-text"
          onClick={() => { void activeQuery.refetch(); }}
        >
          <RefreshCw className="w-4 h-4" />
          Tentar de novo
        </button>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-theme-text">Fora da fila</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            {cameFromQr
              ? 'Entre pelo QR da casa para pegar senha.'
              : 'A fila abre pelo QR no balcão.'}
          </p>
        </div>
        {joinHref && (
          <Link
            to={joinHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
          >
            <QrCode className="w-4 h-4" />
            Pegar senha
          </Link>
        )}
      </div>
    );
  }

  const position = board.data?.position;
  const settings = board.data?.settings;
  const etaMinutes = board.data?.etaMinutes;
  const serviceName = board.data?.serviceName;
  const payBadge = queuePaymentBadge(board.data?.paymentStatus);
  const aheadCount = Math.max(0, (position ?? 1) - 1);

  const isCalling = entry.status === 'calling';
  const isServing = entry.status === 'serving';
  const isWaiting = entry.status === 'waiting';
  const isNext = isWaiting && aheadCount === 0;

  const title = isCalling
    ? (firstName ? `${firstName}, pode ir à cadeira` : 'Pode ir à cadeira')
    : isServing
      ? 'Em atendimento'
      : isNext
        ? 'Você é o próximo'
        : 'Na fila';

  const waitLine = !isWaiting || isNext
    ? null
    : [
        `${aheadCount} ${aheadCount === 1 ? 'pessoa' : 'pessoas'} na frente`,
        etaMinutes != null && etaMinutes > 0 ? `cerca de ${etaMinutes} min` : null,
      ].filter(Boolean).join(' · ');

  const waitingMin = isWaiting ? waitMinutes(entry.joined_at) : null;
  const metaLine = [
    waitingMin != null ? `há ${waitingMin} min` : null,
    entry.duration_minutes ? `${entry.duration_minutes} min de serviço` : null,
  ].filter(Boolean).join(' · ');

  const ruleLine = isCalling
    ? (settings?.allowLeave
      ? `${settings.lateMinutes} min para chegar`
      : 'Dirija-se à cadeira agora')
    : isServing
      ? 'Seu horário já começou'
      : settings?.allowLeave
        ? `Ao chamar, ${settings.lateMinutes} min para a cadeira`
        : 'Permaneça na casa';

  const surfaceClass = isCalling
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
    : isServing
      ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)]'
      : 'border-theme-border bg-theme-card';

  return (
    <article className={`rounded-2xl border overflow-hidden ${surfaceClass}`}>
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`text-lg font-bold leading-tight ${
              isCalling ? 'text-[var(--color-success)]' : isServing ? 'text-[var(--color-info)]' : 'text-theme-text'
            }`}>
              {title}
            </h2>
            {serviceName && (
              <p className="text-sm text-theme-textSecondary mt-1 truncate">{serviceName}</p>
            )}
          </div>
          <Badge variant={payBadge.variant} className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold">
            {payBadge.label}
          </Badge>
        </div>

        {waitLine && (
          <p className="text-sm font-semibold text-theme-text">{waitLine}</p>
        )}
        {metaLine && (
          <p className="text-sm text-theme-textSecondary">{metaLine}</p>
        )}
      </div>

      <div className="px-5 py-3 border-t border-theme-border flex items-center justify-between gap-3">
        <p className="text-xs text-theme-textMuted leading-snug min-w-0">
          {ruleLine}
        </p>
        {(isWaiting || isCalling) && (
          <button
            type="button"
            className="shrink-0 min-h-[44px] px-2 text-xs font-semibold text-theme-textMuted hover:text-[var(--color-danger)] inline-flex items-center gap-1.5"
            onClick={() => setLeaveOpen(true)}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        )}
      </div>

      <ConfirmModal
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        title="Sair da fila?"
        message="Você perde a posição. Para voltar, pegue senha de novo pelo QR."
        confirmLabel="Sair da fila"
        loading={leaving}
        variant="danger"
        onConfirm={async () => {
          if (!lookupPhone) return;
          setLeaving(true);
          try {
            await cancelQueueEntryPublic(entry.id, lookupPhone);
            clearQueueTicket(businessId);
            await queryClient.invalidateQueries({ queryKey: ['queue', 'client-active', businessId] });
            setLeaveOpen(false);
          } finally {
            setLeaving(false);
          }
        }}
      />
    </article>
  );
};
