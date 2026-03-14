---
skill: rag-archivist
version: 1.0.0
description: Skill que indexa conhecimento do projeto no RAG 2.0 via embeddings vetoriais
scripts:
  - sanitizer.py: Remoção de segredos (API keys, JWTs, env vars) antes de indexar
  - indexer.py: Geração de embeddings via text-embedding-004 + upsert no Supabase
  - pruner.py: Deduplicação por hash SHA-256 + detecção de conteúdo obsoleto
  - sync_memory.py: CLI de entrada única (--path, --dir, --dry-run, --table)
  - verify_embeddings.py: Validação de integridade vetorial + contagem por tabela
requires:
  - google-generativeai>=0.3.0
  - supabase>=2.0.0
  - python>=3.10
environment_variables:
  - GEMINI_API_KEY: Necessária para text-embedding-004
  - SUPABASE_URL: URL do projeto Supabase
  - SUPABASE_SERVICE_ROLE_KEY: Service role key (escrita autorizada)
---

# RAG Archivist Skill

Vera, a curadora de memória, indexa automaticamente o conhecimento do projeto no momento certo — sem ruído, sem atraso.

## Responsabilidades

1. **Indexar:** Transformar artefatos `.md` em embeddings 768-dim via Gemini
2. **Sanitizar:** Remover segredos antes de qualquer indexação
3. **Deduplicar:** Não indexar o mesmo conteúdo duas vezes
4. **Podar:** Marcar conteúdo obsoleto quando substituído
5. **Sincronizar:** Manter consistência entre Antigravity e Claude Code

## Uso

### Linha de Comando

```bash
# Indexar arquivo único
python .agent/skills/rag-archivist/scripts/sync_memory.py --path PLAN-rag-2-0.md

# Indexar diretório recursivamente
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir docs/stories/

# Forçar tabela específica
python .agent/skills/rag-archivist/scripts/sync_memory.py --path FILE.md --table rag_context_strategic

# Simulação (sem escrever)
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir docs/ --dry-run

# Verificar integridade
python .agent/skills/rag-archivist/scripts/verify_embeddings.py
```

### Como Módulo Python

```python
from .agent.skills.rag_archivist.scripts.indexer import index_file

# Indexar arquivo
result = index_file(
    file_path='PLAN-rag-2-0.md',
    source_env='claude-code',
    source_event='manual_sync'
)

print(f"Embeddings criados: {result['count']}")
```

## Fluxo de Execução

```
input_file
    ↓
[sanitizer] → Remove segredos
    ↓
[pruner] → Verifica hash, detecta duplicatas
    ↓
[indexer] → Chunking → Gemini embedding → Supabase upsert
    ↓
[verify_embeddings] → Validação (opcional)
    ↓
output: {created: N, updated: M, skipped: K}
```

## Configuração Mínima

```bash
export GEMINI_API_KEY="your-key"
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

python sync_memory.py --path docs/
```

## Tabelas Alvo (Auto-Detect)

| Path Keyword | Tabela |
|---|---|
| prd, roadmap | rag_context_strategic |
| architecture, adr | rag_context_architecture |
| stories, plan | rag_context_operational |
| session, memory | rag_context_conversational |
| *default* | rag_context_operational |

## Testes de Validação

```bash
# Teste 1: Dry-run (sem escrever)
python sync_memory.py --path PLAN-rag-2-0.md --dry-run

# Teste 2: Indexação real
python sync_memory.py --path PLAN-rag-2-0.md

# Teste 3: Verificar integridade
python verify_embeddings.py
```

## Integração com @archivist

Este skill é acionado automaticamente por:

- **Claude Code:** Após QA Gate PASS, git push
- **Antigravity:** Session end, task completion
- **Manual:** Comando `/sync-memory` em ambos os ambientes

---

*Skill RAG Archivist v1.0.0 — Vera, indexadora do conhecimento*
