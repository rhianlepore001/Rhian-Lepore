export interface CopywritingProps {
    clientName: string;
    businessName: string;
    userType: 'barber' | 'beauty' | string;
    daysMissing?: number;
    lastService?: string;
}

export const generateReactivationMessage = ({
    clientName,
    businessName,
    userType,
    daysMissing
}: CopywritingProps): string => {
    const firstName = clientName.split(' ')[0];
    const isBeauty = userType === 'beauty';

    const templates = {
        barber: [
            `Fala, ${firstName}! Tudo tranquilo? Cara, notei que já faz uns ${daysMissing || 30} dias que você não passa aqui na ${businessName}. A cadeira tá te esperando! Bora dar aquele talento? Reservo um horário pra você?`,
            `E aí ${firstName}, beleza? O pessoal aqui da ${businessName} sentiu sua falta. O cabelo já deve estar pedindo um corte, hein? 😂 Se quiser, te mando os horários disponíveis desta semana.`,
            `Grande ${firstName}! Saudade de trocar aquela ideia enquanto damos um tapa no visual. Vamos renovar esse estilo na ${businessName}? Me avisa aqui se quiser que eu separe sua vaga.`
        ],
        beauty: [
            `Olá, ${firstName}! Tudo bem? Sentimos sua falta aqui no ${businessName}. ✨ Já faz um tempinho desde sua última visita e queremos te convidar para um momento de autocuidado. Que tal agendarmos algo para esta semana?`,
            `Oi ${firstName}, como você está? Notamos que seu último procedimento no ${businessName} foi há mais de um mês. 🌸 Temos novidades e adoraríamos te receber de novo. Posso te enviar as disponibilidades?`,
            `Olá ${firstName}! Passando para dizer que o ${businessName} está com saudades de você. 😊 Que tal renovar sua autoestima hoje? Temos alguns horários especiais, quer dar uma olhadinha?`
        ]
    };

    const selectedList = isBeauty ? templates.beauty : templates.barber;
    // Seleciona um template aleatório para não parecer robótico
    const message = selectedList[Math.floor(Math.random() * selectedList.length)];

    return encodeURIComponent(message);
};

export const getWhatsAppUrl = (phone: string, message: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/${cleanPhone}?text=${message}`;
};
