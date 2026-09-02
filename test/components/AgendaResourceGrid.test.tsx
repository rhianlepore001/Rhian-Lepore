import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AgendaResourceGrid,
  type AgendaGridAppointment,
  type AgendaGridMember,
} from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const members: AgendaGridMember[] = [
  { id: 'm1', name: 'Mario Silva' },
  { id: 'm2', name: 'Rhian' },
];

const timeSlots = ['08:00', '08:30'];

const baseAppointments: AgendaGridAppointment[] = [
  {
    id: 'a1',
    clientName: 'Cliente Assinado',
    service: 'Corte',
    appointment_time: '2026-01-05T08:00:00',
    price: 50,
    status: 'confirmed',
    professional_id: 'm1',
  },
  {
    id: 'a2',
    clientName: 'Cliente Livre',
    service: 'Barba',
    appointment_time: '2026-01-05T08:30:00',
    price: 30,
    status: 'pending',
    professional_id: null,
  },
];

function setup(overrides?: Partial<React.ComponentProps<typeof AgendaResourceGrid>>) {
  const onSelectAppointment = vi.fn();
  const onEmptySlotClick = vi.fn();
  const onSelectAll = vi.fn();
  const onToggleProfessional = vi.fn();
  const props: React.ComponentProps<typeof AgendaResourceGrid> = {
    members,
    appointments: baseAppointments,
    timeSlots,
    showUnassigned: true,
    currencyRegion: 'BR',
    selectedProfessionalIds: [],
    selfMemberId: 'm1',
    onSelectAll,
    onToggleProfessional,
    onSelectAppointment,
    onEmptySlotClick,
    ...overrides,
  };
  const utils = render(<AgendaResourceGrid {...props} />);
  return { ...utils, onSelectAppointment, onEmptySlotClick, onSelectAll, onToggleProfessional };
}

describe('AgendaResourceGrid', () => {
  it('renderiza a grade e uma coluna por colaborador', () => {
    setup();
    expect(screen.getByTestId('agenda-resource-grid')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-col-m1')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-col-m2')).toBeInTheDocument();
  });

  it('mostra o primeiro nome de cada colaborador no cabeçalho', () => {
    setup();
    expect(screen.getByTestId('agenda-filter-all')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Horário')).toBeNull();
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.getByText('Rhian')).toBeInTheDocument();
    expect(screen.getByText('MS')).toBeInTheDocument();
  });

  it('clique em Todos e no colaborador dispara o filtro do cabeçalho', async () => {
    const { onSelectAll, onToggleProfessional } = setup({ selectedProfessionalIds: ['m1'] });
    await userEvent.click(screen.getByTestId('agenda-filter-all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('agenda-filter-m2'));
    expect(onToggleProfessional).toHaveBeenCalledWith('m2');
  });

  it('clique em slot vazio dispara onEmptySlotClick com profissional + horário', async () => {
    const { onEmptySlotClick } = setup();
    const button = screen.getByRole('button', { name: /08:00.*Rhian/ });
    expect(button.className).toMatch(/\binset-0\b/);
    await userEvent.click(button);
    expect(onEmptySlotClick).toHaveBeenCalledWith('m2', '08:00');
  });

  it('clique no card de agendamento dispara onSelectAppointment', async () => {
    const { onSelectAppointment } = setup();
    const card = screen.getByRole('button', { name: /Cliente Assinado/ });
    await userEvent.click(card);
    expect(onSelectAppointment).toHaveBeenCalledTimes(1);
    expect(onSelectAppointment.mock.calls[0][0]).toMatchObject({ id: 'a1' });
  });

  it('mostra agendamento não atribuído na primeira coluna quando showUnassigned', () => {
    setup({ showUnassigned: true });
    expect(screen.getByText('Cliente Livre')).toBeInTheDocument();
    expect(screen.getAllByText('Não atribuído').length).toBeGreaterThan(0);
  });

  it('mostra hint de dia vazio quando não há agendamentos', () => {
    setup({ appointments: [], showUnassigned: false });
    expect(screen.getByText(/Nenhum agendamento neste dia/)).toBeInTheDocument();
  });

  it('não usa classes hidden / md:hidden na raiz', () => {
    setup();
    const root = screen.getByTestId('agenda-resource-grid');
    expect(root.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(root.className).not.toMatch(/md:hidden/);
  });
});
