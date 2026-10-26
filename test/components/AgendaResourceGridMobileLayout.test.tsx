import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AgendaResourceGrid,
  compactClientName,
  compactServiceName,
  type AgendaGridMember,
} from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'beauty' }) }));

const members: AgendaGridMember[] = [
  { id: 'b', name: 'Beatriz Souza' },
  { id: 'c', name: 'Camila Rocha' },
  { id: 'a', name: 'Ana Lima' },
  { id: 'j', name: 'Júlia Melo' },
];

function setup(overrides?: Partial<React.ComponentProps<typeof AgendaResourceGrid>>) {
  const onToggleProfessional = vi.fn();
  render(
    <AgendaResourceGrid
      members={members}
      allMembers={members}
      appointments={[
        {
          id: 'x1',
          professional_id: 'c',
          clientName: 'Joana Alves',
          service: 'Hidratação profunda',
          appointment_time: '2026-10-26T13:30:00',
          duration_minutes: 30,
          price: 80,
          status: 'Confirmed',
        } as never,
      ]}
      timeSlots={['13:00', '13:30', '14:00']}
      showUnassigned={false}
      currencyRegion="BR"
      selectedProfessionalIds={[]}
      onSelectAll={vi.fn()}
      onToggleProfessional={onToggleProfessional}
      onSelectAppointment={vi.fn()}
      onEmptySlotClick={vi.fn()}
      {...overrides}
    />,
  );
  return { onToggleProfessional };
}

describe('AgendaResourceGrid: layout compacto no celular (4 colunas)', () => {
  it('colunas flex-1 com mínimo de 86px no celular e 176px a partir de md', () => {
    setup();
    const col = screen.getByTestId('agenda-col-c');
    expect(col.className).toContain('min-w-[86px]');
    expect(col.className).toContain('flex-1');
    expect(col.className).toContain('md:min-w-[176px]');
    expect(col.className).not.toContain('min-w-[152px]');
  });

  it('gutter 36px, meia hora 40px no celular (desktop mantém 48px/56px)', () => {
    setup();
    const gutter = document.querySelector('[data-agenda-gutter="true"]')!;
    expect(gutter.className).toContain('w-9');
    expect(gutter.className).toContain('md:w-12');
    const slot = document.querySelector('[data-agenda-slot="13:00"]')!;
    expect(slot.className).toContain('h-10');
    expect(slot.className).toContain('md:h-14');
  });

  it('card compacto: primeiro nome + inicial e serviço abreviado (só no celular)', () => {
    setup();
    expect(screen.getByTestId('agenda-card-client-compact')).toHaveTextContent('Joana A.');
    expect(screen.getByTestId('agenda-card-service-compact')).toHaveTextContent('Hidrat.');
  });

  it('grade encosta a 4px da borda via token de densidade', () => {
    setup();
    expect(screen.getByTestId('agenda-grid-root').className).toMatch(/-mx-(2|3) md:mx-0/);
  });

  it('“Mais” vira botão no cabeçalho no celular (coluna fica só a partir de md) e abre o mesmo menu', async () => {
    const { onToggleProfessional } = setup({ members: members.slice(0, 2), selectedProfessionalIds: ['b', 'c'] });
    expect(screen.getByTestId('agenda-col-add').className).toContain('hidden md:flex');
    const btn = screen.getByTestId('agenda-filter-add-mobile');
    expect(btn.parentElement!.className).toContain('md:hidden');
    expect(btn.className).toContain('min-h-[40px]');
    await userEvent.click(btn);
    await userEvent.click(screen.getByTestId('agenda-add-a'));
    expect(onToggleProfessional).toHaveBeenCalledWith('a');
  });
});

describe('compactClientName / compactServiceName', () => {
  it('abrevia', () => {
    expect(compactClientName('Joana Alves')).toBe('Joana A.');
    expect(compactClientName('Maria')).toBe('Maria');
    expect(compactServiceName('Hidratação')).toBe('Hidrat.');
    expect(compactServiceName('Corte feminino')).toBe('Corte');
  });
});
