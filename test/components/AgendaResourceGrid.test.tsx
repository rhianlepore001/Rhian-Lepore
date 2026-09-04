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
    allMembers: members,
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
    const { onSelectAll, onToggleProfessional } = setup({
      members: [members[0]],
      selectedProfessionalIds: ['m1'],
    });
    await userEvent.click(screen.getByTestId('agenda-filter-all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('agenda-filter-m1'));
    expect(onToggleProfessional).toHaveBeenCalledWith('m1');
  });

  it('com filtro ativo mostra só a coluna selecionada e ação Adicionar', async () => {
    const { onToggleProfessional } = setup({
      members: [members[0]],
      selectedProfessionalIds: ['m1'],
      showUnassigned: false,
    });
    expect(screen.getByTestId('agenda-col-m1')).toBeInTheDocument();
    expect(screen.queryByTestId('agenda-col-m2')).toBeNull();
    expect(screen.getByTestId('agenda-col-add')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('agenda-filter-add'));
    expect(screen.getByTestId('agenda-add-menu')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('agenda-add-m2'));
    expect(onToggleProfessional).toHaveBeenCalledWith('m2');
  });

  it('expõe scroll-padding alinhado ao gutter', () => {
    setup();
    const root = screen.getByTestId('agenda-resource-grid');
    expect(root).toHaveStyle({ scrollPaddingLeft: '4rem' });
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

  it('não limita a altura da grade com max-h', () => {
    setup();
    const root = screen.getByTestId('agenda-resource-grid');
    expect(root.className).not.toMatch(/max-h-/);
  });

  it('rola só na horizontal — a altura segue os horários', () => {
    setup();
    const root = screen.getByTestId('agenda-resource-grid');
    expect(root.className).toMatch(/overflow-x-auto/);
    expect(root.className).not.toMatch(/(^|\s)overflow-auto(\s|$)/);
    expect(root.className).not.toMatch(/overflow-y-auto/);
    expect(root.className).not.toMatch(/flex-1/);
    expect(root.className).not.toMatch(/min-h-0/);
    expect(root.className).not.toMatch(/overscroll-contain/);
  });

  it('não usa classes hidden / md:hidden na raiz', () => {
    setup();
    const root = screen.getByTestId('agenda-resource-grid');
    expect(root.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(root.className).not.toMatch(/md:hidden/);
  });
});
