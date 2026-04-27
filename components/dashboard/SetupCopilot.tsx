import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Scissors, Users, Clock, Link2, Calendar, Rocket, X, UserPlus, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getOnboardingProgress, saveOnboardingStep, getSetupStatus } from '../../lib/onboarding';

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
    const { user, companyId } = useAuth();
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [resumeStepId, setResumeStepId] = useState<string | null>(null);

    // Estado de conclusão de cada step
    const [checks, setChecks] = useState({
        hasServices: false,
        hasTeam: false,
        hasClients: false,
        hasBusinessHours: false,
        hasBookingSlug: false,
        hasAppointments: false,
        isActivated: false,
    });

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    // Mapeador: step.id → check de conclusão
    const isStepComplete = (stepId: string, status = checks): boolean => {
        switch (stepId) {
            case 'services': return status.hasServices;
            case 'team': return status.hasTeam;
            case 'clients': return status.hasClients;
            case 'hours': return status.hasBusinessHours;
            case 'booking': return status.hasBookingSlug;
            case 'first-appointment': return status.hasAppointments;
            default: return false;
        }
    };

    // Busca o estado real de cada step diretamente nas tabelas corretas
    useEffect(() => {
        const checkSetupProgress = async () => {
            if (!user) return;
            try {
                const status = await getSetupStatus(user.id);
                // Step "booking" concluído por clique — persiste em localStorage
                if (!status.hasBookingSlug && localStorage.getItem(`booking_visited_${user.id}`) === 'true') {
                    status.hasBookingSlug = true;
                }
                setChecks(status);
                // Se já estava ativado antes (sessões futuras), oculta o card automaticamente
                if (status.isActivated) {
                    setDismissed(true);
                }

                // Detecta o último step visitado para oferecer retomada
                if (companyId) {
                    const progress = await getOnboardingProgress(companyId);
                    const stepData = progress?.step_data ?? {};
                    const lastStep = stepData.last_visited_step as string | undefined;

                    if (
                        lastStep &&
                        !stepData.guided_dismissed_at &&
                        !isStepComplete(lastStep, status)
                    ) {
                        setResumeStepId(lastStep);
                    } else {
                        setResumeStepId(null);
                    }
                }
            } catch {
                // Sem bloquear o dashboard em caso de erro de permissão
            } finally {
                setLoading(false);
            }
        };

        checkSetupProgress();

        window.addEventListener('setup-step-completed' as any, checkSetupProgress as any);
        return () => {
            window.removeEventListener('setup-step-completed' as any, checkSetupProgress as any);
        };
    }, [user, companyId]);

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
            description: 'Cadastre seus clientes no CRM para ativar a IA do AgendiX.',
            icon: <UserPlus className="w-4 h-4" />,
            path: '/clientes',
            completed: checks.hasClients,
        },
        {
            id: 'hours',
            label: 'Configurar horários',
            description: 'Defina os dias e horários de funcionamento.',
            icon: <Clock className="w-4 h-4" />,
            path: '/configuracoes/geral',
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
    const isActivated = checks.isActivated || allDone;

    // Marca setup completo no perfil quando tudo concluído
    useEffect(() => {
        if (allDone && user?.id && !checks.isActivated) {
            supabase.from('profiles').update({ setup_completed: true, activation_completed: true, activated_at: new Date().toISOString() }).eq('id', user.id);
            setChecks(prev => ({ ...prev, isActivated: true }));
        }
    }, [allDone, user?.id, checks.isActivated]);

    // Salva o step atual quando o usuário clica para navegar
    const handleStepClick = async (step: SetupStep) => {
        if (step.completed) return;

        // Step "booking" conclui imediatamente ao clicar
        if (step.id === 'booking' && user) {
            localStorage.setItem(`booking_visited_${user.id}`, 'true');
            setChecks(prev => ({ ...prev, hasBookingSlug: true }));
        }

        // Persiste o último step visitado para oferecer retomada na volta ao dashboard
        if (companyId) {
            try {
                const progress = await getOnboardingProgress(companyId);
                await saveOnboardingStep(
                    companyId,
                    progress?.current_step ?? 1,
                    (progress?.completed_steps ?? []) as number[],
                    { ...(progress?.step_data ?? {}), last_visited_step: step.id }
                );
            } catch {
                // Graceful — navegação não é bloqueada por erro de persistência
            }
        }

        navigate(step.path);
    };

    // Descarta o banner de retomada permanentemente
    const handleDismissResume = async () => {
        setResumeStepId(null);
        if (!companyId) return;
        try {
            const progress = await getOnboardingProgress(companyId);
            await saveOnboardingStep(
                companyId,
                progress?.current_step ?? 1,
                (progress?.completed_steps ?? []) as number[],
                { ...(progress?.step_data ?? {}), guided_dismissed_at: new Date().toISOString() }
            );
        } catch {
            // Graceful degradation — banner já foi ocultado localmente
        }
    };

    if (loading) return null;

    const nextStep = steps.find(s => !s.completed);
    const resumeStep = steps.find(s => s.id === resumeStepId);

    return (
        <div className="space-y-3">
            {/* Banner "continuar de onde parou" */}
            {resumeStep && !dismissed && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative rounded-2xl border p-4 overflow-hidden border-blue-500/20 bg-blue-500/5">
                        <button
                            onClick={handleDismissResume}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            aria-label="Dispensar"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start gap-3 pr-8">
                            <div className="flex-shrink-0 p-2 rounded-xl bg-blue-500/15">
                                <RefreshCw className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-snug">
                                    Você estava configurando &quot;{resumeStep.label}&quot; — quer continuar?
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3 pl-11">
                            <button
                                onClick={() => {
                                    setResumeStepId(null);
                                    navigate(resumeStep.path);
                                }}
                                className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            >
                                Continuar <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDismissResume}
                                className="text-xs text-text-secondary hover:text-white transition-colors font-mono"
                            >
                                Não, obrigado
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copilot card — oculto quando dismissed */}
            {!dismissed && (
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
                                    <h3 className="text-sm font-bold font-heading text-white">
                                        {isActivated ? 'Sistema Ativado! 🎉' : 'Configure seu espaço'}
                                    </h3>
                                    <p className="text-[11px] text-text-secondary font-mono">
                                        {isActivated
                                            ? '100% — tudo pronto! 🎉'
                                            : completedCount === 0
                                                ? `${steps.length} passos para começar`
                                                : `${completedCount} de ${steps.length} passos concluídos`
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isActivated && (
                                    <span className={`font-mono text-xs font-bold ${accentText}`}>
                                        {percentage}%
                                    </span>
                                )}
                                <button
                                    onClick={() => setDismissed(true)}
                                    className="p-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
                                    title="Fechar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Barra de progresso */}
                        <div className="px-5 pb-3">
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${isActivated ? 'bg-green-500' : accentBg}`}
                                    style={{ width: `${isActivated ? 100 : percentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Steps (Oculto se ativado) */}
                        {!isActivated && (
                            <div className="px-5 pb-5 space-y-1">
                            {steps.map((step) => (
                                <div key={step.id}>
                                    <button
                                        onClick={() => handleStepClick(step)}
                                        disabled={step.completed}
                                        className={`
                                            w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                                            ${step.completed
                                                ? 'opacity-75 cursor-default bg-green-500/5'
                                                : step.id === nextStep?.id
                                                    ? `border-l-2 ${isBeauty ? 'border-beauty-neon bg-beauty-neon/5' : 'border-accent-gold bg-accent-gold/5'} cursor-pointer`
                                                    : 'opacity-60 hover:opacity-100 hover:bg-white/3 cursor-pointer'
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
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-medium ${step.completed ? 'text-neutral-600 line-through' : 'text-white'}`}>
                                                    {step.label}
                                                </p>
                                                {step.id === 'team' && !step.completed && (
                                                    <span className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-wide">
                                                        Opcional
                                                    </span>
                                                )}
                                                {step.completed && (
                                                    <span className="text-[9px] font-mono font-bold text-green-500 uppercase tracking-wide">
                                                        ✓ Feito
                                                    </span>
                                                )}
                                                {!step.completed && step.id === nextStep?.id && (
                                                    <span className={`text-[9px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded
                                                        ${isBeauty ? 'bg-beauty-neon/20 text-beauty-neon' : 'bg-accent-gold/20 text-accent-gold'}`}>
                                                        Próximo
                                                    </span>
                                                )}
                                            </div>
                                            {!step.completed && (
                                                <p className="text-[11px] text-text-secondary mt-0.5">{step.description}</p>
                                            )}
                                        </div>
                                        {!step.completed && (
                                            <ChevronRight className="w-4 h-4 text-text-secondary flex-shrink-0" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                        )}

                        {/* Mensagem de Sucesso */}
                        {isActivated && (
                            <div className="px-5 pb-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <p className="text-sm text-text-secondary leading-relaxed">
                                    Sua barbearia já está online e pronta para receber agendamentos.
                                    Continue gerenciando sua agenda e clientes através do menu lateral.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
