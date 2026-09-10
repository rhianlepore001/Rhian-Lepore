import type { QueueStatus } from '@/types/queue';

export function queueHistoryStatusLabel(status: QueueStatus): string {
  switch (status) {
    case 'waiting':
      return 'Na fila';
    case 'calling':
      return 'Chamado';
    case 'serving':
      return 'Em atendimento';
    case 'completed':
      return 'Atendido';
    case 'cancelled':
      return 'Saiu da fila';
    case 'no_show':
      return 'Não compareceu';
    default:
      return status;
  }
}

export function queueHistoryStatusTone(status: QueueStatus): 'success' | 'warning' | 'danger' | 'accent' | 'neutral' {
  if (status === 'completed') return 'success';
  if (status === 'calling') return 'warning';
  if (status === 'serving') return 'accent';
  if (status === 'no_show' || status === 'cancelled') return 'danger';
  return 'neutral';
}

export function formatQueueClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
