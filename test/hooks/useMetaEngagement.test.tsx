import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMetaLandingEngagement, useMetaOnboardingStep, useMetaRegistrationStart } from '@/hooks/useMetaEngagement';
import { metaTracker } from '@/lib/metaTracking';

vi.mock('@/lib/metaTracking', () => ({
  metaTracker: {
    viewContent: vi.fn(() => true), landingEngagement: vi.fn(() => true),
    startRegistration: vi.fn(() => true), onboardingStep: vi.fn(() => true),
  },
}));

const accept = () => localStorage.setItem('agendix:marketing-consent:v1', JSON.stringify({
  choice: 'accepted', version: 1, savedAt: Date.now(),
}));

describe('useMetaLandingEngagement', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it('does nothing without consent or without a chosen niche', () => {
    renderHook(() => useMetaLandingEngagement('barber'));
    renderHook(() => { accept(); useMetaLandingEngagement(null); });
    act(() => { vi.advanceTimersByTime(40_000); window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.viewContent).not.toHaveBeenCalled();
  });

  it('sends ViewContent for the niche and TimeOnPage30s after 30 visible seconds, only once', () => {
    accept();
    renderHook(() => useMetaLandingEngagement('beauty'));
    expect(metaTracker.viewContent).toHaveBeenCalledWith('beauty');
    act(() => { vi.advanceTimersByTime(29_000); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('TimeOnPage30s', 'beauty');
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledTimes(1);
  });

  it('does not count time while the tab is hidden', () => {
    accept();
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderHook(() => useMetaLandingEngagement('beauty'));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    state.mockRestore();
  });

  it('sends Scroll75 only when the page is scrollable and 75% was reached', () => {
    accept();
    const root = document.documentElement;
    const define = (name: string, value: number) => Object.defineProperty(root, name, { configurable: true, value });
    renderHook(() => useMetaLandingEngagement('barber'));
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    define('scrollHeight', 800); define('scrollTop', 0);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    define('scrollHeight', 4000); define('scrollTop', 1000);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    define('scrollTop', 2300);
    act(() => { window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledTimes(1);
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('Scroll75', 'barber');
  });
});

describe('useMetaRegistrationStart', () => {
  beforeEach(() => vi.clearAllMocks());
  const Form = () => <form><input aria-label="nome" /></form>;
  const Harness = ({ path }: { path: string }) => { useMetaRegistrationStart(path); return <Form />; };

  it('ignores synthetic (non-user) focus and input events and never blocks them', () => {
    const { getByLabelText } = render(<Harness path="/register" />);
    const input = getByLabelText('nome');
    const allowed = fireEvent.focusIn(input);
    fireEvent.input(input, { target: { value: 'a' } });
    expect(allowed).toBe(true); // o listener é passivo: não cancela nada
    expect(metaTracker.startRegistration).not.toHaveBeenCalled();
  });

  it('does not listen outside /register', () => {
    const add = vi.spyOn(document, 'addEventListener');
    render(<Harness path="/login" />);
    expect(add).not.toHaveBeenCalledWith('focusin', expect.anything(), true);
    add.mockRestore();
  });

  it('removes its listeners on unmount', () => {
    const remove = vi.spyOn(document, 'removeEventListener');
    render(<Harness path="/register" />).unmount();
    expect(remove).toHaveBeenCalledWith('focusin', expect.anything(), true);
    expect(remove).toHaveBeenCalledWith('input', expect.anything(), true);
    remove.mockRestore();
  });
});

describe('useMetaOnboardingStep', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reports the step with owner identity (name split, 2-letter country only)', () => {
    renderHook(() => useMetaOnboardingStep(3, 6, {
      email: 'a@example.com', id: 'u1', fullName: 'Ana Maria Souza', region: 'BR',
    }, true));
    expect(metaTracker.onboardingStep).toHaveBeenCalledWith(3, 6, {
      email: 'a@example.com', external_id: 'u1', first_name: 'Ana', last_name: 'Souza', country: 'br',
    });
  });

  it('does not send when disabled and omits an invalid region', () => {
    renderHook(() => useMetaOnboardingStep(1, 6, { id: 'u1', region: 'Brasil' }, false));
    expect(metaTracker.onboardingStep).not.toHaveBeenCalled();
    renderHook(() => useMetaOnboardingStep(1, 6, { id: 'u1', region: 'Brasil' }, true));
    expect(metaTracker.onboardingStep).toHaveBeenCalledWith(1, 6, { external_id: 'u1' });
  });
});
