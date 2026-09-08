import React from 'react';
import { Button, EmptyState } from '@/components/ui';
import { Receipt } from 'lucide-react';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { QueueRecord } from '@/types/queue';

interface QueueComandasListProps {
  entries: QueueRecord[];
  region: Region;
  serviceNames?: Map<string, string>;
  onOpen: (entry: QueueRecord) => void;
}

function closedAtLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const QueueComandasList: React.FC<QueueComandasListProps> = ({ entries, region, serviceNames, onOpen }) => {
  if (entries.length === 0) {
    return (
      <EmptyState
        bordered
        icon={Receipt}
        title="Nenhuma comanda em aberto"
        description="Atendimentos deixados para pagar depois aparecem aqui até serem finalizados."
      />
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const serviceName = entry.service_id ? serviceNames?.get(entry.service_id) : null;
        const items = entry.ticket_items ?? [];
        const total = (entry.service_price_cents ?? 0) / 100 + items.reduce((sum, item) => sum + item.price, 0);
        const closedAt = closedAtLabel(entry.closed_at);
        const detail = [
          items.length > 0
            ? `${serviceName ?? 'Serviço'} + ${items.length} ${items.length === 1 ? 'item' : 'itens'}`
            : serviceName ?? 'Serviço',
          formatCurrency(total, region),
          closedAt ? `fechada às ${closedAt}` : null,
        ].filter(Boolean).join(' · ');
        return (
          <div key={entry.id} className="rounded-2xl border border-theme-border bg-theme-card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-bold text-theme-text truncate">{entry.client_name}</p>
              <p className="text-xs text-theme-textSecondary truncate mt-0.5">{detail}</p>
            </div>
            <Button variant="secondary" className="min-h-[44px] shrink-0" onClick={() => onOpen(entry)}>
              Finalizar
            </Button>
          </div>
        );
      })}
    </div>
  );
};
