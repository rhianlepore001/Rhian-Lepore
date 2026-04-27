import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { Calendar, DollarSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

interface QuickActionsModalProps {
    onClose: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { userType, role } = useAuth();
    const { setModalOpen } = useUI();
    const isBeauty = userType === 'beauty';
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
        <div className="fixed inset-0 z-[999] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />
            <FocusTrap active={true}>
                <div className={`relative w-full max-w-sm mx-4 mb-24 sm:mb-0 rounded-2xl shadow-promax-glass overflow-hidden animate-in slide-in-from-bottom-10 duration-300
        ${isBeauty ? 'bg-gradient-to-br from-beauty-card/95 to-beauty-dark/95 border border-white/10 backdrop-blur-2xl' : 'bg-brutal-card/80 border border-white/10 backdrop-blur-2xl'}
      `}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="quick-actions-title"
                >
                <div className={`p-4 flex justify-between items-center ${isBeauty ? 'border-b border-white/10 bg-white/5' : 'border-b border-white/5 bg-white/[0.02]'}`}>
                    <h3 id="quick-actions-title" className="font-heading font-bold text-white">Ações Rápidas</h3>
                    <button onClick={onClose} className={`p-2 -mr-2 rounded-full transition-colors ${isBeauty ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-accent-gold/60 hover:text-accent-gold hover:bg-accent-gold/10'}`} aria-label="Fechar ações rápidas" title="Fechar">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className={`p-4 grid gap-4 ${isStaff ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    <button
                        onClick={() => handleAction('/agenda?new=true')}
                        className={`animate-in fade-in duration-300 delay-[0ms] flex min-h-[144px] flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 active:scale-95 hover:scale-[1.02]
              ${isBeauty
                                ? 'border-beauty-neon/20 bg-white/[0.05] hover:bg-beauty-neon/10 hover:shadow-neon'
                                : 'border-accent-gold/20 bg-white/[0.04] hover:bg-accent-gold/10 hover:border-accent-gold/40 hover:shadow-gold'}
            `}
                    >
                        <div className={`p-3 rounded-2xl mb-3 ${isBeauty ? 'bg-beauty-neon/15 text-beauty-neon' : 'bg-accent-gold/15 text-accent-gold'}`}>
                            <Calendar className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-sm text-white text-center">Novo Atendimento</span>
                        <span className="text-[10px] font-mono text-neutral-500 uppercase mt-1">Agenda</span>
                    </button>

                    {!isStaff && (
                        <button
                            onClick={() => handleAction('/financeiro?new=true')}
                            className={`animate-in fade-in duration-300 delay-[50ms] flex min-h-[144px] flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 active:scale-95 hover:scale-[1.02]
                  ${isBeauty
                                    ? 'border-green-500/20 bg-white/[0.05] hover:bg-green-500/10 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]'
                                    : 'border-green-500/20 bg-white/[0.04] hover:bg-green-500/10 hover:border-green-500/40 hover:shadow-[0_0_12px_rgba(52,211,153,0.15)]'}
                `}
                        >
                            <div className="p-3 rounded-2xl mb-3 bg-green-500/15 text-green-400">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-sm text-white text-center">Nova Transação</span>
                            <span className="text-[10px] font-mono text-neutral-500 uppercase mt-1">Financeiro</span>
                        </button>
                    )}
                </div>
                </div>
            </FocusTrap>
        </div>
    );

    return createPortal(modalContent, document.body);
};
