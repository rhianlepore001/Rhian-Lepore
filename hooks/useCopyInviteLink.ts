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
    const origin = window.location.origin;
    if (memberId) {
        return `${origin}/#/invite/${encodeURIComponent(ownerId)}/${encodeURIComponent(memberId)}`;
    }
    return `${origin}/#/register?company=${encodeURIComponent(ownerId)}`;
}

export function useCopyInviteLink(opts: UseCopyInviteLinkOptions = {}): UseCopyInviteLinkResult {
    const { user, companyId, businessName } = useAuth();
    const [copied, setCopied] = useState(false);
    const tenantId = companyId || user?.id;

    const inviteLink = tenantId
        ? buildStaffInviteLink(tenantId, opts.memberId)
        : '';

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

    return { inviteLink, inviteText, copied, copy, share };
}
