# Fila Digital (queue)

## Visão Geral
Sistema de fila de espera em tempo real para clientes sem agendamento prévio. O cliente final entra na fila via QR code ou link (`/queue/:slug`), acompanha sua posição e tempo estimado em uma tela dedicada. O owner gerencia a fila em `/fila`, com ações de chamar, atender, finalizar e marcar não-comparecimento. A finalização cria automaticamente um appointment `Completed` e um registro financeiro.

## Responsabilidades
- Permitir entrada na fila por QR code ou link público (`/queue/:slug`)
- Gerenciar estado da fila em tempo real (Supabase Realtime)
- Calcular posição na fila e tempo estimado de espera
- Notificar cliente sonoramente quando chamado
- Permitir ao owner chamar, atender, finalizar e marcar não-comparecimento
- Criar appointment + finance_record ao finalizar atendimento
- Filtrar entradas por dia atual (`joined_at >= hoje`)

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| slug | string | Slug do estabelecimento |
| client_name | string | Nome do cliente |
| client_phone | string | Telefone |
| service_id | uuid \| null | Serviço desejado |
| professional_id | uuid \| null | Profissional preferido |
| status | 'waiting' \| 'calling' \| 'serving' \| 'completed' \| 'cancelled' \| 'no_show' | Estado da fila |
| price | numeric | Preço do atendimento (na finalização) |
| payment_method | string | Método de pagamento (na finalização) |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| QueueEntry | object | Entrada na fila com status |
| queue_position | number | Posição numérica |
| estimated_wait_seconds | number | Tempo estimado (posição × 20min) |
| Appointment | object | Criado ao finalizar |
| FinanceRecord | object | Criado ao finalizar |

## Regras de Negócio
- **R17** Fila tem estados: `waiting`, `calling`, `serving`, `completed`, `cancelled`, `no_show`. 🟢
- **R18** Transição `waiting → calling` dispara som de notificação. 🟢
- **R19** Finalizar atendimento da fila: cria cliente (se não existir), cria agendamento (`Completed`), cria registro financeiro, atualiza fila. Tudo em transação manual (client-side). 🟢
- **R20** Entradas da fila são filtradas por dia atual (`joined_at >= hoje`). 🟢
- **R37** Tempo estimado: `position × 20 minutos`. Pode ir negativo. 🟢
- **R38** Fallback real-time: polling a cada 10s se WebSocket cair. 🟢
- **R39** Staff não acessa `/fila` (rota protegida por `OwnerRouteGuard`). 🟢
- **R40** Entradas `completed` permanecem visíveis no histórico do dia. 🟢

## Fluxo Principal

### Cliente entra na fila
1. Cliente acessa `/queue/:slug`
2. Preenche nome + telefone + serviço (opcional) + profissional (opcional)
3. INSERT em `queue_entries` com `status='waiting'`
4. Redireciona para `/queue-status/:id`
5. Busca posição via RPC `get_queue_position`
6. Calcula countdown: `position × 20 × 60` segundos
7. Subscreve real-time em `queue_entries`
8. Atualiza status e posição em tempo real

### Owner gerencia a fila
1. Owner acessa `/fila`
2. Busca `queue_entries` do dia (`joined_at >= hoje`)
3. Lista: `waiting` + `calling` + `serving`
4. Ações:
   - **Chamar:** `UPDATE status='calling'` + som de notificação
   - **Atender:** `UPDATE status='serving'`
   - **Finalizar:** abre modal de finalização
   - **Não compareceu:** `UPDATE status='no_show'`

### Finalizar atendimento da fila
1. Owner clica "Finalizar" na entrada `serving`
2. Modal: seleciona serviço + preço + profissional
3. Verifica se cliente existe em `clients`
   - Se sim: usa `client_id` existente
   - Se não: INSERT em `clients`
4. INSERT em `appointments` com `status='Completed'`
5. INSERT em `finance_records`
6. UPDATE `queue_entries` SET `status='completed'`

