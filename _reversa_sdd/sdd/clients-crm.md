# Clientes e CRM (clients-crm)

## Visão Geral
Sistema de gestão de clientes com duas facetas: (1) Lista de clientes do owner com sincronização automática de `public_clients`, criação manual, soft delete, classificação (VIP/Novos/Inativo), tier de fidelidade e IA de reativação; (2) Portal de autoatendimento do cliente público (`ClientArea`) com autenticação via telefone, histórico de bookings, reagendamento e perfil. Inclui memória semântica (RAG com embeddings via Gemini) para preferências de clientes e diagnóstico AIOS para detecção de churn.

## Responsabilidades
- Listar clientes do CRM com busca, filtros e sincronização de `public_clients`
- Criar cliente manualmente com upload de foto
- Editar perfil do cliente (nome, telefone, email, foto, notas)
- Soft delete de cliente (preserva histórico financeiro)
- Classificar clientes: VIP (≥5 visitas), Novos (1-4), Inativo (0)
- Sistema de tiers de fidelidade: Bronze (0-5), Silver (6-15), Gold (16-30), Platinum (31+)
- Previsão de próxima visita baseada na média de intervalos entre visitas
- Portal do cliente (`ClientArea`): auth via telefone, histórico de bookings, cancelamento
- Memória semântica RAG: salvar observações com embeddings, buscar por similaridade
- Diagnóstico AIOS: detectar clientes em risco de churn, gerar mensagens de reativação
- Sincronização automática `public_clients` → `clients` (espelhamento)

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| client_id | uuid | ID do cliente |
| name | string | Nome completo |
| phone | string | Telefone (obrigatório se email vazio) |
| email | string \| null | Email |
| photo | File \| null | Foto de perfil |
| notes | string | Observações |
| loyalty_tier | 'Bronze' \| 'Silver' \| 'Gold' \| 'Platinum' | Tier de fidelidade |
| observation | string | Texto para memória semântica |
| context_type | 'style' \| 'preference' \| 'habit' | Tipo de memória |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| Client | object | Dados do cliente |
| ClientProfile | object | Dados consolidados (client + LTV + histórico) |
| TierInfo | object | Tier atual, cor, próximo tier |
| NextVisitPrediction | string | Previsão textual da próxima visita |
| AIOSDiagnostic | object | Clientes em risco, receita recuperável |
| SemanticMemory[] | object[] | Memórias similares com score |
| BookingHistory | object[] | Histórico de bookings do cliente |

## Regras de Negócio
- **R41** Sincronização automática: `public_clients` são espelhados para `clients` via `fetchClients` (client-side) e `mirror_public_client_to_crm` (RPC SECURITY DEFINER). 🟢
- **R42** Deduplicação flexível: comparação de telefones ignora formatação e sufixos de país (55/351). 🟢
- **R43** Soft delete: clientes desativados (`is_active=false`) são filtrados na listagem mas preservam histórico financeiro. 🟢
- **R44** Tier automático: cliente migrado de outro sistema começa como 'Prata' com 1 visita. **Nota:** há inconsistência de idioma no código — alguns pontos usam `Prata` enquanto o tipo esperado é `Silver`. Deve ser padronizado. 🟢
- **R45** Previsão de visita: algoritmo baseado na média de intervalos entre visitas consecutivas. Se < 2 visitas: "Dados insuficientes". 🟢
- **R46** Reativação AIOS: clientes em risco recebem mensagens personalizadas por WhatsApp — framework ABT (LTV ≤ 500) ou StoryBrand (LTV > 500). 🟢
- **R47** Memória semântica: observações salvas com embeddings permitem busca por similaridade (threshold 0.4-0.5). 🟢
- **R48** ClientArea auth: tela de telefone → se não existe, formulário de registro → espelhamento automático para CRM. 🟢
- **R49** Self-rescheduling: controlado por `business_settings.enable_self_rescheduling` (default: true). 🟢
- **R50** Unique constraint: `clients_user_id_phone_unique` ON (user_id, phone). 🟢
- **R51** Cliente criado manualmente com origem 'Antigo' recebe tier 'Prata' e total_visits=1. 🟢
- **R52** Cliente criado via sincronização recebe tier 'Bronze' e total_visits=0. 🟢

## Fluxo Principal

### Sincronização de Clientes Públicos
1. Owner acessa `/clientes`
2. `fetchClients` busca todos `public_clients` do negócio
3. Busca clientes existentes (`clients`) com telefone preenchido
4. Para cada `public_client` com telefone:
   - Compara telefone em 3 formatos
   - Se não encontrado em `clients` → marca para inserção
5. Insere novos clientes com `loyalty_tier='Bronze'`, `total_visits=0`
6. Busca appointments `Completed` para contar visitas reais
7. Merge: `actual_visits = count(appointments Completed)`
8. Filtra clientes inativos (`is_active ≠ false`)

### Criação Manual de Cliente
1. Owner clica "Novo Cliente"
2. Validação: phone OU email obrigatório
3. Se tem foto: upload para `client_photos`
4. Se upload falha: alert, prossegue sem foto
5. INSERT em `clients`:
   - `loyalty_tier='Prata'` se origin='Antigo', senão 'Bronze' (nota: padronizar para `Silver`)
   - `total_visits=1` se 'Antigo', senão 0
6. Reset do form e refresh

### Perfil do Cliente (ClientCRM)
1. Owner clica em cliente na lista
2. Chama RPC `get_client_profile(p_client_id)`
3. Recebe: dados do cliente, LTV, histórico, hair_history
4. Calcula `totalVisits` e `lastVisit`
5. Chama `calculateNextVisitPrediction`
6. Popula estados para edição

