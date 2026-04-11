import { logger } from '../utils/Logger';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL_NAME = 'google/gemini-2.0-flash-lite-001'; // Nano/Flash level for fast editing

export interface ImageEditPrompt {
    image_url: string;
    instructions: string;
}

export const OpenRouterService = {
    /**
     * Gera ideias de conteúdo para Instagram baseadas no contexto do negócio
     */
    async generateInstagramIdeas(businessName: string, userType: string, segment: string) {
        try {
            const prompt = `Você é um Copy Chief especialista em Marketing para ${userType === 'beauty' ? 'Salões de Beleza' : 'Barbearias'}.
            Nome do Negócio: ${businessName}
            Segmento: ${segment}
            
            Gere 3 ideias criativas de posts para o Instagram que foquem em conversão e autoridade.
            Para cada ideia, forneça:
            1. Título do post
            2. Descrição da imagem/vídeo
            3. Legenda sugerida (com tom de voz premium e brutalista)
            
            Responda em JSON estruturado: { ideas: [{ title, visual, caption }] }`;

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': 'https://rhian-lepore.com', // Optional, for OpenRouter rankings
                    'X-Title': 'Rhian Lepore AIOS',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) throw new Error('Falha na comunicação com OpenRouter');
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            logger.error('Erro ao gerar ideias de Instagram:', error);
            throw error;
        }
    },

    /**
     * Interface simulada para edição de fotos via Prompt (conforme solicitado: Nano Pro API)
     * Como o Gemini no OpenRouter é predominantemente LLM/VLM, aqui focamos na análise e sugestão de edição
     * ou integração com ferramentas de geração se disponíveis.
     */
    async analyzeAndSuggestPhotoEdit(imageUrl: string, instruction: string) {
        try {
            const prompt = [
                {
                    role: 'user', content: [
                        { type: 'text', text: `Analise esta foto de trabalho (cabelo/barba) e aplique esta instrução: "${instruction}". Se for uma foto de portfólio, sugira ajustes de cor, brilho e enquadramento para parecer premium.` },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                }
            ];

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: prompt
                })
            });

            if (!response.ok) throw new Error('Falha na análise de imagem');
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            logger.error('Erro na análise de imagem IA:', error);
            throw error;
        }
    },

    /**
     * Busca tendências e feriados para compor o calendário de conteúdo
     */
    async fetchMonthlyTrends(businessName: string, userType: string, month: string) {
        try {
            const prompt = `Você é a Dra. Trend, especialista em Marketing Digital para ${userType === 'beauty' ? 'Salões de Beleza' : 'Barbearias'}.
            Negócio: ${businessName}
            Mês de Referência: ${month}
            
            Com base em tendências de 2026, eventos sazonais e feriados no Brasil, gere 4 pautas estratégicas que devem estar no calendário deste mês.
            Para cada pauta, forneça:
            1. Data sugerida (formato YYYY-MM-DD)
            2. Tema da tendência
            3. Sugestão de conteúdo (Post/Reels/Story)
            4. Motivo (por que postar isso nesta data?)
            
            Responda APENAS em JSON estruturado: { trends: [{ date, theme, suggestion, reason }] }`;

            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) throw new Error('Falha ao buscar tendências');
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        } catch (error) {
            logger.error('Erro ao buscar tendências mensais:', error);
            throw error;
        }
    }
};
