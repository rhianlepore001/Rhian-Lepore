import { describe, expect, it } from 'vitest';
import {
  CANCELLED_BY_BUSINESS_MESSAGE,
  CANCELLED_GENERIC_MESSAGE,
  cancellationMessage,
  rebookPath,
  splitClientBookings,
  withCancellationInfo,
  type ClientBookingLike,
} from '@/utils/clientBookings';

const NOW = new Date('2026-09-25T12:00:00Z');
const b = (id: string, iso: string, status: string): ClientBookingLike => ({
  id, appointment_time: iso, status, service_ids: ['s1', 's2'],
});

describe('clientBookings (Minha Área, item 5b)', () => {
  const bookings = [
    b('future-confirmed', '2026-09-28T10:00:00Z', 'confirmed'),
    b('future-cancelled', '2026-09-26T10:00:00Z', 'cancelled'),
    b('future-pending', '2026-09-27T10:00:00Z', 'pending'),
    b('past-cancelled', '2026-09-20T10:00:00Z', 'cancelled'),
    b('past-confirmed', '2026-09-20T09:00:00Z', 'confirmed'),
    b('past-completed', '2026-09-19T09:00:00Z', 'completed'),
  ];

  it('Próximos inclui o cancelado futuro (em ordem de horário); passado cancelado fica fora', () => {
    const { upcoming } = splitClientBookings(bookings, NOW);
    expect(upcoming.map((x) => x.id)).toEqual(['future-cancelled', 'future-pending', 'future-confirmed']);
  });

  it('contador de próximos considera só pedidos ativos', () => {
    const { activeUpcoming } = splitClientBookings(bookings, NOW);
    expect(activeUpcoming.map((x) => x.id)).toEqual(['future-confirmed', 'future-pending']);
  });

  it('histórico continua igual (sem cancelados)', () => {
    const { history } = splitClientBookings(bookings, NOW);
    expect(history.map((x) => x.id)).toEqual(['past-confirmed', 'past-completed']);
  });

  it('mensagem: estabelecimento cancelou vs neutra', () => {
    expect(cancellationMessage({ cancelled_by_business: true })).toBe('O estabelecimento cancelou este agendamento.');
    expect(cancellationMessage({ cancelled_by_business: false })).toBe(CANCELLED_GENERIC_MESSAGE);
    expect(cancellationMessage({})).toBe(CANCELLED_GENERIC_MESSAGE);
    expect(CANCELLED_BY_BUSINESS_MESSAGE).not.toBe(CANCELLED_GENERIC_MESSAGE);
  });

  it('Reagendar abre o fluxo do mesmo negócio com os mesmos serviços', () => {
    expect(rebookPath('barbeariasilva', { service_ids: ['s1', 's2'] })).toBe('/book/barbeariasilva?rebook=s1,s2');
    expect(rebookPath('barbeariasilva', { service_ids: [] })).toBe('/book/barbeariasilva');
  });

  it('junta quem cancelou só nos cancelados', () => {
    const merged = withCancellationInfo(bookings, { 'future-cancelled': true, 'future-confirmed': true });
    expect(merged.find((x) => x.id === 'future-cancelled')?.cancelled_by_business).toBe(true);
    expect(merged.find((x) => x.id === 'past-cancelled')?.cancelled_by_business).toBe(false);
    expect(merged.find((x) => x.id === 'future-confirmed')).not.toHaveProperty('cancelled_by_business');
  });
});
