import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    analyzePhoto,
    generateSocialContent,
    generateContentCalendar,
    analyzeCampaignOpportunities
} from '@/lib/gemini';

// Precisamos acessar o mock factory para alterar o comportamento por teste
// Como vitest hoists vi.mock, definitions must be strictly defined or accessed via vi.importMock
// Uma abordagem melhor é mockar o método generateContent de cada instância

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: vi.fn(() => ({
        getGenerativeModel: vi.fn(() => ({
            generateContent: mockGenerateContent
        })),
    })),
}));

describe('Gemini AI Lib', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('analyzePhoto', () => {
        it('should return parsed JSON analysis', async () => {
            const mockData = {
                suggestions: ['Fix lighting'],
                background_options: ['Blur background'],
                quality_score: 8.5,
                recommended_edits: ['Crop', 'Color balance']
            };

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockData)
                }
            });

            const result = await analyzePhoto('base64data');

            expect(result).toEqual(mockData);
            expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        });

        it('should handle markdown code blocks in response', async () => {
            const mockData = { suggestions: [], background_options: [], quality_score: 0, recommended_edits: [] };
            const markdownResponse = `\`\`\`json\n${JSON.stringify(mockData)}\n\`\`\``;

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => markdownResponse
                }
            });

            const result = await analyzePhoto('base64data');
            expect(result).toEqual(mockData);
        });

        it('should throw error on failure', async () => {
            mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

            await expect(analyzePhoto('data')).rejects.toThrow('Falha ao analisar foto');
        });
    });

    describe('generateSocialContent', () => {
        it('should generate content for barber', async () => {
            const mockData = {
                caption: 'Great haircut',
                hashtags: ['#barber'],
                cta: 'Book now'
            };

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockData)
                }
            });

            const result = await generateSocialContent('Fade cut', 'barber', 'My Barbershop');
            expect(result).toEqual(mockData);
        });
    });

    describe('generateContentCalendar', () => {
        it('should fail without API key', async () => {
            vi.stubEnv('VITE_GEMINI_API_KEY', '');

            await expect(generateContentCalendar('barber', 'Shop')).rejects.toThrow('API Key não configurada');

            vi.unstubAllEnvs();
        });

        it('should generate calendar via fetch', async () => {
            // Mock global fetch
            const mockFetch = vi.fn();
            global.fetch = mockFetch;

            const mockData = [
                { day: 'Segunda', content_type: 'post', topic: 'Tips', caption: 'Hi', hashtags: [], posting_time: '10:00' }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [{
                        content: {
                            parts: [{ text: JSON.stringify(mockData) }]
                        }
                    }]
                })
            });

            const result = await generateContentCalendar('barber', 'Shop');
            expect(result).toEqual(mockData);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('generativelanguage.googleapis.com'),
                expect.objectContaining({ method: 'POST' })
            );
        });
    });

    describe('analyzeCampaignOpportunities', () => {
        it('should analyze campaign opportunities', async () => {
            const mockCampaigns = [{ name: 'Promo', type: 'birthday' }];

            const mockClients = [
                {
                    id: '1',
                    name: 'Cliente Teste',
                    email: 'cliente@test.com',
                    phone: '11999999999',
                    loyaltyTier: 'Bronze' as const,
                    lastVisit: '2023-01-01',
                    totalVisits: 5,
                    hairHistory: [],
                    notes: '',
                    nextPrediction: '',
                    created_at: '2023-01-01'
                }
            ];
            const mockAppointments = [{ id: '1', clientName: 'Cliente Teste', service: 'Corte', time: '2023-05-20T10:00:00Z', appointment_time: '2023-05-20T10:00:00Z', status: 'Confirmed' as const, price: 50 }];

            mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: () => JSON.stringify(mockCampaigns)
                }
            });


            const result = await analyzeCampaignOpportunities(mockClients, mockAppointments, 'barber', 'Shop');
            expect(result).toEqual(mockCampaigns);
        });
    });
});
