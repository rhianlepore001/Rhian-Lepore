import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import {
  useFocusCreatedAppointment,
  ensureProfessionalVisible,
  FOCUS_HIGHLIGHT_MS,
  type CreatedAppointmentTarget,
} from '../../hooks/useFocusCreatedAppointment';

type Apt = { id: string; professional_id: string | null };

function Harness({ appointments, target, onHighlight }: { appointments: Apt[]; target: CreatedAppointmentTarget | null; onHighlight: (id: string | null) => void }) {
  const { highlightId, focusCreated } = useFocusCreatedAppointment(appointments);
  React.useEffect(() => { if (target) focusCreated(target); }, [target, focusCreated]);
  React.useEffect(() => { onHighlight(highlightId); }, [highlightId, onHighlight]);
  return (
    <div>
      {appointments.map((a) => <button key={a.id} data-appointment-id={a.id}>{a.id}</button>)}
      <div data-testid="agenda-col-pro-1"><div data-agenda-slot="18:30">slot</div></div>
    </div>
  );
}

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: reduce && q.includes('prefers-reduced-motion'), media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), onchange: null, dispatchEvent: vi.fn(),
  }));
};

describe('useFocusCreatedAppointment', () => {
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
    setReducedMotion(false);
  });
  afterEach(() => { vi.useRealTimers(); });

  it('espera o agendamento aparecer (refetch), rola até o card centralizado e destaca por ~2s', () => {
    const onHighlight = vi.fn();
    const target = { id: 'new-1', professionalId: 'pro-1', time: '18:30' };
    const { rerender } = render(<Harness appointments={[{ id: 'old', professional_id: 'pro-1' }]} target={target} onHighlight={onHighlight} />);
    act(() => { vi.advanceTimersByTime(50); });
    // ainda não chegou no refetch: não rola para nada antigo
    expect(scrollIntoView).not.toHaveBeenCalled();
    rerender(<Harness appointments={[{ id: 'old', professional_id: 'pro-1' }, { id: 'new-1', professional_id: 'pro-1' }]} target={target} onHighlight={onHighlight} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('data-appointment-id', 'new-1');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'smooth' });
    expect(onHighlight).toHaveBeenLastCalledWith('new-1');
    act(() => { vi.advanceTimersByTime(FOCUS_HIGHLIGHT_MS + 10); });
    expect(onHighlight).toHaveBeenLastCalledWith(null);
    expect(FOCUS_HIGHLIGHT_MS).toBeGreaterThanOrEqual(1800);
    expect(FOCUS_HIGHLIGHT_MS).toBeLessThanOrEqual(2500);
  });

  it('prefers-reduced-motion: rolagem instantânea (auto)', () => {
    setReducedMotion(true);
    const target = { id: 'new-1', professionalId: 'pro-1', time: '18:30' };
    render(<Harness appointments={[{ id: 'new-1', professional_id: 'pro-1' }]} target={target} onHighlight={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'center', behavior: 'auto' });
  });

  it('sem booking_id: cai no slot do profissional/horário', () => {
    const target = { professionalId: 'pro-1', time: '18:30' };
    render(<Harness appointments={[{ id: 'x', professional_id: 'pro-1' }]} target={target} onHighlight={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toHaveAttribute('data-agenda-slot', '18:30');
  });

  it('desiste sem erro se o card nunca aparecer (ex.: refetch falhou) e limpa timers ao desmontar', () => {
    const target = { id: 'nunca', professionalId: 'pro-9', time: '07:00' };
    const { unmount } = render(<Harness appointments={[]} target={target} onHighlight={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(10_000); });
    expect(scrollIntoView).not.toHaveBeenCalled();
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('ensureProfessionalVisible', () => {
  it('sem filtro (todos) não muda nada', () => {
    const ids: string[] = [];
    expect(ensureProfessionalVisible(ids, 'pro-2')).toBe(ids);
  });
  it('filtro que já inclui o profissional não muda nada', () => {
    const ids = ['pro-1', 'pro-2'];
    expect(ensureProfessionalVisible(ids, 'pro-2')).toBe(ids);
  });
  it('filtro que esconde o profissional: adiciona, mantendo os outros', () => {
    expect(ensureProfessionalVisible(['pro-1'], 'pro-2')).toEqual(['pro-1', 'pro-2']);
  });
  it('agendamento sem profissional: não muda', () => {
    const ids = ['pro-1'];
    expect(ensureProfessionalVisible(ids, null)).toBe(ids);
  });
});
