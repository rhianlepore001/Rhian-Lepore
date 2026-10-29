import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublicGroupBooking } from '../../components/booking/PublicGroupBooking';

const mutateAsync = vi.fn();
const fetchAvailableSlots = vi.fn();

vi.mock('../../components/ui/Toast', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));
vi.mock('../../hooks/usePublicBooking', () => ({
  useSubmitPublicGroupBooking: () => ({ mutateAsync, isPending: false }),
}));
vi.mock('../../services/publicBooking', () => ({
  fetchAvailableSlots: (...args: unknown[]) => fetchAvailableSlots(...args),
}));

const services = [
  { id: 'svc-corte', name: 'Corte', price: 50, duration_minutes: 30, category_id: 'cat-a' },
  { id: 'svc-barba', name: 'Barba', price: 30, duration_minutes: 30, category_id: 'cat-a' },
  { id: 'svc-cor', name: 'Coloração', price: 120, duration_minutes: 60, category_id: 'cat-b' },
];
const professionals = [
  { id: 'pro-ana', name: 'Ana Souza' },
  { id: 'pro-bia', name: 'Bia Lima' },
];

function renderGroup(overrides: Partial<React.ComponentProps<typeof PublicGroupBooking>> = {}) {
  const props: React.ComponentProps<typeof PublicGroupBooking> = {
    businessId: 'biz-1',
    userType: 'beauty',
    isBeauty: true,
    currencyRegion: 'BR',
    timezone: 'America/Sao_Paulo',
    services,
    categories: [{ id: 'cat-a', name: 'Cabelo' }, { id: 'cat-b', name: 'Cor' }],
    professionals,
    isLoggedIn: true,
    customerName: 'Marina Teste',
    setCustomerName: vi.fn(),
    customerPhone: '11999990000',
    setCustomerPhone: vi.fn(),
    acceptedPolicy: true,
    setAcceptedPolicy: vi.fn(),
    inlinePolicy: <div>Política</div>,
    onOpenPolicy: vi.fn(),
    autoConfirm: true,
    onBooked: vi.fn().mockResolvedValue(true),
    onOpenClientArea: vi.fn(),
    onExit: vi.fn(),
    buildWhatsAppHref: () => null,
    ...overrides,
  };
  return { props, ...render(<PublicGroupBooking {...props} />) };
}

async function fillPeople(user: ReturnType<typeof userEvent.setup>, secondPro = 'Bia Lima') {
  await user.click(screen.getByRole('button', { name: /Corte/ }));
  await user.click(within(screen.getByRole('group', { name: 'Profissional' })).getByRole('button', { name: /Ana Souza/ }));
  await user.click(screen.getByTestId('group-person-tab-1'));
  await user.type(screen.getByLabelText(/Nome da pessoa 2/), 'Caio Teste');
  await user.click(screen.getByRole('button', { name: /Coloração/ }));
  await user.click(within(screen.getByRole('group', { name: 'Profissional' })).getByRole('button', { name: new RegExp(secondPro) }));
}

async function pickDateAndTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  await user.click(screen.getByTestId('group-next'));
  await user.click(screen.getByLabelText('Próximo mês'));
  const day = document.querySelector('button[data-date$="-15"]') as HTMLButtonElement;
  await user.click(day);
  await user.click(await screen.findByRole('button', { name: time }));
}

