import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, Play, QrCode, Settings, User } from 'lucide-react';
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

  const renderCard = (entry: QueueRecord, highlighted = false) => (
    <QueueStaffCard
      key={entry.id}
      entry={entry}
      region={region === 'PT' ? 'PT' : 'BR'}
      highlighted={highlighted}
      lateMinutes={lateMinutes}
      busy={updateStatus.isPending || confirmPay.isPending || cancelPay.isPending}
      onStart={(id) => void mutateStatus(id, 'serving')}
      onCall={(id) => void mutateStatus(id, 'calling')}
      onCloseTicket={setCheckoutEntry}
      onConfirmPay={(id) => void handleConfirmPay(id)}
      onCancelPay={(id) => void handleCancelPay(id)}
    />
  );

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Fila Digital"
        subtitle="Uma coluna. Cliente à vista: iniciar. Se não estiver: chamar."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" icon={<User className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              Adicionar
            </Button>
            {!isStaff && (
              <>
                <Button variant="secondary" size="sm" icon={<QrCode className="w-4 h-4" />} onClick={() => setShowQr(true)}>
                  QR da fila
                </Button>
                <Button variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => setShowSettings(true)}>
                  Ajustes
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border border-[var(--color-warning-border)]">
          <p className="text-xs uppercase text-theme-textMuted font-bold">Na fila</p>
          <p className="text-3xl font-heading text-[var(--color-warning)]">{waiting.length}</p>
        </Card>
        <Card className="p-4 border border-[var(--color-info-border)]">
          <p className="text-xs uppercase text-theme-textMuted font-bold">Atendendo</p>
          <p className="text-3xl font-heading text-[var(--color-info)]">{serving.length}</p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Próximos
        </h2>
        {waiting.length === 0 ? (
          <EmptyState
            bordered
            icon={Clock}
            title="A fila está vazia"
            description="Adicione um cliente ou peça o scan do QR na casa."
            action={(
              <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
                Adicionar cliente
              </Button>
            )}
          />
        ) : mode === 'per_professional' && isStaff ? (
          <div className="space-y-4">
            {myQueue.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-theme-textSecondary">Sua fila</p>
                {myQueue.map((entry) => renderCard(entry, true))}
              </div>
            )}
            {otherQueue.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-theme-textSecondary">Outras cadeiras</p>
                {otherQueue.map((entry) => renderCard(entry))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {waiting.map((entry) => renderCard(entry))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Play className="w-5 h-5" />
          Em atendimento
        </h2>
        {serving.length === 0 ? (
          <EmptyState
            bordered
            icon={Play}
            title="Nenhum atendimento em andamento"
            description="Inicie o atendimento quando o cliente estiver à vista."
          />
        ) : (
          <div className="space-y-3">
            {serving.map((entry) => renderCard(entry))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text">Comandas</h2>
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
