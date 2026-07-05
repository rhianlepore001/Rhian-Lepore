import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Scissors, Users, Clock, Link2, Calendar, Rocket, X, UserPlus, RefreshCw, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getOnboardingProgress, saveOnboardingStep, getSetupStatus } from '@/services/onboarding';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

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
export const SetupCopilot: React.FC = () => {
    const navigate = useNavigate();
    const { user, companyId } = useAuth();
    const { accent, colors, classes } = useBrutalTheme();
    const getDismissedKey = () => `setup_copilot_dismissed_${user?.id ?? 'anon'}`;
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined' || !user?.id) return false;
        return localStorage.getItem(`setup_copilot_dismissed_${user.id}`) === 'true';
    });
    const [loading, setLoading] = useState(true);
    const [resumeStepId, setResumeStepId] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);

    const getActivationSeenKey = () => `setup_copilot_activated_seen_${user?.id ?? 'anon'}`;

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

                // Se o sistema já foi ativado e o usuário já viu/dispensou a mensagem,
                // não mostrar mais o copilot
                const activationSeen = localStorage.getItem(getActivationSeenKey());
                const allDoneNow =
                    status.hasServices &&
                    status.hasTeam &&
                    status.hasClients &&
                    status.hasBusinessHours &&
                    status.hasBookingSlug &&
                    status.hasAppointments;
                const isActivatedNow = status.isActivated || allDoneNow;
                if (isActivatedNow && activationSeen === 'true') {
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

    // Expande automaticamente se houver steps pendentes e ainda não ativado
    useEffect(() => {
        if (!loading && !isActivated) {
            const pending = steps.some(s => !s.completed);
            if (pending) setIsExpanded(true);
        }
    }, [loading, isActivated, steps]);

    // Marca setup completo no perfil quando tudo concluído
    useEffect(() => {
        if (allDone && user?.id && !checks.isActivated) {
            supabase.from('profiles')
                .update({ setup_completed: true, activation_completed: true, activated_at: new Date().toISOString() })
                .eq('id', user.id)
                .then(({ error }) => {
                    if (error) console.warn('[SetupCopilot] Falha ao atualizar activation_completed:', error);
                });
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

    const successTextClass = classes.badgeSuccess.split(' ').find(c => c.startsWith('text-')) || 'text-emerald-400';
    const successBgClass = classes.badgeSuccess.split(' ').find(c => c.startsWith('bg-')) || 'bg-emerald-500/10';

    return (
        <div className="space-y-3">
            {/* Banner "continuar de onde parou" */}
            {resumeStep && !dismissed && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`relative rounded-2xl border p-4 overflow-hidden ${colors.card} ${colors.border}`}>
                        <button
                            onClick={handleDismissResume}
                            className={`absolute top-3 right-3 p-1.5 rounded-full ${colors.surfaceHover} ${colors.textSecondary} hover:text-theme-text transition-colors`}
                            aria-label="Dispensar"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-start gap-3 pr-8">
                            <div className={`flex-shrink-0 p-2 rounded-xl ${accent.bgDim}`}>
                                <RefreshCw className={`w-4 h-4 ${accent.text}`} />
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${colors.text} leading-snug`}>
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
                                className={`text-xs font-bold font-mono px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${accent.bgDim} ${accent.text} hover:brightness-110`}
                            >
                                Continuar <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDismissResume}
                                className={`text-xs ${colors.textSecondary} hover:text-theme-text transition-colors font-mono`}
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
                    <div className={`relative rounded-2xl border overflow-hidden ${colors.card} ${colors.border}`}>
                        {/* Header — clickable para expandir/colapsar */}
                        <button
                            onClick={() => setIsExpanded(v => !v)}
                            className="w-full flex items-center justify-between px-5 pt-5 pb-3 text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${accent.bgDim}`}>
                                    <Rocket className={`w-5 h-5 ${accent.text}`} />
                                </div>
                                <div>
                                    <h3 className={`text-sm font-bold font-heading ${colors.text}`}>
                                        {isActivated ? 'Sistema Ativado!' : 'Configure seu espaço'}
                                    </h3>
                                    <p className={`text-xs ${colors.textSecondary} font-mono`}>
                                        {isActivated
                                            ? '100% — tudo pronto!'
                                            : completedCount === 0
                                                ? `${steps.length} passos para começar`
                                                : `${completedCount} de ${steps.length} passos concluídos`
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {!isActivated && (
                                    <span className={`font-mono text-xs font-bold ${accent.text}`}>
                                        {percentage}%
                                    </span>
                                )}
                                <ChevronDown className={`w-4 h-4 ${colors.textSecondary} transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDismissed(true);
                                        localStorage.setItem(getDismissedKey(), 'true');
                                        if (isActivated) {
                                            localStorage.setItem(getActivationSeenKey(), 'true');
                                        }
                                    }}
                                    className={`p-1.5 rounded-full ${colors.surfaceHover} ${colors.textSecondary} hover:text-theme-text transition-colors`}
                                    title="Fechar"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </button>

                        {/* Barra de progresso */}
                        <div className="px-5 pb-3">
                            <div className={`w-full h-1.5 ${colors.inputBg} rounded-full overflow-hidden`}>
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${isActivated ? successBgClass : accent.bg}`}
                                    style={{ width: `${isActivated ? 100 : percentage}%` }}
                                />
                            </div>
                        </div>

                        {/* Steps (collapsible) */}
                        {!isActivated && isExpanded && (
                            <div className="px-5 pb-5 space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                                {steps.map((step) => (
                                    <div key={step.id}>
                                        <button
                                            onClick={() => handleStepClick(step)}
                                            disabled={step.completed}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                                                ${step.completed
                                                    ? `opacity-75 cursor-default ${successBgClass}`
                                            : step.id === nextStep?.id
                                                ? `${accent.bgDim} ring-1 ${accent.borderDim} cursor-pointer`
                                                : `opacity-60 hover:opacity-100 ${colors.surfaceHover} cursor-pointer`
                                                }`}
                                        >
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0
                                                ${step.completed
                                                    ? successBgClass
                                                    : step.id === nextStep?.id
                                                        ? `${accent.bgDim} ${accent.text}`
                                                        : `${colors.inputBg} ${colors.textSecondary}`
                                                }`}>
                                                {step.completed ? <Check className="w-3.5 h-3.5" /> : step.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-medium ${step.completed ? `${colors.textMuted} line-through` : colors.text}`}>
                                                        {step.label}
                                                    </p>
                                                    {step.id === 'team' && !step.completed && (
                                                        <span className={`text-xs font-mono font-bold ${colors.textSecondary} uppercase tracking-wide`}>
                                                            Opcional
                                                        </span>
                                                    )}
                                                    {step.completed && (
                                                        <span className={`text-xs font-mono font-bold ${successTextClass} uppercase tracking-wide`}>
                                                            Feito
                                                        </span>
                                                    )}
                                                    {!step.completed && step.id === nextStep?.id && (
                                                        <span className={`text-xs font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${accent.bgDim} ${accent.text}`}>
                                                            Próximo
                                                        </span>
                                                    )}
                                                </div>
                                                {!step.completed && (
                                                    <p className={`text-xs ${colors.textSecondary} mt-0.5`}>{step.description}</p>
                                                )}
                                            </div>
                                            {!step.completed && (
                                                <ChevronRight className={`w-4 h-4 ${colors.textSecondary} flex-shrink-0`} />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Mensagem de Sucesso */}
                        {isActivated && (
                            <div className={`px-5 pb-6 text-center animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                                <p className={`text-sm ${colors.textSecondary} leading-relaxed`}>
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
