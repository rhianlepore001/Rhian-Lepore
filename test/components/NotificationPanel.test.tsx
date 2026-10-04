import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationPanel } from '@/components/NotificationPanel';
import type { AppNotification } from '@/contexts/AlertsContext';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const unread: AppNotification = {
  id: 'n1',
  title: 'Novo pedido',
  message: 'Novo pedido: Zé Cliente, Corte tesoura, dom., 04/10 às 14:00',
  type: 'new',
  read: false,
  link: '/agenda',
  booking_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07',
  created_at: '2026-10-04T12:00:00.000Z',
};

describe('NotificationPanel', () => {
  it('empty state e marca todas só com não lidas', () => {
    const { rerender } = render(
      <NotificationPanel
        notifications={[]}
        alerts={[]}
        timeZone="America/Sao_Paulo"
        now={new Date('2026-10-04T12:00:00.000Z')}
        onMarkRead={vi.fn()}
        onMarkAll={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText('Nenhuma notificação nova')).toBeInTheDocument();
    expect(screen.queryByTestId('mark-all-read')).not.toBeInTheDocument();

    rerender(
      <NotificationPanel
        notifications={[{ ...unread, read: true }]}
        alerts={[]}
        timeZone="America/Sao_Paulo"
        now={new Date('2026-10-04T12:00:00.000Z')}
        onMarkRead={vi.fn()}
        onMarkAll={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('mark-all-read')).not.toBeInTheDocument();
    expect(screen.getByTestId('bell-notification')).toHaveAttribute('data-read', 'true');
  });

  it('mostra tempo relativo, ponto de não lida e navega para o dia do pedido', async () => {
    const onMarkRead = vi.fn();
    const onNavigate = vi.fn();
    render(
      <NotificationPanel
        notifications={[unread]}
        alerts={[]}
        timeZone="America/Sao_Paulo"
        now={new Date('2026-10-04T12:00:00.000Z')}
        onMarkRead={onMarkRead}
        onMarkAll={vi.fn()}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByTestId('bell-relative-time')).toHaveTextContent('agora');
    expect(screen.getByTestId('bell-unread-dot')).toBeInTheDocument();
    expect(screen.getByTestId('mark-all-read')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('bell-notification'));
    expect(onMarkRead).toHaveBeenCalledWith('n1');
    expect(onNavigate).toHaveBeenCalledWith('/agenda?booking=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa07');
  });
});
