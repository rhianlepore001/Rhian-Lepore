import { describe, expect, it } from 'vitest';
import {
  getPublicBookingAwaitingWhatsAppText,
  getPublicBookingSuccessCopy,
} from '@/utils/publicBookingCopy';

describe('publicBookingCopy', () => {
  it('pending não usa copy de confirmado', () => {
    const barber = getPublicBookingSuccessCopy({ isBeauty: false, status: 'pending' });
    const beauty = getPublicBookingSuccessCopy({ isBeauty: true, status: 'pending' });

    expect(barber.title).toBe('SOLICITAÇÃO ENVIADA');
    expect(beauty.title).toBe('Solicitação enviada');
    expect(barber.title.toLowerCase()).not.toContain('confirmado');
    expect(beauty.title.toLowerCase()).not.toContain('confirmado');
    expect(barber.subtitle.toLowerCase()).toContain('aguardando');
    expect(beauty.subtitle.toLowerCase()).toContain('aguardando');
    expect(barber.whatsappCta).toMatch(/pedir confirmação/i);
    expect(barber.stepperLastLabel).toBe('Enviado');
  });

  it('confirmed mantém copy de confirmação', () => {
    const copy = getPublicBookingSuccessCopy({ isBeauty: false, status: 'confirmed' });
    expect(copy.title).toBe('AGENDAMENTO CONFIRMADO');
  });

  it('WhatsApp de pending pede confirmação do salão', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: 'Corte Fino',
      dateLabel: '18/09/2026',
      timeLabel: '10:00',
    });
    expect(text.toLowerCase()).toContain('aguardando');
    expect(text.toLowerCase()).not.toContain('nos vemos em breve');
  });
});

describe('publicBookingCopy — cancelado (item 5b)', () => {
  it('cancelled não fica como "solicitação enviada" nem "confirmado"', () => {
    const barber = getPublicBookingSuccessCopy({ isBeauty: false, status: 'cancelled' });
    const beauty = getPublicBookingSuccessCopy({ isBeauty: true, status: 'cancelled', isEdit: true });
    expect(barber.title).toBe('AGENDAMENTO CANCELADO');
    expect(beauty.title).toBe('Agendamento cancelado');
    expect(beauty.subtitle).toBe('Este agendamento foi cancelado. Escolha um novo horário.');
    expect(barber.subtitle).toBe('ESTE AGENDAMENTO FOI CANCELADO. ESCOLHA UM NOVO HORÁRIO.');
    expect(barber.stepperLastLabel).toBe('Cancelado');
  });

  it('tela de sucesso não atribui o cancelamento ao estabelecimento (recusa ou cliente em outra aba)', () => {
    for (const isBeauty of [false, true]) {
      for (const isEdit of [false, true]) {
        const copy = getPublicBookingSuccessCopy({ isBeauty, status: 'cancelled', isEdit });
        expect(copy.subtitle.toLowerCase()).not.toContain('estabelecimento cancelou');
        expect(copy.title.toLowerCase()).toContain('cancelado');
      }
    }
  });
});
