import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ClientBookingCard, type ClientBooking } from '../../components/ClientBookingCard';
import { formatClientCardDate, formatClientCardDateInSentence } from '../../utils/clientBookings';
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
    const pedir = screen.getByRole('button', { name: /Pedir confirmação/ });
    expect(pedir).toBeInTheDocument();
    expect(pedir.className).toMatch(/col-span-2/);
    expect(screen.queryByRole('button', { name: /^WhatsApp$/ })).toBeNull();
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
    const rebook = screen.getByRole('button', { name: /Agendar de novo/ });
    expect(rebook).toBeInTheDocument();
    expect(rebook.className).toMatch(/theme-accent/);
    expect(screen.getByTestId('client-booking-cancelled-note').className).toMatch(/danger/);
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Repetir este agendamento/ })).toBeNull();
  });

  it('Agendar de novo abre o booking público com os mesmos serviços', async () => {
    renderCancelled({ cancelled_by_business: true });
    await userEvent.click(screen.getByRole('button', { name: /Agendar de novo/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/book/barbearia-silva?rebook=s1,s2&pro=p1');
  });

  it('cancelado sem sinal do estabelecimento (recusado / pelo cliente): mensagem neutra', () => {
    renderCancelled({ cancelled_by_business: false });
    expect(screen.getByTestId('client-booking-cancelled-note')).toHaveTextContent('Este agendamento foi cancelado.');
    expect(screen.getByRole('button', { name: /Agendar de novo/ })).toBeInTheDocument();
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
    const dateLabel = formatClientCardDate(dateObj, 'Europe/Lisbon');
    const dateInSentence = formatClientCardDateInSentence(dateObj, 'Europe/Lisbon');
    const timeLabel = dateObj.toLocaleTimeString('pt-BR', {
      timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit',
    });
    expect(url).toContain(
      `Olá, Barbearia São João ✂️! Fiz um agendamento online para Corte tesoura com Mário em ${dateInSentence} às ${timeLabel}. Pode confirmar, por favor?`,
    );
    expect(dateInSentence).toMatch(/^sáb/);
    expect(dateLabel).toMatch(/^Sáb/);
    expect(screen.getByText(dateLabel)).toBeInTheDocument();
    expect(String(open.mock.calls[0]?.[0] ?? '')).toContain('https://wa.me/351');
    expect(dateLabel).toMatch(/de out\./);
    expect(dateLabel).not.toMatch(/De Out/);
    expect(url.toLowerCase()).not.toContain('o salão');
    expect(url.toLowerCase()).not.toContain('barbearia silva');
    open.mockRestore();
  });

  it('profissional vazio na mensagem usa com qualquer profissional', async () => {
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
    expect(url).toContain('com qualquer profissional');
    expect(url).not.toContain('com Qualquer profissional');
    expect(url.toLowerCase()).not.toContain('o salão');
    open.mockRestore();
  });

  it('sem nome do estabelecimento o WhatsApp começa com Olá!', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPr1Card({
      status: 'pending',
      appointment_time: '2026-10-10T14:00:00.000Z',
      businessName: '',
    });
    fireEvent.click(screen.getByRole('button', { name: /Pedir confirmação/ }));
    const url = decodeURIComponent(String(open.mock.calls[0]?.[0] ?? ''));
    expect(url).toContain('Olá! Fiz um agendamento');
    expect(url).not.toContain('Olá, estabelecimento');
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
    const noshowCta = screen.getByRole('button', { name: /^Agendar horário$/ });
    expect(noshowCta).toBeInTheDocument();
    expect(noshowCta.className).toMatch(/theme-accent/);
    expect(screen.queryByRole('button', { name: /Agendar de novo/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
    expect(screen.queryByTestId('client-booking-club')).toBeNull();
  });

  it('status noshow (sem underscore) usa o mesmo card D2 de não compareceu', () => {
    renderPr1Card({
      status: 'noshow',
      appointment_time: '2026-10-02T15:00:00.000Z',
    });
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByText('Sentimos sua falta. Quer marcar outro horário?')).toBeInTheDocument();
  });

  it('passado confirmado usa Agendar de novo secundário, data com de/mês minúsculos', () => {
    renderPr1Card({
      status: 'confirmed',
      appointment_time: '2026-10-02T14:00:00.000Z',
    });
    expect(screen.getByRole('button', { name: /^Agendar de novo$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Repetir este agendamento/ })).toBeNull();
    expect(screen.getByText(/de out\./)).toBeInTheDocument();
    expect(screen.queryByText(/De Out/)).toBeNull();
  });

  it('cancelado no passado pelo cliente: só o selo, sem caixa Cancelado.', () => {
    const { container } = renderPr1Card({
      status: 'cancelled',
      appointment_time: '2026-09-20T10:00:00.000Z',
    });
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByTestId('client-booking-cancelled-note')).toBeNull();
    expect(screen.queryByText('Cancelado.')).toBeNull();
    expect(screen.getByRole('button', { name: /^Agendar de novo$/ }).className).not.toMatch(/theme-accent/);
    expect(container.querySelector('[data-booking-status="cancelled_quiet"]')).toBeTruthy();
  });

  it('cancelado no passado pelo estabelecimento: uma linha mudo', () => {
    renderPr1Card({
      status: 'cancelled',
      appointment_time: '2026-09-20T10:00:00.000Z',
      cancelled_by_business: true,
    });
    expect(screen.getByTestId('client-booking-cancelled-note')).toHaveTextContent(
      'O estabelecimento cancelou este horário.',
    );
    expect(screen.getByTestId('client-booking-cancelled-note').className).not.toMatch(/danger/);
    expect(screen.getByRole('button', { name: /^Agendar de novo$/ })).toBeInTheDocument();
  });

  it('confirmado futuro: WhatsApp em largura total com DDI 351, sem Pedir confirmação', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    renderPr1Card({
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      businessPhone: '912345678',
    });
    expect(screen.queryByRole('button', { name: /Pedir confirmação/ })).toBeNull();
    const wa = screen.getByRole('button', { name: /^WhatsApp$/ });
    expect(wa.className).toMatch(/col-span-2/);
    fireEvent.click(wa);
    const url = String(open.mock.calls[0]?.[0] ?? '');
    const decoded = decodeURIComponent(url);
    expect(url).toContain('https://wa.me/351912345678');
    expect(url).not.toMatch(/wa\.me\/912345678/);
    expect(decoded).toMatch(/de sáb\., 10 de out\./);
    expect(decoded).not.toMatch(/de Sáb/);
    open.mockRestore();
  });
});

