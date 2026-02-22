---
id: US-003
título: Cache Semântico Global (AI Knowledge Base)
status: pending
estimativa: 4h
prioridade: medium
agente: developer
---

# US-003: Cache Semântico Global (AI Knowledge Base)

## Por Quê
Muitas perguntas feitas à IA são repetitivas (ex: "Como funciona a fidelidade?", "Quais os horários de pico?", "Como faço um backup?"). Chamar o Gemini para cada uma delas é caro e mais lento do que uma busca local. O Cache Semântico permite que o sistema aprenda com as respostas passadas e as reutilize para perguntas similares.

## O Que
Implementar um mecanismo de "Short-Circuit" que:
1.  Antes de chamar a IA, busca na tabela `ai_knowledge_base` por uma pergunta similar (embedding match).
2.  Se encontrar um match acima de 90%, retorna a resposta do cache imediatamente.
3.  Se não encontrar, chama a IA e, após a resposta, gera o embedding e salva o par pergunta/resposta no cache para uso futuro.

## Critérios de Aceitação
- [ ] Integração da função `match_kb_content` no fluxo de chamadas de IA.
- [ ] Lógica em `lib/gemini.ts` para verificar o cache antes da geração de conteúdo.
- [ ] Salvar novas respostas úteis e genéricas (FAQ) automaticamente no cache.
- [ ] Dashboad de "Tokens Economizados" (opcional ou log de auditoria).

## Arquivos Impactados
- `lib/gemini.ts`
- `lib/supabase.ts`
- `aios-settings.json` (para configurar threshold de match)

## Definição de Pronto
- [ ] Perguntar a mesma coisa duas vezes resulta em tempo de resposta < 500ms na segunda vez.
- [ ] Nenhuma chamada extra à API do Gemini é feita se houver match de cache.
- [ ] O sistema diferencia entre "Dados Sensíveis do Cliente" (não cachar globalmente) e "Explicações Gerais" (cachar).
