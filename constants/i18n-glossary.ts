/**
 * Glossário de termos simplificados para interface do usuário
 * Objetivo: Tornar a linguagem mais acessível para usuários leigos
 */

export const SIMPLE_LABELS = {
    // Agendamento/Atendimento
    'Agendamento': 'Atendimento',
    'Novo Agendamento': 'Novo Atendimento',
    'Criar Agendamento': 'Marcar Atendimento',
    'Agendamentos': 'Atendimentos',
    'Histórico de Agendamentos': 'Atendimentos Anteriores',
    'Próximos Agendamentos': 'Próximos Atendimentos',
    'Agendamentos Atrasados': 'Atendimentos Atrasados',
    'Confirmar Agendamento': 'Confirmar Atendimento',
    'Editar Agendamento': 'Alterar Atendimento',
    'Detalhes do Agendamento': 'Informações do Atendimento',

    // Configurações/Settings
    'Agendamento Público': 'Reserva Online',
    'Link de Agendamento': 'Link de Reserva',
    'Configure seu Link de Agendamento': 'Configure sua Reserva Online',
    'Ativar Agendamento Público': 'Ativar Reservas Online',
    'Página de Agendamento Online': 'Página de Reservas',

    // Termos técnicos
    'UUID': 'Código',
    'RLS': 'Segurança',
    'Subscription': 'Assinatura',
    'Premium': 'Plano Pro',

    // Outras simplificações
    'Configurações': 'Ajustes',
    'Dashboard': 'Painel',
    'Insights': 'Análises',
} as const;

/**
 * Helper function para obter label simplificado
 */
export const getSimpleLabel = (key: keyof typeof SIMPLE_LABELS): string => {
    return SIMPLE_LABELS[key] || key;
};

/**
 * Helper para substituir múltiplas ocorrências em um texto
 */
export const simplifyText = (text: string): string => {
    let simplified = text;
    Object.entries(SIMPLE_LABELS).forEach(([original, simplified_term]) => {
        simplified = simplified.replace(new RegExp(original, 'g'), simplified_term);
    });
    return simplified;
};