function renderPr4(
  extra: Partial<ClientBooking> & { clubActive?: boolean; timeZone?: string } = {},
) {
  const { clubActive = false, timeZone = 'America/Sao_Paulo', ...bookingExtra } = extra;
  return render(
    <MemoryRouter initialEntries={['/minha-area/barbearia-sao-joao']}>
      <Routes>
        <Route
          path="/minha-area/:slug"
          element={(
            <ClientBookingCard
              booking={{ ...booking, ...bookingExtra }}
              isBeauty={false}
              businessPhone="11999998888"
              businessSlug="barbearia-sao-joao"
              clientName="Zé Cliente"
              clientPhone="11999998888"
              region="BR"
              timeZone={timeZone}
              clubActive={clubActive}
              onCancelled={vi.fn()}
            />
          )}
        />
        <Route path="/book/:slug" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientBookingCard — PR-4 Finalizado / Não compareceu / Clube', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as ReturnType<typeof vi.fn>).mockReturnValue({ showToast });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-03T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finalizado no mesmo dia: selo, obrigado e Agendar próximo horário, sem Editar/Cancelar', () => {
    renderPr4({
      status: 'completed',
      appointment_time: '2026-10-03T14:00:00.000Z',
    });
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
    expect(screen.getByText('Obrigado pela visita, Zé!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Agendar próximo horário$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Editar/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Cancelar$/ })).toBeNull();
    expect(screen.queryByTestId('client-booking-club')).toBeNull();
  });

  it('finalizado depois da virada do dia no fuso do negócio: Agendar horário', () => {
    vi.setSystemTime(new Date('2026-10-03T03:00:00.000Z'));
    renderPr4({
      status: 'completed',
      appointment_time: '2026-10-03T02:30:00.000Z',
      timeZone: 'America/Sao_Paulo',
    });
    expect(screen.getByRole('button', { name: /^Agendar horário$/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Agendar próximo horário/ })).toBeNull();
  });

  it('no_show não usa vermelho de erro', () => {
    renderPr4({
      status: 'no_show',
      appointment_time: '2026-10-02T15:00:00.000Z',
    });
    const note = screen.getByTestId('client-booking-noshow').querySelector('p');
    expect(note?.className).not.toMatch(/danger/);
    expect(screen.getByText('Não compareceu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Agendar horário$/ })).toBeInTheDocument();
  });

  it('CTA pré-preenche profissional e serviços', async () => {
    renderPr4({
      status: 'completed',
      appointment_time: '2026-10-03T14:00:00.000Z',
      service_ids: ['s1', 's2'],
      professional_id: 'p1',
    });
    fireEvent.click(screen.getByRole('button', { name: /^Agendar próximo horário$/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/book/barbearia-sao-joao?rebook=s1,s2&pro=p1');
  });

  it('Clube ligado mostra frase própria em cada estado; desligado some', () => {
    const { unmount } = renderPr4({
      status: 'completed',
      appointment_time: '2026-10-03T14:00:00.000Z',
      clubActive: true,
    });
    expect(screen.getByTestId('client-booking-club')).toHaveTextContent('Esta visita entrou no seu Clube.');
    unmount();

    renderPr4({
      status: 'no_show',
      appointment_time: '2026-10-02T15:00:00.000Z',
      clubActive: true,
    });
    expect(screen.getByTestId('client-booking-club')).toHaveTextContent('Seu Clube continua ativo.');
  });

  it('confirmado e cancelado também têm frase do Clube quando o negócio tem Clube', () => {
    const { unmount } = renderPr4({
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      clubActive: true,
    });
    expect(screen.getByTestId('client-booking-club')).toHaveTextContent('Seu Clube cobre este horário.');
    unmount();

    renderPr4({
      status: 'cancelled',
      appointment_time: '2026-10-10T14:00:00.000Z',
      clubActive: true,
    });
    expect(screen.getByTestId('client-booking-club')).toHaveTextContent('Seu Clube segue valendo.');
  });
});
