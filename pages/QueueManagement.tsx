import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, Play, QrCode, Settings, UserPlus, Users, Receipt } from 'lucide-react';
import { Button, Card, PageHeader, SkeletonCard, useToast } from '@/components/ui';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
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
import { useQueueRealtime } from '@/hooks/useQueueRealtime';
import { fetchServices } from '@/services/serviceSettings';
import type { QueueRecord } from '@/types/queue';

export const QueueManagement: React.FC = () => {
  const navigate = useNavigate();
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
  const [noShowEntry, setNoShowEntry] = useState<QueueRecord | null>(null);

  const entries = rawEntries as QueueRecord[];
  const mode = settings?.queueMode ?? 'shared';
  const lateMinutes = settings?.lateMinutes ?? 10;
  const allowLeave = settings?.allowLeave ?? true;

  const serviceNames = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );
  const professionalNames = useMemo(
    () => new Map(teamMembers.map((member) => [member.id, member.name])),
    [teamMembers],
  );

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

  useQueueRealtime(tenantId, () => {
    void refetchEntries();
  });

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
      showToast('Não identificamos o estabelecimento. Entre de novo.', 'error');
      return false;
    }
    try {
      await updateStatus.mutateAsync({ entryId, businessId: tenantId, status });
      if (status === 'calling') playCallSound();
      return true;
    } catch {
      showToast('Não foi possível atualizar a fila. Tente de novo.', 'error');
      return false;
    }
  };

  const handleNoShow = async () => {
    if (!noShowEntry) return;
    const ok = await mutateStatus(noShowEntry.id, 'no_show');
    if (ok) {
      showToast(`${noShowEntry.client_name} foi removido da fila.`, 'success');
      setNoShowEntry(null);
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
      showToast('Não foi possível cancelar o pagamento. Tente de novo.', 'error');
    }
  };

  if (!tenantId) {
    return (
      <EmptyState
        bordered
        icon={Clock}
        title="Não foi possível carregar a fila"
        description="Recarregue a página. Se continuar, saia e entre de novo na sua conta."
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

  const busy = updateStatus.isPending || confirmPay.isPending || cancelPay.isPending;

  const renderCard = (entry: QueueRecord, highlighted = false, position?: number) => (
    <QueueStaffCard
      key={entry.id}
      entry={entry}
      region={region === 'PT' ? 'PT' : 'BR'}
      serviceName={entry.service_id ? serviceNames.get(entry.service_id) ?? null : null}
      professionalName={entry.professional_id ? professionalNames.get(entry.professional_id) ?? null : null}
      highlighted={highlighted}
      lateMinutes={lateMinutes}
      allowLeave={allowLeave}
      busy={busy}
      position={position}
      onStart={(id) => void mutateStatus(id, 'serving')}
      onCall={(id) => void mutateStatus(id, 'calling')}
      onCloseTicket={setCheckoutEntry}
      onConfirmPay={(id) => void handleConfirmPay(id)}
      onCancelPay={(id) => void handleCancelPay(id)}
      onNoShow={setNoShowEntry}
      onRequeue={(id) => void mutateStatus(id, 'waiting')}
    />
  );

  const callingCount = waiting.filter((entry) => entry.status === 'calling').length;

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="Fila Digital"
        subtitle="Acompanhe quem está esperando, chame e feche as comandas."
        meta={!isStaff ? (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" icon={<QrCode className="w-4 h-4" />} onClick={() => setShowQr(true)}>
              QR Code
            </Button>
            <Button variant="ghost" size="sm" icon={<History className="w-4 h-4" />} onClick={() => navigate('/fila/historico')}>
              Histórico
            </Button>
            <Button variant="ghost" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => setShowSettings(true)}>
              Ajustes
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={<History className="w-4 h-4" />} onClick={() => navigate('/fila/historico')}>
            Histórico
          </Button>
        )}
        action={
          <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            Adicionar cliente
          </Button>
        }
      />

      <section className="grid grid-cols-2 gap-3">
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-theme-accent" />
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">Na fila</p>
          </div>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums text-theme-text">{waiting.length}</p>
          <p className="mt-1 text-xs text-theme-textSecondary">
            {waiting.length === 0
              ? 'Ninguém aguardando'
              : callingCount > 0
                ? `${callingCount} ${callingCount === 1 ? 'chamado' : 'chamados'}`
                : waiting.length === 1 ? '1 cliente aguardando' : `${waiting.length} clientes aguardando`}
          </p>
        </Card>
        <Card variant="outlined" className="p-4">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-[var(--color-info)]" />
            <p className="text-xs font-semibold uppercase tracking-wide text-theme-textMuted">Em atendimento</p>
          </div>
          <p className="mt-2 font-mono text-3xl font-black tabular-nums text-theme-text">{serving.length}</p>
          <p className="mt-1 text-xs text-theme-textSecondary">
            {serving.length === 0 ? 'Nenhum atendimento agora' : serving.length === 1 ? '1 cliente sendo atendido' : `${serving.length} clientes sendo atendidos`}
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
            <Clock className="w-5 h-5 text-theme-accent" />
            Aguardando
          </h2>
          {waiting.length > 0 && (
            <span className="text-xs font-semibold text-theme-textMuted uppercase tracking-wide">
              {waiting.length} {waiting.length === 1 ? 'cliente' : 'clientes'}
            </span>
          )}
        </div>
        {waiting.length === 0 ? (
          <EmptyState
            bordered
            icon={Clock}
            title="Ninguém na fila"
            description={isStaff
              ? 'Quando um cliente escanear o QR Code, ele aparece aqui.'
              : 'Deixe o QR Code visível no balcão ou adicione um cliente manualmente.'}
            action={
              <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
                Adicionar cliente
              </Button>
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
                <p className="text-xs font-semibold uppercase text-theme-textMuted tracking-wide">Outros profissionais</p>
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
            description="Toque em Iniciar atendimento no próximo cliente da fila."
          />
        ) : (
          <div className="space-y-3">
            {serving.map((entry) => renderCard(entry))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Receipt className="w-5 h-5 text-theme-textMuted" />
          Comandas abertas
        </h2>
        <QueueComandasList
          entries={comandas}
          region={region === 'PT' ? 'PT' : 'BR'}
          serviceNames={serviceNames}
          onOpen={setCheckoutEntry}
        />
      </section>

      <ConfirmModal
        open={!!noShowEntry}
        title="Remover da fila?"
        message={noShowEntry
          ? `${noShowEntry.client_name} sai da fila como "não compareceu". Para voltar, precisa pegar uma nova senha pelo QR Code.`
          : ''}
        confirmLabel="Remover da fila"
        cancelLabel="Manter"
        variant="danger"
        loading={updateStatus.isPending}
        onCancel={() => setNoShowEntry(null)}
        onConfirm={() => void handleNoShow()}
      />

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
        baseServiceName={checkoutEntry?.service_id ? serviceNames.get(checkoutEntry.service_id) ?? null : null}
        loggedProfessionalId={teamMemberId}
        teamMembers={teamMembers}
        onClose={() => setCheckoutEntry(null)}
        onDone={() => {
          setCheckoutEntry(null);
          void refetchEntries();
        }}
      />
    </div>
  );
};
