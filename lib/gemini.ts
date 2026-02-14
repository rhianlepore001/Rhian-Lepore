import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface GeminiPhotoAnalysis {
    suggestions: string[];
    background_options: string[];
    quality_score: number;
    recommended_edits: string[];
}

interface GeminiSocialContent {
    caption: string;
    hashtags: string[];
    cta: string;
}

interface GeminiCalendarDay {
    day: string;
    content_type: 'carousel' | 'reel' | 'story' | 'post';
    topic: string;
    caption: string;
    hashtags: string[];
    posting_time: string;
}

interface GeminiMarketingCampaign {
    name: string;
    type: 'birthday' | 'reactivation' | 'promotion' | 'premium' | 'seasonal';
    target_audience: string;
    objective: string;
    timing: string;
    expected_impact: string;
    message: string;
}

/**
 * Analyze a photo and suggest professional edits
 */
export async function analyzePhoto(imageBase64: string): Promise<GeminiPhotoAnalysis> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Analyze this haircut/beauty salon photo and suggest professional edits for social media.

Provide suggestions in the following categories:
1. Quality improvements (lighting, sharpness, color correction)
2. Background options (blur, remove, replace with professional backdrop)
3. Professional touch-ups (remove blemishes, enhance details)
4. Composition improvements

Return ONLY valid JSON in this exact format:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "background_options": ["option 1", "option 2"],
  "quality_score": 7.5,
  "recommended_edits": ["edit 1", "edit 2"]
}`;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg'
                }
            }
        ]);

        const text = result.response.text();
        // Remove markdown code blocks if present
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error analyzing photo:', error);
        throw new Error('Falha ao analisar foto. Tente novamente.');
    }
}

/**
 * Generate social media content (caption + hashtags)
 */
export async function generateSocialContent(
    imageDescription: string,
    businessType: 'barber' | 'beauty',
    businessName: string,
    customRequest?: string
): Promise<GeminiSocialContent> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        const prompt = `Generate Instagram post content for ${businessName}, a ${businessType === 'barber' ? 'barbearia' : 'salão de beleza'}.

Image description: ${imageDescription}
${customRequest ? `Additional request: ${customRequest}` : ''}

Create engaging content in Portuguese (Brazil) that:
- Has a catchy, professional caption (2-3 sentences)
- Includes 10-15 relevant hashtags
- Has a clear call-to-action
- Matches the ${businessType} industry tone

Return ONLY valid JSON in this exact format:
{
  "caption": "engaging caption here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "cta": "call to action text"
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error generating content:', error);
        throw new Error('Falha ao gerar conteúdo. Tente novamente.');
    }
}

/**
 * Generate a weekly content calendar
 */
export async function generateContentCalendar(
    businessType: 'barber' | 'beauty',
    businessName: string
): Promise<GeminiCalendarDay[]> {
    try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('API Key não configurada. Configure VITE_GEMINI_API_KEY no .env.local');
        }

        const businessTypePT = businessType === 'barber' ? 'barbearia' : 'salão de beleza';

        const prompt = `Create a 7-day Instagram content calendar for ${businessName}, a ${businessTypePT} in Brazil.

For each day (Monday to Sunday), provide:
- content_type: one of "carousel", "reel", "story", "post"
- topic: brief topic/theme
- caption: engaging caption in Portuguese (2-3 sentences)
- hashtags: array of 8-12 relevant hashtags
- posting_time: best time to post (format: "HH:MM")

Vary the content types throughout the week. Include mix of:
- Educational content (tips, tutorials)
- Before/after transformations
- Behind-the-scenes
- Client testimonials
- Promotional content

Return ONLY valid JSON array with 7 objects in this exact format:
[
  {
    "day": "Segunda-feira",
    "content_type": "post",
    "topic": "topic here",
    "caption": "caption here",
    "hashtags": ["hashtag1", "hashtag2"],
    "posting_time": "10:00"
  }
]`;

        // Direct API call with proper headers
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', errorData);
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error: any) {
        console.error('Error generating calendar:', error);
        throw new Error(error.message || 'Falha ao gerar calendário. Tente novamente.');
    }
}

/**
 * Analyze business data and suggest marketing campaigns
 */
export async function analyzeCampaignOpportunities(
    clients: any[], // TODO: Type this properly with imported Client type
    appointments: any[], // TODO: Type this properly with imported Appointment type
    businessType: 'barber' | 'beauty',
    businessName: string
): Promise<GeminiMarketingCampaign[]> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

        // Analyze data
        const now = new Date();
        const thisMonth = now.getMonth();
        const birthdaysThisMonth = clients.filter(c => {
            if (!c.created_at) return false;
            const clientMonth = new Date(c.created_at).getMonth();
            return clientMonth === thisMonth;
        }).length;

        // Find inactive clients (no appointments in last 60 days)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        const recentAppointments = appointments.filter(a =>
            new Date(a.appointment_time) > sixtyDaysAgo
        );
        const activeClientIds = new Set(recentAppointments.map(a => a.client_id));
        const inactiveClients = clients.filter(c => !activeClientIds.has(c.id)).length;

        // Analyze appointment patterns
        const appointmentsByDay = appointments.reduce((acc: any, apt) => {
            const day = new Date(apt.appointment_time).getDay();
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        const businessTypePT = businessType === 'barber' ? 'barbearia' : 'salão de beleza';

        const prompt = `Analyze this ${businessTypePT} business data and suggest 3-5 targeted marketing campaigns.

Business: ${businessName}
Data:
- Total clients: ${clients.length}
- Birthdays this month: ${birthdaysThisMonth}
- Inactive clients (60+ days): ${inactiveClients}
- Busiest days: ${Object.entries(appointmentsByDay).sort((a: any, b: any) => b[1] - a[1]).slice(0, 2).map(([day]) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][day]).join(', ')}

Suggest campaigns for:
1. Birthday promotions
2. Reactivating inactive clients
3. Filling slow days with promotions
4. Premium pricing on peak days
5. Seasonal opportunities

For each campaign, provide:
- name: campaign name
- type: "birthday", "reactivation", "promotion", "premium", or "seasonal"
- target_audience: who to target
- objective: main goal
- timing: when to run it
- expected_impact: estimated results
- message: suggested campaign message in Portuguese

Return ONLY valid JSON array with 3-5 campaign objects in this exact format:
[
  {
    "name": "campaign name",
    "type": "birthday",
    "target_audience": "description",
    "objective": "goal",
    "timing": "when to run",
    "expected_impact": "expected results",
    "message": "campaign message in Portuguese"
  }
]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Error analyzing campaigns:', error);
        throw new Error('Falha ao analisar oportunidades. Tente novamente.');
    }
}

/**
 * Helper function to convert image file to base64
 */
export async function imageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            // Remove data:image/jpeg;base64, prefix
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
