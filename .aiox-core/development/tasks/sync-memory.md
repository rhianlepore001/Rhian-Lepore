# Task: sync-memory

**Sincronização de Memória com RAG 2.0**

---

## Propósito

Acionar o `@archivist` (Vera) para indexar conhecimento no RAG 2.0, alimentando o sistema de memória vetorial com artefatos `.md` do projeto.

Esta task é invocada automaticamente em gates:
- Após QA Gate PASS em uma story
- Após `git push` bem-sucedido
- Ao modificar `agents/*/MEMORY.md`

Também pode ser acionada manualmente via `/sync-memory` ou `*sync-memory` em AIOX.

---

## Execução

### Comando Base

```bash
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir docs/ --dir .agent/memory/
```

### Parâmetros Opcionais

- `--path <arquivo>` — indexar apenas um arquivo específico
- `--table <tabela>` — forçar tabela alvo (padrão: auto-detect)
- `--env <env>` — ambiente de origem: `claude-code` (padrão), `antigravity`, `manual`
- `--event <event>` — evento disparador: `story_done`, `devops_push`, `memory_updated`, `manual_sync`
- `--dry-run` — simular sem escrever no Supabase

### Exemplos

```bash
# Sincronizar plan inteiro
python .agent/skills/rag-archivist/scripts/sync_memory.py --path PLAN-rag-2-0.md

# Sincronizar stories (operacional)
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir docs/stories/ --table rag_context_operational

# Sincronizar memory files (conversacional)
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir .agent/memory/ --table rag_context_conversational

# Simular sem escrever
python .agent/skills/rag-archivist/scripts/sync_memory.py --dir docs/ --dry-run

# Verificar integridade
python .agent/skills/rag-archivist/scripts/verify_embeddings.py
```

---

## Saída Esperada

A task retorna:
- ✅ **Embeddings criados**: número de novos registros
- ✅ **Atualizados**: número de registros re-indexados
- ✅ **Pulados**: número de duplicatas detectadas
- ✅ **Erros**: lista de falhas (se houver)
- ✅ **Sanitizações**: tipos e contagem de segredos removidos

Exemplo:

```
🚀 Iniciando sincronização
   Ambiente: claude-code
   Evento: story_done

📄 Processando: docs/stories/2026-03-14-US-028.md
⚠️ Redações realizadas (docs/stories/2026-03-14-US-028.md):
  - ENV_VAR: 2
  - JWT: 1

✅ Sincronização completa!
   Arquivos processados: 1
   Embeddings criados: 3
   Atualizados: 0
   Pulados: 0
   Erros: 0
```

---

## Variáveis de Ambiente Necessárias

```bash
GEMINI_API_KEY=...           # Para text-embedding-004
SUPABASE_URL=...             # URL do projeto Supabase
SUPABASE_SERVICE_ROLE_KEY=.. # Service role (escrita no RAG)
```

Se qualquer uma estiver faltando, o script falhará graciosamente (não bloqueará o desenvolvimento).

---

## Triggers Automáticos (AIOX)

### 1. Após QA Gate PASS

**Quando:** Uma story passa no `qa-gate`
**Escopo:** Story + arquivos modificados
**Comando:** `sync_memory.py --path {story-file}`

### 2. Após `git push` (via @devops)

**Quando:** @devops pusha commits com sucesso
**Escopo:** Todos os `.md` modificados no push
**Comando:** `sync_memory.py --dir . --env devops_push`

### 3. Ao Modificar MEMORY.md

**Quando:** Qualquer `agents/*/MEMORY.md` é commitado
**Escopo:** Arquivo MEMORY.md modificado
**Comando:** `sync_memory.py --path {agents/*/MEMORY.md}`

---

## Exclusão de Ruído (Anti-Noise)

A seguinte lista de padrões **não são indexados**:

```
package-lock.json
node_modules/**
.eslintrc*
.eslintignore
vite.config.*
tsconfig*.json
*.lock
dist/**
coverage/**
__pycache__/**
.git/**
.env*
```

**Commits:** Apenas `feat:`, `fix:`, `docs:` são indexados. `chore:` é ignorado.

---

## Considerações de Segurança

✅ **Sanitização Automática:**
- OpenAI keys (`sk-...`)
- Google API keys (`AIza...`)
- JWTs (`eyJ...`)
- Supabase URLs com credenciais
- Variáveis de ambiente (`KEY=value`)
- API keys genéricas (32+ chars)

✅ **Deduplicação:**
- SHA-256 hash de `(source_path + content)`
- Não indexa conteúdo idêntico duas vezes
- Marca versões antigas como obsoletas

---

## Integração com Story Lifecycle

Na conclusão de uma story (após QA Gate PASS):

1. ✅ Story é marcada como "InReview"
2. 🔄 **`@archivist` sincroniza** (esta task)
3. 🚀 @devops prepara para push
4. 📤 Commits são enviados
5. ✅ Story é marcada como "Done"

---

## Graceful Degradation

Se a sincronização **falhar:**
- ⚠️ Erro é logado em `.archivist/sync-log.jsonl`
- ✅ Development flow **NÃO é bloqueado**
- 🔄 Retry automático na próxima trigger
- 📢 User é notificado mas pode continuar trabalhando

---

## Próximas Etapas

- **US-029:** Testes E2E do ciclo completo dual-environment
- **Future:** Dashboard de visualização do RAG
- **Future:** Integração com @architect para recomendações em tempo real

---

**Referência:** [PLAN-rag-2-0.md](../../PLAN-rag-2-0.md) → Fases 3-5
