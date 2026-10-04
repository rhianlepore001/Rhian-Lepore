import { describe, expect, it } from 'vitest';
import {
  classifyFinanceDeleteKind,
  financeDeleteConfirmMessage,
  FinanceDeleteError,
  formatFinancePaidAt,
  mapFinanceDeleteError,
  shouldShowFinanceDelete,
} from '@/utils/financeDelete';

describe('shouldShowFinanceDelete', () => {
  it('mostra Excluir só para o dono', () => {
    expect(shouldShowFinanceDelete('owner')).toBe(true);
    expect(shouldShowFinanceDelete('staff')).toBe(false);
    expect(shouldShowFinanceDelete(undefined)).toBe(false);
    expect(shouldShowFinanceDelete(null)).toBe(false);
  });
});

describe('classifyFinanceDeleteKind', () => {
  it('classifica serviço, produto, lançamento e despesa', () => {
    expect(classifyFinanceDeleteKind({ type: 'revenue', description: null })).toBe('appointment');
    expect(classifyFinanceDeleteKind({ type: 'revenue', description: 'Venda de produto: Pomada' })).toBe('product_sale');
    expect(classifyFinanceDeleteKind({ type: 'revenue', description: 'Caixa extra' })).toBe('manual');
    expect(classifyFinanceDeleteKind({ type: 'expense', description: 'Aluguel' })).toBe('expense');
  });

  it('respeita kind explícito da RPC', () => {
    expect(classifyFinanceDeleteKind({ type: 'revenue', description: null, kind: 'product_sale' })).toBe('product_sale');
  });
});

describe('financeDeleteConfirmMessage', () => {
  it('avisa que o atendimento e a comissão saem juntos', () => {
    expect(financeDeleteConfirmMessage({
      deleteKind: 'appointment',
      clientName: 'Maria Silva',
      date: '04/10/2026',
    })).toBe('Isto remove o atendimento de Maria Silva em 04/10/2026 e a comissão dele. Não dá para desfazer.');
  });

  it('deixa claro que o produto não apaga o atendimento', () => {
    expect(financeDeleteConfirmMessage({ deleteKind: 'product_sale' }))
      .toBe('Só o produto sai. O atendimento continua.');
  });

  it('usa confirmação simples no lançamento e na despesa, sem barbearia nem salão', () => {
    expect(financeDeleteConfirmMessage({ deleteKind: 'manual', serviceName: 'Caixa extra' }))
      .toBe('Excluir "Caixa extra"? Não dá para desfazer.');
    expect(financeDeleteConfirmMessage({ deleteKind: 'expense', serviceName: 'Aluguel' }))
      .toBe('Excluir "Aluguel"? Não dá para desfazer.');
    expect(financeDeleteConfirmMessage({ deleteKind: 'manual' })).not.toMatch(/barbearia|salão/i);
    expect(financeDeleteConfirmMessage({ deleteKind: 'appointment', clientName: 'Ana', date: '01/01/2026' }))
      .not.toMatch(/barbearia|salão/i);
  });
});

describe('mapFinanceDeleteError', () => {
  it('explica comissão já paga com nome e data', () => {
    expect(mapFinanceDeleteError(new FinanceDeleteError('commission_already_paid', {
      staffName: 'Diego',
      paidAt: '2026-10-01T15:00:00.000Z',
    }))).toBe('A comissão deste serviço já foi paga a Diego em 01/10/2026, então ele não pode ser excluído.');
  });

  it('aponta pagamento de comissão para Pagamentos > Pagos', () => {
    expect(mapFinanceDeleteError(new FinanceDeleteError('commission_payment_record')))
      .toBe('Pagamentos de comissão são controlados em Pagamentos > Pagos.');
  });

  it('não mostra código técnico em RPC ausente nem em erro genérico', () => {
    const missing = mapFinanceDeleteError({ code: 'PGRST202', message: 'Could not find the function public.delete_finance_transaction' });
    expect(missing).toContain('Não foi possível excluir esta transação');
    expect(missing).not.toMatch(/PGRST|#/);
    const generic = mapFinanceDeleteError({ code: 'XX000', message: 'stack dump' });
    expect(generic).toBe('Não foi possível excluir a transação. Tente de novo.');
    expect(generic).not.toMatch(/PGRST|#|XX000|stack/);
  });

  it('traduz staff e registro ausente sem vazar existência', () => {
    expect(mapFinanceDeleteError({ code: '42501', message: 'Apenas o dono pode excluir transações.' }))
      .toBe('Você não tem permissão para excluir transações.');
    expect(mapFinanceDeleteError(new FinanceDeleteError('not_found')))
      .toBe('Esta transação não foi encontrada. Pode já ter sido excluída.');
  });
});

describe('formatFinancePaidAt', () => {
  it('formata ISO sem deslocar o dia', () => {
    expect(formatFinancePaidAt('2026-10-04T03:00:00.000Z')).toBe('04/10/2026');
  });
});
