import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIOSDiagnostic } from '@/hooks/useAIOSDiagnostic';
import { supabase } from '@/lib/supabase';

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
        aiosEnabled: true,
    }),
}));

describe('useAIOSDiagnostic', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('não chama a função get_aios_diagnostic, que não devolve o formato esperado pela tela', async () => {
        const { result } = renderHook(() => useAIOSDiagnostic());

        await waitFor(() => expect(result.current.loading).toBe(false));

        const calledFunctions = (supabase.rpc as any).mock.calls.map((c: unknown[]) => c[0]);
        expect(calledFunctions).not.toContain('get_aios_diagnostic');
    });

    it('mantém o diagnóstico vazio e sem erro para que a interface siga normal', async () => {
        const { result } = renderHook(() => useAIOSDiagnostic());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.diagnostic).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('continua registrando campanhas pela função log_aios_campaign', async () => {
        (supabase.rpc as any).mockResolvedValueOnce({ data: 'log-1', error: null });
        const { result } = renderHook(() => useAIOSDiagnostic());
        await waitFor(() => expect(result.current.loading).toBe(false));

        const logId = await result.current.logCampaignActivity('client-1', 'Agent', 'reativacao');

        expect(logId).toBe('log-1');
        expect(supabase.rpc).toHaveBeenCalledWith('log_aios_campaign', {
            p_client_id: 'client-1',
            p_agent_name: 'Agent',
            p_campaign_type: 'reativacao',
        });
    });
});
