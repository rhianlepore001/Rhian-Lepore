import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { supabase } from '@/lib/supabase';

// Mock simples do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'user-123', created_at: '2023-01-01T00:00:00Z' }
    })
}));

describe('useDashboardData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and format dashboard data correctly', async () => {
        const mockProfile = { business_slug: 'test-shop', monthly_goal: 10000 };
        const mockAppointments = [
            {
                id: '1',
                clients: { name: 'Client 1' },
                service: 'Corte',
                appointment_time: '2023-05-20T10:00:00Z',
                status: 'Confirmed',
                price: 50
            }
        ];
        const mockStats = {
            total_profit: 5000,
            current_month_revenue: 1200,
            weekly_growth: 15,
            monthly_goal: 10000
        };

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'profiles') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
                };
            }
            if (table === 'appointments') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: mockAppointments, error: null })
                };
            }
            return {};
        });

        (supabase.rpc as any).mockImplementation((fn: string) => {
            if (fn === 'get_dashboard_stats') {
                return Promise.resolve({ data: mockStats, error: null });
            }
            // Mock finance stats para o loop de 6 meses
            if (fn === 'get_finance_stats') {
                return Promise.resolve({ data: { revenue: 1000 }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
        });

        const { result } = renderHook(() => useDashboardData());

        // Esperar pelo loading sumir (timeout maior para o loop de 6 rpc calls)
        await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 3000 });

        expect(result.current.businessSlug).toBe('test-shop');
        expect(result.current.profit).toBe(5000);
        expect(result.current.appointments).toHaveLength(1);
        expect(result.current.appointments[0].clientName).toBe('Client 1');
    });

    it('should handle errors during fetch', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockRejectedValue(new Error('DB Error'))
        }));

        const { result } = renderHook(() => useDashboardData());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(consoleSpy).toHaveBeenCalled();
        expect(result.current.loading).toBe(false);

        consoleSpy.mockRestore();
    });
});

