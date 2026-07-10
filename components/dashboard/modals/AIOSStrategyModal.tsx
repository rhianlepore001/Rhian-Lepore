import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';
import { Target, Zap, Trophy, Rocket, MessageSquare } from 'lucide-react';

interface AIOSStrategyModalProps {
    isOpen: boolean;
    onClose: () => void;
    isBeauty: boolean;
}

export const AIOSStrategyModal: React.FC<AIOSStrategyModalProps> = ({ isOpen, onClose, isBeauty }) => {
    const { accent, colors } = useBrutalTheme({ override: isBeauty ? 'beauty' : 'barber' });

    const playbooks = [
        {
            icon: <Trophy className={`w-5 h-5 ${accent.text}`} />,
            title: "O Painel de Oportunidades",
            description: "Identifique quem não aparece há 30 dias. Recuperar 2 clientes por semana paga o sistema e sobra lucro neto.",
            tag: "LUCRO RÁPIDO"
        },
        {
            icon: <MessageSquare className={`w-5 h-5 ${accent.text}`} />,
            title: "Script que Converte",
            description: "Use o link de WhatsApp no CRM. Dica: 'Notei que faz tempo que não damos aquele trato. Tenho uma vaga pra quinta!'",
            tag: "RESULTADO"
        },
        {
            icon: <Target className={`w-5 h-5 ${accent.text}`} />,
            title: "Psicologia da Meta",
            description: "Defina metas 10% maiores que o mês passado. O sistema brilha mais forte conforme você se aproxima.",
            tag: "CRESCIMENTO"
        }
    ];

    return (
        <Modal open={isOpen} onClose={onClose} size="xl">
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Zap className={`w-4 h-4 ${accent.text}`} />
                    <span className={`text-xs font-mono uppercase tracking-[0.3em] ${accent.text}`}>AgendiX Success Playbook</span>
                </div>
                <h2 className={`text-2xl md:text-3xl font-heading ${colors.text}`}>Guia para Faturar Mais</h2>
            </div>

            <div className="grid gap-4">
                {playbooks.map((p, idx) => (
                    <div
                        key={idx}
                        className={`group p-4 md:p-5 ${colors.surface} border ${colors.border} rounded-2xl ${colors.surfaceHover} transition-all duration-300`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`mt-1 p-3 rounded-xl ${accent.bgDim} border ${colors.border} group-hover:scale-110 transition-transform`}>
                                {p.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1 gap-2">
                                    <h3 className={`font-heading text-lg ${colors.text}`}>{p.title}</h3>
                                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${colors.card} ${colors.textMuted} border ${colors.border} whitespace-nowrap`}>
                                        {p.tag}
                                    </span>
                                </div>
                                <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>
                                    {p.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={`mt-8 flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-2xl ${colors.surface} border ${colors.border}`}>
                <div className="flex items-center gap-4 text-left">
                    <Rocket className={`w-8 h-8 ${accent.text} opacity-40`} />
                    <div>
                        <p className={`text-xs uppercase font-bold tracking-widest mb-1 ${colors.text}`}>Dica Pro:</p>
                        <p className={`text-xs max-w-xs font-mono ${colors.textSecondary}`}>
                            Ative o 2FA para garantir que seus dados estratégicos estejam blindados.
                        </p>
                    </div>
                </div>
                <Button onClick={onClose} className="w-full md:w-auto">
                    ENTENDI, VAMOS FATURAR!
                </Button>
            </div>
        </Modal>
    );
};
