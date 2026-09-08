import { describe, expect, it } from 'vitest';
import { queueClientHeadline, queueClientPaymentBadge, queueClientRuleLine } from '@/utils/queueClientCopy';

describe('queueClientHeadline', () => {
  it('mostra posição ordinal, pessoas à frente e estimativa', () => {
    const headline = queueClientHeadline({ status: 'waiting', position: 3, etaMinutes: 25 });
    expect(headline.title).toBe('Você é o 3º da fila');
    expect(headline.subtitle).toBe('2 pessoas na sua frente · cerca de 25 min');
  });

  it('singular para uma pessoa e sem estimativa quando ETA é nulo', () => {
    const headline = queueClientHeadline({ status: 'waiting', position: 2, etaMinutes: null });
    expect(headline.subtitle).toBe('1 pessoa na sua frente');
  });

  it('primeiro da fila é o próximo', () => {
    expect(queueClientHeadline({ status: 'waiting', position: 1 }).title).toBe('Você é o próximo');
    expect(queueClientHeadline({ status: 'waiting', position: null }).title).toBe('Você é o próximo');
  });

  it('chamado usa o primeiro nome e o profissional', () => {
    const headline = queueClientHeadline({
      status: 'calling',
      position: null,
      firstName: 'Carlos',
      professionalName: 'João',
    });
    expect(headline.title).toBe('Carlos, é a sua vez!');
    expect(headline.subtitle).toBe('João está esperando por você.');
  });

  it('estados encerrados explicam o desfecho', () => {
    expect(queueClientHeadline({ status: 'completed', position: null, firstName: 'Ana' }).subtitle)
      .toBe('Obrigado pela visita, Ana. Até a próxima!');
    expect(queueClientHeadline({ status: 'no_show', position: null }).title).toBe('Sua senha foi encerrada');
  });
});

describe('queueClientRuleLine', () => {
  it('aguardando com saída permitida informa a tolerância', () => {
    expect(queueClientRuleLine({ status: 'waiting', allowLeave: true, lateMinutes: 15 }))
      .toBe('Você pode sair e voltar. Ao ser chamado, terá 15 min para chegar.');
  });

  it('aguardando sem saída pede para ficar no local', () => {
    expect(queueClientRuleLine({ status: 'waiting', allowLeave: false, lateMinutes: 15 }))
      .toBe('Aguarde no local. Você será chamado pelo nome.');
  });

  it('chamado mostra contagem regressiva e prazo esgotado', () => {
    expect(queueClientRuleLine({ status: 'calling', allowLeave: true, lateMinutes: 10, remainingLateMinutes: 4 }))
      .toBe('Você tem 4 min para chegar.');
    expect(queueClientRuleLine({ status: 'calling', allowLeave: true, lateMinutes: 10, remainingLateMinutes: 0 }))
      .toBe('O prazo para chegar terminou. Fale com a equipe no balcão.');
    expect(queueClientRuleLine({ status: 'calling', allowLeave: false, lateMinutes: 10 }))
      .toBe('Vá até o atendimento agora.');
  });

  it('em atendimento não mostra regra', () => {
    expect(queueClientRuleLine({ status: 'serving', allowLeave: true, lateMinutes: 10 })).toBeNull();
  });
});

describe('queueClientPaymentBadge', () => {
  it('traduz o status de pagamento para o cliente', () => {
    expect(queueClientPaymentBadge('paid').label).toBe('Pago');
    expect(queueClientPaymentBadge('membership').label).toBe('Assinatura');
    expect(queueClientPaymentBadge('awaiting_confirmation').label).toBe('Pagamento em confirmação');
    expect(queueClientPaymentBadge('unpaid').label).toBe('Pagamento no balcão');
  });
});
