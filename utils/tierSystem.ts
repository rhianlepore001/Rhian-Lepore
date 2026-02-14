import { Appointment } from '../types';

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

export interface TierConfig {
    name: LoyaltyTier;
    minVisits: number;
    maxVisits: number;
    color: string;
    bgColor: string;
    borderColor: string;
}

export const TIER_CONFIGS: TierConfig[] = [
    {
        name: 'Bronze',
        minVisits: 0,
        maxVisits: 5,
        color: 'text-amber-700',
        bgColor: 'bg-amber-900/20',
        borderColor: 'border-amber-700'
    },
    {
        name: 'Silver',
        minVisits: 6,
        maxVisits: 15,
        color: 'text-gray-400',
        bgColor: 'bg-gray-800/20',
        borderColor: 'border-gray-400'
    },
    {
        name: 'Gold',
        minVisits: 16,
        maxVisits: 30,
        color: 'text-accent-gold',
        bgColor: 'bg-accent-gold/10',
        borderColor: 'border-accent-gold'
    },
    {
        name: 'Platinum',
        minVisits: 31,
        maxVisits: Infinity,
        color: 'text-white',
        bgColor: 'bg-white/10',
        borderColor: 'border-white'
    }
];

export function calculateTier(totalVisits: number): LoyaltyTier {
    const tier = TIER_CONFIGS.find(
        t => totalVisits >= t.minVisits && totalVisits <= t.maxVisits
    );
    return tier?.name || 'Bronze';
}

export function getTierConfig(tier: LoyaltyTier): TierConfig {
    return TIER_CONFIGS.find(t => t.name === tier) || TIER_CONFIGS[0];
}

export function calculateNextVisitPrediction(appointments: Appointment[]): string {
    if (!appointments || appointments.length < 2) {
        return 'Dados insuficientes';
    }

    // Calculate average days between visits
    const sortedAppointments = [...appointments]
        .sort((a, b) => {
            const timeA = new Date(a.appointment_time || a.time).getTime();
            const timeB = new Date(b.appointment_time || b.time).getTime();
            return timeA - timeB;
        });

    let totalDays = 0;
    let intervals = 0;

    for (let i = 1; i < sortedAppointments.length; i++) {
        const prevDate = new Date(sortedAppointments[i - 1].appointment_time || sortedAppointments[i - 1].time);
        const currDate = new Date(sortedAppointments[i].appointment_time || sortedAppointments[i].time);
        const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDays += daysDiff;
        intervals++;
    }

    const avgDays = Math.round(totalDays / intervals);
    const lastVisit = new Date(sortedAppointments[sortedAppointments.length - 1].appointment_time);
    const predictedDate = new Date(lastVisit);
    predictedDate.setDate(predictedDate.getDate() + avgDays);

    const today = new Date();
    const daysUntil = Math.floor((predictedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
        return 'Atrasado';
    } else if (daysUntil === 0) {
        return 'Hoje';
    } else if (daysUntil === 1) {
        return 'Amanhã';
    } else if (daysUntil <= 7) {
        return `${daysUntil} dias`;
    } else {
        return predictedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
}
