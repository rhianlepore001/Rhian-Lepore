-- Migration: descrição curta
-- Data: YYYY-MM-DD
-- Contexto: por que esta migration é necessária

-- ============================================================
-- ATENÇÃO: Toda tabela DEVE ter company_id e RLS habilitado.
-- Queries sem company_id retornam vazio silenciosamente.
-- ============================================================

-- Exemplo: criar tabela nova
CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice obrigatório para performance com RLS
CREATE INDEX IF NOT EXISTS idx_nome_tabela_company_id ON nome_tabela(company_id);

-- Habilitar RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

-- Policy: usuários autenticados só veem dados da própria empresa
CREATE POLICY "Users can view own company data" ON nome_tabela
  FOR SELECT USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policy: usuários autenticados podem inserir na própria empresa
CREATE POLICY "Users can insert own company data" ON nome_tabela
  FOR INSERT WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policy: usuários autenticados podem atualizar na própria empresa
CREATE POLICY "Users can update own company data" ON nome_tabela
  FOR UPDATE USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Policy: usuários autenticados podem deletar na própria empresa
CREATE POLICY "Users can delete own company data" ON nome_tabela
  FOR DELETE USING (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- Se precisa de acesso anônimo (booking público, fila):
-- Usar RPC com SECURITY DEFINER, NÃO policy anônima direta.
-- Ver DEBUGGING.md seção 2 para detalhes.
-- ============================================================
