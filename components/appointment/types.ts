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
    teamMembers: any[];
    services: Service[];
    categories?: any[];
    clients: any[];
    onRefreshClients: () => void;
}
