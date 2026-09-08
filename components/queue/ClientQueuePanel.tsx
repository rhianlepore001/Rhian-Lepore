import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui';
import { useQueueBoard } from '@/hooks/useQueueBoard';
import {
  cancelQueueEntryPublic,
  clearQueueTicket,
  isActiveQueueStatus,
  resolveClientQueueEntry,
} from '@/services/queue';
import { fetchPublicProfessionals } from '@/services/publicBooking';
import { queueClientHeadline, queueClientPaymentBadge, queueClientRuleLine } from '@/utils/queueClientCopy';
import { formatElapsedMinutes, minutesSince, remainingLateMinutes } from '@/utils/queueTime';
import { formatFirstName } from '@/utils/formatters';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, LogOut, QrCode, RefreshCw } from 'lucide-react';

interface ClientQueuePanelProps {
  businessId: string;
  phone: string | null;
  slug?: string | null;
  clientName?: string | null;
  cameFromQr?: boolean;
}

const MAX_PEOPLE_VISIBLE = 8;

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
  const [leaveError, setLeaveError] = useState('');
  const [, setTick] = useState(0);
  const firstName = clientName ? formatFirstName(clientName) : '';

  const activeQuery = useQuery({
    queryKey: ['queue', 'client-active', businessId, phone, slug],
    queryFn: () => resolveClientQueueEntry({ businessId, phone, slug }),
    enabled: Boolean(businessId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'calling' || status === 'serving') return 4000;
      if (status === 'waiting') return 8000;
      return 15_000;
    },
    staleTime: 0,
  });

  const entry = activeQuery.data ?? null;
  const isActive = entry ? isActiveQueueStatus(entry.status) : false;
  const lookupPhone = phone || entry?.client_phone || null;
  const board = useQueueBoard(isActive ? entry?.id : null, lookupPhone, entry?.status);

  const professionalQuery = useQuery({
    queryKey: ['queue', 'public-professionals', businessId],
    queryFn: () => fetchPublicProfessionals(businessId),
    enabled: Boolean(businessId && entry?.professional_id),
    staleTime: 5 * 60 * 1000,
  });
  const professionalName = entry?.professional_id
    ? (professionalQuery.data as Array<{ id: string; name?: string }> | undefined)
      ?.find((pro) => pro.id === entry.professional_id)?.name?.split(' ')[0] ?? null
    : null;

  // Relógio local para "há X min" e contagem do prazo sem esperar o próximo poll.
  const isCallingNow = entry?.status === 'calling';
  useEffect(() => {
    if (!isActive) return;
    const id = window.setInterval(() => setTick((value) => value + 1), isCallingNow ? 5_000 : 30_000);
    return () => window.clearInterval(id);
  }, [isActive, isCallingNow]);

  const joinHref = slug ? `/queue/${slug}` : null;
  const bookHref = slug ? `/book/${slug}?agendar=1` : null;

  if (activeQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5">
        <p className="text-sm text-theme-textSecondary">Buscando sua senha…</p>
      </div>
    );
  }

  if (activeQuery.isError && !entry) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-theme-text">Não conseguimos carregar sua senha</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            Verifique sua conexão e tente de novo. Sua posição na fila está guardada.
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
          <h2 className="text-base font-bold text-theme-text">Você não está na fila</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            {cameFromQr
              ? 'Sua senha anterior foi encerrada. Para entrar de novo, escolha o serviço abaixo.'
              : 'Para entrar na fila, escaneie o QR Code disponível no estabelecimento.'}
          </p>
        </div>
        {cameFromQr && joinHref && (
          <Link
            to={joinHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
          >
            <QrCode className="w-4 h-4" />
            Entrar na fila
          </Link>
        )}
      </div>
    );
  }

  const status = entry.status;
  const isWaiting = status === 'waiting';
  const isCalling = status === 'calling';
  const isServing = status === 'serving';
  const isClosed = !isActive;

  const position = board.data ? board.data.position ?? null : undefined;
  const settings = board.data?.settings;
  const etaMinutes = board.data?.etaMinutes ?? null;
  const serviceName = board.data?.serviceName ?? null;
  const people = board.data?.people ?? [];
  const payBadge = queueClientPaymentBadge(board.data?.paymentStatus ?? entry.payment_status);

  const headline = queueClientHeadline({
    status,
    position,
    firstName,
    etaMinutes,
    professionalName,
  });

  const lateLeft = isCalling ? remainingLateMinutes(board.data?.calledAt ?? entry.called_at, settings?.lateMinutes ?? 10) : null;
  const ruleLine = queueClientRuleLine({
    status,
    allowLeave: settings?.allowLeave,
    lateMinutes: settings?.lateMinutes,
    remainingLateMinutes: lateLeft,
  });

  const waitedMin = isWaiting ? minutesSince(entry.joined_at) : null;
  const metaParts = [
    serviceName,
    entry.duration_minutes ? `${entry.duration_minutes} min` : null,
    !isClosed && professionalName && !isCalling && !isServing ? `com ${professionalName}` : null,
    waitedMin != null && waitedMin > 0 ? `na fila há ${formatElapsedMinutes(waitedMin)}` : null,
  ].filter(Boolean);

  const surfaceClass = isCalling
    ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
    : isServing
      ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)]'
      : 'border-theme-border bg-theme-card';

  const titleClass = isCalling
    ? 'text-[var(--color-success)]'
    : isServing
      ? 'text-[var(--color-info)]'
      : 'text-theme-text';

  const visiblePeople = people.slice(0, MAX_PEOPLE_VISIBLE);
  const hiddenPeople = Math.max(0, people.length - visiblePeople.length);
  const showPeople = isWaiting && people.length > 1;

  const handleLeave = async () => {
    if (!lookupPhone) return;
    setLeaving(true);
    setLeaveError('');
    try {
      const ok = await cancelQueueEntryPublic(entry.id, lookupPhone);
      if (!ok) {
        setLeaveError('Sua senha já foi chamada ou encerrada. Fale com a equipe no balcão.');
        return;
      }
      clearQueueTicket(businessId);
      await queryClient.invalidateQueries({ queryKey: ['queue', 'client-active', businessId] });
      setLeaveOpen(false);
    } catch {
      setLeaveError('Não foi possível sair da fila agora. Tente de novo.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <article className={`rounded-2xl border overflow-hidden ${surfaceClass}`} aria-live="polite">
      <div className="p-5 space-y-4">
        <div className="space-y-2">
          {!isClosed && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">
                {isCalling ? 'Sua senha foi chamada' : isServing ? 'Atendimento em andamento' : 'Sua senha'}
              </p>
              <Badge variant={payBadge.variant} className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold">
                {payBadge.label}
              </Badge>
            </div>
          )}
          <h2 className={`text-2xl font-bold leading-tight ${titleClass}`}>{headline.title}</h2>
          {headline.subtitle && (
            <p className="text-sm text-theme-textSecondary leading-relaxed">{headline.subtitle}</p>
          )}
        </div>

        {!isClosed && metaParts.length > 0 && (
          <p className="text-sm text-theme-textSecondary">{metaParts.join(' · ')}</p>
        )}

        {showPeople && (
          <div className="rounded-xl border border-theme-border bg-theme-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted mb-2">Ordem da fila</p>
            <ol className="space-y-1.5">
              {visiblePeople.map((person) => (
                <li
                  key={`${person.position}-${person.firstName}`}
                  className={`flex items-center gap-3 text-sm ${person.isYou ? 'font-bold text-theme-text' : 'text-theme-textSecondary'}`}
                >
                  <span
                    className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                      person.isYou
                        ? 'bg-theme-accent text-[var(--color-on-accent)]'
                        : 'bg-theme-card border border-theme-border text-theme-textMuted'
                    }`}
                  >
                    {person.position}
                  </span>
                  <span className="truncate">{person.isYou ? 'Você' : person.firstName}</span>
                </li>
              ))}
              {hiddenPeople > 0 && (
                <li className="text-xs text-theme-textMuted pl-9">
                  e mais {hiddenPeople} {hiddenPeople === 1 ? 'pessoa' : 'pessoas'}
                </li>
              )}
            </ol>
          </div>
        )}

        {status === 'completed' && bookHref && (
          <Link
            to={bookHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-4 text-sm font-semibold text-theme-text"
          >
            <CalendarPlus className="w-4 h-4" />
            Agendar a próxima visita
          </Link>
        )}
      </div>

      {(ruleLine || isWaiting || isCalling) && (
        <div className="px-5 py-3 border-t border-theme-border flex items-center justify-between gap-3">
          <p className="text-xs text-theme-textMuted leading-snug min-w-0">{ruleLine}</p>
          {(isWaiting || isCalling) && (
            <button
              type="button"
              className="shrink-0 min-h-[44px] px-2 text-xs font-semibold text-theme-textMuted hover:text-[var(--color-danger)] inline-flex items-center gap-1.5"
              onClick={() => { setLeaveError(''); setLeaveOpen(true); }}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair da fila
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        title="Sair da fila?"
        message={leaveError || 'Você perde a sua posição. Para entrar de novo, escaneie o QR Code do estabelecimento.'}
        confirmLabel="Sair da fila"
        cancelLabel="Continuar na fila"
        loading={leaving}
        variant="danger"
        onConfirm={() => void handleLeave()}
      />
    </article>
  );
};
