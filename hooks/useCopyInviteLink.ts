import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface UseCopyInviteLinkOptions {
    recipientName?: string;
    memberId?: string | null;
    customText?: string;
}

interface UseCopyInviteLinkResult {
    inviteLink: string;
    inviteText: string;
    copied: boolean;
    copy: () => Promise<void>;
    share: () => Promise<void>;
    /** "Gerar novo link": troca o token; o link anterior deixa de valer. */
    regenerate: () => Promise<void>;
    regenerating: boolean;
    inviteError: string | null;
}

const TOKEN_ERROR = 'Não foi possível gerar o link do convite. Tente de novo.';

const isMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export function buildStaffInviteLink(ownerId: string, memberId?: string | null, inviteToken?: string | null): string {
    const base = `${window.location.origin}/#/register?company=${ownerId}`;
    if (!memberId) return base;
    const withMember = `${base}&member=${memberId}`;
    return inviteToken ? `${withMember}&invite=${inviteToken}` : withMember;
}

export function useCopyInviteLink(opts: UseCopyInviteLinkOptions = {}): UseCopyInviteLinkResult {
    const { user, businessName } = useAuth();
    const [copied, setCopied] = useState(false);
    const memberId = opts.memberId ?? null;
    // Token do convite (staff_invites) do cadastro atual; o link só existe com ele.
    const [invite, setInvite] = useState<{ memberId: string; token: string } | null>(null);
    const [inviteError, setInviteError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const userId = user?.id ?? null;

    useEffect(() => {
        if (!userId || !memberId) return;
        let cancelled = false;
        setInviteError(null);
        void supabase
            .rpc('get_or_create_staff_invite', { p_member_id: memberId })
            .then(({ data, error }) => {
                if (cancelled) return;
                if (error || typeof data !== 'string' || !data) {
                    setInviteError(TOKEN_ERROR);
                    return;
                }
                setInvite({ memberId, token: data });
            });
        return () => {
            cancelled = true;
        };
    }, [userId, memberId]);

    const inviteToken = invite && invite.memberId === memberId ? invite.token : null;
    const inviteLink = !user
        ? ''
        : memberId
            ? (inviteToken ? buildStaffInviteLink(user.id, memberId, inviteToken) : '')
            : buildStaffInviteLink(user.id);

    const inviteText = opts.customText
        ?? (opts.recipientName && businessName
            ? `Olá, ${opts.recipientName.split(/\s+/)[0]}. A ${businessName} convidou você para integrar a equipe no AgendiX. Finalize seu acesso neste link: ${inviteLink}`
            : `Você foi convidado(a) a integrar nossa equipe no AgendiX. Finalize seu acesso neste link: ${inviteLink}`);

    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => () => {
        if (resetTimer.current) clearTimeout(resetTimer.current);
    }, []);

    const flashCopied = useCallback(() => {
        setCopied(true);
        if (resetTimer.current) clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), 2000);
    }, []);

    const fallbackCopy = useCallback((text: string): boolean => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch {
            return false;
        }
    }, []);

    const copy = useCallback(async () => {
        if (!inviteLink) return;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteLink);
                flashCopied();
                return;
            }
            throw new Error('Clipboard API unavailable');
        } catch {
            if (fallbackCopy(inviteLink)) flashCopied();
        }
    }, [inviteLink, flashCopied, fallbackCopy]);

    const share = useCallback(async () => {
        if (!inviteLink) return;

        if (navigator.share && isMobile()) {
            try {
                await navigator.share({
                    title: 'Convite para Equipe - AgendiX',
                    text: inviteText,
                    url: inviteLink,
                });
                return;
            } catch {
                await copy();
            }
        } else {
            await copy();
        }
    }, [inviteLink, inviteText, copy]);

    const regenerate = useCallback(async () => {
        if (!memberId) return;
        setRegenerating(true);
        setInviteError(null);
        try {
            const { data, error } = await supabase.rpc('rotate_staff_invite', { p_member_id: memberId });
            if (error || typeof data !== 'string' || !data) {
                setInviteError(TOKEN_ERROR);
                return;
            }
            setCopied(false);
            setInvite({ memberId, token: data });
        } finally {
            setRegenerating(false);
        }
    }, [memberId]);

    return { inviteLink, inviteText, copied, copy, share, regenerate, regenerating, inviteError };
}
