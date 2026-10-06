import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StaffOpenAppointmentsModal } from '@/components/settings/StaffOpenAppointmentsModal';
import { getBusinessRemainderNoun } from '@/utils/businessCopy';
import type { OpenAppointment } from '@/utils/staffDelete';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));
vi.mock('@/contexts/UIContext', () => ({
  useUI: () => ({ setModalOpen: () => {} }),
  useOptionalUI: () => ({ setModalOpen: () => {} }),
}));
vi.mock('focus-trap-react', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const NOW = new Date('2026-10-06T09:00:00.000Z');
const apt = (id: string, iso: string, client: string, service = 'Corte', status = 'Confirmed'): OpenAppointment => ({
  id, appointment_time: iso, status, service, duration_minutes: 30, client_name: client,
});
const items = [
  apt('a1', '2026-07-05T10:30:00.000Z', 'Lucas Almeida', 'Sobrancelha', 'Pending'),
  apt('a2', '2026-10-06T13:30:00.000Z', 'Vanessa Lima', 'Pigmentação'),
  apt('a3', '2026-10-07T09:15:00.000Z', 'Bruno Oliveira', 'Corte + Barba'),
  apt('a4', '2026-10-08T09:15:00.000Z', 'Quarto'),
];

function renderModal(props: Partial<React.ComponentProps<typeof StaffOpenAppointmentsModal>> = {}) {
  const handlers = { onClose: vi.fn(), onOpenAppointment: vi.fn(), onOpenAgenda: vi.fn() };
  render(
    <StaffOpenAppointmentsModal
      open
      memberName="Bob Funcionario"
      total={66}
      items={items}
      status="ready"
      timeZone="Europe/Lisbon"
      remainder={getBusinessRemainderNoun('barber')}
      now={NOW}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

describe('StaffOpenAppointmentsModal', () => {
  it('explica, lista no máximo 3 com Atrasado e mostra "e mais X"', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Ainda há atendimentos em aberto' })).toBeInTheDocument();
    expect(screen.getByTestId('staff-open-appointments-lead')).toHaveTextContent('Bob Funcionario ainda tem 66 atendimentos em aberto.');
    expect(screen.getByText('Para excluir, finalize cada um ou passe para outro profissional da barbearia.')).toBeInTheDocument();
    const rows = screen.getAllByTestId('staff-open-appointment-row');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText('Lucas Almeida')).toBeInTheDocument();
    expect(within(rows[0]).getByTestId('staff-open-appointment-late')).toHaveTextContent('Atrasado');
    expect(within(rows[0]).getByText(/05\/07 · 11:30/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Sobrancelha/)).toBeInTheDocument();
    expect(within(rows[1]).queryByTestId('staff-open-appointment-late')).not.toBeInTheDocument();
    expect(within(rows[1]).getByText(/Hoje · 14:30/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/Amanhã · 10:15/)).toBeInTheDocument();
    expect(screen.queryByText('Quarto')).not.toBeInTheDocument();
    expect(screen.getByTestId('staff-open-appointments-more')).toHaveTextContent('e mais 63 atendimentos');
  });

  it('"Ver atendimento" abre o primeiro (mais antigo); cada linha abre o seu; Fechar fecha', async () => {
    const h = renderModal();
    await userEvent.click(screen.getByRole('button', { name: 'Ver atendimento' }));
    expect(h.onOpenAppointment).toHaveBeenCalledWith(items[0]);
    await userEvent.click(screen.getAllByTestId('staff-open-appointment-row')[2]);
    expect(h.onOpenAppointment).toHaveBeenLastCalledWith(items[2]);
    await userEvent.click(screen.getByTestId('staff-open-appointments-close'));
    expect(h.onClose).toHaveBeenCalled();
  });

  it('sem "e mais" quando cabe tudo; singular', () => {
    renderModal({ total: 1, items: [items[1]], memberName: 'Aline' });
    expect(screen.getByTestId('staff-open-appointments-lead')).toHaveTextContent('Aline ainda tem 1 atendimento em aberto.');
    expect(screen.queryByTestId('staff-open-appointments-more')).not.toBeInTheDocument();
  });

  it('carregando: esqueleto e botão ocupado', () => {
    renderModal({ status: 'loading', items: [], total: 4 });
    expect(screen.getByTestId('staff-open-appointments-loading')).toBeInTheDocument();
    expect(screen.getByTestId('staff-open-appointments-view')).toBeDisabled();
    expect(screen.getByTestId('staff-open-appointments-lead')).toHaveTextContent('4 atendimentos em aberto');
  });

  it('lista falhou: mantém a explicação e oferece abrir a agenda', async () => {
    const h = renderModal({ status: 'error', items: [], total: 2 });
    expect(screen.getByTestId('staff-open-appointments-error')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir agenda' }));
    expect(h.onOpenAgenda).toHaveBeenCalled();
  });

  it.each([
    ['beauty', 'do salão'],
    ['tattoo', 'do estúdio'],
    [null, 'do negócio'],
  ])('texto do negócio vem do helper (%s)', (userType, label) => {
    renderModal({ remainder: getBusinessRemainderNoun(userType) });
    expect(screen.getByText(`Para excluir, finalize cada um ou passe para outro profissional ${label}.`)).toBeInTheDocument();
  });
});
