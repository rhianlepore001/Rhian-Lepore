import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Scissors, Users, Clock, Link2, Calendar, Rocket, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SetupStep {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    path: string;
    completed: boolean;
}

interface SetupCopilotProps {
    isBeauty: boolean;
    servicesCount: number;
    teamCount: number;
    hasBusinessHours: boolean;
    hasBookingSlug: boolean;
    appointmentsTotal: number;
}

export const SetupCopilot: React.FC<SetupCopilotProps> = ({
    isBeauty,
    servicesCount,
    teamCount,
    hasBusinessHours,
    hasBookingSlug,
    appointmentsTotal
}) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(false);

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    const steps: SetupStep[] = [
        {
            id: 'services',
            label: 'Cadastrar serviços',
            description: 'Adicione os serviços que você oferece com preço e duração.',
            icon: <Scissors className="w-4 h-4" />,
            path: '/configuracoes/servicos',
            completed: servicesCount > 0
        },
        {
            id: 'team',
            label: 'Adicionar equipe',
            description: 'Cadastre os profissionais que atendem no seu espaço.',
            icon: <Users className="w-4 h-4" />,
            path: '/configuracoes/equipe',
            completed: teamCount > 0
        },
        {
            id: 'hours',
            label: 'Configurar horários',
            description: 'Defina os dias e horários de funcionamento.',
            icon: <Clock className="w-4 h-4" />,
            path: '/configuracoes/agendamento',
            completed: hasBusinessHours
        },
        {
            id: 'booking',
            label: 'Compartilhar link de agendamento',
            description: 'Envie o link para seus clientes agendarem online.',
            icon: <Link2 className="w-4 h-4" />,
            path: '/configuracoes/agendamento',
            completed: hasBookingSlug
        },
        {
            id: 'first-appointment',
            label: 'Criar primeiro agendamento',
            description: 'Teste o sistema criando um agendamento.',
            icon: <Calendar className="w-4 h-4" />,
            path: '/agenda',
            completed: appointmentsTotal > 0
        }
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const percentage = Math.round((completedCount / steps.length) * 100);
    const allDone = completedCount === steps.length;

    // Don't show if all done or dismissed
    useEffect(() => {
        if (allDone && user?.id) {
            // Mark setup as complete in profile so we don't keep checking
            supabase.from('profiles').update({ setup_completed: true }).eq('id', user.id);
        }
    }, [allDone, user?.id]);

    if (dismissed || allDone) return null;

    const nextStep = steps.find(s => !s.completed);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`
                relative rounded-2xl border overflow-hidden
                ${isBeauty ? 'border-beauty-neon/15 bg-beauty-card/50' : 'border-white/8 bg-neutral-900/60'}
                backdrop-blur-md
            `}>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isBeauty ? 'bg-beauty-neon/10' : 'bg-accent-gold/10'}`}>
                            <Rocket className={`w-5 h-5 ${accentText}`} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold font-heading text-white">Configure seu espaço</h3>
                            <p className="text-[11px] text-text-secondary font-mono">{completedCount}/{steps.length} completo</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setDismissed(true)}
                        className="p-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
                        title="Fechar"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="px-5 pb-3">
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${accentBg}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Steps */}
                <div className="px-5 pb-5 space-y-1">
                    {steps.map((step) => (
                        <button
                            key={step.id}
                            onClick={() => !step.completed && navigate(step.path)}
                            disabled={step.completed}
                            className={`
                                w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                                ${step.completed
                                    ? 'opacity-50 cursor-default'
                                    : step.id === nextStep?.id
                                        ? `border ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-accent-gold/20 bg-accent-gold/5'} cursor-pointer`
                                        : 'hover:bg-white/3 cursor-pointer'
                                }
                            `}
                        >
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                ${step.completed
                                    ? 'bg-green-500/20 text-green-400'
                                    : step.id === nextStep?.id
                                        ? `${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon' : 'bg-accent-gold/20 text-accent-gold'}`
                                        : 'bg-white/5 text-text-secondary'
                                }
                            `}>
                                {step.completed ? <Check className="w-3.5 h-3.5" /> : step.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${step.completed ? 'text-text-secondary line-through' : 'text-white'}`}>
                                    {step.label}
                                </p>
                                {step.id === nextStep?.id && !step.completed && (
                                    <p className="text-[11px] text-text-secondary mt-0.5">{step.description}</p>
                                )}
                            </div>
                            {!step.completed && (
                                <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
