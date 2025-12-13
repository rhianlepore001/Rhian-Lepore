import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    Megaphone, Mail, MessageSquare, Send, Plus, Users, BarChart2, CheckCircle,
    Image as ImageIcon, Upload, Sparkles, Calendar as CalendarIcon, Target,
    Wand2, Download, Copy, Check
} from 'lucide-react';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';
import {
    analyzePhoto,
    generateSocialContent,
    generateContentCalendar,
    analyzeCampaignOpportunities,
    imageToBase64
} from '../lib/gemini';

type TabType = 'campaigns' | 'photo-editor' | 'calendar' | 'intelligence';

export const Marketing: React.FC = () => {
    const { user, userType } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('campaigns');
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Campaign Form
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignType, setNewCampaignType] = useState<'email' | 'sms' | 'whatsapp'>('whatsapp');
    const [newCampaignContent, setNewCampaignContent] = useState('');

    // Photo Editor State
    const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoAnalyzing, setPhotoAnalyzing] = useState(false);
    const [photoSuggestions, setPhotoSuggestions] = useState<any>(null);
    const [selectedEdits, setSelectedEdits] = useState<string[]>([]);
    const [customEditRequest, setCustomEditRequest] = useState('');
    const [generatingContent, setGeneratingContent] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<any>(null);
    const [copiedCaption, setCopiedCaption] = useState(false);

    // Content Calendar State
    const [contentCalendar, setContentCalendar] = useState<any[]>([]);
    const [generatingCalendar, setGeneratingCalendar] = useState(false);
    const [selectedDay, setSelectedDay] = useState<any>(null);

    // Campaign Intelligence State
    const [campaignSuggestions, setCampaignSuggestions] = useState<any[]>([]);
    const [analyzingCampaigns, setAnalyzingCampaigns] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [appointments, setAppointments] = useState<any[]>([]);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    useEffect(() => {
        fetchCampaigns();
        fetchClientsAndAppointments();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const { data, error } = await supabase
                .from('campaigns')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setCampaigns(data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientsAndAppointments = async () => {
        try {
            const [clientsRes, appointmentsRes] = await Promise.all([
                supabase.from('clients').select('*').eq('user_id', user.id),
                supabase.from('appointments').select('*').eq('user_id', user.id)
            ]);

            if (clientsRes.data) setClients(clientsRes.data);
            if (appointmentsRes.data) setAppointments(appointmentsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleCreateCampaign = async () => {
        try {
            const { error } = await supabase.from('campaigns').insert({
                user_id: user.id,
                name: newCampaignName,
                type: newCampaignType,
                content: newCampaignContent,
                status: 'draft',
                audience_count: 0
            });

            if (error) throw error;

            alert('Campanha criada com sucesso!');
            setShowNewCampaign(false);
            setNewCampaignName('');
            setNewCampaignContent('');
            fetchCampaigns();
        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Erro ao criar campanha.');
        }
    };

    // Photo Editor Functions
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('Imagem muito grande! Máximo 10MB.');
            return;
        }

        setPhotoFile(file);
        const reader = new FileReader();
        reader.onload = () => setUploadedPhoto(reader.result as string);
        reader.readAsDataURL(file);

        // Auto-analyze
        setPhotoAnalyzing(true);
        try {
            const base64 = await imageToBase64(file);
            const analysis = await analyzePhoto(base64);
            setPhotoSuggestions(analysis);
        } catch (error: any) {
            alert(error.message || 'Erro ao analisar foto');
        } finally {
            setPhotoAnalyzing(false);
        }
    };

    const handleGenerateContent = async () => {
        if (!uploadedPhoto || !photoFile) return;

        setGeneratingContent(true);
        try {
            const imageDescription = `Professional ${isBeauty ? 'beauty salon' : 'barbershop'} photo showing ${selectedEdits.join(', ')}`;
            const content = await generateSocialContent(
                imageDescription,
                isBeauty ? 'beauty' : 'barber',
                'Meu Negócio', // You can get this from user profile
                customEditRequest
            );
            setGeneratedContent(content);
        } catch (error: any) {
            alert(error.message || 'Erro ao gerar conteúdo');
        } finally {
            setGeneratingContent(false);
        }
    };

    const handleCopyCaption = () => {
        if (!generatedContent) return;
        const fullText = `${generatedContent.caption}\n\n${generatedContent.hashtags.join(' ')}\n\n${generatedContent.cta}`;
        navigator.clipboard.writeText(fullText);
        setCopiedCaption(true);
        setTimeout(() => setCopiedCaption(false), 2000);
    };

    // Content Calendar Functions
    const handleGenerateCalendar = async () => {
        setGeneratingCalendar(true);
        try {
            const calendar = await generateContentCalendar(
                isBeauty ? 'beauty' : 'barber',
                'Meu Negócio'
            );
            setContentCalendar(calendar);
        } catch (error: any) {
            alert(error.message || 'Erro ao gerar calendário');
        } finally {
            setGeneratingCalendar(false);
        }
    };

    // Campaign Intelligence Functions
    const handleAnalyzeCampaigns = async () => {
        setAnalyzingCampaigns(true);
        try {
            const suggestions = await analyzeCampaignOpportunities(
                clients,
                appointments,
                isBeauty ? 'beauty' : 'barber',
                'Meu Negócio'
            );
            setCampaignSuggestions(suggestions);
        } catch (error: any) {
            alert(error.message || 'Erro ao analisar campanhas');
        } finally {
            setAnalyzingCampaigns(false);
        }
    };

    const handleCreateAICampaign = (suggestion: any) => {
        setNewCampaignName(suggestion.name);
        setNewCampaignContent(suggestion.message);
        setShowNewCampaign(true);
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-white/10 pb-4 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Marketing</h2>
                        <AIAssistantButton context="estratégias de marketing e campanhas com IA" />
                    </div>
                    <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
                        Atraia e fidelize clientes com IA
                    </p>
                </div>
                <BrutalButton
                    variant="primary"
                    size="md"
                    icon={<Plus />}
                    onClick={() => setShowNewCampaign(true)}
                >
                    Nova Campanha
                </BrutalButton>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { id: 'campaigns' as TabType, label: 'Campanhas', icon: Megaphone },
                    { id: 'photo-editor' as TabType, label: 'Editor de Fotos IA', icon: ImageIcon },
                    { id: 'calendar' as TabType, label: 'Calendário de Conteúdo', icon: CalendarIcon },
                    { id: 'intelligence' as TabType, label: 'Sugestões Inteligentes', icon: Target }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase whitespace-nowrap transition-colors ${activeTab === tab.id
                            ? `${accentBg} text-black`
                            : 'bg-neutral-800 text-white hover:bg-neutral-700'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Stats Cards - Only show if there are campaigns */}
            {activeTab === 'campaigns' && campaigns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <BrutalCard>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Campanhas Ativas</p>
                            <InfoButton text="Campanhas em rascunho ou agendadas." />
                        </div>
                        <h3 className={`text-3xl font-heading ${accentText}`}>{campaigns.filter(c => c.status !== 'sent').length}</h3>
                        <div className="flex items-center gap-1 text-text-secondary text-xs font-mono mt-2">
                            <Megaphone className="w-3 h-3" />
                            <span>Total: {campaigns.length} campanhas</span>
                        </div>
                    </BrutalCard>

                    <BrutalCard>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Campanhas Enviadas</p>
                            <InfoButton text="Campanhas já enviadas aos clientes." />
                        </div>
                        <h3 className="text-3xl font-heading text-white">{campaigns.filter(c => c.status === 'sent').length}</h3>
                        <div className="flex items-center gap-1 text-text-secondary text-xs font-mono mt-2">
                            <CheckCircle className="w-3 h-3" />
                            <span>Histórico de envios</span>
                        </div>
                    </BrutalCard>

                    <BrutalCard>
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Audiência Total</p>
                            <InfoButton text="Total de destinatários alcançados." />
                        </div>
                        <h3 className="text-3xl font-heading text-white">
                            {campaigns.reduce((sum, c) => sum + (c.audience_count || 0), 0)}
                        </h3>
                        <div className="flex items-center gap-1 text-text-secondary text-xs font-mono mt-2">
                            <Users className="w-3 h-3" />
                            <span>Clientes impactados</span>
                        </div>
                    </BrutalCard>
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'campaigns' && (
                <BrutalCard title="Minhas Campanhas">
                    {campaigns.length === 0 ? (
                        <div className="text-center py-12">
                            <Megaphone className="w-16 h-16 mx-auto text-neutral-700 mb-4" />
                            <h4 className="text-white font-heading text-xl mb-2">Nenhuma campanha ainda</h4>
                            <p className="text-text-secondary text-sm mb-6">Crie sua primeira campanha de marketing para engajar seus clientes!</p>
                            <BrutalButton variant="primary" icon={<Plus />} onClick={() => setShowNewCampaign(true)}>
                                Criar Campanha
                            </BrutalButton>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {campaigns.map((campaign) => (
                                <div key={campaign.id} className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${campaign.type === 'whatsapp' ? 'bg-green-500/10 text-green-500' :
                                            campaign.type === 'sms' ? 'bg-blue-500/10 text-blue-500' :
                                                'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                            {campaign.type === 'whatsapp' ? <MessageSquare className="w-5 h-5" /> :
                                                campaign.type === 'sms' ? <Megaphone className="w-5 h-5" /> :
                                                    <Mail className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{campaign.name}</h4>
                                            <div className="flex items-center gap-3 text-xs font-mono text-text-secondary mt-1">
                                                <span className="uppercase">{campaign.type}</span>
                                                <span>•</span>
                                                <span>{new Date(campaign.created_at).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>{campaign.audience_count} destinatários</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${campaign.status === 'sent' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                            campaign.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                'bg-neutral-800 text-neutral-400 border border-neutral-700'
                                            }`}>
                                            {campaign.status === 'sent' ? 'Enviada' :
                                                campaign.status === 'scheduled' ? 'Agendada' :
                                                    'Rascunho'}
                                        </span>
                                        <BrutalButton size="sm" variant="ghost">Editar</BrutalButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </BrutalCard>
            )}

            {activeTab === 'photo-editor' && (
                <div className="space-y-6">
                    <BrutalCard title="Editor de Fotos com IA">
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div className="border-2 border-dashed border-neutral-700 p-8 text-center hover:border-neutral-600 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                    className="hidden"
                                    id="photo-upload"
                                />
                                <label htmlFor="photo-upload" className="cursor-pointer">
                                    {uploadedPhoto ? (
                                        <img src={uploadedPhoto} alt="Uploaded" className="max-h-96 mx-auto rounded" />
                                    ) : (
                                        <div className="space-y-4">
                                            <Upload className="w-16 h-16 mx-auto text-neutral-600" />
                                            <div>
                                                <p className="text-white font-bold">Clique para fazer upload</p>
                                                <p className="text-text-secondary text-sm mt-1">JPG, PNG ou WEBP (máx. 10MB)</p>
                                            </div>
                                        </div>
                                    )}
                                </label>
                            </div>

                            {/* AI Analysis */}
                            {photoAnalyzing && (
                                <div className="text-center py-8">
                                    <Sparkles className={`w-12 h-12 mx-auto ${accentText} animate-pulse`} />
                                    <p className="text-white mt-4">Analisando foto com IA...</p>
                                </div>
                            )}

                            {/* Suggestions */}
                            {photoSuggestions && !photoAnalyzing && (
                                <div className="space-y-4">
                                    <h4 className="text-white font-heading text-xl uppercase">Sugestões de Edição</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {photoSuggestions.suggestions?.map((suggestion: string, index: number) => (
                                            <label key={index} className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedEdits.includes(suggestion)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedEdits([...selectedEdits, suggestion]);
                                                        } else {
                                                            setSelectedEdits(selectedEdits.filter(s => s !== suggestion));
                                                        }
                                                    }}
                                                    className="w-4 h-4"
                                                />
                                                <span className="text-white text-sm">{suggestion}</span>
                                            </label>
                                        ))}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-mono text-neutral-500 mb-2 uppercase">Pedido Personalizado</label>
                                        <textarea
                                            value={customEditRequest}
                                            onChange={(e) => setCustomEditRequest(e.target.value)}
                                            placeholder="Ex: Deixar o fundo branco, melhorar iluminação..."
                                            className="w-full bg-black border border-neutral-700 p-3 text-white h-24 focus:border-accent-gold outline-none"
                                        />
                                    </div>

                                    <BrutalButton
                                        variant="primary"
                                        className="w-full"
                                        icon={<Wand2 />}
                                        onClick={handleGenerateContent}
                                        disabled={generatingContent}
                                    >
                                        {generatingContent ? 'Gerando...' : 'Gerar Conteúdo'}
                                    </BrutalButton>
                                </div>
                            )}

                            {/* Generated Content */}
                            {generatedContent && (
                                <div className="border-t-2 border-neutral-800 pt-6 space-y-4">
                                    <h4 className={`text-xl font-heading ${accentText} uppercase`}>Conteúdo Gerado</h4>
                                    <div className="bg-neutral-900 border border-neutral-800 p-6 space-y-4">
                                        <div>
                                            <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Legenda</p>
                                            <p className="text-white">{generatedContent.caption}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Hashtags</p>
                                            <p className={accentText}>{generatedContent.hashtags.join(' ')}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Call to Action</p>
                                            <p className="text-white">{generatedContent.cta}</p>
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            <BrutalButton
                                                variant="secondary"
                                                icon={copiedCaption ? <Check /> : <Copy />}
                                                onClick={handleCopyCaption}
                                                className="flex-1"
                                            >
                                                {copiedCaption ? 'Copiado!' : 'Copiar Tudo'}
                                            </BrutalButton>
                                            <BrutalButton variant="primary" icon={<Download />} className="flex-1">
                                                Baixar Imagem
                                            </BrutalButton>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </BrutalCard>
                </div>
            )}

            {activeTab === 'calendar' && (
                <div className="space-y-6">
                    <BrutalCard title="Calendário de Conteúdo Semanal">
                        <div className="space-y-6">
                            <BrutalButton
                                variant="primary"
                                icon={<Sparkles />}
                                onClick={handleGenerateCalendar}
                                disabled={generatingCalendar}
                                className="w-full md:w-auto"
                            >
                                {generatingCalendar ? 'Gerando Calendário...' : 'Gerar Calendário com IA'}
                            </BrutalButton>

                            {generatingCalendar && (
                                <div className="text-center py-12">
                                    <Sparkles className={`w-16 h-16 mx-auto ${accentText} animate-pulse`} />
                                    <p className="text-white mt-4 font-heading text-xl">Criando seu calendário...</p>
                                    <p className="text-text-secondary text-sm mt-2">Isso pode levar alguns segundos</p>
                                </div>
                            )}

                            {contentCalendar.length > 0 && !generatingCalendar && (
                                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                                    {contentCalendar.map((day, index) => (
                                        <div
                                            key={index}
                                            className="border border-neutral-800 p-4 hover:border-neutral-700 transition-colors cursor-pointer"
                                            onClick={() => setSelectedDay(day)}
                                        >
                                            <h4 className={`font-heading text-lg ${accentText} mb-2`}>{day.day}</h4>
                                            <span className="inline-block px-2 py-1 bg-neutral-900 text-xs font-mono uppercase mb-3">
                                                {day.content_type}
                                            </span>
                                            <p className="text-white text-sm font-bold mb-2">{day.topic}</p>
                                            <p className="text-text-secondary text-xs line-clamp-2">{day.caption}</p>
                                            <p className="text-xs font-mono text-neutral-600 mt-2">⏰ {day.posting_time}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedDay && (
                                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                                    <BrutalCard className="w-full max-w-2xl">
                                        <div className="flex items-center justify-between mb-6">
                                            <h3 className="text-2xl font-heading text-white uppercase">{selectedDay.day}</h3>
                                            <button
                                                onClick={() => setSelectedDay(null)}
                                                className="text-neutral-400 hover:text-white transition-colors text-2xl"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Tipo de Conteúdo</p>
                                                <p className="text-white capitalize">{selectedDay.content_type}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Tema</p>
                                                <p className="text-white">{selectedDay.topic}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Legenda</p>
                                                <p className="text-white">{selectedDay.caption}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Hashtags</p>
                                                <p className={accentText}>{selectedDay.hashtags.join(' ')}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Melhor Horário</p>
                                                <p className="text-white">{selectedDay.posting_time}</p>
                                            </div>
                                            <BrutalButton variant="primary" className="w-full mt-4">
                                                Copiar Conteúdo
                                            </BrutalButton>
                                        </div>
                                    </BrutalCard>
                                </div>
                            )}
                        </div>
                    </BrutalCard>
                </div>
            )}

            {activeTab === 'intelligence' && (
                <div className="space-y-6">
                    <BrutalCard title="Sugestões Inteligentes de Campanhas">
                        <div className="space-y-6">
                            <BrutalButton
                                variant="primary"
                                icon={<Target />}
                                onClick={handleAnalyzeCampaigns}
                                disabled={analyzingCampaigns}
                                className="w-full md:w-auto"
                            >
                                {analyzingCampaigns ? 'Analisando...' : 'Analisar Oportunidades'}
                            </BrutalButton>

                            {analyzingCampaigns && (
                                <div className="text-center py-12">
                                    <Target className={`w-16 h-16 mx-auto ${accentText} animate-pulse`} />
                                    <p className="text-white mt-4 font-heading text-xl">Analisando seus dados...</p>
                                    <p className="text-text-secondary text-sm mt-2">Identificando oportunidades de marketing</p>
                                </div>
                            )}

                            {campaignSuggestions.length > 0 && !analyzingCampaigns && (
                                <div className="space-y-4">
                                    {campaignSuggestions.map((suggestion, index) => (
                                        <div key={index} className="border border-neutral-800 p-6 hover:border-neutral-700 transition-colors">
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h4 className="text-white font-heading text-xl mb-2">{suggestion.name}</h4>
                                                    <span className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase ${suggestion.type === 'birthday' ? 'bg-purple-500/10 text-purple-500' :
                                                        suggestion.type === 'reactivation' ? 'bg-blue-500/10 text-blue-500' :
                                                            suggestion.type === 'promotion' ? 'bg-green-500/10 text-green-500' :
                                                                'bg-yellow-500/10 text-yellow-500'
                                                        }`}>
                                                        {suggestion.type}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p className="text-xs font-mono text-neutral-500 uppercase mb-1">Público-Alvo</p>
                                                    <p className="text-white text-sm">{suggestion.target_audience}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-mono text-neutral-500 uppercase mb-1">Objetivo</p>
                                                    <p className="text-white text-sm">{suggestion.objective}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-mono text-neutral-500 uppercase mb-1">Timing</p>
                                                    <p className="text-white text-sm">{suggestion.timing}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-mono text-neutral-500 uppercase mb-1">Impacto Esperado</p>
                                                    <p className={`text-sm ${accentText}`}>{suggestion.expected_impact}</p>
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <p className="text-xs font-mono text-neutral-500 uppercase mb-2">Mensagem Sugerida</p>
                                                <p className="text-white bg-neutral-900 p-3 rounded">{suggestion.message}</p>
                                            </div>
                                            <BrutalButton
                                                variant="primary"
                                                onClick={() => handleCreateAICampaign(suggestion)}
                                                className="w-full"
                                            >
                                                Criar Esta Campanha
                                            </BrutalButton>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </BrutalCard>
                </div>
            )}

            {/* New Campaign Modal */}
            {showNewCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 border-2 border-neutral-700 w-full max-w-lg p-6 shadow-2xl relative">
                        <button
                            onClick={() => setShowNewCampaign(false)}
                            className="absolute top-4 right-4 text-text-secondary hover:text-white"
                        >
                            ✕
                        </button>

                        <h3 className="text-2xl font-heading text-white mb-6 uppercase">Nova Campanha</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-text-secondary uppercase mb-2">Nome da Campanha</label>
                                <input
                                    type="text"
                                    value={newCampaignName}
                                    onChange={(e) => setNewCampaignName(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white focus:border-white transition-colors"
                                    placeholder="Ex: Promoção de Verão"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-text-secondary uppercase mb-2">Canal</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['whatsapp', 'sms', 'email'].map((channel) => (
                                        <button
                                            key={channel}
                                            onClick={() => setNewCampaignType(channel as any)}
                                            className={`p-3 border ${newCampaignType === channel ? 'bg-white text-black border-white' : 'border-neutral-700 hover:bg-white/5 text-white'} text-sm font-bold uppercase transition-colors`}
                                        >
                                            {channel}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-text-secondary uppercase mb-2">Mensagem</label>
                                <textarea
                                    value={newCampaignContent}
                                    onChange={(e) => setNewCampaignContent(e.target.value)}
                                    className="w-full bg-black border border-neutral-700 p-3 text-white h-32 focus:border-white transition-colors"
                                    placeholder="Digite sua mensagem..."
                                />
                            </div>

                            <BrutalButton
                                variant="primary"
                                className="w-full mt-4"
                                icon={<Send />}
                                onClick={handleCreateCampaign}
                            >
                                Criar Campanha
                            </BrutalButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
