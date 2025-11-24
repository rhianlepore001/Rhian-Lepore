import React, { useState } from 'react';
import { Info, Bot, X, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface InfoButtonProps {
    text: string;
}

export const InfoButton: React.FC<InfoButtonProps> = ({ text }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="relative inline-block ml-2">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-text-secondary hover:text-white transition-colors"
            >
                <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 p-2 bg-neutral-800 border border-neutral-700 text-xs text-white rounded shadow-lg z-50 text-center">
                    {text}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-800"></div>
                </div>
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
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                            ? (isBeauty ? 'bg-beauty-neon text-black' : 'bg-accent-gold text-black')
                                            : 'bg-neutral-800 text-white'
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
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Digite sua dúvida..."
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                            />
                            <button
                                onClick={handleSend}
                                className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon text-black hover:bg-beauty-neonHover' : 'bg-accent-gold text-black hover:bg-accent-goldHover'}`}
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
