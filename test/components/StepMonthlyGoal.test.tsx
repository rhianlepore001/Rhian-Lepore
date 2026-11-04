import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StepMonthlyGoal } from '@/components/onboarding/StepMonthlyGoal';
import { supabase } from '@/lib/supabase';

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'user-123' }, region: 'BR' }),
}));

const buildTable = (result: { error: unknown }) => {
    const eq = vi.fn(() => Promise.resolve(result));
    const update = vi.fn(() => ({ eq }));
    const upsert = vi.fn(() => Promise.resolve(result));
    return { update, upsert, eq };
};

const renderStep = () => {
    const onNext = vi.fn();
    render(<StepMonthlyGoal onNext={onNext} onBack={vi.fn()} onSkip={vi.fn()} accentColor="#fff" />);
    fireEvent.change(screen.getByPlaceholderText('0,00'), { target: { value: '8000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Definir Meta' }));
    return onNext;
};

describe('StepMonthlyGoal', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('salva a meta no perfil e na meta do mês, sem usar a tabela monthly_goals', async () => {
        const tables: Record<string, ReturnType<typeof buildTable>> = {
            profiles: buildTable({ error: null }),
            goal_settings: buildTable({ error: null }),
        };
        (supabase.from as any).mockImplementation((name: string) => tables[name] ?? buildTable({ error: null }));

        const onNext = renderStep();

        await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
        const usedTables = (supabase.from as any).mock.calls.map((c: unknown[]) => c[0]);
        expect(usedTables).not.toContain('monthly_goals');
        expect(tables.profiles.update).toHaveBeenCalledWith({ monthly_goal: 8000 });
        expect(tables.profiles.eq).toHaveBeenCalledWith('id', 'user-123');
        expect(tables.goal_settings.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: 'user-123', monthly_goal: 8000 }),
            { onConflict: 'user_id,month,year' }
        );
    });

    it('segue para o próximo passo mesmo se o salvamento falhar, como antes', async () => {
        const failing = buildTable({ error: { message: 'falha' } });
        (supabase.from as any).mockImplementation(() => failing);
        const warn = vi.spyOn(console, 'error').mockImplementation(() => {});

        const onNext = renderStep();

        await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
        warn.mockRestore();
    });
});
