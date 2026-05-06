import React from 'react';
import { Rocket, Bell } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

export const Marketing: React.FC = () => {
    const { accent, isBeauty } = useBrutalTheme();

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className={`max-w-sm w-full mx-auto text-center p-10 border-2 ${accent.borderDim} ${accent.bgDim} rounded-2xl`}>
                <div className={`w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-2xl ${accent.bgDim} border ${accent.borderDim}`}>
                    <Rocket className={`w-8 h-8 ${accent.text}`} />
                </div>

                <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${accent.text} opacity-70`}>
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
