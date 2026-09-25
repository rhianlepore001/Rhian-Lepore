import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { cancelPublicBooking } from '../../services/publicBooking';
import { useToast } from '../../components/ui/Toast';

vi.mock('../../services/publicBooking', () => ({
  cancelPublicBooking: vi.fn(),
}));

vi.mock('../../components/ui/Toast', () => ({
  useToast: vi.fn(),
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

const showToast = vi.fn();

function renderCard(onCancelled = vi.fn()) {
  return render(
    <MemoryRouter>
      <ClientBookingCard
        booking={booking}
        isBeauty
        businessPhone="11999998888"
        businessSlug="barbearia-silva"
        clientName="Zé"
        clientPhone="11999998888"
        region="PT"
        onCancelled={onCancelled}
      />
    </MemoryRouter>,
  );
}

describe('ClientBookingCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast });
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
    const onCancelled = vi.fn();

    renderCard(onCancelled);
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Confirmar$/ }));

    expect(cancelPublicBooking).toHaveBeenCalledWith('b1', '11999998888');
    expect(onCancelled).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      'Não foi possível cancelar. Tente de novo ou fale com o salão.',
      'error',
    );
  });
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="location">{loc.pathname + loc.search}</div>;
}

function renderCancelled(extra: Partial<ClientBooking>) {
  return render(
    <MemoryRouter initialEntries={['/minha-area/barbearia-silva']}>
      <Routes>
        <Route
          path="/minha-area/:slug"
          element={(
            <ClientBookingCard
              booking={{ ...booking, status: 'cancelled', service_ids: ['s1', 's2'], ...extra }}
              isBeauty={false}
              businessPhone="11999998888"
              businessSlug="barbearia-silva"
              clientName="Zé"
              clientPhone="11999998888"
              region="PT"
              onCancelled={vi.fn()}
            />
          )}
        />
        <Route path="/book/:slug" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientBookingCard — cancelado (item 5b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast });
  });

  it('cancelado pelo estabelecimento: CANCELADO + mensagem + Reagendar, sem Editar/Cancelar', () => {
    renderCancelled({ cancelled_by_business: true });
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByTestId('client-booking-cancelled-note')).toHaveTextContent('O estabelecimento cancelou este agendamento.');
    expect(screen.getByRole('button', { name: /Reagendar horário/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Repetir este agendamento/ })).toBeNull();
  });

  it('Reagendar horário abre o booking público com os mesmos serviços', async () => {
    renderCancelled({ cancelled_by_business: true });
    await userEvent.click(screen.getByRole('button', { name: /Reagendar horário/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/book/barbearia-silva?rebook=s1,s2');
  });

  it('cancelado sem sinal do estabelecimento (recusado / pelo cliente): mensagem neutra', () => {
    renderCancelled({ cancelled_by_business: false });
    expect(screen.getByTestId('client-booking-cancelled-note')).toHaveTextContent('Este agendamento foi cancelado.');
    expect(screen.getByRole('button', { name: /Reagendar horário/ })).toBeInTheDocument();
  });
});
