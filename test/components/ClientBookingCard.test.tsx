import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  appointment_time: '2026-12-08T10:00:00.000Z',
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

function renderPr1Card(
  extra: Partial<ClientBooking> & { businessPhone?: string | null; businessName?: string } = {},
) {
  const { businessPhone = '11999998888', businessName = 'Barbearia São João ✂️', ...bookingExtra } = extra;
  return render(
    <MemoryRouter>
      <ClientBookingCard
        booking={{ ...booking, ...bookingExtra }}
        isBeauty={false}
        businessPhone={businessPhone}
        businessSlug="barbearia-sao-joao"
        clientName="Zé"
        clientPhone="11999998888"
        region="PT"
        timeZone="Europe/Lisbon"
        onCancelled={vi.fn()}
        businessName={businessName}
      />
    </MemoryRouter>,
  );
}

describe('ClientBookingCard — PR-1 cards honestos e WhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pedido confirmado no passado: selo Horário passou, sem Editar nem Cancelar', () => {
    renderPr1Card({
      status: 'confirmed',
      appointment_time: '2026-10-02T15:00:00.000Z',
    });
    expect(screen.getByText('Horário passou')).toBeInTheDocument();
    expect(screen.queryByText('Confirmado')).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Pedir confirmação/ })).toBeNull();
  });

  it('pedido pending no passado também perde Editar/Cancelar e mostra Horário passou', () => {
    renderPr1Card({
      status: 'pending',
      appointment_time: '2026-10-02T10:00:00.000Z',
    });
    expect(screen.getByText('Horário passou')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
  });

  it('Pedir confirmação abre WhatsApp com nome do negócio, serviço, profissional, data e hora no fuso', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const appointmentTime = '2026-10-10T14:00:00.000Z';
    renderPr1Card({
      status: 'pending',
      appointment_time: appointmentTime,
      service_names: ['Corte tesoura'],
      professional_name: 'Mário',
      businessName: 'Barbearia São João ✂️',
    });

    fireEvent.click(screen.getByRole('button', { name: /Pedir confirmação/ }));

    const url = decodeURIComponent(String(open.mock.calls[0]?.[0] ?? ''));
    const dateObj = new Date(appointmentTime);
    const dateLabel = dateObj.toLocaleDateString('pt-BR', {
      timeZone: 'Europe/Lisbon', weekday: 'short', day: '2-digit', month: 'short',
    });
    const timeLabel = dateObj.toLocaleTimeString('pt-BR', {
      timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit',
    });
    expect(url).toContain(
      `Olá, Barbearia São João ✂️! Fiz um agendamento online para Corte tesoura com Mário em ${dateLabel} às ${timeLabel}. Pode confirmar, por favor?`,
    );
    expect(url.toLowerCase()).not.toContain('o salão');
    expect(url.toLowerCase()).not.toContain('barbearia silva');
    open.mockRestore();
  });

  it('profissional vazio na mensagem vira Qualquer profissional', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPr1Card({
      status: 'pending',
      appointment_time: '2026-10-10T14:00:00.000Z',
      service_names: ['Barba'],
      professional_name: null,
      businessName: 'Corte Fino',
    });
    fireEvent.click(screen.getByRole('button', { name: /Pedir confirmação/ }));
    const url = decodeURIComponent(String(open.mock.calls[0]?.[0] ?? ''));
    expect(url).toContain('com Qualquer profissional');
    expect(url.toLowerCase()).not.toContain('o salão');
    open.mockRestore();
  });

  it('sem telefone do negócio o Pedir confirmação some', () => {
    renderPr1Card({
      status: 'pending',
      appointment_time: '2026-10-10T14:00:00.000Z',
      businessPhone: null,
    });
    expect(screen.queryByRole('button', { name: /Pedir confirmação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^WhatsApp$/ })).toBeNull();
  });

  it('telefone do negócio em branco também esconde Pedir confirmação', () => {
    renderPr1Card({
      status: 'pending',
      appointment_time: '2026-10-10T14:00:00.000Z',
      businessPhone: '',
    });
    expect(screen.queryByRole('button', { name: /Pedir confirmação/ })).toBeNull();
  });

  it('no_show mostra Não compareceu com tom neutro e CTA para remarcar', () => {
    renderPr1Card({
      status: 'no_show',
      appointment_time: '2026-10-02T15:00:00.000Z',
    });
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByText('Sentimos sua falta. Quer marcar outro horário?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agendar horário/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
  });

  it('status noshow (sem underscore) usa o mesmo card D2 de não compareceu', () => {
    renderPr1Card({
      status: 'noshow',
      appointment_time: '2026-10-02T15:00:00.000Z',
    });
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByText('Sentimos sua falta. Quer marcar outro horário?')).toBeInTheDocument();
  });
});
