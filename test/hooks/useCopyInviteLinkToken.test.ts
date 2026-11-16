/**
 * Convite com token (invite hardening): o link do colaborador leva o token
 * emitido pelo dono (get_or_create_staff_invite) e "Gerar novo link" troca o
 * token (rotate_staff_invite).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { buildStaffInviteLink, useCopyInviteLink } from '@/hooks/useCopyInviteLink';
import { supabase } from '@/lib/supabase';

vi.mock('@/contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'owner-uuid-123' }, businessName: 'Barbearia do Marcos' }),
}));

const TOKEN = 'a'.repeat(64);
const NEW_TOKEN = 'b'.repeat(64);
const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe('useCopyInviteLink: token do convite', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(window, 'location', {
            value: { ...window.location, origin: 'https://app.example.com' },
            writable: true,
        });
        rpc.mockImplementation((name: string) => Promise.resolve(
            name === 'get_or_create_staff_invite' ? { data: TOKEN, error: null }
                : name === 'rotate_staff_invite' ? { data: NEW_TOKEN, error: null }
                    : { data: null, error: null },
        ));
    });

    it('buildStaffInviteLink acrescenta &invite=<token>', () => {
        expect(buildStaffInviteLink('owner-uuid-123', 'member-9', TOKEN)).toBe(
            `https://app.example.com/#/register?company=owner-uuid-123&member=member-9&invite=${TOKEN}`,
        );
    });

    it('busca o token do cadastro e só mostra o link com o token', async () => {
        const { result } = renderHook(() => useCopyInviteLink({ memberId: 'member-9', recipientName: 'Lucas' }));
        expect(result.current.inviteLink).toBe('');
        await waitFor(() => expect(result.current.inviteLink).toContain(`&invite=${TOKEN}`));
        expect(rpc).toHaveBeenCalledWith('get_or_create_staff_invite', { p_member_id: 'member-9' });
        expect(result.current.inviteLink).toBe(
            `https://app.example.com/#/register?company=owner-uuid-123&member=member-9&invite=${TOKEN}`,
        );
        expect(result.current.inviteText).toContain(`&invite=${TOKEN}`);
    });

    it('"Gerar novo link" troca o token (rotate_staff_invite)', async () => {
        const { result } = renderHook(() => useCopyInviteLink({ memberId: 'member-9' }));
        await waitFor(() => expect(result.current.inviteLink).toContain(TOKEN));
        await act(async () => {
            await result.current.regenerate();
        });
        expect(rpc).toHaveBeenCalledWith('rotate_staff_invite', { p_member_id: 'member-9' });
        expect(result.current.inviteLink).toContain(`&invite=${NEW_TOKEN}`);
        expect(result.current.inviteLink).not.toContain(TOKEN);
    });

    it('falha ao gerar o token: sem link e com mensagem de erro', async () => {
        rpc.mockResolvedValue({ data: null, error: { message: 'invalid_invite' } });
        const { result } = renderHook(() => useCopyInviteLink({ memberId: 'member-9' }));
        await waitFor(() => expect(result.current.inviteError).toBeTruthy());
        expect(result.current.inviteLink).toBe('');
    });
});
