import { describe, expect, it } from 'vitest';
import { queuePaymentBadge, queueStaffActions } from '@/utils/queueStaffActions';

describe('queueStaffActions', () => {
  it('waiting: iniciar atendimento é primário, chamar é secundário e pode marcar não compareceu', () => {
    const actions = queueStaffActions({ status: 'waiting', paymentStatus: 'unpaid' });
    expect(actions.primary).toEqual({ id: 'start', label: 'Iniciar atendimento' });
    expect(actions.secondary).toEqual({ id: 'call', label: 'Chamar cliente' });
    expect(actions.tertiary.map((action) => action.id)).toEqual(['no_show']);
    expect(actions.showConfirmPay).toBe(false);
  });

  it('calling: pode voltar para a fila ou marcar não compareceu', () => {
    const actions = queueStaffActions({ status: 'calling', paymentStatus: 'unpaid' });
    expect(actions.primary?.id).toBe('start');
    expect(actions.secondary).toBeNull();
    expect(actions.tertiary.map((action) => action.id)).toEqual(['requeue', 'no_show']);
  });

  it('Pix pendente mostra confirmar e cancelar', () => {
    const actions = queueStaffActions({
      status: 'waiting',
      paymentStatus: 'awaiting_confirmation',
    });
    expect(actions.showConfirmPay).toBe(true);
    expect(actions.showCancelPay).toBe(true);
    expect(queuePaymentBadge('awaiting_confirmation').label).toBe('Aguardando pagamento');
  });

  it('serving fecha comanda, sem ações de remoção, e paid vira badge Pago', () => {
    const actions = queueStaffActions({ status: 'serving', paymentStatus: 'paid' });
    expect(actions.primary).toEqual({ id: 'close', label: 'Fechar comanda' });
    expect(actions.tertiary).toEqual([]);
    expect(queuePaymentBadge('paid').label).toBe('Pago');
    expect(queuePaymentBadge('membership').label).toBe('Clube');
    expect(queuePaymentBadge('unpaid').label).toBe('Paga no balcão');
  });
});
