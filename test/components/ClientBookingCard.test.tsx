import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { ToastProvider } from '../../components/ui/Toast';
import { cancelPublicBooking } from '../../services/publicBooking';

vi.mock('../../services/publicBooking', () => ({
  cancelPublicBooking: vi.fn(),
}));

const booking: ClientBooking = {
  id: 'b1',
  appointment_time: '2026-09-08T10:00:00',
  status: 'pending',
  service_ids: ['s1'],
  service_names: ['Corte Teste Automatizado'],
  professional_id: 'p1',
  professional_name: 'Mario',
  total_price: 50,
  duration_minutes: 30,
  created_at: '2026-09-01T00:00:00.000Z',
};

function renderCard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ClientBookingCard
          booking={booking}
          isBeauty
          businessPhone="11999998888"
          businessSlug="barbearia-silva"
          clientName="Zé"
          clientPhone="11999998888"
          region="PT"
          onCancelled={vi.fn()}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('ClientBookingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mantém ações dentro da grade sem cortar o botão Editar', () => {
    const { container } = renderCard();

    const actions = screen.getByRole('button', { name: /Editar/ }).parentElement;
    expect(actions?.className).toMatch(/grid/);
    expect(container.firstChild).toHaveClass('min-w-0');
    expect(screen.getByText(/50,00/)).toBeInTheDocument();
    expect(screen.queryByText(/Cobrar Confirmação/)).toBeNull();
    expect(screen.getByRole('button', { name: /Pedir confirmação/ })).toBeInTheDocument();
    expect(screen.getByText('Aguardando')).toBeInTheDocument();
  });

  it('mostra toast de erro quando o cancelamento RPC falha', async () => {
    (cancelPublicBooking as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('booking_not_cancellable'),
    );

    renderCard();
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Confirmar$/ }));

    expect(cancelPublicBooking).toHaveBeenCalledWith('b1', '11999998888');
    expect(await screen.findByText(/Não foi possível cancelar/i)).toBeInTheDocument();
  });
});
