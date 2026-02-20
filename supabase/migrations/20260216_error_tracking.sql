-- Migration: System Errors Log
-- Data: 2026-02-16
-- Descrição: Cria tabela para rastreamento de erros do sistema (Frontend/Backend)

-- ============================================================================
-- 1. TABELA DE ERROS DO SISTEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    component_stack TEXT, -- Para erros de React
    severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'error', 'critical')) DEFAULT 'error',
    context JSONB DEFAULT '{}'::jsonb, -- Metadados (URL, Browser, OS)
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE system_errors ENABLE ROW LEVEL SECURITY;

-- Permitir INSERT para qualquer usuário autenticado (para logar erros)
CREATE POLICY "Permitir insert de erros autenticados"
    ON system_errors
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Permitir INSERT anônimo (para erros de login/cadastro)
CREATE POLICY "Permitir insert de erros anônimos"
    ON system_errors
    FOR INSERT
    WITH CHECK (auth.role() = 'anon');

-- Permitir SELECT apenas para Admins (ou o próprio usuário se quiser ver seus erros, mas geralmente é admin)
-- Simplificação: Usuário vê seus próprios erros (debug)
CREATE POLICY "Usuário vê seus erros"
    ON system_errors
    FOR SELECT
    USING (user_id = auth.uid());

-- ============================================================================
-- 3. FUNÇÃO RPC PARA LOG DE ERRO (Facilita chamada do Front)
-- ============================================================================

CREATE OR REPLACE FUNCTION log_error(
    p_message TEXT,
    p_stack TEXT DEFAULT NULL,
    p_component_stack TEXT DEFAULT NULL,
    p_severity VARCHAR DEFAULT 'error',
    p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO system_errors (
        error_message,
        stack_trace,
        component_stack,
        severity,
        context,
        user_id
    ) VALUES (
        p_message,
        p_stack,
        p_component_stack,
        p_severity,
        p_context,
        auth.uid()
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
END;
$$;

-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_system_errors_created_at ON system_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_severity ON system_errors(severity);
CREATE INDEX IF NOT EXISTS idx_system_errors_user_id ON system_errors(user_id);
