import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Play, QrCode, Settings, User, Users, Receipt } from 'lucide-react';
import { Button, Card, PageHeader, SkeletonCard, useToast } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueueCheckoutSheet } from '@/components/queue/QueueCheckoutSheet';
import { QueueComandasList } from '@/components/queue/QueueComandasList';
import { QueueManualAddSheet } from '@/components/queue/QueueManualAddSheet';
import { QueueQrSheet } from '@/components/queue/QueueQrSheet';
import { QueueSettingsSheet } from '@/components/queue/QueueSettingsSheet';
import { QueueStaffCard } from '@/components/queue/QueueStaffCard';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBusinessSlug,
  useCancelQueuePayment,
  useConfirmQueuePayment,
  useQueueEntries,
  useQueueSettings,
  useQueueTeamMembers,
  useUpdateQueueStatus,
} from '@/hooks/useQueue';
import { supabase } from '@/lib/supabase';
import { fetchServices } from '@/services/serviceSettings';
import type { QueueRecord } from '@/types/queue';

export const QueueManagement: React.FC = () => {
  const { role, region, companyId, teamMemberId } = useAuth();
  const isStaff = role === 'staff';
  const { showToast } = useToast();
  const tenantId = companyId ?? '';

  const { data: rawEntries = [], isLoading: loadingEntries, refetch: refetchEntries } = useQueueEntries(tenantId);
  const { data: businessSlug } = useBusinessSlug(tenantId);
  const { data: teamMembers = [] } = useQueueTeamMembers(tenantId);
  const { data: settings, refetch: refetchSettings } = useQueueSettings();
  const { data: services = [] } = useQuery({
    queryKey: ['queue', 'services', tenantId],
    queryFn: () => fetchServices(tenantId),
    enabled: Boolean(tenantId),
  });

  const updateStatus = useUpdateQueueStatus();
  const confirmPay = useConfirmQueuePayment();
  const cancelPay = useCancelQueuePayment();

  const [showAdd, setShowAdd] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [checkoutEntry, setCheckoutEntry] = useState<QueueRecord | null>(null);

  const entries = rawEntries as QueueRecord[];
  const mode = settings?.queueMode ?? 'shared';
  const lateMinutes = settings?.lateMinutes ?? 10;

  const waiting = useMemo(
    () => entries.filter((entry) => entry.status === 'waiting' || entry.status === 'calling'),
    [entries],
  );
  const serving = useMemo(
    () => entries.filter((entry) => entry.status === 'serving'),
    [entries],
  );
  const comandas = useMemo(
    () => entries.filter((entry) => entry.ticket_status === 'open'),
    [entries],
  );
  const activeCount = waiting.length + serving.length;

  const myQueue = useMemo(() => {
    if (mode !== 'per_professional' || !isStaff || !teamMemberId) return [];
    return waiting.filter((entry) => entry.professional_id === teamMemberId);
  }, [isStaff, mode, teamMemberId, waiting]);

  const otherQueue = useMemo(() => {
    if (mode !== 'per_professional' || !isStaff || !teamMemberId) return waiting;
    return waiting.filter((entry) => entry.professional_id !== teamMemberId);
  }, [isStaff, mode, teamMemberId, waiting]);

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase.channel('queue_manage')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'queue_entries', filter: `business_id=eq.${tenantId}` },
        () => {
          void refetchEntries();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchEntries, tenantId]);

  const playCallSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      [0, 0.2].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.15);
      });
    } catch {
      // Sem áudio disponível
    }
  };

  const mutateStatus = async (entryId: string, status: QueueRecord['status']) => {
    if (!tenantId) {
      showToast('Sessão sem estabelecimento.', 'error');
      return;
    }
    try {
      await updateStatus.mutateAsync({ entryId, businessId: tenantId, status });
      if (status === 'calling') playCallSound();
    } catch {
      showToast('Não foi possível atualizar a fila.', 'error');
    }
  };

  const handleConfirmPay = async (entryId: string) => {
    try {
      await confirmPay.mutateAsync(entryId);
    } catch {
      showToast('Não foi possível confirmar o pagamento.', 'error');
    }
  };

  const handleCancelPay = async (entryId: string) => {
    try {
      await cancelPay.mutateAsync(entryId);
    } catch {
      showToast('Não foi possível cancelar o Pix.', 'error');
    }
  };

  if (!tenantId) {
    return (
      <EmptyState
        bordered
        icon={Clock}
        title="Estabelecimento não identificado"
        description="Recarregue a página e entre de novo."
      />
    );
  }

  if (loadingEntries) {
    return (
      <div className="space-y-4 pb-20">
        <SkeletonCard className="min-h-[96px]" />
        <SkeletonCard className="min-h-[160px]" />
      </div>
    );
  }

  const renderCard = (entry: QueueRecord, highlighted = false, position?: number) => (
    <QueueStaffCard
      key={entry.id}
      entry={entry}
      region={region === 'PT' ? 'PT' : 'BR'}
      highlighted={highlighted}
      lateMinutes={lateMinutes}
      busy={updateStatus.isPending || confirmPay.isPending || cancelPay.isPending}
      position={position}
      onStart={(id) => void mutateStatus(id, 'serving')}
      onCall={(id) => void mutateStatus(id, 'calling')}
      onCloseTicket={setCheckoutEntry}
      onConfirmPay={(id) => void handleConfirmPay(id)}
      onCancelPay={(id) => void handleCancelPay(id)}
    />
  );

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="Fila Digital"
        subtitle="Cliente à vista: iniciar. Fora da cadeira: chamar."
        meta={!isStaff ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<QrCode className="w-4 h-4" />} onClick={() => setShowQr(true)}>
              QR da fila
            </Button>
            <Button variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => setShowSettings(true)}>
              Ajustes
            </Button>
          </div>
        ) : undefined}
        action={
          <Button variant="primary" size="sm" icon={<User className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Adicionar
          </Button>
        }
      />

      {/* Métricas — hierarquia: ativos primeiro, depois cadeiras */}
      <section className="grid grid-cols-2 gap-3">
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-theme-accent" />
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">Na fila</p>
          </div>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums text-theme-text">{waiting.length}</p>
          <p className="mt-1 text-xs text-theme-textSecondary">
            {waiting.length === 0 ? 'Fila vazia' : waiting.length === 1 ? '1 cliente aguardando' : `${waiting.length} clientes aguardando`}
          </p>
        </Card>
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[var(--color-info)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">Atendendo</p>
          </div>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums text-theme-text">{serving.length}</p>
          <p className="mt-1 text-xs text-theme-textSecondary">
            {serving.length === 0 ? 'Nenhuma cadeira' : serving.length === 1 ? '1 cadeira ocupada' : `${serving.length} cadeiras ocupadas`}
          </p>
        </Card>
      </section>

      {/* Próximos — seção principal */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
            <Clock className="w-5 h-5 text-theme-accent" />
            Próximos
          </h2>
          {waiting.length > 0 && (
            <span className="text-xs font-semibold text-theme-textMuted uppercase tracking-wide">
              {waiting.length} {waiting.length === 1 ? 'pessoa' : 'pessoas'}
            </span>
          )}
        </div>
        {waiting.length === 0 ? (
          <EmptyState
            bordered
            icon={Clock}
            title="A fila está vazia"
            description={isStaff ? "Aguardando o próximo cliente entrar via QR Code." : "Compartilhe o QR Code ou adicione um cliente manualmente."}
            action={
              !isStaff ? (
                <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
                  Adicionar cliente
                </Button>
              ) : undefined
            }
          />
        ) : mode === 'per_professional' && isStaff ? (
          <div className="space-y-4">
            {myQueue.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-theme-accent tracking-wide">Sua fila</p>
                {myQueue.map((entry, index) => renderCard(entry, true, index + 1))}
              </div>
            )}
            {otherQueue.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-theme-textMuted tracking-wide">Outras cadeiras</p>
                {otherQueue.map((entry) => renderCard(entry))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {waiting.map((entry, index) => renderCard(entry, false, entry.status === 'waiting' ? index + 1 : undefined))}
          </div>
        )}
      </section>

      {/* Em atendimento */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Play className="w-5 h-5 text-[var(--color-info)]" />
          Em atendimento
        </h2>
        {serving.length === 0 ? (
          <EmptyState
            bordered
            icon={Play}
            title="Nenhum atendimento em andamento"
            description="Chame o próximo da fila para começar."
          />
        ) : (
          <div className="space-y-3">
            {serving.map((entry) => renderCard(entry))}
          </div>
        )}
      </section>

      {/* Comandas */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Receipt className="w-5 h-5 text-theme-textMuted" />
          Comandas
        </h2>
        <QueueComandasList entries={comandas} onOpen={setCheckoutEntry} />
      </section>

      <QueueManualAddSheet
        open={showAdd}
        companyId={tenantId}
        region={region === 'PT' ? 'PT' : 'BR'}
        mode={mode}
        services={services}
        teamMembers={teamMembers}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          setShowAdd(false);
          void refetchEntries();
        }}
      />

      {!isStaff && (
        <>
          <QueueQrSheet
            open={showQr}
            slug={businessSlug ?? null}
            mode={mode}
            teamMembers={teamMembers}
            onClose={() => setShowQr(false)}
          />
          <QueueSettingsSheet
            open={showSettings}
            settings={settings ?? null}
            activeCount={activeCount}
            onClose={() => setShowSettings(false)}
            onSaved={() => {
              setShowSettings(false);
              void refetchSettings();
            }}
          />
        </>
      )}

      <QueueCheckoutSheet
        open={!!checkoutEntry}
        entry={checkoutEntry}
        companyId={tenantId}
        region={region === 'PT' ? 'PT' : 'BR'}
        services={services}
        loggedProfessionalId={teamMemberId}
        onClose={() => setCheckoutEntry(null)}
        onDone={() => {
          setCheckoutEntry(null);
          void refetchEntries();
        }}
      />
    </div>
  );
};
