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
    teamMembers: any[];
    services: Service[];
    categories?: any[];
    clients: any[];
    onRefreshClients: () => void;
}
