import { describe, expect, it } from 'vitest';
import {
  getPublicBookingAwaitingWhatsAppText,
  getPublicBookingSubmitLabel,
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

describe('publicBookingCopy — confirmação automática', () => {
  it('botão final: Enviar pedido (manual) x Confirmar agendamento (automático)', () => {
    expect(getPublicBookingSubmitLabel({ autoConfirm: false })).toBe('Enviar pedido');
    expect(getPublicBookingSubmitLabel({ autoConfirm: true })).toBe('Confirmar agendamento');
  });

  it('alteração sempre é pedido, mesmo no automático', () => {
    expect(getPublicBookingSubmitLabel({ autoConfirm: true, isEdit: true })).toBe('Enviar pedido');
    expect(getPublicBookingSubmitLabel({ autoConfirm: false, isEdit: true })).toBe('Enviar pedido');
  });

  it('pending usa o nome do tipo de negócio, nunca "salão" fixo', () => {
    const barber = getPublicBookingSuccessCopy({ isBeauty: false, status: 'pending', userType: 'barber' });
    expect(barber.subtitle).toBe('AGUARDANDO A CONFIRMAÇÃO DA BARBEARIA. ACOMPANHE NA MINHA ÁREA.');
    expect(barber.subtitle).not.toContain('SALÃO');
    const beauty = getPublicBookingSuccessCopy({ isBeauty: true, status: 'pending', userType: 'beauty' });
    expect(beauty.subtitle).toBe('Aguardando a confirmação do salão. Acompanhe na Minha Área.');
  });

  it('sem userType cai no tema (barbearia x salão)', () => {
    expect(getPublicBookingSuccessCopy({ isBeauty: false, status: 'pending' }).subtitle).toContain('DA BARBEARIA');
    expect(getPublicBookingSuccessCopy({ isBeauty: true, status: 'pending' }).subtitle).toContain('do salão');
  });

  it('nenhuma copy de sucesso tem "AGUARDANDO CONFIRMAÇÃO DO SALÃO" para barbearia', () => {
    for (const isEdit of [false, true]) {
      const copy = getPublicBookingSuccessCopy({ isBeauty: false, status: 'pending', isEdit, userType: 'barber' });
      expect(copy.subtitle).not.toMatch(/SALÃO/);
    }
  });

  it('confirmed: horário garantido, sem pedir confirmação', () => {
    const barber = getPublicBookingSuccessCopy({ isBeauty: false, status: 'confirmed', userType: 'barber' });
    const beauty = getPublicBookingSuccessCopy({ isBeauty: true, status: 'confirmed', userType: 'beauty' });
    expect(barber.title).toBe('AGENDAMENTO CONFIRMADO');
    expect(beauty.title).toBe('Agendamento confirmado');
    expect(beauty.subtitle).toBe('Seu horário está garantido. Te esperamos!');
    expect(barber.subtitle).toBe('SEU HORÁRIO ESTÁ GARANTIDO. TE ESPERAMOS!');
    expect(barber.whatsappCta).toBe('Falar no WhatsApp');
    expect(barber.stepperLastLabel).toBe('Confirmado');
  });

  it('WhatsApp de confirmado não pede confirmação', () => {
    const text = getPublicBookingAwaitingWhatsAppText({
      businessName: 'Corte Fino',
      dateLabel: '18/09/2026',
      timeLabel: '10:00',
      serviceLabel: 'Corte tesoura',
      professionalName: 'Mario',
      confirmed: true,
    });
    expect(text).toBe('Olá, Corte Fino! Fiz um agendamento online para Corte tesoura com Mario em 18/09/2026 às 10:00.');
  });
});
