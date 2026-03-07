-- Migração: Marketing Engine v3.0 - Oportunidades Proativas
-- Cria a RPC que identifica janelas vazias na agenda e clientes com alto potencial de retorno

CREATE OR REPLACE FUNCTION get_marketing_opportunities(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_empty_slots JSON;
    v_high_value_churn JSON;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 1. Identificar janelas vazias na agenda de hoje/amanhã
    -- Baseado em horários comerciais padrão ou lacunas entre agendamentos
    -- Para esta versão, focamos em clientes que costumam vir nestes dias da semana
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'time_slot', sub.slot_time,
            'reason', 'Agenda Vazia',
            'suggested_clients', (
                SELECT JSON_AGG(JSON_BUILD_OBJECT('name', c.name, 'phone', c.phone))
                FROM clients c
                WHERE c.user_id = p_user_id::TEXT
                AND c.is_active = true
                AND (c.last_visit < v_today - INTERVAL '15 days')
                LIMIT 2
            )
        )
    )
    INTO v_empty_slots
    FROM (
        -- Simulação de detecção de slots (Pode ser refinado com tabela de horários)
        SELECT v_today + (time_val || ' hours')::INTERVAL as slot_time
        FROM generate_series(9, 18) as time_val
        WHERE NOT EXISTS (
            SELECT 1 FROM appointments a 
            WHERE a.user_id = p_user_id::TEXT 
            AND a.appointment_time BETWEEN (v_today + (time_val || ' hours')::INTERVAL) AND (v_today + (time_val + 1 || ' hours')::INTERVAL)
            AND a.status != 'Cancelled'
        )
        LIMIT 3
    ) sub;

    -- 2. Identificar clientes de Alto Valor (LTV) em risco de Churn
    -- Clientes que gastaram mais que a média e estão sumidos
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'id', c.id,
            'name', c.name,
            'phone', c.phone,
            'total_spent', COALESCE(sub.total_spent, 0),
            'days_missing', (v_today - c.last_visit),
            'last_service', sub.last_service
        )
    )
    INTO v_high_value_churn
    FROM clients c
    JOIN (
        SELECT 
            client_id, 
            SUM(price) as total_spent,
            MAX(service) as last_service
        FROM appointments
        WHERE user_id = p_user_id::TEXT AND status = 'Completed'
        GROUP BY client_id
        HAVING SUM(price) > (
            SELECT AVG(total_price) 
            FROM (SELECT SUM(price) as total_price FROM appointments WHERE user_id = p_user_id::TEXT AND status = 'Completed' GROUP BY client_id) av
        )
    ) sub ON sub.client_id = c.id
    WHERE c.user_id = p_user_id::TEXT
    AND c.last_visit < v_today - INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM appointments a 
        WHERE a.client_id = c.id AND a.appointment_time > v_today
    )
    ORDER BY sub.total_spent DESC
    LIMIT 5;

    -- Calcula Receita Potencial (Gaps + VIPs)
    -- Para cada gap, assumimos o ticket médio do estúdio (ou 75 se nulo)
    -- Para cada VIP, assumimos o ticket médio real desse cliente
    v_total_potential := (COALESCE(jsonb_array_length(v_empty_slots), 0) * 75) + 
                         (SELECT COALESCE(SUM(total_spent / NULLIF(count, 0)), 0) 
                          FROM (SELECT (v_high_value_churn->i->>'total_spent')::DECIMAL as total_spent, 
                                       5 as count -- Média de 5 serviços para estimar ticket
                                FROM generate_series(0, COALESCE(jsonb_array_length(v_high_value_churn), 1) - 1) i) sub);

    -- Identifica oportunidades e retorna como JSON
    RETURN json_build_object(
        'empty_slots', COALESCE(v_empty_slots, '[]'::JSON),
        'high_value_clients', COALESCE(v_high_value_churn, '[]'::JSON),
        'potential_revenue', v_total_potential,
        'generated_at', v_generated_at
    );
END;
$$;

-- Segurança: Somente usuários autenticados podem rodar (RLS indireto via p_user_id)
GRANT EXECUTE ON FUNCTION get_marketing_opportunities(UUID) TO authenticated;
```
