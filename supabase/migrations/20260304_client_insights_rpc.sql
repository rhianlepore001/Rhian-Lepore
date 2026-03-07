-- Migração: RPC de Insights de Clientes
-- Retorna crescimento mensal de clientes, top clientes e taxa de retenção

CREATE OR REPLACE FUNCTION get_client_insights(
    p_user_id UUID,
    p_months INT DEFAULT 6
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_growth JSON;
    v_top_clients JSON;
    v_retention_rate NUMERIC;
    v_current_month_start DATE;
    v_prev_month_start DATE;
    v_returning_clients INT;
    v_prev_clients INT;
BEGIN
    v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_prev_month_start := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::DATE;

    -- Crescimento de clientes por mês (últimos p_months meses)
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'month', TO_CHAR(gs.month_date, 'Mon'),
            'new_clients', COALESCE(cnt.new_clients, 0)
        ) ORDER BY gs.month_date
    )
    INTO v_growth
    FROM GENERATE_SERIES(
        DATE_TRUNC('month', CURRENT_DATE - ((p_months - 1) || ' months')::INTERVAL)::DATE,
        v_current_month_start,
        '1 month'::INTERVAL
    ) AS gs(month_date)
    LEFT JOIN (
        SELECT
            DATE_TRUNC('month', created_at)::DATE AS month_date,
            COUNT(id) AS new_clients
        FROM clients
        WHERE user_id = p_user_id
        GROUP BY DATE_TRUNC('month', created_at)::DATE
    ) cnt ON cnt.month_date = gs.month_date;

    -- Top 10 clientes do mês atual (por número de visitas)
    SELECT JSON_AGG(
        JSON_BUILD_OBJECT(
            'name', sub.client_name,
            'visits', sub.visits,
            'revenue', sub.revenue,
            'last_visit', sub.last_visit
        ) ORDER BY sub.visits DESC
    )
    INTO v_top_clients
    FROM (
        SELECT
            COALESCE(c.name, 'Cliente') AS client_name,
            COUNT(a.id) AS visits,
            COALESCE(SUM(a.price), 0) AS revenue,
            MAX(a.appointment_time)::DATE AS last_visit
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE a.user_id = p_user_id
            AND a.status = 'Completed'
            AND DATE_TRUNC('month', a.appointment_time)::DATE = v_current_month_start
        GROUP BY c.name, a.client_id
        ORDER BY visits DESC
        LIMIT 10
    ) sub;

    -- Taxa de retenção: clientes do mês anterior que voltaram este mês
    SELECT COUNT(DISTINCT a.client_id)
    INTO v_returning_clients
    FROM appointments a
    WHERE a.user_id = p_user_id
        AND a.status = 'Completed'
        AND DATE_TRUNC('month', a.appointment_time)::DATE = v_current_month_start
        AND a.client_id IN (
            SELECT DISTINCT client_id
            FROM appointments
            WHERE user_id = p_user_id
                AND status = 'Completed'
                AND DATE_TRUNC('month', appointment_time)::DATE = v_prev_month_start
        );

    SELECT COUNT(DISTINCT client_id)
    INTO v_prev_clients
    FROM appointments
    WHERE user_id = p_user_id
        AND status = 'Completed'
        AND DATE_TRUNC('month', appointment_time)::DATE = v_prev_month_start;

    IF v_prev_clients > 0 THEN
        v_retention_rate := ROUND((v_returning_clients::NUMERIC / v_prev_clients * 100), 1);
    ELSE
        v_retention_rate := 0;
    END IF;

    v_result := JSON_BUILD_OBJECT(
        'client_growth_by_month', COALESCE(v_growth, '[]'::JSON),
        'top_clients', COALESCE(v_top_clients, '[]'::JSON),
        'retention_rate', v_retention_rate
    );

    RETURN v_result;
END;
$$;

-- Garantir permissão de execução para authenticated role
GRANT EXECUTE ON FUNCTION get_client_insights(UUID, INT) TO authenticated;
