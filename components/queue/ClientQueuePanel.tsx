import React from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useQueueBoard } from '@/hooks/useQueueBoard';
import { cancelQueueEntryPublic, findActiveQueueEntryByPhone } from '@/services/queue';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface ClientQueuePanelProps {
  businessId: string;
  phone: string | null;
  cameFromQr?: boolean;
}

export const ClientQueuePanel: React.FC<ClientQueuePanelProps> = ({
  businessId,
  phone,
  cameFromQr = false,
}) => {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const activeQuery = useQuery({
    queryKey: ['queue', 'active', businessId, phone],
    queryFn: () => findActiveQueueEntryByPhone(businessId, phone!),
    enabled: Boolean(phone),
  });

  const entry = activeQuery.data ?? null;
  const board = useQueueBoard(entry?.id, phone, entry?.status);

  if (!phone) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold text-theme-text">Fila disponível na casa</h2>
        <p className="text-sm text-theme-textSecondary mt-1">
          Escaneie o QR no balcão ou na bancada para entrar.
        </p>
      </div>
    );
  }

  if (activeQuery.isLoading) {
    return <p className="text-sm text-theme-textSecondary">Carregando sua senha…</p>;
  }

  if (!entry) {
    return (
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 shadow-[var(--shadow-card)]">
        <h2 className="font-bold text-theme-text">Fila disponível na casa</h2>
        <p className="text-sm text-theme-textSecondary mt-1">
          {cameFromQr
            ? 'Escolha o serviço no QR para entrar na fila.'
            : 'A fila digital não abre pelo site. Escaneie o QR no balcão ou na bancada.'}
        </p>
      </div>
    );
  }

  const people = board.data?.people ?? [];
  const position = board.data?.position;
  const settings = board.data?.settings;
  const ahead = people.filter((person) => !person.isYou && (position == null || person.position < position));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-theme-border bg-theme-card p-5 space-y-2 shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">
          {entry.status === 'calling' ? 'É a sua vez' : entry.status === 'serving' ? 'Em atendimento' : 'Na fila'}
        </p>
        <h2 className="text-2xl font-bold text-theme-text">
          {position ? `Você é o ${position}º da fila` : 'Sua senha está ativa'}
        </h2>
        {board.data?.etaMinutes != null && (
          <p className="text-sm text-theme-textSecondary">Tempo estimado: ~{board.data.etaMinutes} min.</p>
        )}
        {ahead.length > 0 && (
          <p className="text-sm text-theme-textSecondary">
            Na sua frente: {ahead.map((person) => person.firstName).join(', ')}
          </p>
        )}
        {settings?.allowLeave ? (
          <p className="text-sm text-theme-textSecondary">
            Após ser chamado, você tem {settings.lateMinutes} minutos para chegar à cadeira.
          </p>
        ) : (
          <p className="text-sm text-theme-textSecondary">Permaneça na casa enquanto aguarda.</p>
        )}
      </div>

      {(entry.status === 'waiting' || entry.status === 'calling') && (
        <button
          type="button"
          className="w-full min-h-[44px] rounded-xl border border-theme-border text-sm font-semibold text-theme-text"
          onClick={() => setLeaveOpen(true)}
        >
          Sair da fila
        </button>
      )}

      <ConfirmModal
        open={leaveOpen}
        onCancel={() => setLeaveOpen(false)}
        title="Sair da fila?"
        message="Você perderá sua posição. Para voltar, será necessário escanear o QR novamente na casa."
        confirmLabel="Sair da fila"
        loading={leaving}
        variant="danger"
        onConfirm={async () => {
          if (!phone) return;
          setLeaving(true);
          try {
            await cancelQueueEntryPublic(entry.id, phone);
            await activeQuery.refetch();
            setLeaveOpen(false);
          } finally {
            setLeaving(false);
          }
        }}
      />
    </div>
  );
};
