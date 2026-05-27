# Flowchart — clients/crm

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Fluxo Geral: Sincronização de Clientes

```mermaid
flowchart TD
    A[fetchClients] --> B[Buscar public_clients por business_id]
    B --> C[Buscar clients existentes com telefone]
    C --> D{Para cada public_client com telefone}
    D --> E[Comparar telefone em 3 formatos]
    E --> F{Já existe em clients?}
    F -->|Sim| G[Pular]
    F -->|Não| H[Marcar para inserção]
    H --> I[INSERT em clients: tier=Bronze, visits=0, notes='Registrado via link público']
    I --> J[Buscar appointments Completed por client_id]
    J --> K[Calcular actual_visits por cliente]
    K --> L[Filtrar is_active ≠ false]
    L --> M[Renderizar lista com filtros]
```

---

## Fluxo: Perfil do Cliente (ClientCRM)

```mermaid
flowchart TD
    A[Carregar página /clientes/:id] --> B[RPC get_client_profile]
    B --> C[Receber: client, ltv, appointments_history, hair_history]
    C --> D[Calcular totalVisits e lastVisit]
    D --> E[calculateNextVisitPrediction]
    E --> F{AIOS habilitado E cliente em risco?}
    F -->|Sim| G[Exibir card de reativação com botão WhatsApp]
    F -->|Não| H[Exibir AISemanticInsights com memórias]
    G --> I[handleWhatsAppClick → logCampaignActivity + generateReactivationMessage]
    H --> J[searchMemorías com query de preferências]
    
    K[Salvar notas] --> L{Salvar com memória semântica?}
    L -->|Sim| M[UPDATE clients.notes + saveMemory(embedding)]
    L -->|Não| N[UPDATE clients.notes]
```

---

## Fluxo: Sistema de Fidelidade (Tier)

```mermaid
flowchart LR
    A[totalVisits] --> B{0-5?}
    B -->|Sim| C[Bronze]
    B -->|Não| D{6-15?}
    D -->|Sim| E[Silver]
    D -->|Não| F{16-30?}
    F -->|Sim| G[Gold]
    F -->|Não| H[Platinum]
```

---

## Fluxo: Autenticação do Cliente Público (ClientArea)

```mermaid
flowchart TD
    A[Cliente acessa /minha-area/:slug] --> B[Buscar business via slug]
    B --> C{Client já autenticado? via localStorage}
    C -->|Sim| D[Exibir área do cliente]
    C -->|Não| E[Exibir gate de telefone]
    E --> F[Inserir telefone]
    F --> G[RPC get_public_client_by_phone]
    G --> H{Encontrado?}
    H -->|Sim| I[Setar client no state + localStorage]
    H -->|Não| J[Exibir formulário de registro]
    J --> K[register: nome + email + telefone]
    K --> L[Verificar se já existe por phone]
    L --> M{Já existe?}
    M -->|Sim| N[UPDATE dados + espelhar para CRM]
    M -->|Não| O[INSERT em public_clients]
    O --> P[Espelhar para CRM via mirror_public_client_to_crm RPC]
    N --> P
    P --> Q[Setar client + localStorage → Exibir área]
    
    D --> R[fetchBookings: get_client_bookings_history]
    R --> S[Real-time subscription em public_bookings_{phone}]
    S --> T[Separar upcoming / history]
    T --> U[Renderizar tabs: Próximos / Histórico / Perfil]
```

---

## Fluxo: Detalhado — Mensagem de Reativação (AIOS)

```mermaid
flowchart TD
    A[cliente em risco detectado] --> B{LTV > R$500?}
    B -->|Sim| C[Framework StoryBrand]
    B -->|Não| D[Framework ABT]
    C --> E["{firstName}, você merece estar na sua melhor versão. No {businessName}, nosso plano é simples: agendar seu horário, {goal} e garantir que você saia incrível."]
    D --> F["Oi, {firstName}! Você sempre cuida do seu {lastService} com a gente E sua última visita foi incrível, MAS já faz {daysMissing} dias. PORTANTO, separei horários exclusivos."]
    E --> G[encodeURIComponent + wa.me link]
    F --> G
    G --> H[logCampaignActivity: clientId, agentName, 'reactivation_spark']
```

---

## Fluxo: Memória Semântica (RAG)

```mermaid
flowchart LR
    A[Salvar observação] --> B[Gemini: generateEmbedding text]
    B --> C[INSERT client_semantic_memory: client_id, observation, embedding, context_type]
    
    D[Buscar memórias para atendimento] --> E[Gemini: generateEmbedding query]
    E --> F[RPC match_client_memories: client_id, query_embedding, threshold=0.5, limit=5]
    F --> G[Retorna memórias similares com score]
```

---

## Fluxo: Previsão de Próxima Visita

```mermaid
flowchart TD
    A[calculateNextVisitPrediction] --> B{< 2 appointments?}
    B -->|Sim| C["'Dados insuficientes'"]
    B -->|Não| D[Ordenar appointments cronologicamente]
    D --> E[Calcular média de dias entre visitas]
    E --> F[Adicionar média ao lastVisit → predictedDate]
    F --> G{Comparar com hoje}
    G -->|Passado| H["'Atrasado'"]
    G -->|Hoje| I["'Hoje'"]
    G -->|Amanhã| J["'Amanhã'"]
    G -->|≤ 7 dias| K["'{n} dias'"]
    G -->|> 7 dias| L["'dd MMM yyyy'"]
```