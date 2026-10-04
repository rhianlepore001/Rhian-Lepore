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

  it('WhatsApp de pending usa o nome do estabelecimento, serviço e profissional', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: 'Corte Fino',
      dateLabel: '18/09/2026',
      timeLabel: '10:00',
      serviceLabel: 'Corte tesoura',
      professionalName: 'Mario',
    });
    expect(text).toBe(
      'Olá, Corte Fino! Fiz um agendamento online para Corte tesoura com Mario em 18/09/2026 às 10:00. Pode confirmar, por favor?',
    );
    expect(text.toLowerCase()).not.toContain('o salão');
    expect(text.toLowerCase()).not.toContain('barbearia silva');
    expect(text).not.toContain('aguardando a sua confirmação');
  });

  it('WhatsApp aceita nome com acento e emoji; profissional vazio vira Qualquer profissional', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: 'Barbearia São João ✂️',
      dateLabel: '03/10/2026',
      timeLabel: '15:13',
      serviceLabel: 'Barba',
      professionalName: null,
    });
    expect(text).toBe(
      'Olá, Barbearia São João ✂️! Fiz um agendamento online para Barba com qualquer profissional em 03/10/2026 às 15:13. Pode confirmar, por favor?',
    );
  });

  it('WhatsApp trata profissional em branco como qualquer profissional', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: 'Corte Fino',
      dateLabel: '18/09/2026',
      timeLabel: '10:00',
      serviceLabel: 'Corte tesoura',
      professionalName: '   ',
    });
    expect(text).toBe(
      'Olá, Corte Fino! Fiz um agendamento online para Corte tesoura com qualquer profissional em 18/09/2026 às 10:00. Pode confirmar, por favor?',
    );
  });

  it('sem nome do estabelecimento a mensagem começa com Olá!', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: '  ',
      dateLabel: '10/10/2026',
      timeLabel: '15:00',
      serviceLabel: 'Corte tesoura',
      professionalName: 'Mário',
    });
    expect(text.startsWith('Olá! ')).toBe(true);
    expect(text).not.toContain('Olá, estabelecimento');
    expect(text).not.toContain('Olá, !');
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

  it('pedido de alteração usa a copy exata do horário original', () => {
    const subtitle =
      'Pedido de alteração enviado. Seu horário original (dom., 04 de out. às 10:00) continua reservado até a resposta.';
    const copy = getPublicBookingSuccessCopy({
      isBeauty: false,
      status: 'pending',
      isEdit: true,
      editSentSubtitle: subtitle,
    });
    expect(copy.title).toBe('ALTERAÇÃO ENVIADA');
    expect(copy.subtitle).toBe(subtitle);
    expect(copy.stepperLastLabel).toBe('Enviado');
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
