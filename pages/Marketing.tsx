import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Megaphone, Mail, MessageSquare, Send, Plus, Users, BarChart2, CheckCircle } from 'lucide-react';
import { InfoButton, AIAssistantButton } from '../components/HelpButtons';

interface Campaign {
    id: string;
    name: string;
    type: 'email' | 'sms' | 'whatsapp';
    status: 'draft' | 'scheduled' | 'sent';
    audience: number;
    date: string;
}

export const Marketing: React.FC = () => {
    const { user, userType } = useAuth();
    const [showNewCampaign, setShowNewCampaign] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // New Campaign Form
    const [newCampaignName, setNewCampaignName] = useState('');
    const [newCampaignType, setNewCampaignType] = useState<'email' | 'sms' | 'whatsapp'>('whatsapp');
    const [newCampaignContent, setNewCampaignContent] = useState('');

    useEffect(() => {
        fetchCampaigns();
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

    const handleCreateCampaign = async () => {
        try {
            const { error } = await supabase.from('campaigns').insert({
                user_id: user.id,
                name: newCampaignName,
                type: newCampaignType,
                content: newCampaignContent,
                status: 'draft',
                audience_count: 0 // Logic to calculate audience would go here
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

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-white/10 pb-4 gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Marketing</h2>
                        <AIAssistantButton context="estratégias de marketing e campanhas" />
                    </div>
                    <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
                        Atraia e fidelize clientes com campanhas inteligentes
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <BrutalCard>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Alcance Total</p>
                        <InfoButton text="Número total de clientes impactados por suas campanhas." />
                    </div>
                    <h3 className={`text-3xl font-heading ${accentText}`}>1,240</h3>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-mono mt-2">
                        <Users className="w-3 h-3" />
                        <span>+12% este mês</span>
                    </div>
                </BrutalCard>

                <BrutalCard>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Taxa de Abertura</p>
                        <InfoButton text="Porcentagem de clientes que visualizaram suas mensagens." />
                    </div>
                    <h3 className="text-3xl font-heading text-white">68%</h3>
                    <div className="flex items-center gap-1 text-text-secondary text-xs font-mono mt-2">
                        <BarChart2 className="w-3 h-3" />
                        <span>Média do setor: 45%</span>
                    </div>
                </BrutalCard>

                <BrutalCard>
                    <div className="flex justify-between items-start mb-2">
                        <p className="text-text-secondary font-mono text-xs uppercase tracking-widest">Retorno (ROI)</p>
                        <InfoButton text="Receita gerada diretamente através das campanhas." />
                    </div>
                    <h3 className="text-3xl font-heading text-white">R$ 4.5k</h3>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-mono mt-2">
                        <CheckCircle className="w-3 h-3" />
                        <span>15 agendamentos</span>
                    </div>
                </BrutalCard>
            </div>

            {/* Campaigns List */}
            <BrutalCard title="Minhas Campanhas">
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
            </BrutalCard>

            {/* New Campaign Modal (Mock) */}
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
