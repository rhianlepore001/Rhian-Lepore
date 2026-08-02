import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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
}

const isMobile = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export function buildStaffInviteLink(ownerId: string, memberId?: string | null): string {
    const base = `${window.location.origin}/#/register?company=${ownerId}`;
    return memberId ? `${base}&member=${memberId}` : base;
}

export function useCopyInviteLink(opts: UseCopyInviteLinkOptions = {}): UseCopyInviteLinkResult {
    const { user, businessName } = useAuth();
    const [copied, setCopied] = useState(false);

    const inviteLink = user
        ? buildStaffInviteLink(user.id, opts.memberId)
        : '';

    const inviteText = opts.customText
        ?? (opts.recipientName && businessName
            ? `${opts.recipientName}, seu perfil já está pronto na equipe ${businessName}. Cadastre-se aqui: ${inviteLink}`
            : `Cadastre-se na nossa equipe e gerencie sua agenda: ${inviteLink}`);

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

    return { inviteLink, inviteText, copied, copy, share };
}
