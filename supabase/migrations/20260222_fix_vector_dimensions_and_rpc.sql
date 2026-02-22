-- Migração: Ajustar dimensões de vetores para Gemini e adicionar funções RPC
-- Descrição: Altera as tabelas de memória semântica para 768 dimensões e cria funções de busca.

-- 1. Alterar dimensões das colunas de embedding (768 para Gemini text-embedding-004)
ALTER TABLE public.ai_knowledge_base 
ALTER COLUMN embedding TYPE VECTOR(768);

ALTER TABLE public.client_semantic_memory 
ALTER COLUMN embedding TYPE VECTOR(768);

-- 2. Função para busca por similaridade na Base de Conhecimento (Cache Semântico)
CREATE OR REPLACE FUNCTION match_kb_content (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai_knowledge_base.id,
    ai_knowledge_base.content,
    ai_knowledge_base.metadata,
    1 - (ai_knowledge_base.embedding <=> query_embedding) AS similarity
  FROM ai_knowledge_base
  WHERE 1 - (ai_knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

-- 3. Função para busca por similaridade na Memória do Cliente (RAG)
CREATE OR REPLACE FUNCTION match_client_memories (
  p_client_id uuid,
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  observation text,
  context_type varchar,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    client_semantic_memory.id,
    client_semantic_memory.observation,
    client_semantic_memory.context_type,
    1 - (client_semantic_memory.embedding <=> query_embedding) AS similarity
  FROM client_semantic_memory
  WHERE client_semantic_memory.client_id = p_client_id
    AND 1 - (client_semantic_memory.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_kb_content IS 'Busca conteúdo similar na base de conhecimento usando similaridade de cosseno.';
COMMENT ON FUNCTION match_client_memories IS 'Busca preferências similares de um cliente específico para personalização de IA.';
