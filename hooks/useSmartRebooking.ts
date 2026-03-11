import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

export interface RebookingSuggestion {
    clientId: string;
    clientName: string;
    clientPhone: string;
    avgCadenceDays: number;
    daysSinceLastVisit: number;
    daysUntilSuggested: number;
    urgency: 'now' | 'soon' | 'upcoming';
    avgTicket: number;
    totalVisits: number;
    lastVisitDate: string;
}

/**
 * Calcula cadência preditiva de retorno dos clientes.
 * Usa o intervalo médio entre visitas para prever quando
 * cada cliente deveria voltar.
 */
export function useSmartRebooking() {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<RebookingSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRebookingData = async () => {
            if (!user) return;
            setLoading(true);

            try {
                // Buscar clientes com pelo menos 2 visitas para calcular cadência
                const { data: clientsData, error } = await supabase
                    .from('appointments')
                    .select(`
                        client_id,
                        appointment_time,
                        total_price,
                        clients!inner(id, name, phone)
                    `)
                    .eq('user_id', user.id)
                    .in('status', ['Confirmed', 'Completed', 'Done'])
                    .order('appointment_time', { ascending: true });

                if (error) throw error;
                if (!clientsData || clientsData.length === 0) {
                    setSuggestions([]);
                    return;
                }

                // Agrupar por cliente
                const clientVisits: Record<string, {
                    name: string;
                    phone: string;
                    visits: Date[];
                    totalSpent: number;
                }> = {};

                for (const apt of clientsData) {
                    const clientId = apt.client_id;
                    if (!clientId) continue;

                    const client = apt.clients as any;
                    if (!clientVisits[clientId]) {
                        clientVisits[clientId] = {
                            name: client?.name || 'Cliente',
                            phone: client?.phone || '',
                            visits: [],
                            totalSpent: 0
                        };
                    }
                    clientVisits[clientId].visits.push(new Date(apt.appointment_time));
                    clientVisits[clientId].totalSpent += (apt.total_price || 0);
                }

                const now = new Date();
                const results: RebookingSuggestion[] = [];

                for (const [clientId, data] of Object.entries(clientVisits)) {
                    // Precisa de pelo menos 2 visitas para calcular cadência
                    if (data.visits.length < 2) continue;

                    // Calcular intervalo médio entre visitas (em dias)
                    const intervals: number[] = [];
                    for (let i = 1; i < data.visits.length; i++) {
                        const diff = data.visits[i].getTime() - data.visits[i - 1].getTime();
                        intervals.push(diff / (1000 * 60 * 60 * 24));
                    }
                    const avgCadence = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);

                    // Última visita
                    const lastVisit = data.visits[data.visits.length - 1];
                    const daysSince = Math.round((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

                    // Dias até sugestão de contato (cadência - dias desde última)
                    const daysUntil = avgCadence - daysSince;

                    // Só sugerir clientes que estão perto ou passaram da cadência
                    // Margem: sugerir 5 dias antes da cadência esperada
                    if (daysUntil > 5) continue;

                    let urgency: 'now' | 'soon' | 'upcoming';
                    if (daysUntil <= -5) urgency = 'now';       // Já passou 5+ dias da cadência
                    else if (daysUntil <= 0) urgency = 'soon';  // Na janela da cadência
                    else urgency = 'upcoming';                    // Próximo dos 5 dias

                    results.push({
                        clientId,
                        clientName: data.name,
                        clientPhone: data.phone,
                        avgCadenceDays: avgCadence,
                        daysSinceLastVisit: daysSince,
                        daysUntilSuggested: daysUntil,
                        urgency,
                        avgTicket: Math.round(data.totalSpent / data.visits.length),
                        totalVisits: data.visits.length,
                        lastVisitDate: lastVisit.toISOString()
                    });
                }

                // Ordenar: urgentes primeiro, depois por dias até sugestão
                results.sort((a, b) => {
                    const urgencyOrder = { now: 0, soon: 1, upcoming: 2 };
                    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
                        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
                    }
                    return a.daysUntilSuggested - b.daysUntilSuggested;
                });

                setSuggestions(results);
            } catch (err) {
                logger.error('Error fetching smart rebooking data:', err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchRebookingData();
    }, [user]);

    return { suggestions, loading };
}
