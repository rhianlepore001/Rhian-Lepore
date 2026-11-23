import React from 'react';
import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { postMetaDemoToParent } = vi.hoisted(() => ({ postMetaDemoToParent: vi.fn() }));

vi.mock('@/lib/demo/mode', () => ({
  isDemoPreview: () => true,
  getDemoNiche: () => 'barber' as const,
  getDemoColorMode: () => 'light' as const,
  setDemoColorMode: vi.fn(),
}));

vi.mock('@/lib/metaDemoBridge', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/metaDemoBridge')>();
  return { ...actual, postMetaDemoToParent };
});

vi.mock('@/components/Layout', () => ({ Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/DemoNavigation', () => ({
  DemoNavigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { Demo } from '@/pages/Demo';

describe('Demo embedded Meta bridge', () => {
  beforeEach(() => {
    postMetaDemoToParent.mockClear();
    Object.defineProperty(window, 'scrollTo', { configurable: true, value: vi.fn() });
  });

  it('does not post on mount; posts start+screen on first user screen navigation', async () => {
    const router = createMemoryRouter(
      [{ path: '/demo/:niche/*', element: <Demo /> }],
      { initialEntries: ['/demo/barber'] },
    );
    render(<RouterProvider router={router} />);
    expect(postMetaDemoToParent).not.toHaveBeenCalled();
    await act(async () => {
      await router.navigate('/demo/barber/agenda');
    });
    expect(postMetaDemoToParent).toHaveBeenCalledWith({ action: 'start' });
    expect(postMetaDemoToParent).toHaveBeenCalledWith({ action: 'screen', screen: 'agenda' });
    postMetaDemoToParent.mockClear();
    await act(async () => {
      await router.navigate('/demo/barber/fila');
    });
    expect(postMetaDemoToParent).not.toHaveBeenCalledWith({ action: 'start' });
    expect(postMetaDemoToParent).toHaveBeenCalledWith({ action: 'screen', screen: 'fila' });
  });
});
