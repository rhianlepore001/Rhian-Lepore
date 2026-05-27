# Assistente de IA (ai-assistant)

## Visão Geral
5 sub-sistemas: AI Chat (OpenRouter/gemini-2.0-flash-lite com system prompt contextual), AIOS Diagnostic (churn detection via RPC, at_risk_clients + recoverable_revenue), Semantic Memory RAG (embeddings 768d via text-embedding-004, match_client_memories, match_kb_content), Content Calendar (OpenRouter + feriados BR) e Gemini Direct (foto analysis, social content, campaigns). Feature flag `aiosEnabled`. Semantic cache com threshold 0.92.

## Responsabilidades
- Chat com IA contextual (dados do negócio, métricas, agenda)
- Diagnóstico AIOS de churn (clientes em risco, receita recuperável)
- Memória semântica RAG (salvar/buscar observações com embeddings)
- Cache semântico de respostas (threshold 0.92)
- Geração de calendário de conteúdo (feriados BR)
- Análise de fotos (Gemini 1.5 Flash)
- Geração de conteúdo social (Gemini 2.0 Flash Lite)
- Análise de oportunidades de campanha

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| userMessage | string | Mensagem do usuário |
| client_id | uuid | Cliente para memória |
| observation | string | Texto da observação |
| context_type | 'style' \| 'preference' \| 'habit' | Tipo de memória |
| query | string | Busca semântica |
| threshold | number | Threshold de similaridade |
| imageBase64 | string | Foto para análise |
| year | number | Ano do calendário |
| month | number | Mês do calendário |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| assistantMessage | string | Resposta da IA |
| AIOSDiagnostic | object | Diagnóstico de churn |
| SemanticMemory[] | object[] | Memórias similares |
| CalendarPost[] | object[] | Posts do calendário |
| GeminiPhotoAnalysis | object | Análise de foto |
| GeminiSocialContent | object | Conteúdo social |

## Regras de Negócio
- **R126** AIOS só ativa se `aiosEnabled === true`. 🟢
- **R127** Chat: system prompt contextual com dados do negócio. 🟢
- **R128** Modelo: `gemini-2.0-flash-lite-001`, max_tokens 300, temperature 0.7. 🟢
- **R129** Embeddings: `text-embedding-004`, 768 dimensões. 🟢
- **R129a** Retenção de memórias: máximo 50 memórias semânticas ativas por cliente; registros antigos devem ser arquivados ou removidos após 12 meses sem uso. 🟢
- **R130** Semantic cache: threshold 0.92. 🟢
- **R131** Data maturity guard: funcionalidades escondidas se dados insuficientes. 🟢
- **R132** Content calendar: feriados BR via OpenRouter. 🟢
- **R133** Photo analysis: Gemini 1.5 Flash. 🟢

## Fluxo Principal

### AI Chat
1. Usuário digita mensagem
2. `buildContext`: coleta dados do negócio
3. Monta system prompt
4. `fetch OpenRouter API`
5. Adiciona resposta ao state

### AIOS Diagnostic
1. Verifica `aiosEnabled`
2. RPC `get_aios_diagnostic`
3. Se `recoverable_revenue > 0`: renderiza card

### Semantic Memory
1. `saveMemory`: gera embedding → INSERT `client_semantic_memory`
2. `searchMemories`: gera embedding → RPC `match_client_memories`

### Content Calendar
1. `generatePosts`: monta prompt com feriados
2. `fetch OpenRouter API`
3. Parse JSON → CalendarPost[]

## Dependências
- `lib/openrouter.ts` — OpenRouter API
- `lib/gemini.ts` — Gemini API
- `hooks/useAIOSDiagnostic.ts` — diagnóstico
- `hooks/useSemanticMemory.ts` — memória semântica

## Critérios de Aceitação

```gherkin
# Cenário 1: Chat com IA
Dado que o usuário está no chat
Quando digita "Qual minha receita hoje?"
Então o sistema responde com dados do dashboard

# Cenário 2: Diagnóstico AIOS
Dado que aiosEnabled=true
Quando o dashboard carrega
Então exibe clientes em risco se houver

# Cenário 3: Memória semântica
Dado que o owner salva observação
Quando busca memórias similares
Então retorna observações com score > 0.5
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| AI Chat | Could | Diferencial |
| AIOS Diagnostic | Could | Condicional |
| Memória semântica | Could | Premium |
| Content calendar | Could | Marketing |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `hooks/useAIAssistant.ts` | `useAIAssistant` | 🟢 |
| `hooks/useAIOSDiagnostic.ts` | `useAIOSDiagnostic` | 🟢 |
| `hooks/useSemanticMemory.ts` | `useSemanticMemory` | 🟢 |
| `lib/openrouter.ts` | `fetchOpenRouter` | 🟢 |
| `lib/gemini.ts` | `generateEmbedding` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
