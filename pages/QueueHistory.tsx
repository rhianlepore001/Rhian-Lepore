import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, History, User } from 'lucide-react';
import { Badge, Button, Card, PageHeader, SkeletonCard } from '@/components/ui';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { useQueueHistory, useQueueTeamMembers } from '@/hooks/useQueue';
import { useQueueRealtime } from '@/hooks/useQueueRealtime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchServices } from '@/services/serviceSettings';
import { summarizeQueueHistory } from '@/services/queue';
import { formatPhone } from '@/utils/formatters';
import {
  formatQueueClock,
  queueHistoryStatusLabel,
  queueHistoryStatusTone,
} from '@/utils/queueHistoryCopy';
import type { QueueRecord } from '@/types/queue';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDayLabel(day: Date): string {
  if (isSameDay(day, new Date())) return 'Hoje';
  return day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
}

function shiftDay(day: Date, delta: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + delta);
  return next;
}

export const QueueHistory: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { companyId, region } = useAuth();
  const tenantId = companyId ?? '';
  const [day, setDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const { data: entries = [], isLoading, refetch } = useQueueHistory(tenantId, day);
  const { data: teamMembers = [] } = useQueueTeamMembers(tenantId);
  const { data: services = [] } = useQuery({
    queryKey: ['queue', 'services', tenantId],
    queryFn: () => fetchServices(tenantId),
    enabled: Boolean(tenantId),
  });

  useQueueRealtime(tenantId, () => {
    void queryClient.invalidateQueries({ queryKey: ['queue', 'history', tenantId] });
  });

  const professionalNames = useMemo(
    () => new Map(teamMembers.map((member) => [member.id, member.name])),
    [teamMembers],
  );
  const serviceNames = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );

  const summary = useMemo(() => summarizeQueueHistory(entries as QueueRecord[]), [entries]);
  const localeRegion = region === 'PT' ? 'PT' : 'BR';

  if (!tenantId) {
    return (
      <EmptyState
        bordered
        icon={History}
        title="Não foi possível carregar o histórico"
        description="Recarregue a página. Se continuar, saia e entre de novo na sua conta."
      />
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <PageHeader
        title="Histórico da fila"
        subtitle="Quem entrou, quem atendeu e como cada senha terminou."
        meta={(
          <Button variant="ghost" size="sm" icon={<ChevronLeft className="w-4 h-4" />} onClick={() => navigate('/fila')}>
            Voltar à fila
          </Button>
        )}
        action={(
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDay((current) => shiftDay(current, -1))} aria-label="Dia anterior">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <p className="min-w-[7.5rem] text-center text-sm font-semibold text-theme-text capitalize">
              {formatDayLabel(day)}
            </p>
            <Button
              variant="secondary"
              size="sm"
              disabled={isSameDay(day, new Date())}
              onClick={() => setDay((current) => shiftDay(current, 1))}
              aria-label="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SkeletonCard className="min-h-[88px]" />
          <SkeletonCard className="min-h-[88px]" />
          <SkeletonCard className="min-h-[88px]" />
          <SkeletonCard className="min-h-[88px]" />
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Entraram', value: summary.entered },
            { label: 'Atendidos', value: summary.completed },
            { label: 'Não compareceu', value: summary.noShow },
            { label: 'Saiu da fila', value: summary.cancelled },
          ].map((item) => (
            <Card key={item.label} variant="outlined" className="p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-theme-textMuted">{item.label}</p>
              <p className="mt-1 font-mono text-2xl font-black tabular-nums text-theme-text">{item.value}</p>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-theme-text flex items-center gap-2">
          <Clock className="w-5 h-5 text-theme-accent" />
          Movimento do dia
        </h2>
        {isLoading ? (
          <SkeletonCard className="min-h-[160px]" />
        ) : entries.length === 0 ? (
          <EmptyState
            bordered
            icon={History}
            title="Nenhuma senha neste dia"
            description="Quando um cliente entrar na fila, o registro aparece aqui."
            action={(
              <Button variant="secondary" size="sm" onClick={() => { void refetch(); }}>
                Atualizar
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            {(entries as QueueRecord[]).map((entry) => {
              const professionalName = entry.professional_id
                ? professionalNames.get(entry.professional_id) ?? '—'
                : 'Qualquer profissional';
              const serviceName = entry.service_id ? serviceNames.get(entry.service_id) ?? 'Serviço' : 'Serviço';
              return (
                <article key={entry.id} className="rounded-2xl border border-theme-border bg-theme-card p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold text-theme-text truncate">{entry.client_name}</h3>
                      <p className="text-xs text-theme-textSecondary font-mono mt-0.5">
                        {formatPhone(entry.client_phone, localeRegion)}
                      </p>
                    </div>
                    <Badge variant={queueHistoryStatusTone(entry.status)} className="shrink-0">
                      {queueHistoryStatusLabel(entry.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-theme-text">
                    {serviceName}
                    {entry.duration_minutes ? ` · ${entry.duration_minutes} min` : ''}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-theme-textSecondary">
                    <User className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Atendeu: {professionalName}</span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-theme-textMuted">
                    <div>Entrou {formatQueueClock(entry.joined_at)}</div>
                    <div>Chamou {formatQueueClock(entry.called_at)}</div>
                    <div>Iniciou {formatQueueClock(entry.serving_at)}</div>
                    <div>Encerrou {formatQueueClock(entry.closed_at)}</div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
