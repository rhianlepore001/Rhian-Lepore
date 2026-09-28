import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { AgendaResourceGrid } from '../../components/agenda/AgendaResourceGrid';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ colors: { border: '', surface: '', card: '', divider: '', text: '', textMuted: '', textSecondary: '' }, accent: { bg: '', text: '', border: '' } }),
}));

const at = (h: number, m = 0) => new Date(2026, 8, 28, h, m).toISOString();
const apts = [
  { id: 'a-old', clientName: 'Rui', service: 'Corte', appointment_time: at(9), price: 40, status: 'Confirmed', professional_id: 'p1', duration_minutes: 30 },
  { id: 'a-new', clientName: 'Nova', service: 'Barba', appointment_time: at(18, 30), price: 20, status: 'Confirmed', professional_id: 'p1', duration_minutes: 30 },
];
const slots = Array.from({ length: 36 }, (_, i) => `${String(6 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);

describe('AgendaResourceGrid: destaque do agendamento recém-criado', () => {
  it('cards expõem data-appointment-id e só o novo recebe data-highlight + classe de destaque', () => {
    render(
      <AgendaResourceGrid
        members={[{ id: 'p1', name: 'Bob' }]} allMembers={[{ id: 'p1', name: 'Bob' }]} appointments={apts as never}
        timeSlots={slots} showUnassigned={false} currencyRegion="BR" selectedProfessionalIds={[]}
        onSelectAll={vi.fn()} onToggleProfessional={vi.fn()} onSelectAppointment={vi.fn()} onEmptySlotClick={vi.fn()}
        highlightAppointmentId="a-new"
      />,
    );
    const fresh = screen.getByRole('button', { name: /Nova — Barba às 18:30/ });
    const old = screen.getByRole('button', { name: /Rui — Corte às 09:00/ });
    expect(fresh).toHaveAttribute('data-appointment-id', 'a-new');
    expect(old).toHaveAttribute('data-appointment-id', 'a-old');
    expect(fresh).toHaveAttribute('data-highlight', 'true');
    expect(fresh.className).toMatch(/agenda-card-highlight/);
    expect(old).not.toHaveAttribute('data-highlight');
    expect(old.className).not.toMatch(/agenda-card-highlight/);
  });

  it('CSS: destaque com pulso sutil e sem animação em prefers-reduced-motion', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../../styles/tailwind.css'), 'utf8');
    expect(css).toMatch(/\.agenda-card-highlight\s*\{[^}]*outline/);
    expect(css).toMatch(/@keyframes agenda-card-pulse/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{[^@]*\.agenda-card-highlight\s*\{[^}]*animation:\s*none/);
  });
});
