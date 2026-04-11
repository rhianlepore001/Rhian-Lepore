import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getHolidaysForMonth, getDaysInMonth } from '../utils/brazilianHolidays';
import { logger } from '../utils/Logger';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL_NAME = 'google/gemini-2.0-flash-lite-001';

export interface CalendarPost {
    day: number;
    caption: string;
    hashtags: string;
    theme: string;
    holiday?: string;
    bgGradient: string;
    textColor: string;
}

const GRADIENTS = [
    'from-amber-600 to-orange-800',
    'from-violet-600 to-purple-800',
    'from-emerald-600 to-teal-800',
    'from-rose-600 to-pink-800',
    'from-blue-600 to-indigo-800',
    'from-cyan-600 to-sky-800',
    'from-fuchsia-600 to-purple-800',
    'from-lime-600 to-green-800',
];

export function useContentCalendar() {
    const { businessName, userType } = useAuth();
    const [posts, setPosts] = useState<CalendarPost[]>([]);
    const [loading, setLoading] = useState(false);

    const generatePosts = useCallback(async (year: number, month: number) => {
        setLoading(true);
        try {
            const daysInMonth = getDaysInMonth(year, month);
            const holidays = getHolidaysForMonth(month);
            const monthName = new Date(year, month).toLocaleString('pt-BR', { month: 'long' });
            const bizType = userType === 'beauty' ? 'salão de beleza' : 'barbearia';

            const holidayInfo = holidays.length > 0
                ? `Datas comemorativas do mês: ${holidays.map(h => `${h.day}/${month + 1} - ${h.name}`).join(', ')}.`
                : 'Sem datas comemorativas relevantes neste mês.';

            const prompt = `Você é um especialista em marketing para ${bizType}.
Negócio: ${businessName || 'Meu Negócio'}
Mês: ${monthName} ${year}
${holidayInfo}

Gere ${Math.min(daysInMonth, 30)} posts para Instagram, um para cada dia do mês.
Para cada post, forneça:
- day: número do dia (1 a ${daysInMonth})
- caption: legenda pronta para Instagram (2-3 frases, tom profissional mas acessível)
- hashtags: 5-8 hashtags relevantes
- theme: tema do post em 3-4 palavras

IMPORTANTE: Adapte posts para datas comemorativas quando houver.
Responda APENAS em JSON: { "posts": [{ "day", "caption", "hashtags", "theme" }] }`;

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://rhian-lepore.com',
                    'X-Title': 'AgenX Content Calendar',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' },
                    max_tokens: 4000,
                }),
            });

            if (!response.ok) throw new Error('Falha ao gerar posts');

            const data = await response.json();
            const parsed = JSON.parse(data.choices[0].message.content);
            const generatedPosts: CalendarPost[] = (parsed.posts || []).map((p: any, i: number) => {
                const holiday = holidays.find(h => h.day === p.day);
                return {
                    day: p.day,
                    caption: p.caption,
                    hashtags: p.hashtags,
                    theme: p.theme,
                    holiday: holiday?.name,
                    bgGradient: GRADIENTS[i % GRADIENTS.length],
                    textColor: 'text-white',
                };
            });

            setPosts(generatedPosts);
        } catch (error) {
            logger.error('Erro ao gerar calendário de conteúdo:', error);
        } finally {
            setLoading(false);
        }
    }, [businessName, userType]);

    return { posts, loading, generatePosts, setPosts };
}
