import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Rocket, Bell } from 'lucide-react';

export const Marketing: React.FC = () => {
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10';
    const accentBorder = isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20';

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className={`max-w-sm w-full mx-auto text-center p-10 border-2 ${accentBorder} ${accentBg} rounded-2xl`}>
                <div className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-2xl ${accentBg} border ${accentBorder}`}>
                    <Rocket className={`w-8 h-8 ${accentText}`} />
                </div>

                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${accentText} opacity-70`}>
                    Em breve
                </span>

                <h2 className="text-2xl font-heading text-white uppercase mt-3 mb-4">
                    Campanhas de Marketing
                </h2>

                <p className="text-sm text-text-secondary font-mono leading-relaxed">
                    Estamos preparando ferramentas para te ajudar a chamar clientes de volta e
                    preencher sua agenda.
                </p>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-text-secondary/60 font-mono">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Você será avisado quando estiver disponível</span>
                </div>
            </div>
        </div>
    );
};
