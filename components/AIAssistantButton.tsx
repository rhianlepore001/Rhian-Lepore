/**
 * Assistente AgendiX (demonstração, sem IA real). Desligado por `ASSISTANT_ENABLED` em
 * utils/featureFlags.ts; só é importado (lazy) quando o interruptor estiver ligado.
 */
import React, { useState } from 'react';
import { Bot, X, Send } from 'lucide-react';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { Button } from './ui/Button';

interface AIAssistantButtonProps {
    context: string;
    /** Controle externo (ex.: item "Assistente" do menu "⋯" do Financeiro). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Só o painel, sem o botão (quem abre é o menu). */
    hideTrigger?: boolean;
    className?: string;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ context, open, onOpenChange, hideTrigger = false, className = '' }) => {
    const [innerOpen, setInnerOpen] = useState(false);
    const isOpen = open ?? innerOpen;
    const setIsOpen = (next: boolean) => {
        if (open === undefined) setInnerOpen(next);
        onOpenChange?.(next);
    };
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
        { role: 'assistant', content: `Olá! Sou seu assistente pessoal. Como posso ajudar com ${context}?` }
    ]);
    const [input, setInput] = useState('');
    const { assistantName } = useBusinessCopy();

    const handleSend = () => {
        if (!input.trim()) return;

        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput('');

        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Entendi sua dúvida sobre "${userMsg}". Como sou uma versão de demonstração, ainda não posso processar respostas complexas, mas em breve estarei conectado a uma IA real para te ajudar a gerenciar seu negócio!`
            }]);
        }, 1000);
    };

    return (
        <>
            {/* Mesma altura e alinhamento dos botões vizinhos (Filtrar/Exportar):
                quadrado de 44 px no celular, com rótulo a partir de 768 px. */}
            {!hideTrigger && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    title="Assistente"
                    aria-label="Abrir assistente IA"
                    className={`w-11 px-0 md:w-auto md:px-3 ${className}`}
                    icon={<Bot className="h-4 w-4" />}
                >
                    <span className="hidden md:inline">Assistente</span>
                </Button>
            )}

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/50 backdrop-blur-sm p-4">
                    <div className="bg-[var(--color-card)] border-2 border-[var(--color-border)] w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[600px]">
                        {/* Header */}
                        <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-theme-accent" />
                                <h3 className="font-bold text-[var(--color-text)]">{assistantName}</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-[var(--color-text)]" aria-label="Fechar assistente" title="Fechar">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                        ? 'bg-theme-accent text-[var(--color-on-accent)] font-bold'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border)]'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-[var(--color-border)] flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua dúvida..."
                                className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-input-focus)]"
                            />
                            <button
                                onClick={handleSend}
                                className="p-2 rounded-lg bg-theme-accent text-[var(--color-on-accent)] hover:opacity-90 transition-opacity"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};