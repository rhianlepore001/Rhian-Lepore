-- Migração: Habilitar pgvector e tabelas de memória semântica
-- Descrição: Ativa a extensão de vetores e cria estrutura para RAG e preferências de clientes.

-- 1. Habilitar a extensão pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabela para FAQ e Base de Conhecimento da Barbearia (Cache Semântico)
CREATE TABLE IF NOT EXISTS public.ai_knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    embedding VECTOR(1536), -- Dimensão padrão para OpenAI text-embedding-ada-002 / v3-small
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela para Memória de Preferências de Clientes (RAG Individualizado)
CREATE TABLE IF NOT EXISTS public.client_semantic_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    observation TEXT NOT NULL,
    embedding VECTOR(1536),
    context_type VARCHAR(50), -- 'style', 'preference', 'habit'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices para busca por similaridade (HNSW para performance)
CREATE INDEX IF NOT EXISTS ai_knowledge_base_embedding_idx ON public.ai_knowledge_base 
USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS client_semantic_memory_embedding_idx ON public.client_semantic_memory 
USING hnsw (embedding vector_cosine_ops);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE public.ai_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_semantic_memory ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (apenas autenticados)
CREATE POLICY "Permitir leitura da base de conhecimento para todos autenticados"
ON public.ai_knowledge_base FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Permitir gestão de memória semântica por barbeiros"
ON public.client_semantic_memory FOR ALL
TO authenticated
USING (true); -- No futuro, filtrar por user_id/barber_id

COMMENT ON TABLE public.ai_knowledge_base IS 'Base de conhecimento vetorial para reduzir consumo de tokens via RAG.';
COMMENT ON TABLE public.client_semantic_memory IS 'Memória semântica para sugestões proativas e personalização profunda.';
