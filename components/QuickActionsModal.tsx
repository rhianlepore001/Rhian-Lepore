import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { Calendar, DollarSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface QuickActionsModalProps {
    onClose: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { role } = useAuth();
    const { setModalOpen } = useUI();
    const { colors, accent, status, radius, shadow } = useBrutalTheme();
    const isStaff = role === 'staff';

    useEffect(() => {
        setModalOpen(true);
        return () => setModalOpen(false);
    }, [setModalOpen]);

    const handleAction = (path: string) => {
        navigate(path);
        onClose();
    };

    const modalContent = (
        <div className="fixed inset-0 flex items-end justify-center sm:items-center bg-[var(--color-overlay)] backdrop-blur-sm animate-in fade-in duration-200" style={{ zIndex: 'var(--z-modal)' }}>
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <FocusTrap active={true}>
                <div
                    className={`relative w-full max-w-sm mx-4 mb-24 sm:mb-0 ${radius.modal} ${shadow.modal} overflow-hidden animate-in slide-in-from-bottom-10 duration-300 bg-[var(--color-modal-bg)] border border-[var(--color-modal-border)] backdrop-blur-2xl`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quick-actions-title"
                >
                <div className={`p-4 flex justify-between items-center border-b ${colors.divider} bg-[var(--color-card-hover)]`}>
                    <h3 id="quick-actions-title" className={`font-heading font-bold ${colors.text}`}>Ações Rápidas</h3>
                    <button
                        onClick={onClose}
                        className={`p-2 -mr-2 rounded-full transition-colors ${colors.textMuted} hover:text-theme-text hover:bg-[var(--color-card-hover)]`}
                        aria-label="Fechar ações rápidas"
                        title="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className={`p-4 grid gap-4 ${isStaff ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <button
                        onClick={() => handleAction('/agenda?new=true')}
                        className={`animate-in fade-in duration-300 delay-[0ms] flex min-h-[144px] flex-col items-center justify-center p-5 ${radius.card} border transition-all duration-200 active:scale-95 hover:scale-[1.02] ${accent.border} bg-[var(--color-card-hover)] hover:bg-[var(--color-accent-dim)] ${accent.shadow}`}
                    >
                        <div className={`p-3 ${radius.card} mb-3 ${accent.bgDim} ${accent.text}`}>
                            <Calendar className="w-8 h-8" />
                        </div>
                        <span className={`font-bold text-sm ${colors.text} text-center`}>Novo Atendimento</span>
                        <span className={`text-xs font-mono ${colors.textMuted} uppercase mt-1`}>Agenda</span>
                    </button>

                    {!isStaff && (
                        <button
                            onClick={() => handleAction('/financeiro?new=true')}
                            className={`animate-in fade-in duration-300 delay-[50ms] flex min-h-[144px] flex-col items-center justify-center p-5 ${radius.card} border transition-all duration-200 active:scale-95 hover:scale-[1.02] ${status.successBorder} bg-[var(--color-card-hover)] hover:bg-[var(--color-success-bg)]`}
                        >
                            <div className={`p-3 ${radius.card} mb-3 ${status.successBg} ${status.success}`}>
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <span className={`font-bold text-sm ${colors.text} text-center`}>Nova Transação</span>
                            <span className={`text-xs font-mono ${colors.textMuted} uppercase mt-1`}>Financeiro</span>
                        </button>
                    )}
                </div>
                </div>
            </FocusTrap>
        </div>
    );

    return createPortal(modalContent, document.body);
};
