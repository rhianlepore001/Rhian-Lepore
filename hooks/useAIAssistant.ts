import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardData } from './useDashboardData';
import { useAIOSDiagnostic } from './useAIOSDiagnostic';
import { buildSystemPrompt, type BusinessContext } from '../lib/ai-assistant-prompts';
import { logger } from '../utils/Logger';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL_NAME = 'google/gemini-2.0-flash-lite-001';

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function useAIAssistant() {
    const { businessName, userType, region } = useAuth();
    const { currentMonthRevenue, profitMetrics, financialDoctor, appointments } = useDashboardData();
    const { diagnostic } = useAIOSDiagnostic();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const currencySymbol = region === 'PT' ? '€' : 'R$';

    const buildContext = useCallback((): BusinessContext => {
        return {
            businessName: businessName || '',
            userType: userType || 'barber',
            currentMonthRevenue: currentMonthRevenue || 0,
            previousMonthRevenue: profitMetrics?.totalProfit || 0,
            monthlyGoal: 0,
            totalClients: 0,
            appointmentsThisMonth: appointments?.length || 0,
            clientsAtRisk: diagnostic?.at_risk_clients?.length || 0,
            avgTicket: financialDoctor?.avgTicket || 0,
            topService: financialDoctor?.topService || '',
            emptySlots: 0,
            currencySymbol,
        };
    }, [businessName, userType, currentMonthRevenue, profitMetrics, financialDoctor, appointments, diagnostic, currencySymbol]);

    const sendMessage = useCallback(async (userMessage: string) => {
        if (!userMessage.trim()) return;

        const userMsg: ChatMessage = {
            role: 'user',
            content: userMessage,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const ctx = buildContext();
            const systemPrompt = buildSystemPrompt(ctx);

            const conversationHistory = messages.slice(-6).map(m => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://rhian-lepore.com',
                    'X-Title': 'AgendiX AI Assistant',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory,
                        { role: 'user', content: userMessage },
                    ],
                    max_tokens: 300,
                    temperature: 0.7,
                }),
            });

            if (!response.ok) throw new Error('Falha na comunicação com IA');

            const data = await response.json();
            const assistantContent = data.choices[0].message.content;

            const assistantMsg: ChatMessage = {
                role: 'assistant',
                content: assistantContent,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (error) {
            logger.error('Erro no assistente IA:', error);
            const errorMsg: ChatMessage = {
                role: 'assistant',
                content: 'Desculpe, não consegui processar sua pergunta agora. Tente novamente em alguns segundos.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    }, [messages, buildContext]);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        loading,
        sendMessage,
        clearMessages,
    };
}
