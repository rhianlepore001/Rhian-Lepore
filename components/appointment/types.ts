import type { BusinessHours } from '../../types/settings';

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
    /** Chamado após criar; `created` identifica o agendamento para a agenda focar nele. */
    onSuccess: (date: Date, created?: { id?: string; professionalId: string }) => void;
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
    /** Horário de funcionamento: o passo Horário lista o expediente e oferece encaixe fora dele. */
    businessHours?: BusinessHours | null;
    /** Fuso do negócio (IANA) para ler o horário de funcionamento. */
    shopTimeZone?: string;
}
