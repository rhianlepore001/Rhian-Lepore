import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useAIAssistant, type ChatMessage } from '../hooks/useAIAssistant';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

const QUICK_QUESTIONS = [
    'Como foi meu mês?',
    'Tenho clientes para recuperar?',
    'Qual meu melhor serviço?',
    'Como melhorar meu faturamento?',
];

export const AIAssistantChat: React.FC = () => {
    const { businessName } = useAuth();
    const { messages, loading, sendMessage, clearMessages } = useAIAssistant();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const { accent, isBeauty } = useBrutalTheme();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msg = input;
        setInput('');
        await sendMessage(msg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] w-14 h-14 rounded-full ${accent.bg} text-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center`}
                aria-label="Abrir assistente IA"
            >
                {isOpen ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageCircle className="w-6 h-6" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 z-[59] w-[calc(100vw-2rem)] md:w-96 max-h-[70vh] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-300">
                    {/* Header */}
                    <div className={`px-4 py-3 border-b border-neutral-800 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center`}>
                                <Sparkles className="w-4 h-4 text-black" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">Assistente IA</h3>
                                <p className="text-neutral-500 text-[10px] font-mono">
                                    {businessName || 'Seu negócio'}
                                </p>
                            </div>
                        </div>
                        {messages.length > 0 && (
                            <button
                                onClick={clearMessages}
                                className="text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                                title="Limpar conversa"
                                aria-label="Limpar conversa"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[50vh]">
                        {messages.length === 0 ? (
                            <div className="text-center py-6">
                                <Sparkles className={`w-10 h-10 mx-auto mb-3 ${accent.text} opacity-50`} />
                                <p className="text-neutral-400 text-sm mb-4">
                                    Pergunte qualquer coisa sobre seu negócio!
                                </p>
                                <div className="space-y-2">
                                    {QUICK_QUESTIONS.map((q, i) => (
                                        <button
                                            key={i}
                                            onClick={() => sendMessage(q)}
                                            className="block w-full text-left px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? `${accent.bg} text-black`
                                                : 'bg-neutral-800 text-neutral-200'
                                        }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-neutral-800 px-4 py-3 rounded-xl flex items-center gap-2">
                                    <Loader2 className={`w-4 h-4 animate-spin ${accent.text}`} />
                                    <span className="text-neutral-400 text-sm">Analisando...</span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-neutral-800">
                        <div className="flex gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Pergunte sobre seu negócio..."
                                className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neutral-500 placeholder-neutral-500"
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className={`${accent.bg} text-black p-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed`}
                                aria-label="Enviar mensagem"
                                title="Enviar"
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
