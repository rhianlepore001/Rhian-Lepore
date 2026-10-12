import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('../../hooks/useBrutalTheme', () => { const any: any = new Proxy({}, { get: () => '' }); return { useBrutalTheme: () => ({ colors: any, font: any, status: any, classes: any, radius: any }) }; });
vi.mock('../../lib/autoBugCapture', () => ({ captureRenderError: vi.fn() }));
vi.mock('../../utils/chunkLoadError', async (orig) => {
  const real = await orig<typeof import('../../utils/chunkLoadError')>();
  return { ...real, reloadOnceForNewVersion: vi.fn(() => false) };
});
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { captureRenderError } from '../../lib/autoBugCapture';
import { reloadOnceForNewVersion } from '../../utils/chunkLoadError';

const Boom = ({ msg }: { msg: string }) => { throw new TypeError(msg); };

describe('ErrorBoundary', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); });

  it('chunk de deploy antigo: tela "Nova versão disponível", tenta 1 reload, não registra bug', () => {
    render(<ErrorBoundary><Boom msg="Failed to fetch dynamically imported module: https://x/assets/Agenda-1.js" /></ErrorBoundary>);
    expect(screen.getByTestId('new-version-screen')).toBeTruthy();
    expect(screen.getByText('Nova versão disponível')).toBeTruthy();
    expect(screen.queryByText(/Sistema Interrompido/i)).toBeNull();
    expect(reloadOnceForNewVersion).toHaveBeenCalledTimes(1);
    expect(captureRenderError).not.toHaveBeenCalled();
  });

  it('outros erros continuam na tela "Sistema Interrompido" e são registrados', () => {
    render(<ErrorBoundary><Boom msg="Cannot read properties of undefined" /></ErrorBoundary>);
    expect(screen.getByText(/Sistema Interrompido/i)).toBeTruthy();
    expect(captureRenderError).toHaveBeenCalledTimes(1);
    expect(reloadOnceForNewVersion).not.toHaveBeenCalled();
  });
});
