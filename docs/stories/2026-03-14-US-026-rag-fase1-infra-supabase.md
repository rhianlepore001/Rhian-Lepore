---
id: US-026
título: RAG 2.0 — Fase 1: Infraestrutura Supabase (pgvector + Tabelas + RLS)
status: approved
estimativa: 1h
prioridade: high
agente: data-engineer
assignee: "@data-engineer"
executor: "@data-engineer"
quality_gate: "@dev"
quality_gate_tools:
  - supabase-mcp
  - manual-sql-review
blockedBy: []
epic: EPIC-003
---

# US-026: RAG 2.0 — Fase 1: Infraestrutura Supabase

## Por Quê

O sistema RAG 2.0 precisa de uma fundação sólida no banco de dados antes de qualquer script ou agente poder indexar contexto. Sem as tabelas certas com `pgvector`, embeddings não podem ser armazenados. Sem RLS correta, a segurança do sistema de memória fica comprometida.

Esta story é o **pré-requisito bloqueante** de todas as outras stories da EPIC-003.

## O Que

Criar a infraestrutura completa de dados para o RAG 2.0:

1. **Validar pgvector** — confirmar que a extensão está ativa no Supabase do projeto
2. **Criar migration SQL** — 4 tabelas especializadas por nível de contexto
3. **Configurar RLS** — service_role escreve, leitura interna permitida
4. **Criar índices ivfflat** — para busca por similaridade vetorial eficiente
5. **Validar GEMINI_API_KEY** — confirmar suporte ao modelo `text-embedding-004`

## Critérios de Aceitação

- [x] `SELECT extname FROM pg_extension WHERE extname = 'vector'` retorna resultado ✅ v0.8.0
- [x] Arquivo `supabase/migrations/20260315_rag_2_0_tables.sql` criado e aplicado ✅
- [x] 4 tabelas existem: `rag_context_strategic`, `rag_context_architecture`, `rag_context_operational`, `rag_context_conversational` ✅
- [x] Cada tabela possui coluna `embedding VECTOR(768)` funcional ✅
- [x] Índices `idx_rag_*_embedding` criados com `ivfflat vector_cosine_ops` ✅ (4 índices)
- [x] RLS ativo em todas as tabelas (INSERT bloqueado para anon, SELECT permitido) ✅ (4 policies)
- [x] Campo `source_env TEXT NOT NULL` presente (distingue 'antigravity' de 'claude-code') ✅
- [x] Campo `source_event TEXT NOT NULL` presente (identifica o trigger) ✅
- ⚠️ `GEMINI_API_KEY` validada: Requer teste local (usuário executar verify_embeddings.py)

## Tarefas

- [x] **1.1** Verificar pgvector via Supabase MCP: `SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`
  - Se inativo: `CREATE EXTENSION IF NOT EXISTS vector`
  - ✅ COMPLETA: pgvector v0.8.0 ativo
- [x] **1.2** Criar `supabase/migrations/20260315_rag_2_0_tables.sql` com schema completo **incluindo RLS e policies** (ver Notas Técnicas) — tudo no mesmo arquivo para evitar janela sem segurança
  - ✅ COMPLETA: Arquivo criado com 4 tabelas + RLS + indices ivfflat
- [x] **1.3** Aplicar migration via Supabase MCP (`execute_sql`) — RLS já incluso
  - ✅ COMPLETA: Migration aplicada com sucesso
- [x] **1.4** Verificar criação das 4 tabelas, índices e policies RLS ativas
  - ✅ COMPLETA: 4 tabelas criadas, 4 indices ivfflat ativas, 4 policies SELECT ativas, RLS enabled
- [x] **1.6** Teste de validação: inserir embedding de teste via service_role e buscar por similaridade
  - ✅ COMPLETA: Embedding sintético inserido (0.1 × 768) e busca por similaridade retornou resultado com score 1.0
