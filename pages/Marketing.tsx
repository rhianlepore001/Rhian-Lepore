import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Sparkles, Bell } from 'lucide-react';

export const Marketing: React.FC = () => {
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon/30' : 'border-accent-gold/30';
    const accentGlow = isBeauty
        ? 'shadow-[0_0_60px_rgba(255,0,255,0.08)]'
        : 'shadow-[0_0_60px_rgba(212,175,55,0.08)]';

    return (
        <div className="min-h-[70vh] flex items-center justify-center px-4">
            <div className={`max-w-md w-full text-center space-y-8 p-10 rounded-2xl border ${accentBorder} bg-neutral-950 ${accentGlow}`}>
                {/* Ícone principal */}
                <div className="relative inline-flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'}`} />
                    <div className={`relative w-20 h-20 rounded-2xl border ${accentBorder} bg-neutral-900 flex items-center justify-center`}>
                        <Megaphone className={`w-9 h-9 ${accentText}`} />
                    </div>
                    <div className="absolute -top-1 -right-1">
                        <Sparkles className={`w-5 h-5 ${accentText} animate-pulse`} />
                    </div>
                </div>

                {/* Texto */}
                <div className="space-y-3">
                    <p className={`text-[10px] font-mono uppercase tracking-[0.3em] ${accentText}`}>
                        Em breve
                    </p>
                    <h2 className="text-3xl font-heading text-white uppercase tracking-tighter leading-tight">
                        Central de Marketing
                    </h2>
                    <p className="text-text-secondary text-sm font-mono leading-relaxed">
                        Campanhas inteligentes, calendário de conteúdo e estúdio visual com IA estão sendo preparados para você.
                    </p>
                </div>

                {/* Divider */}
                <div className={`border-t ${accentBorder} opacity-30`} />

                {/* Features preview */}
                <div className="space-y-3 text-left">
                    {[
                        'Campanhas via WhatsApp com IA',
                        'Calendário de tendências do setor',
                        'Estúdio Visual — posts prontos para Instagram',
                        'Radar de oportunidades de receita',
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full ${isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold'} opacity-50 flex-shrink-0`} />
                            <span className="text-xs font-mono text-text-secondary">{feature}</span>
                        </div>
                    ))}
                </div>

                {/* CTA notificação */}
                <button
                    disabled
                    className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl border ${accentBorder} text-xs font-mono uppercase tracking-widest ${accentText} opacity-50 cursor-not-allowed`}
                >
                    <Bell className="w-3.5 h-3.5" />
                    Notificar quando disponível
                </button>
            </div>
        </div>
    );
};
