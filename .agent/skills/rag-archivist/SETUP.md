# RAG 2.0 — Guia de Instalação e Setup

## 🚀 Quick Start

### 1. **Instalar Dependências Python**

```bash
# Navegar para a pasta do skill
cd .agent/skills/rag-archivist

# Instalar dependências
pip install -r requirements.txt
```

**Dependências instaladas:**
- `google-genai>=0.3.0` — Google Generative AI (text-embedding-004 768-dim)
- `supabase>=2.0.0` — Supabase Python SDK
- `requests>=2.31.0` — HTTP library (dep do supabase)
- `pytest>=7.4.0` — Testing framework
- `python-dotenv>=1.0.0` — Load .env files

### 2. **Configurar Variáveis de Ambiente**

Adicione no `.env.local` (ou `.env`) na **raiz do projeto**:

```bash
# Google Generative AI — embeddings
# Obtenha em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**⚠️ IMPORTANTE:** Nunca commitar `.env.local` com credenciais reais.

### 3. **Aplicar Migration RLS no Supabase**

O sistema RAG requer RLS policies explícitas para `service_role` (fix para PGRST204).

**Opção A: Via Supabase Dashboard (Recomendado)**

1. Abra Supabase Dashboard → SQL Editor
2. Cole o SQL abaixo e execute:

```sql
-- RAG 2.0 — RLS Policies para service_role
DROP POLICY IF EXISTS "rag_service_role_write_strategic" ON rag_context_strategic;
CREATE POLICY "rag_service_role_write_strategic"
  ON rag_context_strategic FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rag_service_role_write_architecture" ON rag_context_architecture;
CREATE POLICY "rag_service_role_write_architecture"
  ON rag_context_architecture FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rag_service_role_write_operational" ON rag_context_operational;
CREATE POLICY "rag_service_role_write_operational"
  ON rag_context_operational FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "rag_service_role_write_conversational" ON rag_context_conversational;
CREATE POLICY "rag_service_role_write_conversational"
  ON rag_context_conversational FOR ALL TO service_role USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
```

3. Confirme que não há erros

**Opção B: Via CLI (Supabase CLI)**

```bash
supabase db push supabase/migrations/20260317_rag_service_role_policies.sql
```

---

## ✅ Validação do Setup

### Teste 1: Verificar Embedding (test_emb.py)

```bash
cd .agent/skills/rag-archivist/scripts
python test_emb.py
```

**Saída esperada:**
```
✅ gemini-embedding-2-preview dimensões: 768
```

### Teste 2: Teste Completo (verify_embeddings.py)

```bash
cd .agent/skills/rag-archivist/scripts
python verify_embeddings.py
```

**Saída esperada:**
```
🔍 RAG 2.0 — Verificação de Integridade de Embeddings
================================================

✅ rag_context_strategic
   Total: 0
   Com embedding: 0
   NULL: 0

... [outras 3 tabelas] ...

================================================
📊 Sumário Geral
   Total de registros: 0
   Com embeddings: 0
   NULL: 0
   Status: ✅ PASSED
```

---

## 📝 Uso do Sistema RAG

### Sincronizar um arquivo

```bash
cd .agent/skills/rag-archivist/scripts
python sync_memory.py --path docs/stories/2026-03-14-US-029.md
```

### Sincronizar diretório inteiro

```bash
python sync_memory.py --dir docs/stories/
```

### Simulação sem escrever (dry-run)

```bash
python sync_memory.py --path PLAN-rag-2-0.md --dry-run
```

### Forçar tabela específica

```bash
python sync_memory.py --path docs/architecture.md --table rag_context_architecture
```

---

## 🔧 Estrutura dos Scripts

| Script | Responsabilidade |
|--------|------------------|
| `sanitizer.py` | Remove API keys, JWTs, env vars antes de indexar |
| `indexer.py` | Gera embeddings via Google Gemini (768 dims) e faz UPSERT no Supabase |
| `pruner.py` | Deduplicação (SHA-256) + marca conteúdo obsoleto |
| `sync_memory.py` | **CLI principal** — orquestra todo fluxo (ler → sanitizar → deduplcar → indexar) |
| `verify_embeddings.py` | Validação de integridade (conta registros, verifica dimensão 768) |
| `test_emb.py` | Script de teste rápido para validar credenciais e API |

---

## 🐛 Troubleshooting

### ❌ `GEMINI_API_KEY não encontrada`

**Causa:** `.env.local` não existe ou não tem a chave

**Solução:**
```bash
# Criar .env.local na raiz
echo "GEMINI_API_KEY=your-key" > .env.local
```

### ❌ `PGRST204 — Not found` ao fazer UPSERT

**Causa:** RLS policies não foram aplicadas

**Solução:** Execute o SQL de RLS acima no Supabase Dashboard

### ❌ `ModuleNotFoundError: No module named 'google.genai'`

**Causa:** Dependências não instaladas

**Solução:**
```bash
pip install -r requirements.txt
```

### ❌ `supabase.auth.exceptions.InvalidAPIKeyError`

**Causa:** `SUPABASE_SERVICE_ROLE_KEY` incorreta ou não configurada

**Solução:** Verifique no Supabase Dashboard → Settings → API → Service Role Key

---

## 📊 Mapeamento de Tabelas (Auto-Detect)

O sistema detecta automaticamente qual tabela usar baseado no caminho do arquivo:

| Palavra-chave no caminho | Tabela |
|---|---|
| `prd`, `roadmap` | `rag_context_strategic` |
| `architecture`, `adr` | `rag_context_architecture` |
| `stories`, `plan` | `rag_context_operational` |
| `session`, `memory` | `rag_context_conversational` |
| *(default)* | `rag_context_operational` |

---

## 🧪 Executar Testes

```bash
# Todos os testes
npm run test:rag

# Com cobertura
npm run test:rag:coverage

# Teste específico
pytest .agent/skills/rag-archivist/tests/test_sanitizer.py -v
```

---

## 📚 Referências

- [Google Generative AI SDK](https://ai.google.dev/gemini-api/docs/api-python)
- [Supabase Python SDK](https://supabase.com/docs/reference/python/introduction)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [RAG 2.0 PLAN](../../PLAN-rag-2-0.md)

---

*Last Updated: 2026-03-17 — RAG Archivist v1.0.0*
