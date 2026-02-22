-- Rollback: Remover pgvector e tabelas de memória semântica
-- Descrição: Reverte as mudanças feitas na migração 20260222_enable_vector_and_semantic_memory.sql

-- 1. Remover Políticas
DROP POLICY IF EXISTS "Permitir leitura da base de conhecimento para todos autenticados" ON public.ai_knowledge_base;
DROP POLICY IF EXISTS "Permitir gestão de memória semântica por barbeiros" ON public.client_semantic_memory;

-- 2. Remover Índices
DROP INDEX IF EXISTS public.ai_knowledge_base_embedding_idx;
DROP INDEX IF EXISTS public.client_semantic_memory_embedding_idx;

-- 3. Remover Tabelas
DROP TABLE IF EXISTS public.ai_knowledge_base;
DROP TABLE IF EXISTS public.client_semantic_memory;

-- 4. Desabilitar Extensão (Opcional, pode manter se outras partes usarem)
-- DROP EXTENSION IF EXISTS vector;

COMMENT ON TABLE public.ai_knowledge_base IS NULL;
COMMENT ON TABLE public.client_semantic_memory IS NULL;
