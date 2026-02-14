-- Migration: Sistema de Logs de Auditoria
-- Data: 2026-02-14
-- Descrição: Implementa sistema completo de auditoria com rastreamento automático de todas as ações

-- ============================================================================
-- 1. TABELA PRINCIPAL DE LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Identificação da Ação
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'CREATE', 'UPDATE', 'DELETE', 
        'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
        'PASSWORD_CHANGE', 'EMAIL_CHANGE',
        'EXPORT', 'IMPORT', 'BACKUP'
    )),
    
    -- Recurso Afetado
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    
    -- Dados da Mudança
    old_values JSONB,
    new_values JSONB,
    
    -- Contexto da Requisição
    ip_address INET,
    user_agent TEXT,
    request_method VARCHAR(10),
    request_path TEXT,
    
    -- Metadados Adicionais
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Índices para performance
    CONSTRAINT audit_logs_action_check CHECK (length(action) > 0),
    CONSTRAINT audit_logs_resource_check CHECK (length(resource_type) > 0)
);

-- ============================================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índice principal: busca por usuário e data
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date 
    ON audit_logs(user_id, created_at DESC);

-- Índice para busca por recurso
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource 
    ON audit_logs(resource_type, resource_id, created_at DESC);

-- Índice para busca por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs(action, created_at DESC);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata 
    ON audit_logs USING gin(metadata);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Usuários só podem ver seus próprios logs
CREATE POLICY "Usuários veem apenas seus logs"
    ON audit_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- Apenas o sistema pode inserir logs (via triggers)
CREATE POLICY "Sistema pode inserir logs"
    ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- Logs são imutáveis (não podem ser atualizados ou deletados)
CREATE POLICY "Logs são imutáveis"
    ON audit_logs
    FOR UPDATE
    USING (false);

CREATE POLICY "Logs não podem ser deletados"
    ON audit_logs
    FOR DELETE
    USING (false);

-- ============================================================================
-- 4. FUNÇÃO PARA CRIAR LOGS MANUALMENTE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_audit_log(
    p_action VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        metadata
    ) VALUES (
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_old_values,
        p_new_values,
        p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

-- ============================================================================
-- 5. TRIGGER GENÉRICO PARA AUTO-LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action VARCHAR(50);
BEGIN
    -- Determinar ação
    v_action := TG_OP;
    
    -- Preparar dados antigos (apenas para UPDATE e DELETE)
    IF TG_OP = 'DELETE' THEN
        v_old_data := row_to_json(OLD)::jsonb;
        v_new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_old_data := row_to_json(OLD)::jsonb;
        v_new_data := row_to_json(NEW)::jsonb;
    ELSIF TG_OP = 'INSERT' THEN
        v_old_data := NULL;
        v_new_data := row_to_json(NEW)::jsonb;
    END IF;
    
    -- Inserir log
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        v_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data
    );
    
    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- ============================================================================
-- 6. APLICAR TRIGGERS EM TABELAS CRÍTICAS
-- ============================================================================

-- Appointments (Agendamentos)
DROP TRIGGER IF EXISTS audit_appointments ON appointments;
CREATE TRIGGER audit_appointments
    AFTER INSERT OR UPDATE OR DELETE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- Clients (Clientes)
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients
    AFTER INSERT OR UPDATE OR DELETE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- Financial Records (Registros Financeiros)
DROP TRIGGER IF EXISTS audit_financial_records ON financial_records;
CREATE TRIGGER audit_financial_records
    AFTER INSERT OR UPDATE OR DELETE ON financial_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- Services (Serviços)
DROP TRIGGER IF EXISTS audit_services ON services;
CREATE TRIGGER audit_services
    AFTER INSERT OR UPDATE OR DELETE ON services
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- Team Members (Membros da Equipe)
DROP TRIGGER IF EXISTS audit_team_members ON team_members;
CREATE TRIGGER audit_team_members
    AFTER INSERT OR UPDATE OR DELETE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- Profiles (Perfis de Usuário)
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
    AFTER UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_log();

-- ============================================================================
-- 7. FUNÇÃO RPC PARA BUSCAR LOGS COM FILTROS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_audit_logs(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_action VARCHAR DEFAULT NULL,
    p_resource_type VARCHAR DEFAULT NULL,
    p_start_date TIMESTAMPTZ DEFAULT NULL,
    p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    action VARCHAR,
    resource_type VARCHAR,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.user_id,
        p.full_name AS user_name,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.ip_address,
        al.user_agent,
        al.metadata,
        al.created_at
    FROM audit_logs al
    LEFT JOIN profiles p ON p.id = al.user_id
    WHERE 
        al.user_id = auth.uid()
        AND (p_action IS NULL OR al.action = p_action)
        AND (p_resource_type IS NULL OR al.resource_type = p_resource_type)
        AND (p_start_date IS NULL OR al.created_at >= p_start_date)
        AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ============================================================================
-- 8. FUNÇÃO PARA LIMPEZA AUTOMÁTICA (180 DIAS)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Deletar logs com mais de 180 dias
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '180 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- Comentário: Esta função deve ser executada periodicamente (ex: cronjob diário)
-- Exemplo de uso: SELECT cleanup_old_audit_logs();

-- ============================================================================
-- 9. VIEWS ÚTEIS
-- ============================================================================

-- View: Resumo de atividades por dia
CREATE OR REPLACE VIEW audit_daily_summary AS
SELECT 
    DATE(created_at) AS log_date,
    user_id,
    action,
    resource_type,
    COUNT(*) AS action_count
FROM audit_logs
GROUP BY DATE(created_at), user_id, action, resource_type
ORDER BY log_date DESC;

-- View: Ações recentes (últimas 24h)
CREATE OR REPLACE VIEW audit_recent_activity AS
SELECT 
    al.id,
    al.user_id,
    p.full_name AS user_name,
    al.action,
    al.resource_type,
    al.created_at
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;

-- ============================================================================
-- COMENTÁRIOS FINAIS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Registro completo de auditoria de todas as ações no sistema';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação realizada (CREATE, UPDATE, DELETE, etc)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Tipo de recurso afetado (nome da tabela)';
COMMENT ON COLUMN audit_logs.old_values IS 'Estado anterior do recurso (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'Novo estado do recurso (JSON)';
COMMENT ON FUNCTION create_audit_log IS 'Cria um log de auditoria manualmente';
COMMENT ON FUNCTION get_audit_logs IS 'Busca logs de auditoria com filtros opcionais';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs com mais de 180 dias';
