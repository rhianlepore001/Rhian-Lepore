/**
 * PixActions — Ação inline na MembersList para confirmar pagamento Pix via simulação.
 * Sprint D+1: até integrarmos PSP real (Inter/BB/Mercado Pago), o barbeiro clica aqui
 * quando o cliente manda o comprovante no WhatsApp. A UI mostra status e o BR Code.
 */

import React from 'react';
import { Zap, ExternalLink, Copy, Loader2 } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { usePixPaymentByMembership, useSimulatePixPaid } from '../../hooks/useMemberships';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

interface PixActionsProps {
    membershipId: string;
    onActivated?: () => void;
}

export const PixActions: React.FC<PixActionsProps> = ({ membershipId, onActivated }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const { colors, accent, font } = useBrutalTheme();
    const { data: pix, isLoading } = usePixPaymentByMembership(membershipId);
    const simulate = useSimulatePixPaid();

    const handleSimulate = async () => {
        if (!user || !pix) return;
        if (!window.confirm('Simular que o Pix foi recebido? O plano será ativado agora.')) return;
        try {
            await simulate.mutateAsync({
                pixPaymentId: pix.id,
                membershipId,
                confirmedByUserId: user.id,
            });
            showToast('Pix confirmado! Assinatura ativada.', 'success');
            onActivated?.();
        } catch (err) {
            showToast('Erro: ' + (err as Error).message, 'error');
        }
    };

    const handleCopy = async () => {
        if (!pix) return;
        try {
            await navigator.clipboard.writeText(pix.br_code);
            showToast('Código Pix copiado!', 'success');
        } catch {
            showToast('Não foi possível copiar. Selecione manualmente.', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
                <Loader2 className="w-3 h-3 animate-spin" /> Pix...
            </div>
        );
    }

    if (!pix) return null;

    return (
        <div
            data-testid="pix-actions"
            className={`flex flex-col gap-2 mt-2 p-3 rounded-xl ${colors.surface} ${colors.border} border`}
        >
            <div className="flex items-center gap-2 text-xs">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span className={`${font.mono} uppercase tracking-wider ${colors.textSecondary}`}>
                    Pix pendente
                </span>
                <span className="text-yellow-300 font-bold">
                    R$ {(pix.amount_cents / 100).toFixed(2).replace('.', ',')}
                </span>
            </div>
            <div className="flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-3 py-1.5 rounded-lg ${colors.inputBg} ${colors.border} ${colors.text} border text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110`}
                >
                    <Copy className="w-3.5 h-3.5" /> Copia-cola
                </button>
                <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={simulate.isPending}
                    data-testid="simulate-pix-btn"
                    className={`px-3 py-1.5 rounded-lg ${accent.bg} text-[var(--color-bg)] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 disabled:opacity-50 transition-all`}
                >
                    {simulate.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Simular recebido
                </button>
            </div>
            <p className={`text-[10px] ${colors.textMuted} leading-relaxed`}>
                <ExternalLink className="w-3 h-3 inline mr-1" />
                Em produção: webhook do PSP ativa automaticamente. Botão é só pra testes.
            </p>
        </div>
    );
};
