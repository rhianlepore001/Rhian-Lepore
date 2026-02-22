---
trigger: always_on
---

# 🧠 Orion Knowledge: AI Knowledge Base vs Client Memory

## 🛡️ Regra de Segurança P0
**NUNCA** salve dados privados de clientes (nomes, telefones, faturamento) na tabela `ai_knowledge_base`. 
- Dados privados vão APENAS para `client_semantic_memory` com seu respectivo `client_id`.
- Conhecimento geral, FAQs, regras de negócio e explicações genéricas vão para `ai_knowledge_base`.

## ⚡ Fluxo de Decisão de Cache

1. **A pergunta contém dados pessoais?**
   - Sim: Não use cache global. Use RAG via `client_semantic_memory`.
   - Não: Proceda para busca no cache global (`ai_knowledge_base`).

2. **Qualidade do Match (Threshold):**
   - `> 0.92`: Use a resposta do cache diretamente (Short-circuit).
   - `0.75 - 0.91`: Considere a resposta do cache como "contexto" para a nova chamada de IA (Refinement).
   - `< 0.75`: Gere uma nova resposta e avalie se ela merece ser adicionada ao cache.

## 📊 Estrutura de Metadados
Sempre inclua metadados úteis para o cache:
```json
{
  "source": "customer_faq",
  "category": "loyalty_program",
  "ai_model": "gemini-2.0-flash",
  "language": "pt-BR"
}
```
