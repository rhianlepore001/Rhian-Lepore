import { describe, it, expect, vi, beforeEach } from 'vitest';

const reportAutoBugMock = vi.fn();
const captureContextMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/lib/bugReport', () => ({
  reportAutoBug: (...args: unknown[]) => reportAutoBugMock(...args),
  captureContext: () => captureContextMock(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => getSessionMock(),
    },
  },
}));

import { captureRenderError, __resetAutoBugCaptureForTests } from '@/lib/autoBugCapture';

const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  vi.clearAllMocks();
  reportAutoBugMock.mockResolvedValue({ id: 'bug-1', error: null });
  captureContextMock.mockReturnValue({ route: '#/agenda', pathname: '/agenda' });
  getSessionMock.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  localStorage.clear();
  __resetAutoBugCaptureForTests();
});

describe('autoBugCapture', () => {
  it('registra um erro novo como bug automático', async () => {
    captureRenderError(new Error('Algo quebrou'));
    await vi.waitFor(() => expect(reportAutoBugMock).toHaveBeenCalledTimes(1));
    const arg = reportAutoBugMock.mock.calls[0][0];
    expect(arg.title).toBe('Algo quebrou');
    expect(arg.dedupKey).toContain('#/agenda');
    expect(arg.description).toContain('captura automática');
  });

  it('não duplica o mesmo erro (dedup por assinatura)', async () => {
    captureRenderError(new Error('Erro repetido'));
    await vi.waitFor(() => expect(reportAutoBugMock).toHaveBeenCalledTimes(1));
    captureRenderError(new Error('Erro repetido'));
    await flush();
    expect(reportAutoBugMock).toHaveBeenCalledTimes(1);
  });

  it('agrupa erros que só diferem em números/ids na mesma assinatura', async () => {
    captureRenderError(new Error('Falhou no registro 12345'));
    await vi.waitFor(() => expect(reportAutoBugMock).toHaveBeenCalledTimes(1));
    captureRenderError(new Error('Falhou no registro 99999'));
    await flush();
    expect(reportAutoBugMock).toHaveBeenCalledTimes(1);
  });

  it('registra erros realmente diferentes separadamente', async () => {
    captureRenderError(new Error('Erro A'));
    await vi.waitFor(() => expect(reportAutoBugMock).toHaveBeenCalledTimes(1));
    captureRenderError(new Error('Erro totalmente diferente B'));
    await vi.waitFor(() => expect(reportAutoBugMock).toHaveBeenCalledTimes(2));
  });

  it('não registra nada sem sessão ativa', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    captureRenderError(new Error('Erro sem login'));
    await flush();
    expect(reportAutoBugMock).not.toHaveBeenCalled();
  });
});
