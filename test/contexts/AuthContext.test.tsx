import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Helper para envolver hooks com o provider
const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with default state and loading true', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.loading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
    });

    it('should fetch profile data if session exists on init', async () => {
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const mockSession = { user: mockUser };
        const mockProfile = {
            user_type: 'beauty',
            region: 'PT',
            business_name: 'Studio X',
            full_name: 'Jane Doe',
            tutorial_completed: false,
            subscription_status: 'active',
            trial_ends_at: null
        };

        // Configurar mocks do Supabase
        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockReturnValue({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Esperar pelo loading sumir
        await act(async () => {
            // O useEffect roda na montagem
        });

        // Verificações
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.userType).toBe('beauty');
        expect(result.current.region).toBe('PT');
        expect(result.current.businessName).toBe('Studio X');
        expect(result.current.tutorialCompleted).toBe(false);
    });

    it('should handle login successfully', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        (supabase.rpc as any).mockResolvedValue({ data: true, error: null });
        (supabase.auth.signInWithPassword as any).mockResolvedValue({ data: {}, error: null });

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('test@example.com', 'password123');
        });

        expect(loginResult.error).toBeNull();
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email: 'test@example.com',
            password: 'password123'
        });
    });

    it('should handle login rate limit', async () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        (supabase.rpc as any).mockResolvedValue({ data: false, error: null });

        let loginResult;
        await act(async () => {
            loginResult = await result.current.login('test@example.com', 'password123');
        });

        expect(loginResult.error.message).toContain('Muitas tentativas');
        expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it('should handle logout and reset state', async () => {
        // 1. Simular estado logado como beauty
        const mockUser = { id: 'user-123' };
        const mockSession = { user: mockUser };
        const mockProfile = { user_type: 'beauty', region: 'PT' };

        (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
        (supabase.from as any).mockImplementation(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
        }));

        const { result } = renderHook(() => useAuth(), { wrapper });

        await act(async () => { /* wait for init */ });

        expect(result.current.userType).toBe('beauty');

        // 2. Executar logout
        await act(async () => {
            await result.current.logout();
        });

        expect(supabase.auth.signOut).toHaveBeenCalled();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.userType).toBe('barber'); // Reset
        expect(result.current.region).toBe('BR'); // Reset
    });
});
