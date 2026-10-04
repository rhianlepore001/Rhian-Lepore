import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PayoutList, payoutRowKind, type PayoutRowData } from '../../components/commissions/PayoutList';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const base = (over: Partial<PayoutRowData>): PayoutRowData => ({
  professional_id: 'x', professional_name: 'X', photo_url: null, commission_rate: 40,
  total_due: 0, services_pending: 0, products_pending: 0, ...over,
});
const cyc = (status: 'pendente' | 'pago' | 'pago_com_ajuste' | 'nada_a_pagar', over: Record<string, unknown> = {}) => ({
  status, saldo_acumulado: 0, saldo_anterior: 0, inactive: false, pago_ciclo: null, pago_calculado: 0,
  paid_at: null, primeiro_nao_pago: null, ...over,
});

const rows: PayoutRowData[] = [
  base({ professional_id: 'ana', professional_name: 'Ana Souza', total_due: 39, services_pending: 2, cycle: cyc('pendente') }),
  base({ professional_id: 'bob', professional_name: 'Bob Funcionario', cycle: cyc('nada_a_pagar') }),
  base({ professional_id: 'carla', professional_name: 'Carla Dias', cycle: cyc('pago', { pago_ciclo: 120, paid_at: '2026-10-02T10:00:00+01:00' }) }),
  base({ professional_id: 'marcos', professional_name: 'Marcos Silva', cycle: cyc('nada_a_pagar') }),
];

const mount = (r = rows, settled?: Set<string>) => render(
  <MemoryRouter>
    <PayoutList
      rows={r}
      theme="barber"
      formatMoney={(v) => `${v.toFixed(2).replace('.', ',')} €`}
      payingId={null}
      settledIds={settled}
      onPay={vi.fn()}
      analysisHref={(x) => `/financeiro/performance?pro=${x.professional_id}`}
      historyHref="/financeiro/performance?de=2026-09-06&ate=2026-10-05"
      periodLabel="Período 06/09 – 05/10"
      onOpenReport={vi.fn()}
      onOpenHistory={vi.fn()}
    />
  </MemoryRouter>,
);

describe('PayoutList (PR-F #10)', () => {
  it('cartão só para quem tem valor: nome, valor, período e Pagar', () => {
    mount();
    const ana = screen.getByTestId('payout-row-ana');
    expect(ana).toHaveTextContent('Ana Souza');
    expect(ana).toHaveTextContent('39,00 €');
    expect(ana).toHaveTextContent('Período 06/09 – 05/10');
    expect(within(ana).getByRole('button', { name: 'Pagar Ana Souza' })).toBeEnabled();
    expect(screen.queryByTestId('payout-row-bob')).toBeNull();
    expect(screen.queryByRole('button', { name: /Nada a pagar/ })).toBeNull();
  });

  it('quem não tem valor vai para uma frase simples', () => {
    mount();
    expect(screen.getByTestId('payout-nothing-due')).toHaveTextContent('Nada a pagar neste período: Bob Funcionario, Marcos Silva.');
  });

  it('nomes em "Nada a pagar" continuam abrindo o histórico de pagamentos', () => {
    const onOpenHistory = vi.fn();
    render(
      <MemoryRouter>
        <PayoutList rows={rows} theme="barber" formatMoney={(v) => `${v}`} payingId={null} onPay={vi.fn()}
          analysisHref={() => '/x'} historyHref="/h" periodLabel="P" onOpenReport={vi.fn()} onOpenHistory={onOpenHistory} />
      </MemoryRouter>,
    );
    const p = screen.getByTestId('payout-nothing-due');
    within(p).getByRole('button', { name: 'Histórico de pagamentos de Marcos Silva' }).click();
    expect(onOpenHistory).toHaveBeenCalledWith(expect.objectContaining({ professional_id: 'marcos' }));
    expect(within(p).getAllByRole('button')).toHaveLength(2);
  });

  it('pagos no período ficam numa lista compacta com a data', () => {
    mount();
    const carla = screen.getByTestId('payout-paid-carla');
    expect(carla).toHaveTextContent('Carla Dias');
    expect(carla).toHaveTextContent('Pago em 02/10');
    expect(carla).toHaveTextContent('120,00 € pagos');
  });

  it('um único link "Ver histórico e análise" no topo, com as datas do ciclo', () => {
    mount();
    const links = screen.getAllByRole('link', { name: 'Ver histórico e análise' });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/financeiro/performance?de=2026-09-06&ate=2026-10-05');
  });

  it('pago nesta sessão sai do cartão e aparece como pago', () => {
    mount(rows, new Set(['ana']));
    expect(screen.queryByTestId('payout-row-ana')).toBeNull();
    expect(screen.getByTestId('payout-paid-ana')).toHaveTextContent('Pago agora');
  });

  it('classificação', () => {
    expect(payoutRowKind(rows[0], false)).toBe('due');
    expect(payoutRowKind(rows[1], false)).toBe('nothing');
    expect(payoutRowKind(rows[2], false)).toBe('paid');
    expect(payoutRowKind(base({ cycle: cyc('nada_a_pagar', { saldo_anterior: 15 }) }), false)).toBe('due');
  });
});
