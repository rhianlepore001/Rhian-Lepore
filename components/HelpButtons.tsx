import React, { useState } from 'react';
import { Info, Bot, X, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createPortal } from 'react-dom';

interface InfoButtonProps {
    text: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({ text }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const tooltipRef = React.useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    // Atualizar coordenadas quando o tooltip for exibido
    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX + (rect.width / 2)
            });
        }
    };

    // Fechar ao clicar fora
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setShowTooltip(false);
            }
        };

        if (showTooltip) {
            updateCoords();
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', updateCoords);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [showTooltip]);

    const handleToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        setShowTooltip(!showTooltip);
    };

    return (
        <div className="relative inline-flex items-center ml-2" ref={triggerRef}>
            <div
                role="button"
                tabIndex={0}
                onClick={handleToggle}
                onMouseEnter={() => !('ontouchstart' in window) && setShowTooltip(true)}
                onMouseLeave={() => !('ontouchstart' in window) && setShowTooltip(false)}
                onKeyDown={(e) => e.key === 'Enter' && handleToggle(e)}
                className={`group cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-300 ${showTooltip
                        ? 'bg-white/20 text-white ring-2 ring-white/10'
                        : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
                    }`}
            >
                <Info className={`w-3.5 h-3.5 transition-transform duration-300 ${showTooltip ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="text-[10px] font-mono uppercase tracking-widest font-bold opacity-70 group-hover:opacity-100">Ajuda</span>
            </div>

            {showTooltip && createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'absolute',
                        top: `${coords.top - 12}px`,
                        left: `${coords.left}px`,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9999
                    }}
                    className="w-64 md:w-72 p-4 bg-neutral-900/90 backdrop-blur-xl border border-white/20 text-xs text-white 
                               rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-left 
                               animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 p-1.5 rounded-lg bg-white/10 shrink-0">
                            <Bot className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <div className="space-y-1.5">
                            <p className="font-bold text-[10px] uppercase tracking-wider text-blue-400 font-mono">Dica do Assistente</p>
                            <p className="text-[11px] leading-relaxed text-neutral-200 font-medium">{text}</p>
                        </div>
                    </div>
                    {/* Seta do Tooltip */}
                    <div
                        className="absolute top-full left-1/2 transform -translate-x-1/2 border-[6px] border-transparent border-t-neutral-900/90"
                    ></div>
                </div>,
                document.body
            )}
        </div>
    );
};

interface AIAssistantButtonProps {
    context: string;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ context }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
        { role: 'assistant', content: `Olá! Sou seu assistente pessoal. Como posso ajudar com ${context}?` }
    ]);
    const [input, setInput] = useState('');
    const { userType } = useAuth();
    const isBeauty = userType === 'beauty';

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
            <button
                onClick={() => setIsOpen(true)}
                className={`ml-2 p-1 rounded-full ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon hover:bg-beauty-neon/20' : 'bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20'} transition-colors`}
                title="Assistente IA"
            >
                <Bot className="w-4 h-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border-2 border-neutral-700 w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[600px]">
                        {/* Header */}
                        <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot className={`w-5 h-5 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />
                                <h3 className="font-bold text-white">Assistente BarberOS</h3>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                            ? `${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'} font-bold`
                                            : 'bg-neutral-800 text-white border border-neutral-700'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="p-4 border-t border-neutral-800 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua dúvida..."
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500"
                            />
                            <button
                                onClick={handleSend}
                                className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black'} hover:opacity-90 transition-opacity`}
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