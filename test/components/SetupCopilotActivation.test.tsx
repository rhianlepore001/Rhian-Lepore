import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SetupCopilot } from '@/components/dashboard/SetupCopilot';
import { supabase } from '@/lib/supabase';

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-123' },
        companyId: 'user-123',
        userType: 'barber',
        region: 'BR',
    }),
}));

vi.mock('@/hooks/useBrutalTheme', async () => {
    const actual = await vi.importActual<any>('@/hooks/useBrutalTheme');
    return { ...actual, useBrutalTheme: () => new Proxy({}, { get: () => new Proxy({}, { get: () => '' }) }) };
});

vi.mock('@/hooks/useBusinessCopy', () => ({
    useBusinessCopy: () => ({ theme: 'barber', isBeauty: false }),
}));

vi.mock('@/services/onboarding', () => ({
    getSetupStatus: vi.fn(() => Promise.resolve({
        hasServices: true,
        hasTeam: true,
        hasClients: true,
        hasBusinessHours: true,
        hasBookingSlug: true,
        hasAppointments: true,
        isActivated: false,
    })),
    getOnboardingProgress: vi.fn(() => Promise.resolve(null)),
    saveOnboardingStep: vi.fn(() => Promise.resolve()),
    shouldHideSetupCopilot: vi.fn(() => false),
}));

describe('SetupCopilot — persistência da ativação', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('grava só colunas que existem em profiles quando todos os passos estão concluídos', async () => {
        const update = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ then: (cb: (r: { error: null }) => void) => cb({ error: null }) }),
        });
        (supabase.from as any).mockImplementation(() => ({ update }));

        render(
            <MemoryRouter>
                <SetupCopilot />
            </MemoryRouter>
        );

        await waitFor(() => expect(update).toHaveBeenCalled());

        expect(supabase.from).toHaveBeenCalledWith('profiles');
        const payload = update.mock.calls[0][0];
        expect(payload).not.toHaveProperty('setup_completed');
        expect(payload.activation_completed).toBe(true);
        expect(typeof payload.activated_at).toBe('string');
        expect(Object.keys(payload).sort()).toEqual(['activated_at', 'activation_completed']);
    });
});
