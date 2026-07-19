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
    const { isBeauty } = useBrutalTheme();
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
                <div className={`relative w-full max-w-sm mx-4 mb-24 sm:mb-0 rounded-2xl shadow-promax-glass overflow-hidden animate-in slide-in-from-bottom-10 duration-300
        ${isBeauty ? 'bg-gradient-to-br from-beauty-card/95 to-beauty-dark/95 border border-[var(--color-border)] backdrop-blur-2xl' : 'bg-brutal-card/80 border border-[var(--color-border)] backdrop-blur-2xl'}
      `}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quick-actions-title"
                >
                <div className={`p-4 flex justify-between items-center ${isBeauty ? 'border-b border-[var(--color-divider)] bg-[var(--color-card-hover)]' : 'border-b border-[var(--color-divider)] bg-[var(--color-card-hover)]'}`}>
                    <h3 id="quick-actions-title" className="font-heading font-bold text-[var(--color-text)]">Ações Rápidas</h3>
                    <button onClick={onClose} className={`p-2 -mr-2 rounded-full transition-colors ${isBeauty ? 'text-[var(--color-text)]/60 hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)]' : 'text-accent-gold/60 hover:text-accent-gold hover:bg-accent-gold/10'}`} aria-label="Fechar ações rápidas" title="Fechar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className={`p-4 grid gap-4 ${isStaff ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <button
                        onClick={() => handleAction('/agenda?new=true')}
                        className={`animate-in fade-in duration-300 delay-[0ms] flex min-h-[144px] flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 active:scale-95 hover:scale-[1.02]
              ${isBeauty
                                ? 'border-[var(--color-accent-border)] bg-[var(--color-card-hover)] hover:bg-[var(--color-accent-dim)] hover:shadow-neon'
                                : 'border-accent-gold/20 bg-[var(--color-card-hover)] hover:bg-accent-gold/10 hover:border-accent-gold/40 hover:shadow-gold'}
            `}
                    >
                        <div className={`p-3 rounded-2xl mb-3 ${isBeauty ? 'bg-[var(--color-accent-dim)] text-theme-accent' : 'bg-accent-gold/15 text-accent-gold'}`}>
                            <Calendar className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-sm text-[var(--color-text)] text-center">Novo Atendimento</span>
                        <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase mt-1">Agenda</span>
                    </button>

                    {!isStaff && (
                        <button
                            onClick={() => handleAction('/financeiro?new=true')}
                            className={`animate-in fade-in duration-300 delay-[50ms] flex min-h-[144px] flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 active:scale-95 hover:scale-[1.02]
                  ${isBeauty
                                    ? 'border-[var(--color-success-border)] bg-[var(--color-card-hover)] hover:bg-[var(--color-success-bg)] hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                                    : 'border-[var(--color-success-border)] bg-[var(--color-card-hover)] hover:bg-[var(--color-success-bg)] hover:border-[var(--color-success-border)] hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]'}
                `}
                        >
                            <div className="p-3 rounded-2xl mb-3 bg-[var(--color-success-bg)] text-[var(--color-success)]">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-sm text-[var(--color-text)] text-center">Nova Transação</span>
                            <span className="text-xs font-mono text-[var(--color-text-muted)] uppercase mt-1">Financeiro</span>
                        </button>
                    )}
                </div>
                </div>
            </FocusTrap>
        </div>
    );

    return createPortal(modalContent, document.body);
};
