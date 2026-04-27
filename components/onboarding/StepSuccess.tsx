import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Calendar, Zap, Link, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

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

    const [primary, ...secondary] = nextSteps;

    return (
        <div className="py-6 space-y-6">
            {/* Checkmark + Título */}
            <div className="text-center">
                <div className={`w-16 h-16 rounded-full ${accentBg} flex items-center justify-center mx-auto mb-5 animate-bounce-slow`}>
                    <CheckCircle className={`w-8 h-8 ${accentClass}`} />
                </div>
                <h2 className="text-2xl md:text-3xl font-heading text-white uppercase mb-2">
                    Tudo Pronto
                </h2>
                <p className="text-neutral-400 text-sm max-w-xs mx-auto">
                    Por onde quer começar?
                </p>
            </div>

            {/* CTA primário — destaque */}
            <button
                onClick={() => handleFinish(primary.path)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left group
                    ${isBeauty
                        ? 'border-beauty-neon/40 bg-beauty-neon/10 hover:bg-beauty-neon/20 hover:border-beauty-neon/70'
                        : 'border-accent-gold/40 bg-accent-gold/10 hover:bg-accent-gold/20 hover:border-accent-gold/70'}`}
            >
                <div className={`w-10 h-10 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0 ${accentClass}`}>
                    {primary.icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className={`font-heading font-bold uppercase text-sm ${accentClass}`}>{primary.label}</p>
                    <p className="text-neutral-400 text-xs mt-0.5">{primary.description}</p>
                </div>
                <div className={`${accentClass} opacity-60 group-hover:opacity-100 transition-opacity`}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </button>

            {/* CTAs secundários */}
            <div className="grid grid-cols-3 gap-2">
                {secondary.map((step) => (
                    <button
                        key={step.path}
                        onClick={() => handleFinish(step.path)}
                        className="flex flex-col items-center gap-2 p-3 bg-white/4 border border-white/8 rounded-lg hover:border-white/20 hover:bg-white/8 transition-all text-center group"
                    >
                        <div className={`${accentClass} opacity-70 group-hover:opacity-100 transition-opacity`}>
                            {step.icon}
                        </div>
                        <p className="text-neutral-400 text-xs font-bold leading-tight group-hover:text-white transition-colors">{step.label}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};