## Fluxos Alternativos
- **[Cliente já na fila]:** Não há verificação de duplicata na fila. Cliente pode entrar múltiplas vezes. 🟡
- **[Owner chamar sem atender]:** Entrada fica em `calling` indefinidamente. Não há timeout. 🟡
- **[Cliente recarrega página]:** Reconecta real-time, mantém posição. 🟢
- **[Fila vazia]:** Exibe mensagem "Nenhum cliente na fila". 🟢

## Cenários de Borda

### B1 — Cliente entra na fila mas sai antes de ser chamado
- **Condição:** Cliente entra na fila, mas fecha o navegador ou sai do estabelecimento.
- **Comportamento:** Entrada permanece em `waiting` até o owner marcar `no_show` ou o dia terminar.
- **Impacto:** Fila inflada com entradas fantasmas. Tempo estimado de outros clientes aumenta.
- **Risco:** Baixo — owner pode marcar `no_show` manualmente.
- **Mitigação:** Nenhuma automática.

### B2 — Finalizar fila com falha parcial
- **Condição:** Appointment criado, mas INSERT em `finance_records` falha.
- **Comportamento:** Atendimento marcado como `Completed`, mas sem receita registrada.
- **Impacto:** Dados inconsistentes — mesma lacuna do checkout da agenda.
- **Risco:** Médio — transação não é atômica.
- **Mitigação / Decisão validada:** Deve ser movido para uma RPC atômica com transação única (BEGIN/COMMIT) no banco. Se qualquer etapa falhar, rollback completo.

### B3 — Dois owners gerenciando a mesma fila
- **Condição:** Dois dispositivos logados como mesmo owner acessam `/fila`.
- **Comportamento:** Ambos veem a mesma fila em real-time. Ações em um dispositivo refletem no outro.
- **Impacto:** Concorrência — dois owners podem chamar o mesmo cliente simultaneamente.
- **Risco:** Baixo — real-time sincroniza rapidamente, mas race condition possível.

## Dependências
- `lib/supabase.ts` — cliente Supabase, RPCs, real-time
- `contexts/AuthContext.tsx` — `useAuth` (role, companyId)
- `components/BrutalCard.tsx`, `components/BrutalButton.tsx` — UI base
- `lucide-react` — Ícones

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Polling a cada 10s como fallback | `QueueStatus.tsx:58-134` | 🟢 |
| Disponibilidade | Real-time para sincronização multi-dispositivo | `queue_manage`, `queue_{id}` channels | 🟢 |
| Usabilidade | Som de notificação ao ser chamado | `QueueManagement.tsx:140-142` | 🟢 |

## Critérios de Aceitação

```gherkin
# Cenário 1: Cliente entra na fila
Dado que um cliente acessa o QR code da fila
Quando preenche nome e telefone
Então o sistema cria queue_entry com status "waiting"
E redireciona para tela de acompanhamento
E exibe posição e tempo estimado

# Cenário 2: Owner chama cliente
Dado que existe um cliente na fila com status "waiting"
Quando o owner clica em "Chamar"
Então o status muda para "calling"
E o cliente ouve som de notificação

# Cenário 3: Owner finaliza atendimento
Dado que um cliente está em status "serving"
Quando o owner clica em "Finalizar"
E preenche serviço, preço e profissional
Então o sistema cria appointment "Completed"
E cria finance_record
E atualiza fila para "completed"

# Cenário 4: Cliente não comparece
Dado que um cliente está na fila
Quando o owner clica em "Não compareceu"
Então o status muda para "no_show"
E a entrada sai da lista ativa
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Entrada na fila | Must | Core para walk-ins |
| Gerenciamento owner | Must | Sem gestão, fila não funciona |
| Finalização com finance | Must | Gera receita |
| Real-time | Should | UX essencial, mas polling funciona |
| Som de notificação | Could | UX premium |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/QueueManagement.tsx` | `QueueManagement`, `updateStatus`, `confirmFinish` | 🟢 |
| `pages/QueueJoin.tsx` | `QueueJoin`, `handleSubmit` | 🟢 |
| `pages/QueueStatus.tsx` | `QueueStatus`, real-time subscription | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
