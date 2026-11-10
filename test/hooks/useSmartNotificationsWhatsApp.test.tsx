import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let resolveLog: () => void = () => undefined;
const logCampaignActivity = vi.fn(() => new Promise<void>(resolve => { resolveLog = resolve; }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber', businessName: 'Barbearia', role: 'owner', region: 'BR' }) }));
vi.mock('../../hooks/useWhatsAppTemplates', () => ({ useWhatsAppTemplates: () => templates }));
const diag = vi.hoisted(() => ({
  loading: false, refetch: () => undefined,
  diagnostic: { at_risk_clients: [{ id: 'c1', name: 'Bruno Exemplo', phone: '11900000001', days_since_last_visit: 45, avg_ticket: 40 }], recoverable_revenue: 0 },
}));
const templates = vi.hoisted(() => ({ templates: {} }));
vi.mock('../../hooks/useAIOSDiagnostic', () => ({ useAIOSDiagnostic: () => ({ ...diag, logCampaignActivity }) }));

import { useSmartNotifications } from '../../hooks/useSmartNotifications';

describe('useSmartNotifications: WhatsApp de reativação', () => {
  it('abre o wa.me no toque, ANTES de esperar o registro da campanha (iPhone bloqueia depois do await)', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({ opener: null } as unknown as Window);
    const { result } = renderHook(() => useSmartNotifications());
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));
    let pending: Promise<void> = Promise.resolve();
    act(() => { pending = result.current.sendWhatsApp(result.current.notifications[0]); });
    // Ainda sem resolver o registro: o WhatsApp já tem que ter sido aberto.
    expect(open).toHaveBeenCalledTimes(1);
    expect(String(open.mock.calls[0][0])).toMatch(/^https:\/\/wa\.me\/5511900000001\?text=/);
    expect(logCampaignActivity).toHaveBeenCalledWith('c1', 'SmartNotification', 'whatsapp_reactivation');
    await act(async () => { resolveLog(); await pending; });
    open.mockRestore();
  });
});
