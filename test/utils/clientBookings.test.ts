import { describe, expect, it } from 'vitest';
import {
  CANCELLED_BY_BUSINESS_MESSAGE,
  CANCELLED_GENERIC_MESSAGE,
  cancellationMessage,
  clubSentence,
  clubInviteSentence,
  CLUB_SENTENCE,
  completedRebookLabel,
  completedThankYou,
  formatClientCardDate,
  formatClientCardDateInSentence,
  isSameBusinessDay,
  NEXT_SLOT_CTA,
  NO_SHOW_MESSAGE,
  PAST_CANCELLED_BY_BUSINESS_MESSAGE,
  pendingAwaitingBanner,
  REBOOK_LABEL,
  rebookPath,
  SLOT_CTA,
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

  it('histórico inclui o cancelado no passado (não some das duas abas)', () => {
    const { history } = splitClientBookings(bookings, NOW);
    expect(history.map((x) => x.id)).toEqual(['past-cancelled', 'past-confirmed', 'past-completed']);
    expect(history.find((x) => x.id === 'past-cancelled')?.status).toBe('cancelled');
  });

  it('cancelado no passado não aparece em Próximos', () => {
    const { upcoming, history } = splitClientBookings(bookings, NOW);
    expect(upcoming.map((x) => x.id)).not.toContain('past-cancelled');
    expect(history.map((x) => x.id)).toContain('past-cancelled');
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
    expect(rebookPath('barbeariasilva', { service_ids: ['s1'], professional_id: 'p1' }))
      .toBe('/book/barbeariasilva?rebook=s1&pro=p1');
  });

  it('rótulo único de remarcar e linha do cancelado pelo estabelecimento', () => {
    expect(REBOOK_LABEL).toBe('Agendar de novo');
    expect(PAST_CANCELLED_BY_BUSINESS_MESSAGE).toBe('O estabelecimento cancelou este horário.');
  });

  it('data do card: weekday capitalizado, de e mês minúsculos; no WhatsApp o weekday fica minúsculo', () => {
    const label = formatClientCardDate(new Date('2026-10-10T14:00:00.000Z'), 'Europe/Lisbon');
    expect(label).toMatch(/^Sáb/);
    expect(label).toMatch(/10 de out/);
    expect(label).not.toMatch(/De Out/);
    expect(label).not.toMatch(/ de Out/);
    expect(label).not.toMatch(/De out/);
    expect(formatClientCardDateInSentence(new Date('2026-10-10T14:00:00.000Z'), 'Europe/Lisbon')).toBe(
      label.replace(/^Sáb/, 'sáb'),
    );
  });

  it('aviso de pending usa o substantivo do negócio e pluraliza horários', () => {
    expect(pendingAwaitingBanner('barbearia', 1)).toBe('A barbearia ainda não confirmou este horário.');
    expect(pendingAwaitingBanner('barbearia', 2)).toBe('A barbearia ainda não confirmou estes horários.');
    expect(pendingAwaitingBanner('salão', 1)).toBe('O salão ainda não confirmou este horário.');
    expect(pendingAwaitingBanner('studio', 1)).toBe('O estabelecimento ainda não confirmou este horário.');
  });

  it('junta quem cancelou só nos cancelados', () => {
    const merged = withCancellationInfo(bookings, { 'future-cancelled': true, 'future-confirmed': true });
    expect(merged.find((x) => x.id === 'future-cancelled')?.cancelled_by_business).toBe(true);
    expect(merged.find((x) => x.id === 'past-cancelled')?.cancelled_by_business).toBe(false);
    expect(merged.find((x) => x.id === 'future-confirmed')).not.toHaveProperty('cancelled_by_business');
  });
});

describe('clientBookings — PR-4 Finalizado / Não compareceu', () => {
  it('histórico inclui no_show mesmo se o horário ainda for futuro', () => {
    const now = new Date('2026-10-03T12:00:00Z');
    const { upcoming, history } = splitClientBookings([
      b('ns', '2026-10-04T10:00:00Z', 'no_show'),
      b('done', '2026-10-04T11:00:00Z', 'completed'),
    ], now);
    expect(upcoming).toHaveLength(0);
    expect(history.map((x) => x.id)).toEqual(['ns', 'done']);
  });

  it('obrigado usa o primeiro nome', () => {
    expect(completedThankYou('Zé Cliente')).toBe('Obrigado pela visita, Zé!');
    expect(completedThankYou('')).toBe('Obrigado pela visita!');
  });

  it('CTA do finalizado vira no fuso do negócio, não no do navegador', () => {
    const appointment = '2026-10-03T02:30:00.000Z'; // 23:30 em São Paulo (dia 2); 03:30 em Lisboa (dia 3)
    const beforeSpMidnight = new Date('2026-10-03T02:00:00.000Z');
    const afterSpMidnight = new Date('2026-10-03T03:00:00.000Z');
    expect(isSameBusinessDay(appointment, 'America/Sao_Paulo', beforeSpMidnight)).toBe(true);
    expect(completedRebookLabel(appointment, 'America/Sao_Paulo', beforeSpMidnight)).toBe(NEXT_SLOT_CTA);
    expect(completedRebookLabel(appointment, 'America/Sao_Paulo', afterSpMidnight)).toBe(SLOT_CTA);
    expect(completedRebookLabel(appointment, 'Europe/Lisbon', afterSpMidnight)).toBe(NEXT_SLOT_CTA);
    expect(NEXT_SLOT_CTA).toBe('Agendar próximo horário');
    expect(SLOT_CTA).toBe('Agendar horário');
    expect(NO_SHOW_MESSAGE).toBe('Sentimos sua falta. Quer marcar outro horário?');
  });

  it('frases do Clube: membro ativo vs convite vs Clube desligado', () => {
    const off = { clubOffered: false, isMember: false, businessName: 'Barbearia São João' };
    const invite = { clubOffered: true, isMember: false, businessName: 'Barbearia São João' };
    const member = { clubOffered: true, isMember: true, businessName: 'Barbearia São João' };
    expect(clubSentence('completed', off)).toBeNull();
    expect(clubSentence('no_show', off)).toBeNull();
    expect(clubSentence('cancelled', off)).toBeNull();
    expect(clubSentence('confirmed', off)).toBeNull();
    expect(clubSentence('completed', invite)).toBe('Conheça o Clube da Barbearia São João');
    expect(clubSentence('no_show', invite)).toBe(clubInviteSentence('Barbearia São João'));
    expect(clubSentence('cancelled', invite)).toBe(clubInviteSentence('Barbearia São João'));
    expect(clubSentence('confirmed', invite)).toBe(clubInviteSentence('Barbearia São João'));
    expect(clubSentence('completed', member)).toBe(CLUB_SENTENCE.completed);
    expect(clubSentence('no_show', member)).toBe(CLUB_SENTENCE.no_show);
    expect(clubSentence('cancelled', member)).toBe(CLUB_SENTENCE.cancelled);
    expect(clubSentence('confirmed', member)).toBe(CLUB_SENTENCE.confirmed);
    expect(clubSentence('pending', member)).toBeNull();
    expect(clubSentence('pending', invite)).toBeNull();
    expect(CLUB_SENTENCE.completed).toBe('Seu Clube segue ativo.');
    expect(CLUB_SENTENCE.completed).not.toMatch(/visita entrou/i);
    expect(CLUB_SENTENCE.confirmed).toBe('Seu Clube está ativo neste horário.');
    expect(CLUB_SENTENCE.no_show).toBe('Seu Clube continua ativo.');
    expect(CLUB_SENTENCE.cancelled).toBe('Seu Clube segue valendo.');
  });
});
