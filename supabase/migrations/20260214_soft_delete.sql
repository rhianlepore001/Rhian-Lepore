-- Migration: Sistema de Soft Delete
-- Data: 2026-02-14
-- Descrição: Implementa exclusão lógica com recuperação em 30 dias

-- ============================================================================
-- 1. ADICIONAR COLUNA deleted_at EM TABELAS CRÍTICAS
-- ============================================================================

-- Appointments
ALTER TABLE IF EXISTS appointments 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Clients  
ALTER TABLE IF EXISTS clients 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Financial Records
ALTER TABLE IF EXISTS financial_records 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Services
ALTER TABLE IF EXISTS services 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Team Members
ALTER TABLE IF EXISTS team_members 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_deleted 
    ON appointments(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clients_deleted 
    ON clients(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_records_deleted 
    ON financial_records(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_services_deleted 
    ON services(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_team_members_deleted 
    ON team_members(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- 3. FUNÇÕES DE SOFT DELETE
-- ============================================================================

-- Soft Delete para Appointments
CREATE OR REPLACE FUNCTION soft_delete_appointment(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE appointments 
    SET deleted_at = NOW() 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agendamento não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Soft Delete para Clients
CREATE OR REPLACE FUNCTION soft_delete_client(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clients 
    SET deleted_at = NOW() 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Soft Delete para Financial Records
CREATE OR REPLACE FUNCTION soft_delete_financial_record(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE financial_records 
    SET deleted_at = NOW() 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro financeiro não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Soft Delete para Services
CREATE OR REPLACE FUNCTION soft_delete_service(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE services 
    SET deleted_at = NOW() 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Serviço não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Soft Delete para Team Members
CREATE OR REPLACE FUNCTION soft_delete_team_member(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE team_members 
    SET deleted_at = NOW() 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membro da equipe não encontrado ou sem permissão';
    END IF;
END;
$$;

-- ============================================================================
-- 4. FUNÇÕES DE RESTAURAÇÃO
-- ============================================================================

-- Restore Appointment
CREATE OR REPLACE FUNCTION restore_appointment(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE appointments 
    SET deleted_at = NULL 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Agendamento não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Restore Client
CREATE OR REPLACE FUNCTION restore_client(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE clients 
    SET deleted_at = NULL 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cliente não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Restore Financial Record
CREATE OR REPLACE FUNCTION restore_financial_record(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE financial_records 
    SET deleted_at = NULL 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Registro financeiro não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Restore Service
CREATE OR REPLACE FUNCTION restore_service(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE services 
    SET deleted_at = NULL 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Serviço não encontrado ou sem permissão';
    END IF;
END;
$$;

-- Restore Team Member
CREATE OR REPLACE FUNCTION restore_team_member(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE team_members 
    SET deleted_at = NULL 
    WHERE id = p_id 
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Membro da equipe não encontrado ou sem permissão';
    END IF;
END;
$$;

-- ============================================================================
-- 5. FUNÇÃO PARA BUSCAR ITENS DELETADOS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_deleted_items(
    p_resource_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    resource_type VARCHAR,
    name TEXT,
    deleted_at TIMESTAMPTZ,
    days_until_permanent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_resource_type = 'appointments' OR p_resource_type IS NULL THEN
        RETURN QUERY
        SELECT 
            a.id::UUID,
            'appointments'::VARCHAR,
            c.name || ' - ' || TO_CHAR(a.appointment_time, 'DD/MM/YYYY HH24:MI') AS name,
            a.deleted_at,
            30 - EXTRACT(DAY FROM NOW() - a.deleted_at)::INTEGER AS days_until_permanent
        FROM appointments a
        LEFT JOIN clients c ON c.id = a.client_id
        WHERE a.user_id = auth.uid()
        AND a.deleted_at IS NOT NULL
        AND a.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY a.deleted_at DESC
        LIMIT p_limit;
    END IF;
    
    IF p_resource_type = 'clients' OR p_resource_type IS NULL THEN
        RETURN QUERY
        SELECT 
            c.id::UUID,
            'clients'::VARCHAR,
            c.name AS name,
            c.deleted_at,
            30 - EXTRACT(DAY FROM NOW() - c.deleted_at)::INTEGER AS days_until_permanent
        FROM clients c
        WHERE c.user_id = auth.uid()
        AND c.deleted_at IS NOT NULL
        AND c.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY c.deleted_at DESC
        LIMIT p_limit;
    END IF;
    
    IF p_resource_type = 'services' OR p_resource_type IS NULL THEN
        RETURN QUERY
        SELECT 
            s.id::UUID,
            'services'::VARCHAR,
            s.name AS name,
            s.deleted_at,
            30 - EXTRACT(DAY FROM NOW() - s.deleted_at)::INTEGER AS days_until_permanent
        FROM services s
        WHERE s.user_id = auth.uid()
        AND s.deleted_at IS NOT NULL
        AND s.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY s.deleted_at DESC
        LIMIT p_limit;
    END IF;
    
    IF p_resource_type = 'team_members' OR p_resource_type IS NULL THEN
        RETURN QUERY
        SELECT 
            t.id::UUID,
            'team_members'::VARCHAR,
            t.name AS name,
            t.deleted_at,
            30 - EXTRACT(DAY FROM NOW() - t.deleted_at)::INTEGER AS days_until_permanent
        FROM team_members t
        WHERE t.user_id = auth.uid()
        AND t.deleted_at IS NOT NULL
        AND t.deleted_at > NOW() - INTERVAL '30 days'
        ORDER BY t.deleted_at DESC
        LIMIT p_limit;
    END IF;
END;
$$;

-- ============================================================================
-- 6. LIMPEZA AUTOMÁTICA (30 DIAS)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_deleted_items()
RETURNS TABLE (
    resource_type VARCHAR,
    deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_appointments_deleted INTEGER;
    v_clients_deleted INTEGER;
    v_financial_deleted INTEGER;
    v_services_deleted INTEGER;
    v_team_deleted INTEGER;
BEGIN
    -- Delete appointments older than 30 days
    DELETE FROM appointments
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_appointments_deleted = ROW_COUNT;
    
    -- Delete clients older than 30 days
    DELETE FROM clients
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_clients_deleted = ROW_COUNT;
    
    -- Delete financial records older than 30 days
    DELETE FROM financial_records
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_financial_deleted = ROW_COUNT;
    
    -- Delete services older than 30 days
    DELETE FROM services
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_services_deleted = ROW_COUNT;
    
    -- Delete team members older than 30 days
    DELETE FROM team_members
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_team_deleted = ROW_COUNT;
    
    -- Return summary
    RETURN QUERY
    SELECT 'appointments'::VARCHAR, v_appointments_deleted
    UNION ALL
    SELECT 'clients'::VARCHAR, v_clients_deleted
    UNION ALL
    SELECT 'financial_records'::VARCHAR, v_financial_deleted
    UNION ALL
    SELECT 'services'::VARCHAR, v_services_deleted
    UNION ALL
    SELECT 'team_members'::VARCHAR, v_team_deleted;
END;
$$;

-- ============================================================================
-- 7. ATUALIZAR POLÍTICAS RLS (EXCLUIR SOFT DELETED POR PADRÃO)
-- ============================================================================

-- Nota: As políticas RLS existentes já devem funcionar corretamente.
-- Os aplicativos devem filtrar por deleted_at IS NULL nas queries normais.
-- Use get_deleted_items() para acessar a lixeira.

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION soft_delete_appointment IS 'Move agendamento para lixeira (soft delete)';
COMMENT ON FUNCTION restore_appointment IS 'Restaura agendamento da lixeira';
COMMENT ON FUNCTION get_deleted_items IS 'Lista todos os itens na lixeira (com menos de 30 dias)';
COMMENT ON FUNCTION cleanup_old_deleted_items IS 'Remove permanentemente itens com mais de 30 dias na lixeira';
