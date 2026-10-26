import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaResourceGrid, type AgendaGridMember } from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

const members: AgendaGridMember[] = [
  { id: 'm1', name: 'Antonio Barros' },
  { id: 'm2', name: 'Boiola' },
  { id: 'm3', name: 'Carla Dias' },
];

function setup(overrides?: Partial<React.ComponentProps<typeof AgendaResourceGrid>>) {
  const onSelectAll = vi.fn();
  const onToggleProfessional = vi.fn();
  const onEmptySlotClick = vi.fn();
  render(
    <AgendaResourceGrid
      members={members}
      allMembers={members}
      appointments={[]}
      timeSlots={['08:00', '08:30', '09:00']}
      showUnassigned={false}
      currencyRegion="BR"
      selectedProfessionalIds={[]}
      onSelectAll={onSelectAll}
      onToggleProfessional={onToggleProfessional}
      onSelectAppointment={vi.fn()}
      onEmptySlotClick={onEmptySlotClick}
      {...overrides}
    />,
  );
  return { onSelectAll, onToggleProfessional, onEmptySlotClick };
}

describe('AgendaResourceGrid: cabeçalho dos profissionais fixo', () => {
  it('Todos + cards ficam num cabeçalho sticky abaixo da barra do app, com fundo sólido', () => {
    setup();
    const header = screen.getByTestId('agenda-grid-header');
    expect(header.className).toMatch(/(^|\s)sticky(\s|$)/);
    expect(header.className).toContain('top-[calc(var(--header-top,0px)+3.5rem)]');
    expect(header.className).toContain('md:top-[calc(var(--header-top,0px)+5rem)]');
    expect(header.className).toMatch(/bg-|\bcard\b/);
    expect(header).toContainElement(screen.getByTestId('agenda-filter-all'));
    for (const m of members) expect(header).toContainElement(screen.getByTestId(`agenda-filter-${m.id}`));
  });

  it('o cabeçalho fica fora do scroller horizontal (senão o sticky vertical não funciona)', () => {
    setup();
    const scroller = screen.getByTestId('agenda-resource-grid');
    expect(scroller).not.toContainElement(screen.getByTestId('agenda-grid-header'));
    // nenhum ancestral com overflow hidden/auto entre o header e a página
    let el = screen.getByTestId('agenda-grid-header').parentElement;
    while (el && el !== document.body) {
      expect(el.className).not.toMatch(/(^|\s)overflow-(hidden|auto|scroll)(\s|$)/);
      el = el.parentElement;
    }
  });

  it('scroll horizontal da grade move o cabeçalho junto', () => {
    setup();
    const scroller = screen.getByTestId('agenda-resource-grid');
    const viewport = screen.getByTestId('agenda-grid-header-viewport');
    scroller.scrollLeft = 140;
    fireEvent.scroll(scroller);
    expect(viewport.scrollLeft).toBe(140);
  });

  it('cards compactos: cabeçalho de 3.25rem, avatar 22px no celular, 7×7 a partir de md', () => {
    setup();
    const header = screen.getByTestId('agenda-grid-header');
    expect(header.innerHTML).toContain('h-[3.25rem]');
    expect(header.innerHTML).not.toContain('h-[4.25rem]');
    const avatar = screen.getByTestId('agenda-filter-m1').querySelector('span') as HTMLElement;
    expect(avatar.className).toMatch(/(^|\s)w-\[22px\] h-\[22px\] md:w-7 md:h-7(\s|$)/);
  });

  it('toques continuam: Todos, profissional e slot', async () => {
    const { onSelectAll, onToggleProfessional, onEmptySlotClick } = setup();
    await userEvent.click(screen.getByTestId('agenda-filter-all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('agenda-filter-m2'));
    expect(onToggleProfessional).toHaveBeenCalledWith('m2');
    await userEvent.click(screen.getByRole('button', { name: /08:00.*Boiola/ }));
    expect(onEmptySlotClick).toHaveBeenCalledWith('m2', '08:00');
  });

  it('colunas do cabeçalho e da grade usam a mesma largura (alinhamento)', () => {
    setup();
    for (const m of members) {
      const head = screen.getByTestId(`agenda-head-${m.id}`);
      const col = screen.getByTestId(`agenda-col-${m.id}`);
      for (const cls of ['shrink-0', 'min-w-[86px]', 'md:min-w-[176px]', 'flex-1', 'border-l']) {
        expect(head.className).toContain(cls);
        expect(col.className).toContain(cls);
      }
    }
  });

  it('com filtro: botão Mais no cabeçalho abre o menu fora do viewport recortado', async () => {
    const { onToggleProfessional } = setup({ members: [members[0]], selectedProfessionalIds: ['m1'] });
    const header = screen.getByTestId('agenda-grid-header');
    expect(header).toContainElement(screen.getByTestId('agenda-filter-add'));
    await userEvent.click(screen.getByTestId('agenda-filter-add'));
    const menu = screen.getByTestId('agenda-add-menu');
    expect(screen.getByTestId('agenda-grid-header-viewport')).not.toContainElement(menu);
    await userEvent.click(screen.getByTestId('agenda-add-m2'));
    expect(onToggleProfessional).toHaveBeenCalledWith('m2');
  });
});
