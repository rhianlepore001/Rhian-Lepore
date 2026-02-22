import React from 'react';
import { X, Trophy, Rocket, Target, Zap, MessageSquare } from 'lucide-react';
import { BrutalButton } from '../BrutalButton';

interface AIOSStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    isBeauty: boolean;
}

export const AIOSStrategyModal: React.FC<AIOSStrategyModalProps> = ({ isOpen, onClose, isBeauty }) => {
    if (!isOpen) return null;

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const borderClass = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';

    const playbooks = [
        {
            icon: <Trophy className={`w-5 h-5 ${accentText}`} />,
            title: "O Radar de Oportunidades",
            description: "Identifique quem não aparece há 30 dias. Recuperar 2 clientes por semana paga o sistema e sobra lucro neto.",
            tag: "LUCRO RÁPIDO"
        },
        {
            icon: <MessageSquare className={`w-5 h-5 ${accentText}`} />,
            title: "Script que Converte",
            description: "Use o link de WhatsApp no CRM. Dica: 'Notei que faz tempo que não damos aquele trato. Tenho uma vaga pra quinta!'",
            tag: "CONVERSÃO"
        },
        {
            icon: <Target className={`w-5 h-5 ${accentText}`} />,
            title: "Psicologia da Meta",
            description: "Defina metas 10% maiores que o mês passado. O sistema brilha mais forte conforme você se aproxima.",
            tag: "CRESCIMENTO"
        }
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`
                relative w-full max-w-2xl bg-neutral-900 border-2 ${borderClass} 
                rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300
            `}>
                {/* Header Gradient */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${accentBg} opacity-50`} />

                <div className="p-6 md:p-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className={`w-4 h-4 ${accentText} animate-pulse`} />
                                <span className={`text-[10px] font-mono uppercase tracking-[0.3em] ${accentText}`}>AgenX Success Playbook</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-heading text-white">Guia de Mestre AIOS</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid gap-4 md:gap-6">
                        {playbooks.map((p, idx) => (
                            <div
                                key={idx}
                                className="group p-4 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="mt-1 p-3 rounded-xl bg-black/40 border border-white/5 group-hover:scale-110 transition-transform">
                                        {p.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-heading text-lg text-white">{p.title}</h3>
                                            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/5">
                                                {p.tag}
                                            </span>
                                        </div>
                                        <p className="text-sm text-text-secondary leading-relaxed font-inter">
                                            {p.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <div className="flex items-center gap-4 text-left">
                            <Rocket className={`w-8 h-8 ${accentText} opacity-40`} />
                            <div>
                                <p className="text-xs text-white uppercase font-bold tracking-widest mb-1">Dica Pro:</p>
                                <p className="text-[11px] text-text-secondary max-w-xs font-mono">
                                    Ative o 2FA para garantir que seus dados estratégicos estejam blindados.
                                </p>
                            </div>
                        </div>
                        <BrutalButton onClick={onClose} className="w-full md:w-auto">
                            ENTENDI, VAMOS FATURAR!
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
