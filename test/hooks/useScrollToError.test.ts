import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollToError } from '@/hooks/useScrollToError';

describe('useScrollToError', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('rola e foca o banner quando o erro aparece', async () => {
    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const { result, rerender } = renderHook(
      ({ error }: { error: string | null }) => useScrollToError(error),
      { initialProps: { error: null as string | null } },
    );

    const node = document.createElement('div');
    result.current.current = node;

    rerender({ error: 'Este e-mail já está cadastrado.' });

    await vi.waitFor(() => {
      expect(node.scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'center',
      });
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    });
  });

  it('não rola quando não há erro', async () => {
    const { result } = renderHook(() => useScrollToError(null));
    const node = document.createElement('div');
    result.current.current = node;

    await Promise.resolve();
    expect(node.scrollIntoView).not.toHaveBeenCalled();
  });
});
