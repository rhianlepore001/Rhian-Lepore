import React, { useEffect, useRef, useState } from 'react';
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
import {
  formatQueueEstimatedWait,
  queueClientHeadline,
  queueClientPaymentBadge,
  queueClientRuleLine,
} from '@/utils/queueClientCopy';
import { playQueueCallAlert } from '@/utils/queueCallAlert';
import { formatElapsedMinutes, minutesSince, remainingLateMinutes } from '@/utils/queueTime';
import { formatFirstName } from '@/utils/formatters';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, ChevronDown, Clock, LogOut, Megaphone, QrCode, RefreshCw } from 'lucide-react';

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
  const [leaveError, setLeaveError] = useState('');
  const [, setTick] = useState(0);
  const lastCallAlertRef = useRef<string | null>(null);
  const firstName = clientName ? formatFirstName(clientName) : '';

  const activeQuery = useQuery({
    queryKey: ['queue', 'client-active', businessId, phone, slug],
    queryFn: () => resolveClientQueueEntry({ businessId, phone, slug }),
    enabled: Boolean(businessId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'calling' || status === 'serving') return 4000;
      if (status === 'waiting') return 6000;
      return 15_000;
    },
    staleTime: 0,
  });

  const entry = activeQuery.data ?? null;
  const isActive = entry ? isActiveQueueStatus(entry.status) : false;
  const lookupPhone = phone || entry?.client_phone || null;
  const board = useQueueBoard(isActive ? entry?.id : null, lookupPhone, entry?.status);

  const entryId = entry?.id;
  const calledAt = entry?.called_at;
  const isCallingNow = entry?.status === 'calling';
  useEffect(() => {
    if (!entryId || !isCallingNow) return;
    const stamp = `${entryId}:${calledAt ?? 'calling'}`;
    if (lastCallAlertRef.current === stamp) return;
    lastCallAlertRef.current = stamp;
    playQueueCallAlert();
  }, [calledAt, entryId, isCallingNow]);

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

  useEffect(() => {
    if (!isActive) return;
    const id = window.setInterval(() => setTick((value) => value + 1), isCallingNow ? 5_000 : 30_000);
    return () => window.clearInterval(id);
  }, [isActive, isCallingNow]);

  const joinHref = slug ? `/queue/${slug}` : null;
  const bookHref = slug ? `/book/${slug}?agendar=1` : null;

  if (activeQuery.isLoading) {
    return (
      <div className="rounded-3xl border border-theme-border bg-theme-card p-6">
        <p className="text-sm text-theme-textSecondary">Buscando sua senha…</p>
      </div>
    );
  }

  if (activeQuery.isError && !entry) {
    return (
      <div className="rounded-3xl border border-theme-border bg-theme-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-theme-text">Não conseguimos carregar sua senha</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            Verifique sua conexão e tente de novo. Sua posição na fila está guardada.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-theme-border bg-theme-surface px-4 text-sm font-semibold text-theme-text"
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
      <div className="rounded-3xl border border-theme-border bg-theme-card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-theme-text">Você não está na fila</h2>
          <p className="text-sm text-theme-textSecondary mt-1">
            {cameFromQr
              ? 'Escolha um serviço para pegar sua senha.'
              : 'Para entrar na fila, escaneie o QR Code disponível no estabelecimento.'}
          </p>
        </div>
        {cameFromQr && joinHref && (
          <Link
            to={joinHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
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
  const estimatedWait = formatQueueEstimatedWait(board.data?.etaMinutes);
  const serviceName = board.data?.serviceName ?? null;
  const people = board.data?.people ?? [];
  const payBadge = queueClientPaymentBadge(board.data?.paymentStatus ?? entry.payment_status);

  const lateLeft = isCalling && settings?.allowLeave
    ? remainingLateMinutes(entry.called_at ?? board.data?.calledAt, settings.lateMinutes)
    : null;
  const lateExpired = isCalling && lateLeft != null && lateLeft <= 0;
  const headline = queueClientHeadline({
    status,
    position: board.isError ? position ?? null : position,
    firstName,
    professionalName,
    remainingLateMinutes: lateLeft,
  });
  const ruleLine = settings && !lateExpired ? queueClientRuleLine({
    status,
    allowLeave: settings.allowLeave,
    lateMinutes: settings.lateMinutes,
    remainingLateMinutes: lateLeft,
  }) : null;

  const waitedMin = isWaiting ? minutesSince(entry.joined_at) : null;
  const serviceDetails = [
    entry.duration_minutes ? `${entry.duration_minutes} min de serviço` : null,
    professionalName && isWaiting ? `com ${professionalName}` : null,
    waitedMin != null && waitedMin > 0 ? `na fila há ${formatElapsedMinutes(waitedMin)}` : null,
  ].filter(Boolean).join(' · ');

  const surfaceClass = lateExpired
    ? 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]'
    : isCalling
      ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
      : isServing
        ? 'border-[var(--color-info-border)] bg-[var(--color-info-bg)]'
        : 'border-theme-border bg-theme-card';

  const titleClass = lateExpired
    ? 'text-[var(--color-warning)]'
    : isCalling
      ? 'text-[var(--color-success)]'
      : isServing
        ? 'text-[var(--color-info)]'
        : 'text-theme-text';

  const handleLeave = async () => {
    if (!lookupPhone) return;
    setLeaving(true);
    setLeaveError('');
    try {
      const ok = await cancelQueueEntryPublic(entry.id, lookupPhone);
      if (!ok) {
        setLeaveError('Seu atendimento pode ter começado ou sua senha pode ter sido encerrada. Atualize a fila ou fale com a equipe no balcão.');
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
    <article className={`rounded-3xl border overflow-hidden shadow-[var(--shadow-card)] ${surfaceClass}`}>
      <div className="space-y-4 p-4 sm:p-6">
        <div aria-live="polite" aria-atomic="true">
          {!isClosed && (
            <p className={`mb-2 flex items-center gap-2 text-sm font-semibold ${titleClass}`}>
              {isCalling && <Megaphone className="size-4 shrink-0" aria-hidden="true" />}
              {isCalling ? 'Sua senha foi chamada' : isServing ? 'Sua senha' : 'Minha senha'}
            </p>
          )}
          <h2 className={`break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl ${titleClass}`}>
            {headline.title}
          </h2>
          {headline.subtitle && <p className="mt-1.5 text-sm leading-relaxed text-theme-textSecondary">{headline.subtitle}</p>}
        </div>

        {isCalling && ruleLine && settings?.allowLeave && (
          <p className="flex items-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-3 py-2.5 text-sm font-semibold text-theme-text">
            <Clock className="size-4 shrink-0" aria-hidden="true" />
            {ruleLine}
          </p>
        )}

        {isActive && (activeQuery.isRefetchError || board.isRefetchError) && (
          <p className="text-sm text-theme-textSecondary" role="status">
            Falha na atualização. Exibindo os últimos dados recebidos.
          </p>
        )}

        {isWaiting && (
          <div className="rounded-xl border border-theme-border bg-theme-surface p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-theme-textSecondary">
                <Clock className="size-4 shrink-0" aria-hidden="true" />
                Espera estimada
              </p>
              <p className="text-lg font-bold tabular-nums text-theme-text">
                {estimatedWait ?? (board.isFetching ? 'Calculando…' : 'Indisponível')}
              </p>
            </div>
            {ruleLine && <p className="mt-2 border-t border-theme-border pt-2 text-sm leading-relaxed text-theme-textSecondary">{ruleLine}</p>}
          </div>
        )}

        {!isClosed && (
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-t border-theme-border pt-3">
            {(serviceName || serviceDetails) && (
              <div className="min-w-0 break-words">
                {serviceName && <p className="text-sm font-semibold text-theme-text">{serviceName}</p>}
                {serviceDetails && <p className="text-xs leading-relaxed text-theme-textSecondary">{serviceDetails}</p>}
              </div>
            )}
            <Badge variant={payBadge.variant} className="text-xs font-semibold">{payBadge.label}</Badge>
          </div>
        )}

        {isWaiting && people.length > 1 && (
          <details className="group rounded-xl border border-theme-border bg-theme-surface px-3.5">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-theme-text marker:content-none [&::-webkit-details-marker]:hidden">
              Ordem da fila
              <ChevronDown className="size-4 shrink-0 group-open:rotate-180" aria-hidden="true" />
            </summary>
            <ol className="space-y-1.5 border-t border-theme-border py-2.5">
              {people.map((person) => (
                <li
                  key={person.position}
                  aria-current={person.isYou ? 'true' : undefined}
                  className={`flex items-center gap-3 text-sm ${person.isYou ? 'font-bold text-theme-text' : 'text-theme-textSecondary'}`}
                >
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${person.isYou
                    ? 'bg-theme-accent text-[var(--color-on-accent)]'
                    : 'bg-theme-card border border-theme-border text-theme-textMuted'}`}>
                    {person.position}
                  </span>
                  <span className="min-w-0 break-words">{person.isYou ? 'Você' : person.firstName}</span>
                </li>
              ))}
            </ol>
          </details>
        )}

        {(status === 'no_show' || status === 'cancelled') && cameFromQr && joinHref && (
          <Link
            to={joinHref}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
          >
            <QrCode className="w-4 h-4" />
            Entrar na fila de novo
          </Link>
        )}

        {status === 'completed' && bookHref && (
          <div className="flex flex-col gap-2">
            <Link
              to={bookHref}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
            >
              <CalendarPlus className="w-4 h-4" />
              Iniciar agendamento
            </Link>
          </div>
        )}
      </div>

      {(isWaiting || isCalling) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-theme-border bg-theme-surface/60 px-4 py-1 sm:px-6">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-theme-textSecondary hover:text-theme-text disabled:opacity-60"
            disabled={activeQuery.isFetching || board.isFetching || !lookupPhone}
            onClick={() => {
              void activeQuery.refetch();
              void board.refetch();
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar fila
          </button>
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-theme-textSecondary hover:text-[var(--color-danger)]"
            onClick={() => { setLeaveError(''); setLeaveOpen(true); }}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sair da fila
          </button>
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
