-- Migration: Rate Limiting System (Postgres-based)
-- Data: 2026-02-14
-- Descrição: Implementa limitação de taxa usando tabela UNLOGGED para alta performance

-- ============================================================================
-- 1. TABELA DE RATE LIMIT (UNLOGGED para performance)
-- ============================================================================

CREATE UNLOGGED TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    tokens INTEGER NOT NULL,
    last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index limpo automaticamente pois é PK

-- ============================================================================
-- 2. FUNÇÃO DE VERIFICAÇÃO (Token Bucket Algorithm)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key TEXT,
    p_limit INTEGER,
    p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_tokens INTEGER;
    r_last_refill TIMESTAMPTZ;
    v_now TIMESTAMPTZ := NOW();
    v_tokens_to_add INTEGER;
    v_new_tokens INTEGER;
BEGIN
    -- Buscar estado atual
    SELECT tokens, last_refill INTO r_tokens, r_last_refill
    FROM rate_limits
    WHERE key = p_key;

    -- Se não existe, inicializa
    IF NOT FOUND THEN
        INSERT INTO rate_limits (key, tokens, last_refill)
        VALUES (p_key, p_limit - 1, v_now)
        ON CONFLICT (key) DO NOTHING;
        RETURN TRUE;
    END IF;

    -- Calcular quantos tokens adicionar baseados no tempo passado
    -- (Refill rate = limit / window)
    -- Simplificação: Reset completo se passar a janela (Window fixa vs Sliding)
    -- Implementação Sliding Window simples:
    
    IF v_now >= r_last_refill + (p_window_seconds || ' seconds')::INTERVAL THEN
        -- Janela passou, reset e consome 1
        UPDATE rate_limits
        SET tokens = p_limit - 1,
            last_refill = v_now
        WHERE key = p_key;
        RETURN TRUE;
    ELSE
        -- Dentro da janela
        IF r_tokens > 0 THEN
            -- Tem tokens, consome 1
            UPDATE rate_limits
            SET tokens = r_tokens - 1
            WHERE key = p_key;
            RETURN TRUE;
        ELSE
            -- Sem tokens, bloqueia
            RETURN FALSE;
        END IF;
    END IF;
END;
$$;

-- ============================================================================
-- 3. FUNÇÃO AUXILIAR PARA LOGIN (Proteção contra Brute Force)
-- ============================================================================

CREATE OR REPLACE FUNCTION check_login_rate_limit(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Limite: 5 tentativas por minuto por email
    RETURN check_rate_limit('login:' || p_email, 5, 60);
END;
$$;

-- ============================================================================
-- 4. LIMPEZA AUTOMÁTICA
-- ============================================================================

-- Função para limpar chaves antigas (pode ser chamada por cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM rate_limits
    WHERE last_refill < NOW() - INTERVAL '1 hour';
END;
$$;

COMMENT ON TABLE rate_limits IS 'Tabela volátil (UNLOGGED) para controle de rate limiting';
COMMENT ON FUNCTION check_rate_limit IS 'Verifica e consome tokens de limite de taxa (Token Bucket simplificado)';
