import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllFormDrafts, FORM_DRAFT_PREFIX, useFormDraft } from '../../hooks/useFormDraft';

const key = `${FORM_DRAFT_PREFIX}company-fictional:user-fictional:form`;
const scope = { enabled: true, companyId: 'company-fictional', userId: 'user-fictional' };

beforeEach(() => { vi.useFakeTimers(); sessionStorage.clear(); });
afterEach(() => { vi.useRealTimers(); sessionStorage.clear(); });

describe('useFormDraft', () => {
  it('debounces changes for 300ms and restores the latest draft', () => {
    const { rerender, unmount } = renderHook(({ name }) => useFormDraft('form', { name }, scope), { initialProps: { name: 'Ana' } });
    act(() => vi.advanceTimersByTime(200));
    rerender({ name: 'Ana Fictícia' });
    act(() => vi.advanceTimersByTime(299));
    expect(sessionStorage.getItem(key)).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(JSON.parse(sessionStorage.getItem(key)!).data.name).toBe('Ana Fictícia');
    unmount();
    const { result } = renderHook(() => useFormDraft('form', { name: '' }, scope));
    expect(result.current.restored).toEqual({ name: 'Ana Fictícia' });
    expect(result.current.hasDraft).toBe(true);
  });

  it('isolates company and user and requires both scope IDs', () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, savedAt: Date.now(), data: { name: 'Ana' } }));
    for (const changed of [{ companyId: 'other' }, { userId: 'other' }, { companyId: null }, { userId: null }]) {
      const { result, unmount } = renderHook(() => useFormDraft('form', { name: '' }, { ...scope, ...changed, enabled: false }));
      expect(result.current.restored).toBeNull();
      unmount();
    }
    const { unmount } = renderHook(() => useFormDraft('missing', { name: 'Ana' }, { ...scope, companyId: null }));
    act(() => vi.advanceTimersByTime(300));
    unmount();
    expect(sessionStorage.length).toBe(1);
  });

  it.each([
    { v: 1, savedAt: Date.now() - 12 * 60 * 60 * 1000 - 1, data: { name: 'Old' } },
    { v: 2, savedAt: Date.now(), data: { name: 'Other version' } },
    { v: 1, savedAt: 'invalid', data: {} },
  ])('removes expired or invalid envelopes: %j', envelope => {
    sessionStorage.setItem(key, JSON.stringify(envelope));
    const { result } = renderHook(() => useFormDraft('form', {}, { ...scope, enabled: false }));
    expect(result.current.restored).toBeNull();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('supports a custom TTL and ignores corrupt JSON', () => {
    sessionStorage.setItem(key, JSON.stringify({ v: 1, savedAt: Date.now() - 101, data: {} }));
    const { result, unmount } = renderHook(() => useFormDraft('form', {}, { ...scope, ttlMs: 100, enabled: false }));
    expect(result.current.restored).toBeNull();
    unmount();
    sessionStorage.setItem(key, '{broken');
    expect(() => renderHook(() => useFormDraft('form', {}, scope))).not.toThrow();
  });

  it('omits sensitive fields and flushes on hidden, pagehide and before-reload', () => {
    const { rerender } = renderHook(({ name }) => useFormDraft('form', { name, password: 'never-store', photo: 'data:image/png;base64,fake' }, { ...scope, omit: ['password', 'photo'] }), { initialProps: { name: 'Ana' } });
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(JSON.parse(sessionStorage.getItem(key)!).data).toEqual({ name: 'Ana' });
    rerender({ name: 'Beatriz' });
    act(() => window.dispatchEvent(new Event('pagehide')));
    expect(JSON.parse(sessionStorage.getItem(key)!).data.name).toBe('Beatriz');
    rerender({ name: 'Carla' });
    act(() => window.dispatchEvent(new Event('agendix:before-reload')));
    expect(JSON.parse(sessionStorage.getItem(key)!).data.name).toBe('Carla');
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('clears without recreating on rerender or unmount, and resumes on a new edit', () => {
    const { result, rerender, unmount } = renderHook(({ name }) => useFormDraft('form', { name }, scope), { initialProps: { name: 'Ana' } });
    act(() => vi.advanceTimersByTime(300));
    act(() => result.current.clear());
    rerender({ name: 'Ana' });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.hasDraft).toBe(false);
    expect(sessionStorage.getItem(key)).toBeNull();
    rerender({ name: 'Carla' });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.hasDraft).toBe(true);
    act(() => result.current.clear());
    unmount();
    expect(sessionStorage.getItem(key)).toBeNull();
  });

  it('logout clears all drafts and prevents pending flushes from recreating them', () => {
    const { unmount } = renderHook(() => useFormDraft('form', { name: 'Ana' }, scope));
    sessionStorage.setItem(`${FORM_DRAFT_PREFIX}other:user:form`, '{}');
    sessionStorage.setItem('unrelated', 'keep');
    act(() => clearAllFormDrafts());
    act(() => vi.advanceTimersByTime(1000));
    act(() => window.dispatchEvent(new Event('pagehide')));
    unmount();
    expect(Object.keys(sessionStorage)).toEqual(['unrelated']);
  });

  it('tolerates quota and unavailable storage', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { unmount } = renderHook(() => useFormDraft('form', { name: 'Ana' }, scope));
    expect(() => act(() => vi.advanceTimersByTime(300))).not.toThrow();
    unmount();
    vi.restoreAllMocks();
  });
});
