export interface Service {
    id: string;
    name: string;
    price: number;
    duration_minutes?: number;
    category_id?: string;
    description?: string | null;
}

export interface WizardProps {
    onClose: () => void;
    onSuccess: (date: Date) => void;
    initialDate?: Date;
    /** Pré-seleção ao abrir a partir da grade da Agenda */
    initialProfessionalId?: string;
    initialTime?: string;
    /**
     * Horário liberado por uma falta ("Usar este horário" / "+" ao lado da falta):
     * frase de contexto no topo; profissional e horário já vêm preenchidos e o
     * passo Horário é pulado (cliente e serviço ficam em branco).
     */
    slotContext?: string;
    teamMembers: any[];
    services: Service[];
    categories?: any[];
    clients: any[];
    onRefreshClients: () => void;
}
