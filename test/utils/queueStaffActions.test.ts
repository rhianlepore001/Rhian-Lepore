import { describe, expect, it } from 'vitest';
import { queuePaymentBadge, queueStaffActions } from '@/utils/queueStaffActions';

describe('queueStaffActions', () => {
  it('waiting: iniciar atendimento é primário e chamar é secundário', () => {
    const actions = queueStaffActions({ status: 'waiting', paymentStatus: 'unpaid' });
    expect(actions.primary).toEqual({ id: 'start', label: 'Iniciar atendimento' });
    expect(actions.secondary).toEqual({ id: 'call', label: 'Chamar cliente' });
    expect(actions.showConfirmPay).toBe(false);
  });

  it('Pix pendente mostra confirmar e cancelar', () => {
    const actions = queueStaffActions({
      status: 'waiting',
      paymentStatus: 'awaiting_confirmation',
    });
    expect(actions.showConfirmPay).toBe(true);
    expect(actions.showCancelPay).toBe(true);
    expect(queuePaymentBadge('awaiting_confirmation').label).toBe(
      'Aguardando confirmação e pagamento',
    );
  });

  it('serving fecha comanda e paid vira badge Pago', () => {
    const actions = queueStaffActions({ status: 'serving', paymentStatus: 'paid' });
    expect(actions.primary).toEqual({ id: 'close', label: 'Fechar comanda' });
    expect(queuePaymentBadge('paid').label).toBe('Pago');
    expect(queuePaymentBadge('membership').label).toBe('Clube');
  });
});
