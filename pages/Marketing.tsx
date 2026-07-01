import React from 'react';
import { Rocket, MessageSquare, Users, Send, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui';

export const Marketing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-24">
            <header className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-heading text-white uppercase tracking-tighter">
                    Marketing
                </h1>
                <p className="text-text-secondary font-mono text-sm">
                    Reative clientes, preencha horários vagos, venda mais.
                </p>
            </header>

            <Card variant="accent" className="p-6 md:p-8">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-[var(--color-accent-dim)] text-[var(--color-accent)]">
                        <Rocket className="w-6 h-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <h2 className="text-xl font-heading text-white uppercase">Reativação de Sumidos</h2>
                        <p className="text-text-secondary text-sm leading-relaxed">
                            Identificamos clientes que sumiram há mais de 60 dias.
                            Em breve você poderá enviar mensagens de WhatsApp em massa com 1 clique.
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-heading text-white uppercase">WhatsApp em Massa</h3>
                            <p className="text-text-secondary text-sm">
                                Envie campanhas sazonais para toda a base de clientes.
                            </p>
                            <p className="text-xs text-text-muted italic">Disponível no Sprint B (WhatsApp)</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400">
                            <Users className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-heading text-white uppercase">Segmentação</h3>
                            <p className="text-text-secondary text-sm">
                                Filtre por frequência, último serviço, valor gasto.
                            </p>
                            <p className="text-xs text-text-muted italic">Disponível no Sprint B (WhatsApp)</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-heading text-white uppercase">Lembretes Automáticos</h3>
                            <p className="text-text-secondary text-sm">
                                Confirmação, lembrete 24h antes, lembrete 2h antes.
                            </p>
                            <p className="text-xs text-text-muted italic">Disponível no Sprint B (WhatsApp)</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400">
                            <Send className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <h3 className="text-lg font-heading text-white uppercase">Pedido de Avaliação</h3>
                            <p className="text-text-secondary text-sm">
                                Peça avaliação no Google após cada atendimento.
                            </p>
                            <p className="text-xs text-text-muted italic">Disponível no Sprint B (WhatsApp)</p>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="text-center pt-4">
                <p className="text-text-muted text-xs font-mono uppercase tracking-widest">
                    Configure WhatsApp em <button
                        type="button"
                        onClick={() => navigate('/configuracoes/notificacoes')}
                        className="underline hover:text-white transition-colors"
                    >
                        Configurações → Notificações
                    </button>
                </p>
            </div>
        </div>
    );
};
