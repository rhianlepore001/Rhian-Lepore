-- RAG 2.0 — Fase 1: Infraestrutura Supabase
-- Migration: 20260315_rag_2_0_tables.sql
-- Purpose: Create 4 context tables with pgvector, RLS policies, and ivfflat indices
-- Security: RLS enabled, anon user blocked from INSERT/UPDATE/DELETE by default

-- Habilitar extensão (se não ativa)
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela: Contexto Estratégico
CREATE TABLE IF NOT EXISTS rag_context_strategic (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_env TEXT NOT NULL CHECK (source_env IN ('antigravity', 'claude-code', 'manual')),
  source_event TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Contexto Arquitetural
CREATE TABLE IF NOT EXISTS rag_context_architecture (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_env TEXT NOT NULL CHECK (source_env IN ('antigravity', 'claude-code', 'manual')),
  source_event TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Contexto Operacional
CREATE TABLE IF NOT EXISTS rag_context_operational (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_env TEXT NOT NULL CHECK (source_env IN ('antigravity', 'claude-code', 'manual')),
  source_event TEXT NOT NULL,
  story_id TEXT,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: Contexto Conversacional (Long-Term Memory)
CREATE TABLE IF NOT EXISTS rag_context_conversational (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  source_env TEXT NOT NULL CHECK (source_env IN ('antigravity', 'claude-code', 'manual')),
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices ivfflat para busca por similaridade
CREATE INDEX IF NOT EXISTS idx_rag_strategic_embedding
  ON rag_context_strategic USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_rag_architecture_embedding
  ON rag_context_architecture USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_rag_operational_embedding
  ON rag_context_operational USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_rag_conversational_embedding
  ON rag_context_conversational USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- RLS: Habilitar em todas as tabelas
ALTER TABLE rag_context_strategic ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_architecture ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_operational ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_conversational ENABLE ROW LEVEL SECURITY;

-- Policies: leitura interna (agentes são internos — sem company_id)
CREATE POLICY "rag_select_all" ON rag_context_strategic FOR SELECT USING (true);
CREATE POLICY "rag_select_all" ON rag_context_architecture FOR SELECT USING (true);
CREATE POLICY "rag_select_all" ON rag_context_operational FOR SELECT USING (true);
CREATE POLICY "rag_select_all" ON rag_context_conversational FOR SELECT USING (true);

-- INSERT, UPDATE, DELETE: sem policy para anon = bloqueado por padrão (RLS deny-by-default)
-- Apenas service_role (scripts Python do @archivist) pode escrever — bypassa RLS nativamente
-- Explicitando a intenção (não necessário, mas documenta o design):
-- REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;
