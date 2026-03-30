import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Zap, Link, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { BrutalButton } from '../BrutalButton';

interface StepSuccessProps {
    accentColor: string;
    onComplete?: () => Promise<void> | void;
}

export const StepSuccess: React.FC<StepSuccessProps> = ({ accentColor, onComplete }) => {
    const navigate = useNavigate();
    const { markTutorialCompleted } = useAuth();

    const isBeauty = accentColor === 'beauty-neon';
    const accentClass = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20';

    const handleFinish = async (path: string) => {
        await markTutorialCompleted();
        await onComplete?.();
        navigate(path);
    };

    const nextSteps = [
        {
            icon: <Calendar className="w-5 h-5" />,
            label: 'Agendar Cliente',
            description: 'Crie seu primeiro agendamento',
            path: '/agenda',
        },
        {
            icon: <Zap className="w-5 h-5" />,
            label: 'Ver Oportunidades',
            description: 'Clientes e horários em risco',
            path: '/marketing',
        },
        {
            icon: <Link className="w-5 h-5" />,
            label: 'Link Público',
            description: 'Compartilhe seu link de agendamento',
            path: '/configuracoes/agendamento-publico',
        },
        {
            icon: <LayoutDashboard className="w-5 h-5" />,
            label: 'Dashboard',
            description: 'Ver painel principal',
            path: '/',
        },
    ];

    return (
        <div className="py-8 space-y-8">
            {/* Checkmark + Título */}
            <div className="text-center">
                <div className={`w-20 h-20 rounded-full ${accentBg} flex items-center justify-center mx-auto mb-6 animate-bounce-slow`}>
                    <CheckCircle className={`w-10 h-10 ${accentClass}`} />
                </div>
                <h2 className="text-2xl md:text-3xl font-heading text-white uppercase mb-3">
                    Tudo Pronto! 🚀
                </h2>
                <p className="text-neutral-400 text-sm max-w-sm mx-auto">
                    Seu setup foi concluído com sucesso. Por onde quer começar?
                </p>
            </div>

            {/* 4 CTAs em grid 2x2 */}
            <div className="grid grid-cols-2 gap-3">
                {nextSteps.map((step) => (
                    <button
                        key={step.path}
                        onClick={() => handleFinish(step.path)}
                        className="flex flex-col items-start gap-2 p-4 bg-neutral-900 border border-white/10 rounded-lg hover:border-white/30 hover:bg-white/5 transition-all text-left group"
                    >
                        <div className={`${accentClass} group-hover:scale-110 transition-transform`}>
                            {step.icon}
                        </div>
                        <div>
                            <p className="text-white text-sm font-bold font-heading">{step.label}</p>
                            <p className="text-neutral-500 text-xs mt-0.5">{step.description}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Dica contextual */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-xs text-neutral-400 leading-relaxed">
                    💡 <strong className="text-white">Dica:</strong> Comece agendando seu primeiro cliente para ativar o financeiro e acompanhar seus ganhos no dashboard.
                </p>
            </div>
        </div>
    );
};
