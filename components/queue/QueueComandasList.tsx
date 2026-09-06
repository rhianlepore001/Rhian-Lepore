import React from 'react';
import { Button, EmptyState } from '@/components/ui';
import { Receipt } from 'lucide-react';
import type { QueueRecord } from '@/types/queue';

interface QueueComandasListProps {
  entries: QueueRecord[];
  onOpen: (entry: QueueRecord) => void;
}

export const QueueComandasList: React.FC<QueueComandasListProps> = ({ entries, onOpen }) => {
  if (entries.length === 0) {
    return (
      <EmptyState
        bordered
        icon={Receipt}
        title="Nenhuma comanda aberta"
        description="Ao fechar um atendimento, a comanda aparece aqui para finalizar."
      />
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-2xl border border-theme-border bg-theme-card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-theme-text truncate">{entry.client_name}</p>
            <p className="text-xs text-theme-textSecondary">Comanda aberta</p>
          </div>
          <Button variant="secondary" className="min-h-[44px] shrink-0" onClick={() => onOpen(entry)}>
            Finalizar
          </Button>
        </div>
      ))}
    </div>
  );
};
