import { describe, expect, it } from 'vitest';
import {
  buildRescheduleWhatsAppMessage,
  formatRescheduleCurrentLine,
  formatRescheduleHistoryLine,
  formatRescheduleInstant,
  slotBusyMessage,
} from '../../utils/rescheduleCopy';

const LISBON = 'Europe/Lisbon';
// 23/08/2026 06:00 em Lisboa (WEST, UTC+1) = 05:00Z
const OLD = '2026-08-23T05:00:00.000Z';
// 24/08/2026 10:30 em Lisboa = 09:30Z
const NEXT = '2026-08-24T09:30:00.000Z';

describe('T-V12 buildRescheduleWhatsAppMessage', () => {
  it('barbearia: copy R-13, datas no fuso da loja, nome do negócio', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: 'Aline',
      businessName: 'Barbearia Bob',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Bob',
    });
    expect(text).toBe(
      'Fala, Aline! 🔁\n'
      + 'Seu horário na *Barbearia Bob* foi remarcado.\n'
      + 'Antes: 23/08/2026 às 06:00\n'
      + 'Agora: *24/08/2026* às *10:30* com Bob.\n'
      + 'Qualquer dúvida é só responder aqui. Até lá! ✂️',
    );
  });

  it('estética: copy R-13 e substituto Salão quando falta o nome', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'beauty',
      clientName: 'Aline',
      businessName: '',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Bruna',
    });
    expect(text).toBe(
      'Olá, Aline! ✨\n'
      + 'Seu horário no *Salão* foi remarcado.\n'
      + 'Antes: 23/08/2026 às 06:00\n'
      + 'Agora: *24/08/2026* às *10:30* com Bruna.\n'
      + 'Se precisar de outro horário, é só responder. 💖',
    );
  });

  it('barbearia sem nome de negócio usa substituto Barbearia', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: 'Aline',
      businessName: null,
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Bob',
    });
    expect(text).toContain('*Barbearia*');
    expect(text).not.toContain('(nome do estabelecimento)');
  });

  it('sem profissional omite o trecho "com …"', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: 'Aline',
      businessName: 'Bob',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: null,
    });
    expect(text).toContain('Agora: *24/08/2026* às *10:30*.');
    expect(text).not.toContain(' com ');
  });

  it('sem nome do cliente usa Olá! (não Fala, olá!)', () => {
    const barber = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: '',
      businessName: 'Bob',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
    });
    expect(barber.startsWith('Olá!')).toBe(true);
    expect(barber).not.toContain('Fala, olá');
    const beauty = buildRescheduleWhatsAppMessage({
      theme: 'beauty',
      clientName: '  ',
      businessName: 'Studio',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
    });
    expect(beauty.startsWith('Olá!')).toBe(true);
    expect(beauty).not.toContain('Olá, olá');
  });
});

describe('copy de remarcação (R-06, R-14, R-16)', () => {
  it('linha Atual no fuso da loja', () => {
    expect(formatRescheduleCurrentLine({
      timeIso: OLD,
      timeZone: LISBON,
      professionalName: 'Bob',
    })).toBe('Atual: Domingo 23/08/2026 às 06:00 com Bob');
  });

  it('histórico Remarcado por', () => {
    expect(formatRescheduleHistoryLine({
      actorName: 'Bob',
      createdAtIso: NEXT,
      oldTimeIso: OLD,
      timeZone: LISBON,
    })).toBe('Remarcado por Bob em 24/08/2026 (antes: 23/08/2026 às 06:00)');
  });

  it('de-para', () => {
    expect(formatRescheduleInstant(OLD, LISBON, 'Bob')).toBe('Domingo 23/08/2026 às 06:00 com Bob');
  });

  it('conflito R-06', () => {
    expect(slotBusyMessage('Diego')).toBe('Esse horário já está ocupado na agenda de Diego. Escolha outro.');
  });
});
