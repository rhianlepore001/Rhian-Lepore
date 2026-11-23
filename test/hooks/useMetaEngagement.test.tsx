import React from 'react';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMetaDemoBridge, useMetaLandingEngagement, useMetaOnboardingStep, useMetaRegistrationStart, useMetaSectionViews } from '@/hooks/useMetaEngagement';
import { META_DEMO_MESSAGE_TYPE } from '@/lib/metaDemoBridge';
import { metaTracker } from '@/lib/metaTracking';

vi.mock('@/lib/metaTracking', () => ({
  metaTracker: {
    viewContent: vi.fn(() => true), landingEngagement: vi.fn(() => true),
    sectionView: vi.fn(() => true), demoStart: vi.fn(() => true), demoScreenView: vi.fn(() => true),
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

  it('sends ViewContent and dwell marks after visible seconds, only once each', () => {
    accept();
    renderHook(() => useMetaLandingEngagement('beauty'));
    expect(metaTracker.viewContent).toHaveBeenCalledWith('beauty');
    act(() => { vi.advanceTimersByTime(14_000); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('TimeOnPage15s', 'beauty');
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('TimeOnPage30s', 'beauty');
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('TimeOnPage60s', 'beauty');
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('TimeOnPage120s', 'beauty');
    expect(metaTracker.landingEngagement).toHaveBeenCalledTimes(4);
  });

  it('does not count time while the tab is hidden', () => {
    accept();
    const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    renderHook(() => useMetaLandingEngagement('beauty'));
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    state.mockRestore();
  });

  it('sends Scroll25/50/75/90 only when the page is scrollable and thresholds are reached', () => {
    accept();
    const root = document.documentElement;
    const define = (name: string, value: number) => Object.defineProperty(root, name, { configurable: true, value });
    renderHook(() => useMetaLandingEngagement('barber'));
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    define('scrollHeight', 800); define('scrollTop', 0);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).not.toHaveBeenCalled();
    define('scrollHeight', 4000); define('scrollTop', 200);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('Scroll25', 'barber');
    define('scrollTop', 1200);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('Scroll50', 'barber');
    define('scrollTop', 2300);
    act(() => { window.dispatchEvent(new Event('scroll')); window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('Scroll75', 'barber');
    define('scrollTop', 2900);
    act(() => { window.dispatchEvent(new Event('scroll')); });
    expect(metaTracker.landingEngagement).toHaveBeenCalledWith('Scroll90', 'barber');
    expect(metaTracker.landingEngagement).toHaveBeenCalledTimes(4);
  });
});

describe('useMetaSectionViews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    document.body.innerHTML = '<div class="landing"><section data-meta-section="hero">Hero</section></div>';
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('fires SectionView after 1s at ≥50% visibility and only once', () => {
    accept();
    type Cb = IntersectionObserverCallback;
    let callback: Cb = () => undefined;
    const observe = vi.fn();
    const unobserve = vi.fn();
    vi.stubGlobal('IntersectionObserver', class {
      constructor(cb: Cb) { callback = cb; }
      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
    });
    renderHook(() => useMetaSectionViews('barber'));
    expect(observe).toHaveBeenCalled();
    const target = document.querySelector('[data-meta-section="hero"]')!;
    act(() => {
      callback([{ isIntersecting: true, intersectionRatio: 0.6, target } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    act(() => { vi.advanceTimersByTime(999); });
    expect(metaTracker.sectionView).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(metaTracker.sectionView).toHaveBeenCalledWith('hero', 'barber');
    act(() => {
      callback([{ isIntersecting: true, intersectionRatio: 0.9, target } as IntersectionObserverEntry], {} as IntersectionObserver);
      vi.advanceTimersByTime(2000);
    });
    expect(metaTracker.sectionView).toHaveBeenCalledTimes(1);
  });
});

describe('useMetaDemoBridge', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('fires DemoStart only on action start, not on screen alone', () => {
    accept();
    renderHook(() => useMetaDemoBridge('barber', true));
    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: META_DEMO_MESSAGE_TYPE, action: 'screen', screen: 'agenda' },
    }));
    expect(metaTracker.demoStart).not.toHaveBeenCalled();
    expect(metaTracker.demoScreenView).toHaveBeenCalledWith('agenda', 'barber');
    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: { type: META_DEMO_MESSAGE_TYPE, action: 'start' },
    }));
    expect(metaTracker.demoStart).toHaveBeenCalledWith('barber');
  });

  it('ignores messages from other origins', () => {
    accept();
    renderHook(() => useMetaDemoBridge('barber', true));
    window.dispatchEvent(new MessageEvent('message', {
      origin: 'https://evil.example',
      data: { type: META_DEMO_MESSAGE_TYPE, action: 'start' },
    }));
    expect(metaTracker.demoStart).not.toHaveBeenCalled();
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
    expect(allowed).toBe(true);
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