### Portal do Cliente (ClientArea)
1. Cliente acessa `/minha-area/:slug`
2. Passo 1 — Telefone: `PublicClientContext.login(phone, businessId)`
   - RPC `get_public_client_by_phone`
   - Se encontrado: seta client + localStorage
   - Se não: exibe formulário de registro
3. Passo 2 — Registro: `PublicClientContext.register(data)`
   - Verifica duplicata
   - INSERT/UPDATE `public_clients`
   - Espelha para CRM via `mirror_public_client_to_crm`
4. Armazena em `localStorage` ('rhian_public_client')
5. Busca histórico de bookings via `get_client_bookings_history`
6. Real-time subscription no canal `public_bookings_{phone}`
7. Separa upcoming vs history

### Memória Semântica
1. Owner digita observação no perfil do cliente
2. Chama `useSemanticMemory.saveMemory`
3. Gera embedding via Gemini (`generateEmbedding`)
4. INSERT em `client_semantic_memory`
5. Busca memórias similares via `match_client_memories`
6. Exibe insights no painel `AISemanticInsights`

## Fluxos Alternativos
- **[Telefone duplicado na criação]:** Unique constraint `clients_user_id_phone_unique` impede INSERT. Exibe erro. 🟢
- **[Foto maior que limite]:** Upload falha, alerta, prossegue sem foto. 🟢
- **[Cliente não encontrado em get_client_profile]:** Exibe erro genérico. 🟡
- **[PublicClientContext.register com erro 23505]:** Tenta login como fallback. 🟢
- **[Cliente cancela booking]:** UPDATE `public_bookings.status='cancelled'`. 🟢

## Cenários de Borda

### B1 — Sincronização cria cliente duplicado se telefone mudou
- **Condição:** Cliente público mudou de telefone. Sistema não encontra match e cria novo cliente.
- **Comportamento:** Dois registros para mesma pessoa com telefones diferentes.
- **Impacto:** LTV fragmentado, histórico dividido.
- **Risco:** Baixo — requer mudança de telefone.

### B2 — Memória semântica cresce indefinidamente (Resolvido)
- **Condição:** Owner salva observações frequentemente. `client_semantic_memory` cresce sem limite.
- **Decisão validada:** Limitar a no máximo 50 memórias semânticas ativas por cliente, priorizando as mais recentes/relevantes. Registros antigos devem ser arquivados ou removidos após 12 meses sem uso, dependendo do custo e volume real.
- **Comportamento:** Busca por similaridade fica mais lenta. Embeddings ocupam espaço (768d por registro).
- **Impacto:** Degradação de performance e custo de storage.
- **Risco:** Baixo — política de retenção definida (50 ativas/cliente, arquivar após 12 meses).

### B3 — Cliente com visitas insuficientes para previsão
- **Condição:** Cliente tem 0 ou 1 visitas.
- **Comportamento:** `calculateNextVisitPrediction` retorna "Dados insuficientes".
- **Impacto:** Owner não tem previsão para reativação.
- **Risco:** Baixo — comportamento esperado.

## Dependências
- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — `useAuth`
- `contexts/PublicClientContext.tsx` — `usePublicClient`
- `hooks/useAIOSDiagnostic.ts` — diagnóstico de churn
- `hooks/useSemanticMemory.ts` — memória semântica
- `utils/tierSystem.ts` — cálculo de tier e previsão
- `utils/aiosCopywriter.ts` — mensagens de reativação
- `lib/gemini.ts` — geração de embeddings
- `components/BrutalCard.tsx` — UI base

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Embeddings 768d via Gemini | `hooks/useSemanticMemory.ts` | 🟢 |
| Escalabilidade | Sem limite de retenção de memórias | `client_semantic_memory` | 🔴 |
| Segurança | RLS por company_id via subquery | `client_semantic_memory_company_isolation` | 🟢 |

## Critérios de Aceitação

```gherkin
# Cenário 1: Sincronizar clientes públicos
Dado que existem public_clients não sincronizados
Quando o owner acessa a lista de clientes
Então o sistema cria novos clientes no CRM
E atribui tier Bronze

# Cenário 2: Previsão de próxima visita
Dado que um cliente tem 3 visitas consecutivas
Quando o owner acessa o perfil
Então o sistema calcula média de intervalos
E exibe previsão textual (ex: "Amanhã")

# Cenário 3: Memória semântica
Dado que o owner salva observação "Prefere corte degradê"
Quando acessa o perfil novamente
Então o sistema gera embedding
E exibe insight semântico na próxima visita

# Cenário 4: Portal do cliente
Dado que um cliente acessa /minha-area/:slug
Quando informa telefone cadastrado
Então vê histórico de bookings
E pode cancelar reservas pending
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Listar/sincronizar clientes | Must | Core do CRM |
| Criar/editar cliente | Must | Gestão básica |
| Soft delete | Must | Preserva histórico |
| Tiers de fidelidade | Should | Engajamento |
| Memória semântica | Could | Diferencial IA |
| AIOS reativação | Could | Condicional a flag |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/Clients.tsx` | `Clients`, `fetchClients`, `handleCreateClient` | 🟢 |
| `pages/ClientCRM.tsx` | `ClientCRM`, `fetchClient` | 🟢 |
| `pages/ClientArea.tsx` | `ClientArea`, `fetchBookings` | 🟢 |
| `hooks/useSemanticMemory.ts` | `saveMemory`, `searchMemories` | 🟢 |
| `hooks/useAIOSDiagnostic.ts` | `useAIOSDiagnostic` | 🟢 |
| `utils/tierSystem.ts` | `calculateTier`, `calculateNextVisitPrediction` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