describe('PublicGroupBooking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAvailableSlots.mockImplementation(async (_biz: string, _date: string, proId: string) => ({
      slots: proId === 'pro-ana' ? ['09:00', '10:00', '11:00'] : ['10:00', '11:00', '15:00'],
      leadTimeHours: 0,
      leadTimeMinutes: 0,
      emptyReason: null,
    }));
  });

  it('só avança quando cada pessoa tem nome, serviço e profissional', async () => {
    const user = userEvent.setup();
    renderGroup();
    expect(screen.getByTestId('group-next')).toBeDisabled();
    await fillPeople(user);
    expect(screen.getByTestId('group-next')).toBeEnabled();
  });

  it('mostra só horários em que todos os profissionais estão livres', async () => {
    const user = userEvent.setup();
    renderGroup();
    await fillPeople(user);
    await user.click(screen.getByTestId('group-next'));
    await user.click(screen.getByLabelText('Próximo mês'));
    await user.click(document.querySelector('button[data-date$="-15"]') as HTMLButtonElement);
    await screen.findByRole('button', { name: '10:00' });
    expect(screen.queryByRole('button', { name: '09:00' })).toBeNull();
    expect(screen.queryByRole('button', { name: '15:00' })).toBeNull();
    const calls = fetchAvailableSlots.mock.calls;
    expect(calls.map(call => [call[2], call[3]]).sort()).toEqual([['pro-ana', 30], ['pro-bia', 60]]);
  });

  it('soma as durações quando as duas pessoas usam o mesmo profissional', async () => {
    const user = userEvent.setup();
    renderGroup();
    await fillPeople(user, 'Ana Souza');
    await user.click(screen.getByTestId('group-next'));
    await user.click(screen.getByLabelText('Próximo mês'));
    await user.click(document.querySelector('button[data-date$="-15"]') as HTMLButtonElement);
    await waitFor(() => expect(fetchAvailableSlots).toHaveBeenCalled());
    expect(fetchAvailableSlots.mock.calls.every(call => call[2] === 'pro-ana' && call[3] === 90)).toBe(true);
    expect(fetchAvailableSlots).toHaveBeenCalledTimes(1);
  });

  it('confirma cada pessoa com serviços, profissional, horário e preço e envia tudo de uma vez', async () => {
    const user = userEvent.setup();
    mutateAsync.mockResolvedValue([
      { id: 'r1', status: 'confirmed', appointment_time: '2026-12-15T13:00:00.000Z', professional_id: 'pro-ana', service_ids: ['svc-corte'], total_price: 50, attendee_name: null },
      { id: 'r2', status: 'confirmed', appointment_time: '2026-12-15T13:00:00.000Z', professional_id: 'pro-bia', service_ids: ['svc-cor'], total_price: 120, attendee_name: 'Caio Teste' },
    ]);
    const { props } = renderGroup();
    await fillPeople(user);
    await pickDateAndTime(user, '10:00');
    await user.click(screen.getByTestId('group-next'));

    const people = screen.getAllByTestId('group-confirm-person');
    expect(people).toHaveLength(2);
    expect(people[0]).toHaveTextContent('Marina Teste');
    expect(people[0]).toHaveTextContent('Corte');
    expect(people[0]).toHaveTextContent('Ana Souza');
    expect(people[1]).toHaveTextContent('Caio Teste');
    expect(people[1]).toHaveTextContent('Coloração');
    expect(people[1]).toHaveTextContent('Bia Lima');
    expect(screen.getByTestId('group-confirm-total')).toHaveTextContent('170');

    await user.click(screen.getByTestId('group-submit'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const payload = mutateAsync.mock.calls[0][0];
    expect(payload.people).toEqual([
      { attendeeName: null, professionalId: 'pro-ana', serviceIds: ['svc-corte'] },
      { attendeeName: 'Caio Teste', professionalId: 'pro-bia', serviceIds: ['svc-cor'] },
    ]);
    expect(payload.customerPhone).toBe('11999990000');
    expect(payload).not.toHaveProperty('confirmationCode');
    expect(await screen.findByTestId('group-booking-success')).toBeInTheDocument();
    expect(screen.getAllByTestId('group-booking-success-person')).toHaveLength(2);
    expect(screen.getByTestId('group-booking-success-total')).toHaveTextContent('170');
    expect(props.onBooked).toHaveBeenCalled();
  });

  it('avisa que nada foi agendado quando o horário é ocupado e volta para a escolha de horário', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue({ message: 'slot_unavailable', code: 'P0001' });
    renderGroup();
    await fillPeople(user);
    await pickDateAndTime(user, '10:00');
    await user.click(screen.getByTestId('group-next'));
    await user.click(screen.getByTestId('group-submit'));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(await screen.findByText('Escolha a data e hora')).toBeInTheDocument();
    expect(screen.queryByTestId('group-booking-success')).toBeNull();
  });

  it('não pede telefone nem código para a pessoa adicional', async () => {
    const user = userEvent.setup();
    renderGroup();
    await user.click(screen.getByTestId('group-person-tab-1'));
    expect(screen.queryByText(/código/i)).toBeNull();
    expect(screen.queryByText(/WhatsApp/i)).toBeNull();
    expect(screen.getByLabelText(/Nome da pessoa 2/)).toBeInTheDocument();
  });
});
