---
trigger: always_on
---

# Guia Rápido de Token Stewardship para o AgenX

> **Regra de Ouro:** Menos tokens = menos custo = mais lucro para o barbeiro.

## ⚡ Estratégia de Micro-Prompts (Obrigatória)

### Antes de enviar qualquer contexto para a IA, filtre:

| Tipo de Informação | Incluir? | Motivo |
|-------------------|----------|--------|
| Story ativa | ✅ Sempre | É o escopo da tarefa |
| Arquivo sendo modificado | ✅ Sempre | Contexto direto |
| Tipos TypeScript relevantes | ✅ Se tipagem for a tarefa | Evita erros de tipo |
| Migração mais recente | ✅ Se for tarefa de DB | Evita conflitos |
| Outros arquivos de componente | ⚠️ Apenas se solicitado | Pode inflar o prompt |
| `node_modules` / `dist` | ❌ Nunca | Irrelevante e pesado |
| Histórico de chat antigo | ❌ Evitar | Use RAG ao invés |

## 🗄️ Cache Semântico (Supabase pgvector)

Quando uma pergunta de IA for respondida com sucesso, salve na `ai_knowledge_base`:

```sql
-- Salvar resposta em cache
INSERT INTO public.ai_knowledge_base (content, metadata)
VALUES (
  '[Resposta da IA aqui]',
  '{"tipo": "faq", "topico": "agendamento", "data": "2026-02-22"}'
);
```

Antes de chamar a IA, busque respostas similares:
```sql
-- Verificar se existe resposta similar
SELECT content
FROM public.ai_knowledge_base
WHERE metadata->>'topico' = '[topico da pergunta]'
ORDER BY created_at DESC
LIMIT 1;
```

## 🧠 RAG para Clientes (Memória Semântica)

Use `client_semantic_memory` para personalizar sem gastar tokens:

```sql
-- Recuperar preferências do cliente
SELECT observation
FROM public.client_semantic_memory
WHERE client_id = '[client_id]'
ORDER BY created_at DESC
LIMIT 5;
```

Adicione apenas esses 5 registros ao contexto do prompt, não o histórico completo.

## 📊 Hierarquia de Custo por Modelo

| Modelo | Uso | Custo |
|--------|-----|-------|
| GPT-4o | Decisões complexas / Diagnóstico | Alto |
| GPT-4o-mini | Sugestões / Formatação | Médio |
| text-embedding-3-small | Embeddings vetoriais | Baixíssimo |

**Regra:** Use o modelo mais barato que resolve o problema.
