import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useMeuDiaData } from '@/hooks/useMeuDiaData';
import { supabase } from '@/lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUser = { id: 'user-123', created_at: '2023-01-01T00:00:00Z' };

// Mock do AuthContext
vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({
        user: mockUser,
        companyId: 'user-123',
        teamMemberId: 'team-member-456'
    })
}));

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: Infinity,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('useMeuDiaData', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and format today appointments for professional', async () => {
        const mockTodayAppointments = [
            {
                id: 'apt-1',
                clients: { name: 'João' },
                service: 'Corte de Cabelo',
                appointment_time: new Date().toISOString(),
                status: 'Confirmed',
                price: 60
            },
            {
                id: 'apt-2',
                clients: { name: 'Maria' },
                service: 'Barba',
                appointment_time: new Date().toISOString(),
                status: 'Completed',
                price: 40
            }
        ];

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'appointments') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    in: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockTodayAppointments, error: null }),
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
        });

        const { result } = renderHook(() => useMeuDiaData(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.appointments).toHaveLength(2);
        expect(result.current.appointments[0].clientName).toBe('João');
        expect(result.current.appointments[1].status).toBe('Completed');
        
        // Verificação do resumo
        expect(result.current.summary.completed).toBe(1);
        expect(result.current.summary.pending).toBe(1);
        expect(result.current.summary.dailyEarnings).toBe(40);
    });

    it('should mark appointment as completed with optimistic update', async () => {
        const mockTodayAppointments = [
            {
                id: 'apt-1',
                clients: { name: 'João' },
                service: 'Corte de Cabelo',
                appointment_time: new Date().toISOString(),
                status: 'Confirmed',
                price: 60
            }
        ];

        let updateStatusCalled = false;

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'appointments') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    gte: vi.fn().mockReturnThis(),
                    lte: vi.fn().mockReturnThis(),
                    order: vi.fn().mockResolvedValue({ data: mockTodayAppointments, error: null }),
                    update: vi.fn().mockImplementation((val) => {
                        if (val.status === 'Completed') {
                            updateStatusCalled = true;
                        }
                        return {
                            eq: vi.fn().mockResolvedValue({ error: null })
                        };
                    })
                };
            }
            return {
                select: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
        });

        const { result } = renderHook(() => useMeuDiaData(), { wrapper: createWrapper() });

        await waitFor(() => expect(result.current.loading).toBe(false));

        let success = false;
        await act(async () => {
            success = await result.current.markAsCompleted('apt-1');
        });

        expect(success).toBe(true);
        expect(updateStatusCalled).toBe(true);
    });
});
