import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useAuth } from "../contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

type TourContext = 'dashboard' | 'agenda' | 'settings' | 'general';

export const useAppTour = () => {
    const { user, userType } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isBeauty = userType === 'beauty';

    // Cores e Textos do tema
    const themeName = isBeauty ? 'Beauty OS' : 'Barber OS';

    // Configuração base do Driver
    const driverConfig = {
        showProgress: true,
        animate: true,
        allowClose: true,
        doneBtnText: "Entendi",
        nextBtnText: "Próximo →",
        prevBtnText: "← Voltar",
        progressText: "{{current}} de {{total}}",
    };

    const startTour = (context: TourContext = 'dashboard') => {
        const isMobile = window.innerWidth < 768;

        // Injetar estilos customizados se não existirem
        if (!document.getElementById('driver-custom-styles')) {
            const style = document.createElement('style');
            style.id = 'driver-custom-styles';
            style.innerHTML = `
                .driver-popover.driverjs-theme {
                    background-color: ${isBeauty ? '#1e1e1e' : '#0f0f0f'} !important;
                    color: #ffffff !important;
                    border: 1px solid ${isBeauty ? 'rgba(255, 255, 255, 0.1)' : '#333'} !important;
                    border-radius: 16px !important;
                    padding: 24px !important;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.6) !important;
                    max-width: 350px !important;
                }
                .driver-popover.driverjs-theme .driver-popover-title {
                    font-family: 'Syne', sans-serif !important;
                    font-size: 20px !important;
                    font-weight: 700 !important;
                    margin-bottom: 12px !important;
                    color: ${isBeauty ? '#eba6f0' : '#c4a06f'} !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                }
                .driver-popover.driverjs-theme .driver-popover-description {
                    font-family: 'Inter', sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                    color: #d4d4d4 !important;
                    margin-bottom: 24px !important;
                }
                .driver-popover.driverjs-theme .driver-popover-footer button {
                    background-color: ${isBeauty ? '#eba6f0' : '#c4a06f'} !important;
                    color: #000000 !important;
                    border: none !important;
                    border-radius: 8px !important;
                    padding: 8px 16px !important;
                    font-weight: 700 !important;
                    font-size: 13px !important;
                    text-transform: uppercase !important;
                    text-shadow: none !important;
                }
                .driver-popover.driverjs-theme .driver-popover-footer button:hover {
                    opacity: 0.9 !important;
                }
                .driver-popover.driverjs-theme .driver-popover-footer button.driver-popover-btn-disabled {
                    opacity: 0.5 !important;
                    cursor: not-allowed !important;
                }
                /* Seta do popover */
                .driver-popover.driverjs-theme .driver-popover-arrow-side-left.driver-popover-arrow {
                    border-left-color: ${isBeauty ? '#1e1e1e' : '#0f0f0f'} !important;
                }
                .driver-popover.driverjs-theme .driver-popover-arrow-side-right.driver-popover-arrow {
                    border-right-color: ${isBeauty ? '#1e1e1e' : '#0f0f0f'} !important;
                }
                .driver-popover.driverjs-theme .driver-popover-arrow-side-top.driver-popover-arrow {
                    border-top-color: ${isBeauty ? '#1e1e1e' : '#0f0f0f'} !important;
                }
                .driver-popover.driverjs-theme .driver-popover-arrow-side-bottom.driver-popover-arrow {
                    border-bottom-color: ${isBeauty ? '#1e1e1e' : '#0f0f0f'} !important;
                }
            `;
            document.head.appendChild(style);
        }

        let steps: DriveStep[] = [];

        // Definição dos Passos por Contexto
        if (context === 'dashboard') {
            steps = [
                {
                    element: '#root',
                    popover: {
                        title: `Olá! Bem-vindo ao ${themeName} ✨`,
                        description: 'Prepare-se para transformar a gestão do seu negócio. Vamos fazer um tour personalizado para você dominar tudo.',
                        align: 'center',
                        side: 'bottom' // Ajuste para centralizar visualmente melhor
                    }
                },
                {
                    element: '#header-notifications-btn',
                    popover: {
                        title: '🔔 Centro de Alertas',
                        description: 'Fique tranquilo! O sistema avisa aqui sobre novos agendamentos, cancelamentos ou metas batidas.',
                        side: 'bottom',
                        align: 'end'
                    }
                },
                {
                    element: '#header-profile-btn',
                    popover: {
                        title: '👤 Seu Perfil',
                        description: 'Acesse aqui para mudar sua foto, editar dados do negócio ou sair do sistema. É o seu espaço pessoal.',
                        side: 'bottom',
                        align: 'end'
                    }
                },
                {
                    element: isMobile ? '#mobile-menu-btn' : '#sidebar-container',
                    popover: {
                        title: '🧭 Menu de Navegação',
                        description: isMobile
                            ? 'Toque aqui para expandir todas as ferramentas: Agenda, Clientes e Financeiro.'
                            : 'Aqui fica o painel de controle da sua nave. Tudo o que você precisa está à esquerda.',
                        side: isMobile ? "bottom" : "right",
                        align: 'start'
                    }
                },
                {
                    element: '#dashboard-appointments-list',
                    popover: { // NOVO PASSO
                        title: '📅 Próximos Clientes',
                        description: 'Sua agenda do dia resumida. Veja quem está chegando para não perder nenhum horário.',
                        side: isMobile ? "top" : "left",
                        align: 'center'
                    }
                },
                {
                    element: '#dashboard-profit-card',
                    popover: {
                        title: '💰 Faturamento em Tempo Real',
                        description: 'Acompanhe cada centavo que entra. Vendo esse número crescer é que a mágica acontece!',
                        side: "bottom",
                        align: 'center'
                    }
                },
                {
                    element: '#dashboard-new-appointment',
                    popover: {
                        title: '⚡ Agendamento Relâmpago',
                        description: 'Cliente na linha ou no balcão? Clique aqui para agendar em segundos sem sair dessa tela.',
                        side: isMobile ? "top" : "left",
                        align: 'center'
                    }
                },
                {
                    element: '#root', // Passo final de transição
                    popover: {
                        title: 'Vamos ver a Agenda Completa?',
                        description: 'Agora que você conhece o painel, vamos mergulhar na Agenda Principal. Clique em "Próximo" para viajar até lá!',
                        align: 'center',
                        onNextClick: () => {
                            navigate('/agenda');
                            localStorage.setItem(`tour_step_${user?.id}`, 'agenda_pending');
                            driverObj.destroy();
                        }
                    }
                }
            ];
        } else if (context === 'agenda') {
            // ... (keep agenda steps logic same as before, maybe slight copy tweak)
            steps = [
                {
                    element: '#root',
                    popover: {
                        title: '📅 Sua Agenda Profissional',
                        description: 'Visualização clara de todos os seus horários. Arraste, clique e organize seu tempo como um mestre.',
                        align: 'center'
                    }
                },
                {
                    element: isMobile ? '.fc-toolbar-title' : '.fc-timegrid-slot',
                    popover: {
                        title: '👆 Toque e Agende',
                        description: 'Basta clicar ou tocar em qualquer horário vazio para criar um novo agendamento. Simples e intuitivo.',
                        align: 'center',
                        side: isMobile ? 'bottom' : 'top'
                    }
                },
                {
                    element: '#root',
                    popover: {
                        title: '⚙️ Configurações Vitais',
                        description: 'Para finalizar, vamos ajustar seus Preços e Equipe. É passo fundamental para começar a faturar.',
                        align: 'center',
                        onNextClick: () => {
                            navigate('/configuracoes/geral');
                            localStorage.setItem(`tour_step_${user?.id}`, 'settings_pending');
                            driverObj.destroy();
                        }
                    }
                }
            ];

            // Tentar selecionar slot ou toolbarTitle
            setTimeout(() => {
                const el = document.querySelector(isMobile ? '.fc-toolbar-title' : '.fc-timegrid-slot');
                if (!el && steps[1]) steps[1].element = '#root';
            }, 100);

        } else if (context === 'settings') {
            steps = [
                {
                    element: '#root',
                    popover: {
                        title: '🛠️ Central de Comando',
                        description: 'Aqui você personaliza o sistema. Defina o nome do seu negócio, horário de funcionamento e muito mais.',
                        align: 'center'
                    }
                },
                {
                    element: isMobile ? '#mobile-menu-btn' : 'a[href="/configuracoes/servicos"]', // Tentar link, senao menu
                    popover: {
                        title: '💲 Menu de Serviços',
                        description: 'Cadastre seus cortes, tratamentos e preços. É o cardápio do seu sucesso.',
                        side: isMobile ? 'bottom' : 'right'
                    }
                },
                {
                    element: '#root',
                    popover: {
                        title: '🎓 Você está pronto!',
                        description: 'Parabéns! Você completou o tour. Agora o sistema é todo seu. Explore e aproveite o poder do Barber OS.',
                        align: 'center'
                    }
                }
            ];
        }

        const driverObj = driver({
            ...driverConfig,
            steps: steps,
            popoverClass: 'driverjs-theme', // Usa a classe customizada
            onDestroyed: () => {
                if (context === 'settings') {
                    localStorage.setItem(`tour_completed_${user?.id}`, 'true');
                    localStorage.removeItem(`tour_step_${user?.id}`);
                }
            }
        });

        driverObj.drive();
    };

    // Efeito para detectar navegação e continuar o tour
    useEffect(() => {
        if (!user) return;

        const pendingStep = localStorage.getItem(`tour_step_${user.id}`);

        // Pequeno delay para garantir que a página carregou
        const timer = setTimeout(() => {
            if (location.pathname === '/agenda' && pendingStep === 'agenda_pending') {
                startTour('agenda');
                localStorage.setItem(`tour_step_${user.id}`, 'in_progress'); // Evita loop
            } else if (location.pathname.startsWith('/configuracoes') && pendingStep === 'settings_pending') {
                startTour('settings');
                localStorage.setItem(`tour_step_${user.id}`, 'in_progress');
            } else if (location.pathname === '/dashboard' && !localStorage.getItem(`tour_completed_${user.id}`) && !pendingStep) {
                // Auto-start inicial apenas no Dashboard se nada estiver pendente
                startTour('dashboard');
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [location.pathname, user?.id]);

    return { startTour };
};
