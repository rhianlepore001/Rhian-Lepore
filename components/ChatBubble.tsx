import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ChatBubbleProps {
    message: string | React.ReactNode;
    isAssistant?: boolean;
    delay?: number;
    typingDuration?: number;
    children?: React.ReactNode;
    isBeauty?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
    message,
    isAssistant = true,
    delay = 0,
    typingDuration = 1200,
    children,
    isBeauty = false
}) => {
    const [isTyping, setIsTyping] = useState(isAssistant && delay >= 0);
    const [isVisible, setIsVisible] = useState(!isAssistant || delay === 0);

    const theme = isBeauty ? 'silk' : 'obsidian';
    const borderRadius = isBeauty ? 'rounded-lg' : 'rounded-none';

    useEffect(() => {
        if (isAssistant && delay > 0) {
            const timer = setTimeout(() => {
                setIsTyping(true);

                const typingTimer = setTimeout(() => {
                    setIsTyping(false);
                    setIsVisible(true);
                }, typingDuration);

                return () => clearTimeout(typingTimer);
            }, delay);

            return () => clearTimeout(timer);
        } else if (isAssistant) {
            const typingTimer = setTimeout(() => {
                setIsTyping(false);
                setIsVisible(true);
            }, typingDuration);
            return () => clearTimeout(typingTimer);
        }
    }, [isAssistant, delay, typingDuration]);

    if (isTyping) {
        return (
            <div className="flex justify-start mb-6 animate-fade-in">
                <div className={`px-6 py-4 ${borderRadius} ${isBeauty ? 'bg-stone-50 border border-stone-100' : 'bg-obsidian-card border border-white/5 shadow-heavy'}`}>
                    <Loader2 className={`w-5 h-5 animate-spin ${isBeauty ? 'text-stone-300' : 'text-obsidian-accent opacity-50'}`} />
                </div>
            </div>
        );
    }

    if (!isVisible) return null;

    return (
        <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'} mb-12 group last:mb-20`}>
            <div className={`flex items-end gap-3 max-w-[95%] md:max-w-[85%] animate-reveal-fragment relative`}>

                {/* Assistant Avatar - Premium Identity */}
                {isAssistant && (
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center border transition-all duration-500 shadow-lg mb-2 ${isBeauty ? 'bg-stone-800 text-white rounded-full border-stone-200' : 'bg-accent-gold text-black rounded-none border-black font-black'}`}>
                        <span className="text-xs tracking-tighter">AI</span>
                    </div>
                )}

                <div className="relative">
                    {/* Decorative index/number (Narrative detail) */}
                    {isAssistant && (
                        <div className="absolute -left-12 top-6 opacity-5 select-none pointer-events-none">
                            <span className="massive-text text-3xl">#</span>
                        </div>
                    )}

                    <div className={`
                        px-7 py-5 shadow-2xl transition-all duration-500
                        ${isAssistant
                            ? (isBeauty ? 'bg-white border border-stone-100 text-stone-800 rounded-2xl rounded-bl-none shadow-silk-shadow' : 'fragment-obsidian text-white border-l-4 border-l-accent-gold')
                            : (isBeauty ? 'bg-stone-800 text-white rounded-2xl rounded-br-none shadow-lg' : 'bg-accent-gold text-black font-black border-4 border-black shadow-heavy-lg')
                        }
                    `}>
                        {typeof message === 'string' ? (
                            <p className={`
                                ${isAssistant
                                    ? (isBeauty ? 'text-stone-700 leading-relaxed font-medium' : 'text-white/90 leading-relaxed font-semibold')
                                    : 'text-base md:text-lg tracking-tight'
                                }
                            `}>
                                {message}
                            </p>
                        ) : (
                            message
                        )}
                    </div>

                    {/* Staggered Children Container */}
                    {children && (
                        <div className="mt-10 transition-all duration-1000 overflow-visible">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
