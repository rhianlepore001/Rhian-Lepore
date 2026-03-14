# EPIC-003: RAG 2.0 — Sistema de Memória Vetorial Dual-Environment

> **Status:** Draft
> **Criado por:** @sm (River)
> **Data:** 2026-03-14
> **Prioridade:** P1 — Infraestrutura de Conhecimento
> **Estimativa:** 4 stories, ~3-4h
> **Referência:** `PLAN-rag-2-0.md`

---

## Visão do Épico

Implementar uma camada de memória vetorial persistente no Supabase que unifique o contexto entre os dois ambientes de desenvolvimento do projeto:

- **Antigravity** (Gemini IDE) — usa `.agent/rules/GEMINI.md` + `session_manager.py`
- **Claude Code** (AIOX CLI) — usa `.aiox-core/` + `agents/*/MEMORY.md`

O RAG 2.0 resolve a fragmentação de contexto entre ferramentas, garantindo que decisões técnicas, stories e padrões arquiteturais estejam acessíveis a qualquer agente, em qualquer ambiente, em qualquer sessão.

**Problema central:** Contexto se perde entre sessões e entre ambientes. Uma decisão tomada no Antigravity não é automaticamente visível no Claude Code, e vice-versa.

**Resultado esperado:** Supabase como fonte única da verdade para memória de projeto. O `@archivist` indexa automaticamente no momento certo — nem cedo demais (ruído), nem tarde demais (contexto perdido).

---

## Contexto Técnico

**Modelo de Embedding:** `text-embedding-004` (Google Gemini, 768 dimensões)
- Custo: Gratuito na cota do Google AI Studio
- Compatibilidade: Nativa com `GEMINI_API_KEY` já configurada
- Dimensão vetorial: 768 (ivfflat index)

**Extensão Supabase:** `pgvector` (precisa estar ativa)

**Tabelas a criar:**
- `rag_context_strategic` — PRD, Roadmap, Visão
- `rag_context_architecture` — ADRs, Design System, Padrões
- `rag_context_operational` — Stories, Planos, Workshops
- `rag_context_conversational` — Long-Term Memory de sessões

**Scripts Python:** `.agent/skills/rag-archivist/scripts/`
- `sanitizer.py` — remove segredos antes de indexar
- `indexer.py` — gera embeddings + upsert Supabase
- `pruner.py` — deduplicação e obsolescência
- `sync_memory.py` — ponto de entrada único

---

## Squad Matrix

| Story | Lead | Escopo | Bloqueio |
|-------|------|--------|----------|
| US-026 | @data-engineer (Dara) | Infra: pgvector + Migrations + RLS | — |
| US-027 | @dev (Dex) | Skill rag-archivist + Scripts Python | US-026 |
| US-028 | @sm (River) / @dev | Perfil @archivist + Integração Claude Code | US-027 |
| US-029 | @dev / @devops | Integração Antigravity + Testes E2E | US-028 |

---

## Fluxo de Orquestração

```
[US-026] Infra Supabase (pgvector + tabelas + RLS)
        ↓
[US-027] Skill rag-archivist (sanitizer + indexer + pruner + sync_memory)
        ↓
[US-028] Agente @archivist + Integração Claude Code (AIOX triggers)
        ↓
[US-029] Integração Antigravity (session_manager) + Testes E2E
```

---

## Critérios de Aceitação (Epic Level)

- [ ] 4 tabelas `rag_context_*` criadas com pgvector e RLS
- [ ] `@archivist` indexa automaticamente após Story Done (AIOX)
- [ ] `@archivist` indexa automaticamente ao encerrar sessão (Antigravity)
- [ ] `/sync-memory` funciona em ambos os ambientes
- [ ] Nenhum segredo/API key indexado (sanitizer validado)
- [ ] Busca por similaridade retorna resultados coerentes (`npm run test:rag`)
- [ ] Deduplicação funciona (source_path como chave)

---

## Arquivos Gerados (Deliverables)

| Story | Output | Status |
|-------|--------|--------|
| US-026 | `supabase/migrations/20260315_rag_2_0_tables.sql` | 🔄 Pendente |
| US-027 | `.agent/skills/rag-archivist/` (5 scripts Python) | 🔄 Pendente |
| US-028 | `.agent/agents/archivist.md` + AIOX tasks | 🔄 Pendente |
| US-029 | Hooks em `session_manager.py` + testes | 🔄 Pendente |

---

## Definição de Pronto (Epic)

- ✅ `pgvector` ativo e tabelas criadas no Supabase
- ✅ Scripts Python com cobertura de sanitização validada
- ✅ `@archivist` acionado corretamente nos eventos mapeados
- ✅ Ambos os ambientes (Antigravity + Claude Code) sincronizando
- ✅ `npm run test:rag` passando
- ✅ Log de auditoria `.archivist/sync-log.jsonl` funcionando

---

## Links Relacionados

- [PLAN-rag-2-0.md](../../PLAN-rag-2-0.md)
- [EPIC-002: Brownfield Assessment](2026-03-14-EPIC-002-brownfield-assessment.md)
- [.agent/rules/GEMINI.md](../../.agent/rules/GEMINI.md)
