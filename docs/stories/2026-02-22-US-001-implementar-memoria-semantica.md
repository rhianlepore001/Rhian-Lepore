---
id: US-001
título: Camada de Memória Semântica Individualizada
status: in-progress
estimativa: 4h
prioridade: high
agente: developer
---

# US-001: Camada de Memória Semântica Individualizada

## Por Quê
O barbeiro observa detalhes importantes sobre os clientes (ex: "tem redemoinho na nuca", "prefere corte baixo nas laterais", "gosta de café sem açúcar"). Atualmente, esses dados são apenas texto. Para o AgenX ser inteligente, precisamos que a IA "lembre" e "relacione" essas preferências automaticamente para sugerir o melhor atendimento.

## O Que
Implementar um serviço que:
1. Gere embeddings vetoriais para observações de clientes usando o modelo `text-embedding-004` do Gemini.
2. Armazene e recupere esses vetores na tabela `client_semantic_memory` do Supabase.
3. Forneça uma função de busca por similaridade (RAG) para alimentar o contexto da IA durante interações.

## Critérios de Aceitação
- [ ] Nova função `generateEmbedding(text: string)` em `lib/gemini.ts`.
- [ ] Novo hook ou serviço `useSemanticMemory` para salvar/buscar preferências.
- [ ] Integração com a tabela `client_semantic_memory` via query RPC `match_client_memories` (necessário criar função Postgres).
- [ ] Validação: Salvar uma preferência e conseguir recuperá-la via busca por similaridade.

## Arquivos Impactados
- `lib/gemini.ts`
- `lib/supabase.ts` (ou novo arquivo de serviço)
- `supabase/migrations/20260222_enable_vector_and_semantic_memory.sql` (adicionar função RPC)

## Definição de Pronto
- [ ] Lint: `npm run lint` sem erros
- [ ] Typecheck: OK
- [ ] Teste manual: Inserir "Gosta de degrade navalhado" e buscar por "tipo de corte" deve retornar o registro.