- [x] **1.7** Confirmar que `GEMINI_API_KEY` em `.env.local` suporta `text-embedding-004`
  - ⚠️ MANUAL: Requer validação local pelo usuário. Executar:
  ```bash
  python .agent/skills/rag-archivist/scripts/verify_embeddings.py
  ```
  - Ou testar via Python:
  ```python
  import google.generativeai as genai
  genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
  result = genai.embed_content(model="models/text-embedding-004", content="Teste")
  assert len(result['embedding']) == 768  # Deve retornar 768 dimensões
  ```

## Notas Técnicas

### Schema SQL Completo

```sql
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

-- RLS
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
```

### Campos Importantes

| Campo | Tipo | Propósito |
|-------|------|-----------|
| `source_env` | TEXT | Distingue qual ambiente indexou ('antigravity' / 'claude-code') |
| `source_event` | TEXT | Qual trigger originou (ex: 'story_done', 'session_end', 'git_push') |
| `source_path` | TEXT | Caminho do arquivo de origem (chave de deduplicação) |
| `story_id` | TEXT | Referência à story relacionada (ex: 'EPIC-003.US-026') |
| `metadata` | JSONB | Tags, agente executor, hash do conteúdo |

### Teste de Validação (Fase 1.6)

```sql
-- Inserir embedding de teste (requer service_role)
-- NOTA: Substituir o array abaixo por um embedding real gerado via text-embedding-004
-- O array deve ter exatamente 768 valores float. Exemplo ilustrativo com 3 dims:
-- '[0.1, 0.2, 0.3, ...]'::vector (repetir até 768 elementos)
-- Na prática, usar o script Python verify_embeddings.py para este teste.
INSERT INTO rag_context_strategic (source_path, source_env, source_event, content, embedding)
VALUES (
  'test/validation',
  'claude-code',
  'manual_test',
  'Teste de validação do RAG 2.0',
  (SELECT array_fill(0.1::float, ARRAY[768])::vector)  -- embedding sintético para teste
);

-- Buscar por similaridade
SELECT id, source_path, content,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM rag_context_strategic
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

### Verificação do GEMINI_API_KEY

```python
# Teste rápido de validação (Python)
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
result = genai.embed_content(
    model="models/text-embedding-004",
    content="Teste de validação RAG 2.0"
)
assert len(result['embedding']) == 768, "Dimensão incorreta!"
print("✅ GEMINI_API_KEY válida para text-embedding-004 (768 dims)")
```

### Arquivos Relacionados (Read-Only)

- `PLAN-rag-2-0.md` — Plano completo do RAG 2.0
- `lib/supabase.ts` — Cliente Supabase (referência de configuração)
- `.env.local` — Verificar `GEMINI_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`
- `supabase/migrations/` — Diretório de migrações existentes

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI não está habilitado em `core-config.yaml`.
> Validação de qualidade via revisão manual do @qa.

## Arquivos Impactados

**Novos:**
- `supabase/migrations/20260315_rag_2_0_tables.sql` (criar)

**Verificados (read-only):**
- `.env.local` (validação de keys)
- `lib/supabase.ts` (referência)

## Progresso Atual

- [x] 100% — COMPLETA (infraestrutura Supabase pronta)

## Definição de Pronto

- [x] Migration SQL criada e aplicada com sucesso
- [x] 4 tabelas e 4 índices ivfflat existentes no Supabase
- [x] RLS ativo em todas as tabelas
- [x] Teste de inserção + busca por similaridade funcional
- ⚠️ `GEMINI_API_KEY` validada para `text-embedding-004` — Requer teste local
- ℹ️ Sem alterações de código TS nesta story (infraestrutura apenas)

## Notas

**Próximo:** US-027 pode iniciar após esta story. Output: tabelas prontas para receber embeddings dos scripts Python.

**Rollback:** Se a migration falhar após aplicação parcial:
```sql
DROP TABLE IF EXISTS rag_context_strategic, rag_context_architecture,
  rag_context_operational, rag_context_conversational CASCADE;
```

**pgvector no Supabase:** Disponível em todos os planos (Free, Pro, Team). Confirmar via Dashboard → Database → Extensions → `vector`.

**Referência canônica:** `PLAN-rag-2-0.md` → Fase 1

---
*Validado por @po (Pax) em 2026-03-14 — Status: APPROVED ✅*