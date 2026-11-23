import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/demo/mode', () => ({
  isDemoPreview: vi.fn(() => false),
}));

import { isDemoPreview } from '@/lib/demo/mode';
import {
  demoPathToScreen,
  isMetaDemoMessage,
  META_DEMO_MESSAGE_TYPE,
  postMetaDemoToParent,
} from '@/lib/metaDemoBridge';

describe('metaDemoBridge', () => {
  beforeEach(() => {
    vi.mocked(isDemoPreview).mockReturnValue(false);
  });

  it('maps demo routes to tracked screens', () => {
    expect(demoPathToScreen('/')).toBe('inicio');
    expect(demoPathToScreen('/agenda')).toBe('agenda');
    expect(demoPathToScreen('/fila')).toBe('fila');
    expect(demoPathToScreen('/fila/historico')).toBe('fila');
    expect(demoPathToScreen('/financeiro')).toBe('financeiro');
    expect(demoPathToScreen('/financeiro', '?tab=commissions')).toBe('comissoes');
    expect(demoPathToScreen('/clientes')).toBe('clientes');
    expect(demoPathToScreen('/resultados-por-hora')).toBe('hora_cadeira');
    expect(demoPathToScreen('/book/simulacao')).toBeNull();
    expect(demoPathToScreen('/produtos')).toBeNull();
  });

  it('accepts only same-origin messages with known actions/screens', () => {
    const origin = 'https://app.example.com';
    expect(isMetaDemoMessage({ type: META_DEMO_MESSAGE_TYPE, action: 'start' }, origin, origin)).toBe(true);
    expect(isMetaDemoMessage({ type: META_DEMO_MESSAGE_TYPE, action: 'screen', screen: 'agenda' }, origin, origin)).toBe(true);
    expect(isMetaDemoMessage({ type: META_DEMO_MESSAGE_TYPE, action: 'screen', screen: 'hack' }, origin, origin)).toBe(false);
    expect(isMetaDemoMessage({ type: META_DEMO_MESSAGE_TYPE, action: 'start' }, 'https://evil.example', origin)).toBe(false);
    expect(isMetaDemoMessage({ type: 'other', action: 'start' }, origin, origin)).toBe(false);
    expect(isMetaDemoMessage({ type: META_DEMO_MESSAGE_TYPE, action: 'start', extra: 1 }, origin, origin)).toBe(false);
  });

  it('posts to parent only inside the demo-preview iframe', () => {
    const postMessage = vi.fn();
    const parentWin = { postMessage } as unknown as Window;
    Object.defineProperty(window, 'parent', { configurable: true, value: parentWin });
    vi.mocked(isDemoPreview).mockReturnValue(true);
    postMetaDemoToParent({ action: 'screen', screen: 'inicio' });
    expect(postMessage).toHaveBeenCalledWith(
      { type: META_DEMO_MESSAGE_TYPE, action: 'screen', screen: 'inicio' },
      window.location.origin,
    );
    postMessage.mockClear();
    Object.defineProperty(window, 'parent', { configurable: true, value: window });
    postMetaDemoToParent({ action: 'start' });
    expect(postMessage).not.toHaveBeenCalled();
  });
});
