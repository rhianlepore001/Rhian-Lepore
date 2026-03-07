export interface ClientContext {
    name: string;
    daysMissing: number;
    userType: 'barber' | 'beauty' | string;
    businessName?: string;
    lastService?: string;
    ltv?: number;
}

/**
 * Aplica o framework ABT (And, But, Therefore) para reativação.
 * Estrutura: [Conexão/Histórico] E [Frequência] MAS [Ausência] PORTANTO [Chamada para Ação].
 */
const applyABT = (context: ClientContext): string => {
    const { name, daysMissing, businessName, lastService } = context;
    const firstName = name.split(' ')[0];
    const bName = businessName || 'nossa unidade';

    return `Oi, ${firstName}! Você sempre cuida do seu ${lastService || 'visual'} com a gente no ${bName} E sua última visita foi incrível, MAS notamos que já faz ${daysMissing} dias que não nos vemos. PORTANTO, separei alguns horários exclusivos para você renovar esse estilo essa semana. Vamos agendar?`;
};

/**
 * Aplica o framework StoryBrand (Cliente como Herói, Empresa como Guia).
 * Foca no desejo do cliente e no plano para o sucesso.
 */
const applyStoryBrand = (context: ClientContext): string => {
    const { name, businessName, userType } = context;
    const firstName = name.split(' ')[0];
    const bName = businessName || 'nossa unidade';
    const goal = userType === 'beauty' ? 'dar aquele upgrade na sua autoestima' : 'manter sua presença impecável';

    return `${firstName}, você merece estar na sua melhor versão. No ${bName}, nosso plano é simples: agendar seu horário, ${goal} e garantir que você saia daqui se sentindo incrível. Como você é uma cliente especial, que tal garantirmos sua próxima visita agora?`;
};

export const generateReactivationMessage = (context: ClientContext): string => {
    const { ltv } = context;

    // Segmentação por valor (LTV) - Storytelling mais profundo para VIPs
    const isHighValue = ltv && ltv > 500;

    const message = isHighValue ? applyStoryBrand(context) : applyABT(context);

    return encodeURIComponent(message);
};

export const getWhatsAppUrl = (phone: string, message: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${message}`;
};

