import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Scissors, Users, Clock, Link2, Calendar, Rocket, X, UserPlus } from 'lucide-react';
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

/* O SetupCopilot faz suas próprias queries para verificar cada step com precisão,
   pois o dataMaturity.hasPublicBookings não reflete corretamente o estado de configuração. */
export const SetupCopilot: React.FC<{ isBeauty: boolean }> = ({ isBeauty }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [guidedStep, setGuidedStep] = useState<string | null>(null);

    // Estado de conclusão de cada step
    const [checks, setChecks] = useState({
        hasServices: false,
        hasTeam: false,
        hasClients: false,
        hasBusinessHours: false,
        hasBookingSlug: false,
        hasAppointments: false,
    });

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    // Busca o estado real de cada step diretamente nas tabelas corretas
    useEffect(() => {
        const checkSetupProgress = async () => {
            if (!user) return;
            try {
                const [
                    servicesRes,
                    teamRes,
                    clientsRes,
                    settingsRes,
                    profileRes,
                    appointmentsRes,
                ] = await Promise.all([
                    supabase.from('services').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('team_members').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('business_settings').select('business_hours, public_booking_enabled').eq('user_id', user.id).maybeSingle(),
                    supabase.from('profiles').select('business_slug').eq('id', user.id).single(),
                    supabase.from('appointments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                ]);

                const businessHours = settingsRes.data?.business_hours;
                // Considera horários configurados se o JSONB não for nulo e tiver pelo menos 1 dia preenchido
                const hasBusinessHours = !!businessHours && Object.keys(businessHours).length > 0;

                // Link ativo = tem slug no perfil E agendamento público habilitado nas configurações
                const hasBookingSlug =
                    !!profileRes.data?.business_slug && (settingsRes.data?.public_booking_enabled === true);

                setChecks({
                    hasServices: (servicesRes.count ?? 0) > 0,
                    hasTeam: (teamRes.count ?? 0) > 0,
                    hasClients: (clientsRes.count ?? 0) > 0,
                    hasBusinessHours,
                    hasBookingSlug,
                    hasAppointments: (appointmentsRes.count ?? 0) > 0,
                });
            } catch {
                // Sem bloquear o dashboard em caso de erro de permissão
            } finally {
                setLoading(false);
            }
        };

        checkSetupProgress();
    }, [user]);

    const steps: SetupStep[] = [
        {
            id: 'services',
            label: 'Cadastrar serviços',
            description: 'Adicione os serviços que você oferece com preço e duração.',
            icon: <Scissors className="w-4 h-4" />,
            path: '/configuracoes/servicos',
            completed: checks.hasServices,
        },
        {
            id: 'team',
            label: 'Adicionar equipe',
            description: 'Cadastre os profissionais que atendem no seu espaço.',
            icon: <Users className="w-4 h-4" />,
            path: '/configuracoes/equipe',
            completed: checks.hasTeam,
        },
        {
            id: 'clients',
            label: 'Adicionar clientes',
            description: 'Cadastre seus clientes no CRM para ativar a IA do AgenX.',
            icon: <UserPlus className="w-4 h-4" />,
            path: '/crm',
            completed: checks.hasClients,
        },
        {
            id: 'hours',
            label: 'Configurar horários',
            description: 'Defina os dias e horários de funcionamento.',
            icon: <Clock className="w-4 h-4" />,
            path: '/configuracoes/agendamento',
            completed: checks.hasBusinessHours,
        },
        {
            id: 'booking',
            label: 'Compartilhar link de agendamento',
            description: 'Ative e envie o link para seus clientes agendarem online.',
            icon: <Link2 className="w-4 h-4" />,
            path: '/configuracoes/agendamento',
            completed: checks.hasBookingSlug,
        },
        {
            id: 'first-appointment',
            label: 'Criar primeiro agendamento',
            description: 'Teste o sistema criando um agendamento.',
            icon: <Calendar className="w-4 h-4" />,
            path: '/agenda',
            completed: checks.hasAppointments,
        },
    ];

    const completedCount = steps.filter(s => s.completed).length;
    const percentage = Math.round((completedCount / steps.length) * 100);
    const allDone = completedCount === steps.length;

    // Marca setup completo no perfil quando tudo concluído
    useEffect(() => {
        if (allDone && user?.id) {
            supabase.from('profiles').update({ setup_completed: true }).eq('id', user.id);
        }
    }, [allDone, user?.id]);

    if (dismissed || allDone || loading) return null;

    const nextStep = steps.find(s => !s.completed);

    // Tooltip guiado: aparece somente quando 'clients' é o próximo passo pendente
    const showClientsTooltip = nextStep?.id === 'clients' && guidedStep !== 'dismissed';

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

                {/* Barra de progresso */}
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
                        <div key={step.id}>
                            <button
                                onClick={() => {
                                    if (step.completed) return;
                                    // Para o step de clientes, ativa tooltip guiado antes de navegar
                                    if (step.id === 'clients') {
                                        setGuidedStep('clients');
                                        setTimeout(() => navigate(step.path), 800);
                                        return;
                                    }
                                    navigate(step.path);
                                }}
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

                            {/* Tooltip guiado — aparece somente quando 'clientes' é o próximo step */}
                            {step.id === 'clients' && showClientsTooltip && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300 mx-3 mb-1">
                                    <div className={`
                                        relative mt-1 p-3 rounded-xl border text-left
                                        ${isBeauty ? 'border-beauty-neon/25 bg-beauty-neon/8' : 'border-accent-gold/25 bg-accent-gold/8'}
                                    `}>
                                        {/* Seta decorativa apontando para cima (em direção ao step) */}
                                        <div className={`absolute -top-1.5 left-6 w-3 h-3 rotate-45 border-l border-t
                                            ${isBeauty ? 'border-beauty-neon/25 bg-beauty-neon/8' : 'border-accent-gold/25 bg-accent-gold/8'}
                                        `} />
                                        <p className="text-[11px] text-text-secondary leading-relaxed">
                                            👉 Clique em{' '}
                                            <span className="text-white font-medium">Clientes</span>{' '}
                                            no menu lateral para cadastrar seu primeiro cliente e ativar os insights de IA.
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => navigate('/crm')}
                                                className={`text-[11px] font-mono font-bold ${accentText} hover:opacity-80 transition-opacity flex items-center gap-1`}
                                            >
                                                Ir agora <ChevronRight className="w-3 h-3" />
                                            </button>
                                            <span className="text-white/20 text-[10px]">·</span>
                                            <button
                                                onClick={() => setGuidedStep('dismissed')}
                                                className="text-[11px] font-mono text-text-secondary hover:text-white transition-colors"
                                            >
                                                Fechar dica
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
