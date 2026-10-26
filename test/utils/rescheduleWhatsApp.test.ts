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
      clientName: 'Cliente Exemplo',
      businessName: 'Negócio Exemplo',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Profissional Exemplo',
    });
    expect(text).toBe(
      'Fala, Cliente Exemplo! 🔁\n'
      + 'Seu horário em *Negócio Exemplo* foi remarcado.\n'
      + 'Antes: 23/08/2026 às 06:00\n'
      + 'Agora: *24/08/2026* às *10:30* com Profissional Exemplo.\n'
      + 'Qualquer dúvida é só responder aqui. Até lá! ✂️',
    );
  });

  it('estética: copy R-13 e substituto Salão quando falta o nome', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'beauty',
      clientName: 'Cliente Exemplo',
      businessName: '',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Outra Profissional',
    });
    expect(text).toBe(
      'Olá, Cliente Exemplo! ✨\n'
      + 'Seu horário em *Salão* foi remarcado.\n'
      + 'Antes: 23/08/2026 às 06:00\n'
      + 'Agora: *24/08/2026* às *10:30* com Outra Profissional.\n'
      + 'Se precisar de outro horário, é só responder. 💖',
    );
  });

  it('barbearia sem nome de negócio usa substituto Barbearia', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: 'Cliente Exemplo',
      businessName: null,
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: 'Profissional Exemplo',
    });
    expect(text).toContain('*Barbearia*');
    expect(text).not.toContain('(nome do estabelecimento)');
  });

  it('sem profissional omite o trecho "com …"', () => {
    const text = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: 'Cliente Exemplo',
      businessName: 'Profissional Exemplo',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
      professionalName: null,
    });
    expect(text).toContain('Agora: *24/08/2026* às *10:30*.');
    expect(text).not.toContain(' com ');
  });

  it('sem nome do cliente mantém a saudação no template', () => {
    const barber = buildRescheduleWhatsAppMessage({
      theme: 'barber',
      clientName: '',
      businessName: 'Profissional Exemplo',
      oldTimeIso: OLD,
      newTimeIso: NEXT,
      timeZone: LISBON,
    });
    expect(barber.startsWith('Fala! 🔁')).toBe(true);
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
      professionalName: 'Profissional Exemplo',
    })).toBe('Atual: Domingo 23/08/2026 às 06:00 com Profissional Exemplo');
  });

  it('histórico Remarcado por', () => {
    expect(formatRescheduleHistoryLine({
      actorName: 'Profissional Exemplo',
      createdAtIso: NEXT,
      oldTimeIso: OLD,
      timeZone: LISBON,
    })).toBe('Remarcado por Profissional Exemplo em 24/08/2026 (antes: 23/08/2026 às 06:00)');
  });

  it('de-para', () => {
    expect(formatRescheduleInstant(OLD, LISBON, 'Profissional Exemplo')).toBe('Domingo 23/08/2026 às 06:00 com Profissional Exemplo');
  });

  it('conflito R-06', () => {
    expect(slotBusyMessage('Diego')).toBe('Esse horário já está ocupado na agenda de Diego. Escolha outro.');
  });
});
