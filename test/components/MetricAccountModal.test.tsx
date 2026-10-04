import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MetricAccountModal } from '../../components/performance/MetricAccountModal';
import { getBusinessRemainderNoun } from '../../utils/businessCopy';
import { buildMetricAccount } from '../../utils/staffPerformanceAccount';
import { ownerPerformanceSchema } from '../../types/staffPerformance';
import team from '../fixtures/staffPerformance/team.json';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const brl = (v: number) =>
  `R$ ${Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
const data = ownerPerformanceSchema.parse(team);
const ana = data.members.find((m) => m.name === 'Ana')!;

describe('MetricAccountModal', () => {
  it('dialog com título, conta, significado, comparação e Fechar', async () => {
    const onClose = vi.fn();
    const account = buildMetricAccount('voltou', ana.metrics, {
      formatMoney: brl,
      remainder: getBusinessRemainderNoun('barber'),
      personName: 'Ana',
      voice: 'member',
      previous: ana.previous,
      previousName: 'agosto',
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });
    render(<MetricAccountModal account={account} onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /Saíram com horário marcado · setembro/ })).toBeInTheDocument();
    expect(screen.getByText('O que isso quer dizer')).toBeInTheDocument();
    expect(screen.getByText(/em até 2 dias/)).toBeInTheDocument();
    expect(screen.getByText('Subiu de 50% para 55%.')).toBeInTheDocument();
    expect(screen.getByText('6 clientes marcaram de novo')).toBeInTheDocument();
    expect(screen.getByText(/÷ 11 clientes atendidos/)).toBeInTheDocument();
    expect(screen.getByText('Ainda esperando: atendidos há menos de 2 dias')).toBeInTheDocument();
    const closeButtons = screen.getAllByRole('button', { name: 'Fechar' });
    expect(closeButtons[0].className).toMatch(/h-11/);
    expect(closeButtons[0].className).toMatch(/w-11/);
    expect(closeButtons[0].className).toMatch(/min-h-\[44px\]/);
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });
});
