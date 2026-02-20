import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, DollarSign, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';

interface QuickActionsModalProps {
    onClose: () => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({ onClose }) => {
    const navigate = useNavigate();
    const { userType } = useAuth();
    const { setModalOpen } = useUI();
    const isBeauty = userType === 'beauty';

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
            <div className={`relative w-full max-w-sm mx-4 mb-24 sm:mb-0 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-300
        ${isBeauty ? 'bg-beauty-card border border-white/10' : 'bg-neutral-900 border-2 border-accent-gold/50 shadow-heavy brutal-card-enhanced'}
      `}>
                <div className={`p-4 flex justify-between items-center ${isBeauty ? 'border-b border-white/10 bg-white/5' : 'border-b-2 border-accent-gold/20 bg-black/40'}`}>
                    <h3 className={`font-heading font-bold ${isBeauty ? 'text-white' : 'text-accent-gold'}`}>Ações Rápidas</h3>
                    <button onClick={onClose} className={`p-2 -mr-2 rounded-full transition-colors ${isBeauty ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-accent-gold/60 hover:text-accent-gold hover:bg-accent-gold/10'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => handleAction('/agenda?new=true')}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all active:scale-95
              ${isBeauty
                                ? 'border-beauty-neon/30 bg-beauty-neon/10 hover:bg-beauty-neon/20'
                                : 'border-accent-gold/30 bg-accent-gold/5 hover:bg-accent-gold/15 hover:border-accent-gold/50'}
            `}
                    >
                        <div className={`p-3 rounded-full mb-3 ${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon' : 'bg-accent-gold/20 text-accent-gold'}`}>
                            <Calendar className="w-8 h-8" />
                        </div>
                        <span className={`font-bold text-sm ${isBeauty ? 'text-white' : 'text-white'}`}>Novo Atendimento</span>
                    </button>

                    <button
                        onClick={() => handleAction('/financeiro?new=true')}
                        className={`flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all active:scale-95
              ${isBeauty
                                ? 'border-green-500/30 bg-green-500/10 hover:bg-green-500/20'
                                : 'border-green-500/30 bg-green-500/5 hover:bg-green-500/15 hover:border-green-500/50'}
            `}
                    >
                        <div className={`p-3 rounded-full mb-3 ${isBeauty ? 'bg-green-500/20 text-green-400' : 'bg-green-500/20 text-green-400'}`}>
                            <DollarSign className="w-8 h-8" />
                        </div>
                        <span className={`font-bold text-sm ${isBeauty ? 'text-white' : 'text-white'}`}>Nova Transação</span>
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};
