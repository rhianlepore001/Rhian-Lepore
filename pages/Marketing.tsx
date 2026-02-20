import React from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import {
    Megaphone, Sparkles, Calendar, Target,
    MessageSquare, ImageIcon, Wand2, Clock, Bell, Info, Plus
} from 'lucide-react';
import { BrutalButton } from '../components/BrutalButton';

export const Marketing: React.FC = () => {
    const { userType } = useAuth();

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

    const upcomingFeatures = [
        {
            icon: Megaphone,
            title: 'Campanhas Automatizadas',
            description: 'Dispare mensagens de WhatsApp, SMS e E-mail para seus clientes de forma segmentada.'
        },
        {
            icon: Sparkles,
            title: 'Editor de Fotos IA',
            description: 'Melhore suas fotos de cortes e serviços automaticamente com inteligência artificial.'
        },
        {
            icon: Calendar,
            title: 'Calendário de Conteúdo',
            description: 'Receba sugestões diárias do que postar nas suas redes sociais para atrair mais clientes.'
        },
        {
            icon: Target,
            title: 'Inteligência de Público',
            description: 'Identifique clientes que não voltam há tempos e crie campanhas de reativação automáticas.'
        }
    ];

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b-4 border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Marketing Inteligente</h2>
                    <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
                        Atraia e fidelize mais clientes usando o poder da IA
                    </p>
                </div>
                <BrutalButton
                    variant="primary"
                    icon={<Plus />}
                    onClick={() => alert('O Criador de Campanhas com IA está em fase final de desenvolvimento e será liberado em breve!')}
                    id="create-campaign-btn"
                >
                    Criar Campanha
                </BrutalButton>
            </div>

            {/* Coming Soon Banner */}
            <BrutalCard className={`border-l-4 border-${accentColor} bg-gradient-to-r from-neutral-900 to-neutral-800`}>
                <div className="flex flex-col md:flex-row items-center gap-6 py-8">
                    <div className={`p-6 rounded-full ${accentBg}/10`}>
                        <MessageSquare className={`w-16 h-16 ${accentText}`} />
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h3 className={`text-3xl font-heading ${accentText} uppercase mb-2`}>
                            Em Breve!
                        </h3>
                        <p className="text-white text-lg mb-4">
                            Sua barbearia/salão terá um departamento de marketing completo integrado ao sistema.
                        </p>
                        <p className="text-neutral-400 text-sm">
                            Estamos finalizando as integrações de IA para que você possa criar anúncios, editar fotos
                            e enviar mensagens automáticas sem esforço.
                        </p>
                    </div>
                </div>
            </BrutalCard>

            {/* Upcoming Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingFeatures.map((feature, index) => (
                    <BrutalCard key={index} className="opacity-60 hover:opacity-80 transition-opacity">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-neutral-800 rounded-lg">
                                <feature.icon className="w-6 h-6 text-neutral-400" />
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-lg mb-1">{feature.title}</h4>
                                <p className="text-neutral-500 text-sm">{feature.description}</p>
                            </div>
                        </div>
                    </BrutalCard>
                ))}
            </div>

            {/* Notify Me */}
            <BrutalCard className="text-center">
                <Bell className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                <h4 className="text-white font-heading text-xl uppercase mb-2">
                    Quer turbinar seu marketing?
                </h4>
                <p className="text-neutral-400 text-sm mb-6 max-w-md mx-auto">
                    Avisaremos assim que as ferramentas de IA estiverem prontas para impulsionar seu faturamento.
                </p>
                <BrutalButton variant="secondary" disabled>
                    <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Em Desenvolvimento
                    </span>
                </BrutalButton>
            </BrutalCard>
        </div>
    );
};
