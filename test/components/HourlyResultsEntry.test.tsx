import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HourlyResultsEntry } from '@/components/performance/HourlyResultsEntry';

vi.mock('@/hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textSecondary: '', border: '', card: '' },
    accent: { bgDim: '', text: '' },
    radius: { card: '' },
  }),
}));
vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    colors: { text: '', textSecondary: '', border: '', card: '' },
    accent: { bgDim: '', text: '' },
    radius: { card: '' },
  }),
}));

describe('HourlyResultsEntry', () => {
  it('link para resultados por hora sem mostrar dinheiro', () => {
    const { container } = render(
      <MemoryRouter>
        <HourlyResultsEntry to="/resultados-por-hora?de=2026-11-01" subtitle="Veja quanto cada hora rendeu no período" />
      </MemoryRouter>,
    );
    const link = screen.getByTestId('hourly-results-entry');
    expect(link).toHaveAttribute('href', '/resultados-por-hora?de=2026-11-01');
    expect(screen.getByRole('heading', { name: 'Resultados por hora' })).toBeInTheDocument();
    expect(screen.getByText('Veja quanto cada hora rendeu no período')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver resultados/i })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/R\$\s*0[,.]00/);
  });

  it('mostra Período quando period é passado', () => {
    render(
      <MemoryRouter>
        <HourlyResultsEntry to="/resultados-por-hora" subtitle="Resumo" period="01/11/2026 — 30/11/2026" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Período:\s*01\/11\/2026 — 30\/11\/2026/)).toBeInTheDocument();
  });
});