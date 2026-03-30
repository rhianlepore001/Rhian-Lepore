import React, { useState, useEffect } from 'react';
import { Check, ChevronRight, Scissors, Users, Clock, Link2, Calendar, Rocket, X, UserPlus, Compass, Square, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGuidedMode } from '../../contexts/GuidedModeContext';
import { getOnboardingProgress, saveOnboardingStep, getSetupStatus } from '../../lib/onboarding';
import { WIZARD_TARGETS, WizardStepId } from '../../constants/WIZARD_TARGETS';

interface SetupStep {
    id: string;
    label: string;
    description: string;
    icon: React.ReactNode;
    path: string;
    completed: boolean;
}

// Ordem de prioridade para o primeiro step pendente do tour guiado
const STEP_PRIORITY: WizardStepId[] = ['services', 'team', 'hours', 'profile', 'booking', 'appointment'];

/* O SetupCopilot faz suas próprias queries para verificar cada step com precisão,
   pois o dataMaturity.hasPublicBookings não reflete corretamente o estado de configuração. */
export const SetupCopilot: React.FC<{ isBeauty: boolean }> = ({ isBeauty }) => {
    const navigate = useNavigate();
    const { user, companyId } = useAuth();
    const { startGuide, endGuide, isGuideActive, activeStep } = useGuidedMode();
    const [dismissed, setDismissed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [guidedStep, setGuidedStep] = useState<string | null>(null);
    const [showTourBanner, setShowTourBanner] = useState(false);
    const [resumeStepId, setResumeStepId] = useState<WizardStepId | null>(null);

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

    // Busca o estado real de cada step diretamente nas tabelas corretas
    // Também carrega onboarding_progress para detectar se é a primeira visita
    useEffect(() => {
        const checkSetupProgress = async () => {
            if (!user) return;
            try {
                const status = await getSetupStatus(user.id);
                setChecks(status);

                // AC1: detectar primeira visita via onboarding_progress.step_data
                if (companyId) {
                    const progress = await getOnboardingProgress(companyId);
                    const stepData = progress?.step_data ?? {};
                    const isFirstVisit =
                        progress?.is_completed === false &&
                        !stepData.guided_started &&
                        !stepData.guided_dismissed_at;
                    setShowTourBanner(isFirstVisit);

                    // Verifica status para o guided_step pendente no ato da retomada
                    const _isWizardStepComplete = (id: WizardStepId): boolean => {
                        switch (id) {
                            case 'services': return status.hasServices;
                            case 'team': return status.hasTeam;
                            case 'hours': return status.hasBusinessHours;
                            case 'profile': return false; // sem check
                            case 'booking': return status.hasBookingSlug;
                            case 'appointment': return status.hasAppointments;
                        }
                    };

                    const lastStep = stepData.last_guided_step as WizardStepId | undefined;
                    
                    // AC1, AC6: Se step guiado não acabou ainda, retoma!
                    if (
                        lastStep &&
                        stepData.guided_started &&
                        !stepData.guided_dismissed_at &&
                        !_isWizardStepComplete(lastStep) &&
                        !isFirstVisit
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

        const handleStepCompleted = () => {
            checkSetupProgress();
        };

        window.addEventListener('setup-step-completed' as any, handleStepCompleted as any);

        return () => {
            window.removeEventListener('setup-step-completed' as any, handleStepCompleted as any);
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
    const isActivated = checks.isActivated || allDone; // Força ativado se tiver 100% completo

    // Marca setup completo no perfil quando tudo concluído
    useEffect(() => {
        if (allDone && user?.id && !checks.isActivated) {
            supabase.from('profiles').update({ setup_completed: true, activation_completed: true, activated_at: new Date().toISOString() }).eq('id', user.id);
            setChecks(prev => ({ ...prev, isActivated: true }));
        }
    }, [allDone, user?.id, checks.isActivated]);

    // Mapeia WizardStepId para o check de conclusão correspondente
    const isWizardStepComplete = (id: WizardStepId): boolean => {
        switch (id) {
            case 'services': return checks.hasServices;
            case 'team': return checks.hasTeam;
            case 'hours': return checks.hasBusinessHours;
            case 'profile': return false; // sem check equivalente no SetupCopilot
            case 'booking': return checks.hasBookingSlug;
            case 'appointment': return checks.hasAppointments;
        }
    };

    // Primeiro step pendente na ordem de prioridade
    const firstPendingStepId: WizardStepId =
        STEP_PRIORITY.find(id => !isWizardStepComplete(id)) ?? 'services';

    // AC7: detecta se um step é o atualmente guiado
    const isGuidedStep = (stepId: string): boolean => {
        const wizardStepId = getWizardStepId(stepId);
        return wizardStepId === activeStep;
    };

    // AC1: mapeador de SetupCopilot.step.id para WizardStepId (para guided mode)
    const getWizardStepId = (stepId: string): WizardStepId | null => {
        switch (stepId) {
            case 'services': return 'services';
            case 'team': return 'team';
            case 'hours': return 'hours';
            case 'booking': return 'booking';
            case 'first-appointment': return 'appointment';
            default: return null; // 'clients' sem target
        }
    };

    // AC1: refatorado click handler — startGuide + navigate
    const handleStepClick = async (step: SetupStep) => {
        if (step.completed) return;

        const wizardStepId = getWizardStepId(step.id);

        // AC2/AC9: ativa guided mode se tem target em WIZARD_TARGETS
        if (wizardStepId) {
            startGuide(wizardStepId);
        }

        // Special case: 'clients' tem tooltip guiado separado
        if (step.id === 'clients') {
            setGuidedStep('clients');
            setTimeout(() => navigate(step.path), 800);
            return;
        }

        navigate(step.path);
    };

    // AC6: para o tutorial
    const handleStopGuide = () => {
        endGuide();
    };

    // AC3: inicia o tour guiado e navega para o primeiro step pendente
    const handleStartTour = () => {
        setShowTourBanner(false);
        startGuide(firstPendingStepId);
        navigate(WIZARD_TARGETS[firstPendingStepId].path);
    };

    // AC4/AC6: salva guided_dismissed_at e oculta o banner permanentemente
    const handleDismissTour = async () => {
        setShowTourBanner(false);
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

    // Tooltip guiado: aparece somente quando 'clients' é o próximo passo pendente
    const showClientsTooltip = nextStep?.id === 'clients' && guidedStep !== 'dismissed';

    return (
        <div className="space-y-3">
            {/* AC1/AC7/AC3: Banner de Retomada (US-0407) */}
            {resumeStepId && !dismissed && !showTourBanner && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative rounded-2xl border p-4 overflow-hidden border-blue-500/20 bg-blue-500/5">
                        <button
                            onClick={handleDismissTour}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            aria-label="Não, obrigado"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {/* AC3: Ícone e copy distintos */}
                        <div className="flex items-start gap-3 pr-8">
                            <div className="flex-shrink-0 p-2 rounded-xl bg-blue-500/15">
                                <RefreshCw className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-snug">
                                    Você parou em {steps.find(s => getWizardStepId(s.id) === resumeStepId)?.label} — quer continuar?
                                </p>
                            </div>
                        </div>

                        {/* AC4/AC5: Ações */}
                        <div className="flex items-center gap-3 mt-3 pl-11">
                            <button
                                onClick={() => {
                                    setResumeStepId(null);
                                    startGuide(resumeStepId);
                                    navigate(WIZARD_TARGETS[resumeStepId].path);
                                }}
                                className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            >
                                Continuar <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDismissTour}
                                className="text-xs text-text-secondary hover:text-white transition-colors font-mono"
                            >
                                Não, obrigado
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AC1/AC8: Banner de boas-vindas — aparece apenas na primeira visita, com animação slide-in */}
            {showTourBanner && !dismissed && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`
                        relative rounded-2xl border p-4 overflow-hidden
                        ${isBeauty ? 'border-beauty-neon/20 bg-beauty-neon/5' : 'border-accent-gold/20 bg-accent-gold/5'}
                    `}>
                        {/* AC6: Botão fechar com mesmo comportamento de "Pular" */}
                        <button
                            onClick={handleDismissTour}
                            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-white/10 text-text-secondary hover:text-white transition-colors"
                            aria-label="Pular por agora"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Ícone + copy */}
                        <div className="flex items-start gap-3 pr-8">
                            <div className={`flex-shrink-0 p-2 rounded-xl ${isBeauty ? 'bg-beauty-neon/15' : 'bg-accent-gold/15'}`}>
                                <Compass className={`w-4 h-4 ${accentText}`} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white leading-snug">
                                    Quer um tour guiado pelo sistema?
                                </p>
                                <p className="text-[11px] text-text-secondary mt-0.5">
                                    Vamos configurar tudo em menos de 5 minutos.
                                </p>
                            </div>
                        </div>

                        {/* AC3/AC4: Botões de ação */}
                        <div className="flex items-center gap-3 mt-3 pl-11">
                            <button
                                onClick={handleStartTour}
                                className={`
                                    text-xs font-bold font-mono px-3 py-1.5 rounded-lg
                                    flex items-center gap-1 transition-colors
                                    ${isBeauty
                                        ? 'bg-beauty-neon/20 text-beauty-neon hover:bg-beauty-neon/30'
                                        : 'bg-accent-gold/20 text-accent-gold hover:bg-accent-gold/30'
                                    }
                                `}
                            >
                                Iniciar Tour <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={handleDismissTour}
                                className="text-xs text-text-secondary hover:text-white transition-colors font-mono"
                            >
                                Pular por agora
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
                                        {isActivated ? '100% completo' : `${completedCount}/${steps.length} completo`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* AC5/AC6: Botão "Parar tutorial" quando guided mode ativo */}
                                {isGuideActive && (
                                    <button
                                        onClick={handleStopGuide}
                                        className={`text-[11px] font-mono font-bold px-2 py-1 rounded-lg transition-colors
                                            ${isBeauty
                                                ? 'bg-beauty-neon/15 text-beauty-neon hover:bg-beauty-neon/25'
                                                : 'bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25'
                                            }
                                        `}
                                    >
                                        ◼ Parar tutorial
                                    </button>
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
                                <div key={step.id} className={isGuideActive && !isGuidedStep(step.id) ? 'opacity-50' : ''}>
                                    <button
                                        onClick={() => handleStepClick(step)}
                                        disabled={step.completed}
                                        className={`
                                            w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all
                                            ${step.completed
                                                ? 'opacity-50 cursor-default'
                                                : isGuidedStep(step.id)
                                                    ? `border-2 ${isBeauty ? 'border-beauty-neon bg-beauty-neon/10' : 'border-accent-gold bg-accent-gold/10'} cursor-pointer`
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
                                            <div className="flex items-center gap-2">
                                                <p className={`text-sm font-medium ${step.completed ? 'text-text-secondary line-through' : 'text-white'}`}>
                                                    {step.label}
                                                </p>
                                                {/* AC4: Badge "Opcional" para o step team */}
                                                {step.id === 'team' && (
                                                    <span className="text-[9px] font-mono font-bold text-text-secondary uppercase tracking-wide">
                                                        Opcional
                                                    </span>
                                                )}
                                            </div>
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
                        )}
                        
                        {/* Mensagem de Sucesso (Se ativado) */}
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
