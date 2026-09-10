import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui';
import { useQueueBoard } from '@/hooks/useQueueBoard';
import { useQueueRealtime } from '@/hooks/useQueueRealtime';
import {
  cancelQueueEntryPublic,
  clearQueueTicket,
  isActiveQueueStatus,
  readQueueTicket,
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

  useQueueRealtime(businessId, (event) => {
    void queryClient.invalidateQueries({ queryKey: ['queue', 'client-active', businessId] });
    void queryClient.invalidateQueries({ queryKey: ['queue', 'board'] });

    const ticket = readQueueTicket(businessId);
    const isMine = ticket?.entryId === event.entryId || entry?.id === event.entryId;
    if (!isMine || event.status !== 'calling') return;
    const stamp = `${event.entryId}:${event.calledAt ?? event.at ?? 'calling'}`;
    if (lastCallAlertRef.current === stamp) return;
    lastCallAlertRef.current = stamp;
    playQueueCallAlert();
  });

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
              ? 'Sua senha anterior foi encerrada. Para entrar de novo, escolha o serviço abaixo.'
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
  const etaMinutes = board.data?.etaMinutes ?? null;
  const serviceName = board.data?.serviceName ?? null;
  const people = board.data?.people ?? [];
  const payBadge = queueClientPaymentBadge(board.data?.paymentStatus ?? entry.payment_status);

  const lateLeft = isCalling ? remainingLateMinutes(board.data?.calledAt ?? entry.called_at, settings?.lateMinutes ?? 10) : null;
  const lateExpired = isCalling && lateLeft != null && lateLeft <= 0;
  const headline = queueClientHeadline({
    status,
    position,
    firstName,
    etaMinutes,
    professionalName,
    remainingLateMinutes: lateLeft,
  });
  const estimatedWaitLabel = isWaiting ? formatQueueEstimatedWait(etaMinutes) : null;

  const ruleLine = queueClientRuleLine({
    status,
    allowLeave: settings?.allowLeave,
    lateMinutes: settings?.lateMinutes,
    remainingLateMinutes: lateLeft,
  });

  const waitedMin = isWaiting ? minutesSince(entry.joined_at) : null;
  const peopleAhead = typeof position === 'number' && position > 1 ? position - 1 : 0;

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
    <article className={`rounded-3xl border overflow-hidden shadow-[var(--shadow-card)] ${surfaceClass}`}>
      <div className="p-5 sm:p-6 space-y-5">
        <div className="space-y-3" aria-live="polite" aria-atomic="true">
          {!isClosed && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-theme-textMuted">
                {lateExpired ? 'Prazo esgotado' : isCalling ? 'Chamada' : isServing ? 'Atendimento' : 'Sua senha'}
              </p>
              <Badge variant={payBadge.variant} className="shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold">
                {payBadge.label}
              </Badge>
            </div>
          )}
          <h2 className={`text-2xl sm:text-3xl font-black leading-tight tracking-tight ${titleClass}`}>
            {headline.title}
          </h2>
          {headline.subtitle && (
            <p className={`text-sm leading-relaxed ${lateExpired ? 'text-[var(--color-warning)] font-medium' : 'text-theme-textSecondary'}`}>
              {headline.subtitle}
            </p>
          )}
          {lateExpired && (
            <div
              role="alert"
              className="rounded-2xl border border-[var(--color-warning-border)] bg-theme-surface px-4 py-3 text-sm text-theme-text"
            >
              A chamada continua visível para a equipe, mas o seu prazo de chegar já acabou.
              Não fique esperando neste ecrã — fale no balcão.
            </div>
          )}
        </div>

        {isWaiting && (
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-theme-border bg-theme-surface px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-theme-textMuted">Posição</p>
              <p className="mt-1 font-mono text-2xl font-black tabular-nums text-theme-text">
                {position == null ? '—' : position === 1 ? 'Próximo' : `${position}º`}
              </p>
              {peopleAhead > 0 && (
                <p className="mt-0.5 text-xs text-theme-textSecondary">
                  {peopleAhead === 1 ? '1 à frente' : `${peopleAhead} à frente`}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-theme-border bg-theme-surface px-3 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-theme-textMuted">Tempo estimado</p>
              <p className="mt-1 text-lg font-black leading-tight text-theme-text">
                {etaMinutes == null
                  ? 'Calculando…'
                  : etaMinutes <= 0
                    ? 'Agora'
                    : `cerca de ${etaMinutes} min`}
              </p>
              <p className="mt-0.5 text-xs text-theme-textSecondary">
                Soma de quem está à frente. Não é horário exato.
              </p>
            </div>
          </div>
        )}

        {estimatedWaitLabel && etaMinutes != null && etaMinutes > 0 && position != null && position <= 1 && (
          <p className="text-sm font-semibold text-theme-text">{estimatedWaitLabel}</p>
        )}

        {!isClosed && (
          <div className="rounded-2xl border border-theme-border/80 bg-theme-surface/80 px-4 py-3 space-y-1">
            {serviceName && (
              <p className="text-sm font-semibold text-theme-text">{serviceName}</p>
            )}
            <p className="text-xs text-theme-textSecondary">
              {[
                entry.duration_minutes ? `Serviço · ${entry.duration_minutes} min` : null,
                professionalName && !isCalling && !isServing ? `com ${professionalName}` : null,
                waitedMin != null && waitedMin > 0 ? `na fila há ${formatElapsedMinutes(waitedMin)}` : null,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {showPeople && (
          <div className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-theme-textMuted mb-2">Ordem da fila</p>
            <ol className="space-y-1.5">
              {visiblePeople.map((person) => (
                <li
                  key={`${person.position}-${person.firstName}`}
                  className={`flex items-center gap-3 text-sm ${person.isYou ? 'font-bold text-theme-text' : 'text-theme-textSecondary'}`}
                >
                  <span
                    className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
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
                <li className="text-xs text-theme-textMuted pl-10">
                  e mais {hiddenPeople} {hiddenPeople === 1 ? 'pessoa' : 'pessoas'}
                </li>
              )}
            </ol>
          </div>
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

      {(ruleLine || isWaiting || isCalling) && (
        <div className="px-5 py-3.5 border-t border-theme-border flex items-center justify-between gap-3 bg-theme-surface/60">
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
