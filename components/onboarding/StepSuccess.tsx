import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

interface StepSuccessProps {
    accentColor: string;
}

export const StepSuccess: React.FC<StepSuccessProps> = ({ accentColor }) => {
    const navigate = useNavigate();

    return (
        <div className="text-center py-8">
            <div className={`w-20 h-20 rounded-full bg-${accentColor}/20 flex items-center justify-center mx-auto mb-6 animate-bounce-slow`}>
                <CheckCircle className={`w-10 h-10 text-${accentColor}`} />
            </div>

            <h2 className="text-2xl md:text-3xl font-heading text-white uppercase mb-4">
                Tudo Pronto! 🚀
            </h2>

            <p className="text-neutral-400 text-lg mb-8 max-w-md mx-auto">
                {accentColor === 'beauty-neon'
                    ? 'Seu espaço foi configurado com sucesso. Agora você tem acesso total ao painel de controle.'
                    : 'Sua barbearia foi configurada com sucesso. Agora você tem acesso total ao painel de controle.'}
            </p>

            <button
                onClick={() => navigate('/')}
                className={`w-full py-4 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center justify-center gap-2 text-lg`}
            >
                Ir para o Dashboard
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    );
};
