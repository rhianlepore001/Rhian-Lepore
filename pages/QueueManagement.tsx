import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, History, Megaphone, Play, QrCode, Settings, UserPlus, Receipt } from 'lucide-react';
import { Button, ErrorState, PageHeader, SkeletonCard, useToast } from '@/components/ui';
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
import { filterBookableServices } from '@/utils/filterBookableServices';

const QUEUE_STAGES = [
  { id: 'waiting', label: 'Aguardando', icon: Clock, empty: 'Ninguém aguardando', help: 'Clientes entram pelo QR Code ou são adicionados pela equipe.' },
  { id: 'calling', label: 'Chamados', icon: Megaphone, empty: 'Nenhum cliente chamado', help: 'Quando você chamar um cliente, ele aparece aqui até começar o atendimento.' },
  { id: 'serving', label: 'Em atendimento', icon: Play, empty: 'Nenhum atendimento em andamento', help: 'Inicie o atendimento de um cliente para acompanhá-lo aqui.' },
  { id: 'tickets', label: 'Comandas abertas', icon: Receipt },
] as const;

type QueueStage = typeof QUEUE_STAGES[number]['id'];

export const QueueManagement: React.FC = () => {
  const navigate = useNavigate();
  const { role, region, companyId, teamMemberId, businessName } = useAuth();
  const isStaff = role === 'staff';
  const { showToast } = useToast();
  const tenantId = companyId ?? '';

  const { data: rawEntries = [], isLoading: loadingEntries, isError: entriesError, refetch: refetchEntries } = useQueueEntries(tenantId);
  const { data: businessSlug } = useBusinessSlug(tenantId);
  const { data: teamMembers = [] } = useQueueTeamMembers(tenantId);
  const { data: settings, refetch: refetchSettings } = useQueueSettings();
  const { data: services = [] } = useQuery({
    queryKey: ['queue', 'services', tenantId],
    queryFn: async () => filterBookableServices(await fetchServices(tenantId)),
    enabled: Boolean(tenantId),
  });

  const updateStatus = useUpdateQueueStatus();
  const confirmPay = useConfirmQueuePayment();
  const cancelPay = useCancelQueuePayment();

  const [stage, setStage] = useState<QueueStage>('waiting');
  const selectedStageRef = useRef<QueueStage>('waiting');
  const stageButtons = useRef<Partial<Record<QueueStage, HTMLButtonElement | null>>>({});
  const selectStage = (next: QueueStage, focus = false) => {
    selectedStageRef.current = next;
    setStage(next);
    if (focus) stageButtons.current[next]?.focus();
  };

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

  const stageEntries = useMemo(() => ({
    waiting: entries.filter((entry) => entry.status === 'waiting'),
    calling: entries.filter((entry) => entry.status === 'calling'),
    serving: entries.filter((entry) => entry.status === 'serving'),
    tickets: entries.filter((entry) => entry.ticket_status === 'open'),
  }), [entries]);
  const activeCount = stageEntries.waiting.length + stageEntries.calling.length + stageEntries.serving.length;
  const currentStage = QUEUE_STAGES.find((item) => item.id === stage) ?? QUEUE_STAGES[0];
  const visibleEntries = stageEntries[stage];

  const lanes = useMemo(() => {
    const byProfessional = new Map<string | null, QueueRecord[]>();
    for (const entry of visibleEntries) {
      const key = mode === 'per_professional' ? entry.professional_id ?? null : null;
      const lane = byProfessional.get(key);
      if (lane) lane.push(entry);
      else byProfessional.set(key, [entry]);
    }
    const groups = Array.from(byProfessional.entries());
    if (!isStaff || !teamMemberId) return groups;
    return groups.sort(([first], [second]) => Number(second === teamMemberId) - Number(first === teamMemberId));
  }, [isStaff, mode, teamMemberId, visibleEntries]);

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
    const previousStage = selectedStageRef.current;
    try {
      await updateStatus.mutateAsync({ entryId, businessId: tenantId, status });
      if (selectedStageRef.current === previousStage) {
        selectStage(status === 'calling' || status === 'serving' || status === 'waiting' ? status : previousStage, true);
      }
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

  if (entriesError && rawEntries.length === 0) {
    return (
      <ErrorState
        title="Não foi possível carregar a fila"
        message="Confira a conexão e tente novamente para ver quem está aguardando."
        onRetry={() => void refetchEntries()}
      />
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

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="Fila digital"
        meta={!isStaff ? (
          <div className="flex flex-wrap gap-1.5">
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

      <div className="space-y-3">
        <div role="group" aria-label="Etapas da fila" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {QUEUE_STAGES.map((item) => {
            const Icon = item.icon;
            const selected = stage === item.id;
            return (
              <button
                key={item.id}
                ref={(button) => { stageButtons.current[item.id] = button; }}
                type="button"
                aria-pressed={selected}
                aria-controls="queue-stage"
                onClick={() => selectStage(item.id)}
                className={`flex min-h-[56px] min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-accent sm:px-3 ${selected
                  ? 'border-theme-accent bg-[var(--color-accent-dim)] text-theme-text'
                  : 'border-theme-border bg-theme-card text-theme-textSecondary hover:bg-theme-surface'}`}
              >
                <Icon className={`hidden size-4 shrink-0 min-[380px]:block ${selected ? 'text-theme-accent' : ''}`} aria-hidden="true" />
                <span className="flex-1 break-words text-xs leading-tight sm:text-sm">{item.label}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-sm tabular-nums ${selected
                  ? 'bg-theme-accent text-[var(--color-on-accent)]'
                  : 'bg-theme-surface text-theme-text'}`}>
                  {stageEntries[item.id].length}
                </span>
              </button>
            );
          })}
        </div>

        <section id="queue-stage" aria-label={currentStage.label} className="space-y-4">
          {currentStage.id === 'tickets' ? (
            <QueueComandasList
              entries={visibleEntries}
              region={region === 'PT' ? 'PT' : 'BR'}
              serviceNames={serviceNames}
              onOpen={setCheckoutEntry}
            />
          ) : visibleEntries.length === 0 ? (
            <EmptyState bordered icon={currentStage.icon} title={currentStage.empty} description={currentStage.help} />
          ) : (
            lanes.map(([professionalId, lane]) => {
              const isOwnLane = isStaff && professionalId != null && professionalId === teamMemberId;
              const laneName = professionalId ? (professionalNames.get(professionalId) ?? 'Profissional da fila') : 'Sem profissional atribuído';
              return (
                <div key={professionalId ?? 'unassigned'} className="space-y-2.5">
                  {mode === 'per_professional' && (
                    <h2 className="break-words text-sm font-semibold text-theme-textSecondary">
                      {isOwnLane ? 'Sua fila' : laneName}
                    </h2>
                  )}
                  {lane.map((entry, index) => renderCard(entry, isOwnLane, stage === 'waiting' ? index + 1 : undefined))}
                </div>
              );
            })
          )}
        </section>
      </div>

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
        slug={businessSlug ?? null}
        businessName={businessName}
        region={region === 'PT' ? 'PT' : 'BR'}
        mode={mode}
        services={services}
        teamMembers={teamMembers}
        onClose={() => setShowAdd(false)}
        onAdded={() => {
          selectStage('waiting');
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
        onDone={(outcome) => {
          setCheckoutEntry(null);
          const next = outcome === 'saved' ? 'tickets' : selectedStageRef.current;
          selectStage(next);
          void refetchEntries();
          window.requestAnimationFrame(() => stageButtons.current[next]?.focus());
        }}
      />
    </div>
  );
};
