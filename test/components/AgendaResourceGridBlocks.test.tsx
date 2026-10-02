import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaResourceGrid, type AgendaGridBlock } from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

const members = [
  { id: 'm1', name: 'Mario Silva' },
  { id: 'm2', name: 'Rhian' },
];

const block: AgendaGridBlock = {
  id: 'blk-1',
  professional_id: 'm1',
  starts_at: '2026-01-05T08:00:00',
  ends_at: '2026-01-05T09:00:00',
};

function setup(overrides?: Partial<React.ComponentProps<typeof AgendaResourceGrid>>) {
  const onSelectBlock = vi.fn();
  const onEmptySlotClick = vi.fn();
  const props: React.ComponentProps<typeof AgendaResourceGrid> = {
    members,
    allMembers: members,
    appointments: [],
    timeSlots: ['08:00', '08:30', '09:00'],
    dateStr: '2026-01-05',
    showUnassigned: false,
    currencyRegion: 'BR',
    selectedProfessionalIds: [],
    selfMemberId: 'm1',
    onSelectAll: vi.fn(),
    onToggleProfessional: vi.fn(),
    onSelectAppointment: vi.fn(),
    onEmptySlotClick,
    blocks: [block],
    onSelectBlock,
    blockCaption: () => 'Bloqueado',
    ...overrides,
  };
  const utils = render(<AgendaResourceGrid {...props} />);
  return { ...utils, onSelectBlock, onEmptySlotClick };
}

describe('AgendaResourceGrid — faixa de bloqueio', () => {
  it('desenha faixa cinza distinta de off-hours, com rótulo Bloqueado', () => {
    setup();
    const band = screen.getByTestId('agenda-block-band');
    expect(band).toHaveTextContent('Bloqueado');
    expect(band.className).toMatch(/agenda-block-band/);
    expect(band.className).not.toMatch(/agenda-slot-off-hours/);
  });

  it('esconde o + nos slots cobertos pelo bloqueio', () => {
    setup();
    expect(screen.queryByRole('button', { name: /08:00.*Mario/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /08:30.*Mario/ })).toBeNull();
    expect(screen.getByRole('button', { name: /09:00.*Mario/ })).toBeInTheDocument();
  });

  it('clique na faixa dispara onSelectBlock', async () => {
    const { onSelectBlock } = setup();
    await userEvent.click(screen.getByTestId('agenda-block-band'));
    expect(onSelectBlock).toHaveBeenCalledWith(expect.objectContaining({ id: 'blk-1' }));
  });

  it('staff sem permissão vê Agenda bloqueada no rótulo', () => {
    setup({ blockCaption: () => 'Agenda bloqueada' });
    expect(screen.getByTestId('agenda-block-band')).toHaveTextContent('Agenda bloqueada');
  });
});
