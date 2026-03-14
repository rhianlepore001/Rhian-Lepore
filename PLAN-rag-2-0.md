# PLAN: Sistema RAG 2.0 de Contexto Profundo (Squads & Agentes)

> **Objetivo:** Unificar o conhecimento estratégico, técnico e operacional entre **Antigravity** (Gemini IDE) e **Claude Code** (AIOX CLI) através de uma camada de memória vetorial persistente no Supabase — tornando o Supabase a **única fonte da verdade** para ambos os ambientes.

---

## 🧠 Visão Geral

O RAG 2.0 resolve a **fragmentação de memória** entre os dois ambientes de desenvolvimento:

| Problema Atual | Solução RAG 2.0 |
|---|---|
| Antigravity lê apenas `.agent/memory/PROJECT_MEMORY.md` | Antigravity consulta Supabase + fallback local |
| Claude Code mantém `agents/*/MEMORY.md` isolados | Claude Code sincroniza com Supabase após cada sessão |
| Decisões técnicas se perdem entre sessões | Embeddings persistentes indexam todas as decisões |
| Contexto não viaja entre ferramentas | RAG compartilhado serve ambos os ambientes |

---

## 🏗️ Arquitetura Dual-Environment

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE (Fonte Única)                │
│  rag_context_strategic   │  rag_context_architecture    │
│  rag_context_operational │  rag_context_conversational  │
└────────────────┬────────────────────┬───────────────────┘
                 │                    │
     ┌───────────▼──────┐   ┌─────────▼─────────────┐
     │   ANTIGRAVITY    │   │     CLAUDE CODE        │
     │   (Gemini IDE)   │   │     (AIOX CLI)         │
     │                  │   │                        │
     │ GEMINI.md:       │   │ .aiox-core + CLAUDE.md │
     │ PROJECT_MEMORY   │   │ agents/*/MEMORY.md     │
     │ session_manager  │   │ .claude/projects/      │
     │                  │   │ memory/MEMORY.md       │
     └──────────────────┘   └────────────────────────┘
              │                          │
              └────────────┬─────────────┘
                           │
                    ┌──────▼──────┐
                    │ @archivist  │
                    │  (Curador)  │
                    └─────────────┘
```

### Responsabilidades por Ambiente

**Antigravity (GEMINI.md):**
- Lê contexto do RAG no início de cada sessão complexa
- Escreve resumo de sessão via `session_manager.py` (já existente)
- Trigger automático: `@archivist` indexa ao final de cada `{task-slug}.md`

**Claude Code (AIOX):**
- Lê contexto do RAG antes de propor mudanças arquiteturais
- Escreve via `agents/*/MEMORY.md` → sincronizado pelo `@archivist`
- Trigger automático: `@archivist` indexa após cada Story Done

---

## ⚡ Matriz de Triggers do @archivist

O agente `@archivist` deve ser acionado **automaticamente** nos seguintes eventos. Ele NUNCA deve ser acionado para commits triviais ou mudanças de arquivo único.

### Triggers Automáticos — Claude Code (AIOX)

| Evento | Gatilho | Tipo de Indexação |
|---|---|---|
| Story marcada como `Done` (QA Gate PASS) | `@qa` finaliza QA Gate | Full story + decisões + arquivos modificados |
| `@devops` executa `git push` | Pós-push hook | Commits do branch + diff de arquivos `.md` |
| Qualquer `agents/*/MEMORY.md` atualizado | File watcher (opcional) | Apenas o delta do MEMORY.md |
| Epic finalizado (`@pm *execute-epic` concluído) | Fim de execução | Epic inteiro + todas as stories |
| `@architect` cria ADR ou decisão arquitetural | Detecção em `docs/architecture/` | Documento de decisão + contexto |

### Triggers Automáticos — Antigravity (GEMINI)

| Evento | Gatilho | Tipo de Indexação |
|---|---|---|
| `{task-slug}.md` concluído (COMPLEX CODE request) | Fim do arquivo de tarefa | Decisões + arquivos chave da tarefa |
| `session_manager.py` ao encerrar sessão | Script já existente | Resumo da sessão (sem segredos) |
| Novo arquivo em `docs/` ou `supabase/migrations/` | Detecção por path | Documento técnico completo |

### Trigger Manual — Ambos os Ambientes

```bash
# Claude Code
/sync-memory

# Antigravity (GEMINI edit mode)
@archivist *sync

# Script direto
python .agent/skills/rag-archivist/scripts/sync_memory.py
```

### O que NÃO aciona o @archivist

- Commits com mensagem começando em `chore:` (sem escopo técnico)
- Mudanças em arquivos de configuração (`.eslintrc`, `vite.config.ts`)
- Atualizações de `package-lock.json` ou `node_modules`
- Mensagens de chat curtas (< 200 tokens de conteúdo útil)
- Correções de typo ou lint fixes isolados

---

## 🗄️ Camada de Dados (Supabase + pgvector)

### Estrutura de Tabelas

```sql
-- Contexto Estratégico: PRD, Roadmap, Visão do Produto
CREATE TABLE rag_context_strategic (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,          -- Caminho do arquivo de origem
  source_env TEXT NOT NULL,           -- 'antigravity' | 'claude-code'
  source_event TEXT NOT NULL,         -- Evento que originou a indexação
  content TEXT NOT NULL,              -- Conteúdo limpo (sem segredos)
  embedding VECTOR(768),              -- text-embedding-004 (Google Gemini)
  metadata JSONB DEFAULT '{}',        -- Tags, agente, story_id, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contexto Arquitetural: ADRs, Design System, Padrões
CREATE TABLE rag_context_architecture (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_env TEXT NOT NULL,
  source_event TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contexto Operacional: Stories, Planos, Workshops concluídos
CREATE TABLE rag_context_operational (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_path TEXT NOT NULL,
  source_env TEXT NOT NULL,
  source_event TEXT NOT NULL,
  story_id TEXT,                      -- Ex: "EPIC-002.US-016"
  content TEXT NOT NULL,
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Contexto Conversacional: Memória de longo prazo (Long-Term Memory)
CREATE TABLE rag_context_conversational (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,           -- ID da sessão Antigravity ou AIOX
  source_env TEXT NOT NULL,
  content TEXT NOT NULL,              -- Resumo limpo da sessão
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por similaridade
CREATE INDEX idx_rag_strategic_embedding ON rag_context_strategic
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_rag_architecture_embedding ON rag_context_architecture
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_rag_operational_embedding ON rag_context_operational
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_rag_conversational_embedding ON rag_context_conversational
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### RLS (Row Level Security)

```sql
-- Todas as tabelas RAG: apenas service_role escreve, anon pode ler
ALTER TABLE rag_context_strategic ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_architecture ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_operational ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_context_conversational ENABLE ROW LEVEL SECURITY;

-- Leitura pública (os agentes são internos — sem company_id)
CREATE POLICY "rag_read_all" ON rag_context_strategic FOR SELECT USING (true);
CREATE POLICY "rag_read_all" ON rag_context_architecture FOR SELECT USING (true);
CREATE POLICY "rag_read_all" ON rag_context_operational FOR SELECT USING (true);
CREATE POLICY "rag_read_all" ON rag_context_conversational FOR SELECT USING (true);

-- Escrita apenas via service_role (scripts Python do @archivist)
-- Nenhuma policy INSERT para anon = bloqueado por padrão
```

---

## 🤖 O Agente @archivist

### Perfil: `.agent/agents/archivist.md`

```yaml
---
name: archivist
persona: "Vera"
role: "Curadora de Memória e Indexação de Conhecimento"
skills:
  - rag-archivist
triggers:
  auto:
    - story_done
    - devops_push
    - task_slug_completed
    - session_end
  manual:
    - /sync-memory
    - "@archivist *sync"
priority: P1
---
```

### Responsabilidades

1. **Indexação:** Converter artefatos `.md` em embeddings via `text-embedding-004`
2. **Limpeza (Sanitização):** Remover segredos, API keys e dados sensíveis antes de indexar
3. **Poda (Pruning):** Marcar como obsoleto o que foi substituído por versão mais nova
4. **Deduplicação:** Evitar indexar o mesmo conteúdo duas vezes (hash do source_path + conteúdo)
5. **Sincronização Cross-Environment:** Garantir que decisões do Antigravity estejam visíveis no Claude Code e vice-versa

### Padrão de Sanitização (Obrigatório)

```python
# .agent/skills/rag-archivist/scripts/sanitizer.py
PATTERNS_TO_REDACT = [
    r'[A-Za-z0-9]{20,}',          # Possíveis API keys
    r'SUPABASE_[A-Z_]+\s*=\s*\S+', # Variáveis de ambiente
    r'sk-[A-Za-z0-9]{40,}',        # OpenAI keys
    r'AIza[A-Za-z0-9_-]{35}',      # Google API keys
    r'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',  # JWTs
]
```

---

## 🚀 Fases de Implementação

### Fase 1: Infraestrutura de Dados (MANDATÓRIO)

- [ ] **1.1** Validar extensão `pgvector` ativa no Supabase (`SELECT * FROM pg_extension WHERE extname = 'vector'`)
- [ ] **1.2** Criar arquivo de migração `supabase/migrations/20260315_rag_2_0_tables.sql` com o schema acima
- [ ] **1.3** Executar migração via Supabase MCP
- [ ] **1.4** Validar que `GEMINI_API_KEY` no `.env.local` suporta `text-embedding-004`
- [ ] **1.5** Verificar que a service_role key está disponível para os scripts Python

### Fase 2: Skill `rag-archivist` e Scripts

- [ ] **2.1** Criar estrutura de skill: `.agent/skills/rag-archivist/SKILL.md`
- [ ] **2.2** Implementar `sanitizer.py` — remoção de segredos antes da indexação
- [ ] **2.3** Implementar `indexer.py` — geração de embeddings + upsert no Supabase
- [ ] **2.4** Implementar `pruner.py` — deduplicação e marcação de conteúdo obsoleto
- [ ] **2.5** Implementar `sync_memory.py` — ponto de entrada único (manual + auto)
- [ ] **2.6** Implementar `verify_embeddings.py` — validação de integridade dos vetores

### Fase 3: Perfil do Agente @archivist

- [ ] **3.1** Criar `.agent/agents/archivist.md` com persona Vera e triggers definidos
- [ ] **3.2** Documentar no `GEMINI.md`: `@archivist` como agente disponível na seção QUICK REFERENCE
- [ ] **3.3** Atualizar `.aiox-core/development/agents/` se necessário para registro AIOX

### Fase 4: Integração Claude Code (AIOX)

- [ ] **4.1** Atualizar `story-lifecycle.md` — adicionar trigger de `@archivist` no QA Gate PASS
- [ ] **4.2** Atualizar `workflow-execution.md` — adicionar etapa de sincronização na Phase 4 (QA Gate)
- [ ] **4.3** Criar skill `/sync-memory` no AIOX: `.aiox-core/development/tasks/sync-memory.md`
- [ ] **4.4** Atualizar `CLAUDE.md` da sessão para incluir instrução de leitura do RAG em sessões novas

### Fase 5: Integração Antigravity (GEMINI)

- [ ] **5.1** Atualizar `.agent/scripts/session_manager.py` — adicionar chamada ao `sync_memory.py` ao encerrar sessão
- [ ] **5.2** Atualizar `GEMINI.md` — adicionar etapa de consulta RAG no PROJECT MEMORY PROTOCOL (Leitura Inicial)
- [ ] **5.3** Documentar comando `/sync-memory` no GEMINI.md como SLASH CMD disponível

---

## 🔄 Fluxo de Coerência Cross-Environment

### Leitura (Consulta ao RAG)

```
Início de sessão complexa
        │
        ▼
[Antigravity OU Claude Code]
        │
        ▼
 Busca por similaridade no Supabase
 (query: resumo da tarefa atual)
        │
        ▼
 Retorna top-5 chunks relevantes
        │
        ▼
 Injeta como contexto adicional
 (junto com MEMORY.md local)
```

### Escrita (Indexação pelo @archivist)

```
Evento de trigger detectado
        │
        ▼
 @archivist coleta artefatos
 (story.md / task-slug.md / MEMORY.md)
        │
        ▼
 sanitizer.py — remove segredos
        │
        ▼
 indexer.py — gera embedding (Gemini)
        │
        ▼
 pruner.py — verifica duplicatas
        │
        ▼
 Upsert no Supabase
 (source_path como chave de deduplicação)
        │
        ▼
 Log: ".archivist/sync-log.jsonl"
```

---

## ⚙️ Modelo de Embedding

> **Modelo:** `text-embedding-004` (Google Gemini)
> **Dimensões:** 768
> **Custo:** Gratuito dentro da cota Google AI Studio
> **Compatibilidade:** Nativa com `GEMINI_API_KEY` já configurada no projeto

---

## 🔒 Privacidade e Segurança

1. **Sanitização obrigatória** antes de qualquer indexação (ver `sanitizer.py`)
2. **Nenhum conteúdo de `.env`** é indexado — o archivist ignora esses arquivos por padrão
3. **RLS** garante que apenas service_role pode escrever nas tabelas RAG
4. **Log de auditoria** em `.archivist/sync-log.jsonl` (gitignored) para rastreabilidade
5. **Campos `metadata`** não armazenam valores, apenas chaves (ex: `{ "has_api_key": true }` — não o valor)

---

## ✅ Plano de Verificação

### Checklist de Infraestrutura

```sql
-- Validar pgvector ativo
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Validar tabelas criadas
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'rag_context_%';

-- Validar índices de embedding
SELECT indexname FROM pg_indexes WHERE indexname LIKE 'idx_rag_%';
```

### Testes Automatizados

```bash
# Validar busca por similaridade retorna resultados coerentes
npm run test:rag

# Verificar integridade dos vetores no Supabase
python .agent/skills/rag-archivist/scripts/verify_embeddings.py

# Verificar sanitização (nenhum segredo passou)
python .agent/skills/rag-archivist/scripts/sanitizer.py --audit
```

### Validação Manual

1. Concluir uma Story no AIOX → verificar novo registro em `rag_context_operational`
2. Encerrar sessão no Antigravity → verificar novo registro em `rag_context_conversational`
3. Perguntar a um agente: *"Baseado na Story US-016, qual foi a decisão de schema tomada?"* — resposta deve referenciar a story
4. Executar `/sync-memory` manualmente → verificar timestamp atualizado no Supabase Dashboard

---

## 📂 Arquivos a Criar/Modificar

| Arquivo | Ação | Responsável |
|---|---|---|
| `supabase/migrations/20260315_rag_2_0_tables.sql` | CRIAR | @data-engineer |
| `.agent/agents/archivist.md` | CRIAR | @archivist (via @sm) |
| `.agent/skills/rag-archivist/SKILL.md` | CRIAR | @dev |
| `.agent/skills/rag-archivist/scripts/sanitizer.py` | CRIAR | @dev |
| `.agent/skills/rag-archivist/scripts/indexer.py` | CRIAR | @dev |
| `.agent/skills/rag-archivist/scripts/pruner.py` | CRIAR | @dev |
| `.agent/skills/rag-archivist/scripts/sync_memory.py` | CRIAR | @dev |
| `.agent/skills/rag-archivist/scripts/verify_embeddings.py` | CRIAR | @dev |
| `.agent/scripts/session_manager.py` | MODIFICAR | @dev |
| `.agent/rules/GEMINI.md` | MODIFICAR | @architect |
| `.aiox-core/development/tasks/sync-memory.md` | CRIAR | @dev |
| `.claude/rules/workflow-execution.md` | MODIFICAR | @architect |

---

> **Status:** RASCUNHO FINAL — Aguardando aprovação para início da Fase 1
> **Próximo passo:** Criar Story US-019 via `@sm *draft` com escopo da Fase 1