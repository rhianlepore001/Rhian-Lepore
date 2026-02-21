-- AIOS Diagnostic Engine: Revenue Recovery & Gap Detection
-- Purpose: Identify "Churning" clients and calculate lost revenue opportunities.

CREATE OR REPLACE FUNCTION get_aios_diagnostic(p_establishment_id UUID)
RETURNS JSON AS $$
DECLARE
    v_churn_days INTEGER := 30; -- Dias sem visita para considerar churn
    v_min_visits INTEGER := 2;  -- Mínimo de visitas para ser considerado "habitual"
    v_total_recoverable DECIMAL(10,2) := 0;
    v_at_risk_clients JSON;
    v_agenda_gaps JSON;
    v_result JSON;
BEGIN
    -- 1. Identificar Clientes em Risco (Churn)
    -- Critério: Habitual (>v_min_visits), última visita > v_churn_days, sem agendamento futuro.
    SELECT json_agg(row_to_json(t)) INTO v_at_risk_clients
    FROM (
        SELECT 
            c.id,
            c.name,
            c.phone,
            MAX(a.appointment_time) as last_visit,
            COUNT(a.id) as total_visits,
            AVG(a.price) as avg_ticket,
            (NOW() - MAX(a.appointment_time)) as days_since_last_visit
        FROM clients c
        JOIN appointments a ON a.client_id = c.id
        WHERE c.user_id = p_establishment_id
          AND a.status = 'Completed'
        GROUP BY c.id, c.name, c.phone
        HAVING COUNT(a.id) >= v_min_visits
           AND MAX(a.appointment_time) < (NOW() - (v_churn_days || ' days')::INTERVAL)
           AND NOT EXISTS (
               SELECT 1 FROM appointments a2 
               WHERE a2.client_id = c.id 
                 AND a2.appointment_time > NOW()
                 AND a2.status IN ('Confirmed', 'Pending')
           )
        ORDER BY last_visit DESC
    ) t;

    -- 2. Calcular Receita Recuperável Total
    SELECT COALESCE(SUM(avg_ticket), 0) INTO v_total_recoverable
    FROM (
        SELECT AVG(a.price) as avg_ticket
        FROM clients c
        JOIN appointments a ON a.client_id = c.id
        WHERE c.user_id = p_establishment_id
          AND a.status = 'Completed'
        GROUP BY c.id
        HAVING COUNT(a.id) >= v_min_visits
           AND MAX(a.appointment_time) < (NOW() - (v_churn_days || ' days')::INTERVAL)
           AND NOT EXISTS (
               SELECT 1 FROM appointments a2 
               WHERE a2.client_id = c.id 
                 AND a2.appointment_time > NOW()
                 AND a2.status IN ('Confirmed', 'Pending')
           )
    ) diag;

    -- 3. Identificar Buracos na Agenda (Próximos 7 dias)
    -- Por simplicidade inicial, vamos focar apenas nos dias com ocupação < 50%
    -- (Lógica mais complexa de slots vazios será adicionada na V2.1)
    SELECT json_agg(row_to_json(g)) INTO v_agenda_gaps
    FROM (
        SELECT 
            date_trunc('day', appointment_time) as date,
            COUNT(*) as appointments_count,
            'low_occupancy' as gap_type
        FROM appointments
        WHERE user_id = p_establishment_id
          AND appointment_time > NOW()
          AND appointment_time < (NOW() + INTERVAL '7 days')
        GROUP BY date_trunc('day', appointment_time)
        HAVING COUNT(*) < 5 -- Exemplo: menos de 5 agendamentos no dia
    ) g;

    -- 4. Registrar Log de Diagnóstico (IA Learning)
    INSERT INTO aios_logs (user_id, agent_name, action_type, content)
    VALUES (p_establishment_id, 'FinanceAgent', 'suggestion', 
            json_build_object(
                'recoverable_revenue', v_total_recoverable,
                'at_risk_count', COALESCE(json_array_length(v_at_risk_clients), 0)
            ));

    -- 5. Build Result
    v_result := json_build_object(
        'recoverable_revenue', v_total_recoverable,
        'at_risk_clients', COALESCE(v_at_risk_clients, '[]'::json),
        'agenda_gaps', COALESCE(v_agenda_gaps, '[]'::json),
        'diagnostic_date', NOW()
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões
GRANT EXECUTE ON FUNCTION get_aios_diagnostic(UUID) TO authenticated;
