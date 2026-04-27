 GLOSSARY.md

Glossário de domínio do AGENDIX — termos de negócio, entidades e conceitos.
Use este arquivo para evitar ambiguidade ao discutir features e implementar código.

---

## Personas

| Termo | Definição |
|---|---|
| **Dono/Owner** | Dono da barbearia ou salão. Tem role `owner`. Acesso total ao sistema. |
| **Profissional/Staff** | Barbeiro, cabeleireiro ou profissional de beleza. Tem role `staff`. Acesso limitado (própria agenda, comissões). |
| **Cliente** | Pessoa que agenda atendimento. Pode ser manual (CRM) ou via booking público. |

---

## Entidades principais

| Termo | Tabela | Definição |
|---|---|---|
| **Agendamento** | `appointments` | Reserva de um serviço com um profissional em data/hora específica. Status: Pending → Confirmed → Completed/Cancelled. |
| **Booking público** | `public_bookings` | Agendamento feito pelo cliente via link público (`/#/book/:slug`). Espelhado em `appointments` via RPC. |
| **Fila virtual** | `queue_entries` | Entrada na fila de espera. Status: waiting → calling → serving → completed/cancelled/no_show. |
| **Serviço** | `services` | Serviço oferecido pelo negócio (ex: corte, barba, manicure). Tem preço, duração e categoria. |
| **Categoria** | `service_categories` | Agrupamento de serviços (ex: "Cabelo", "Barba", "Unhas"). |
| **Profissional** | `team_members` | Membro da equipe. Tem comissão, slug público e foto. |
| **Cliente** | `clients` | Cliente do CRM. Adicionado manualmente pelo dono ou via agendamento online. |
| **Cliente público** | `public_clients` | Cliente que se registra via booking público. `UNIQUE(business_id, phone)`. Espelhado no CRM via `mirror_public_client_to_crm`. |
| **Registro financeiro** | `finance_records` | Receita ou despesa. Gerado automaticamente ao concluir agendamento, ou manualmente. |
| **Comissão** | (via `finance_records` + `commission_payments`) | Valor devido ao profissional com base no `commission_rate`. Calculada por RPC `get_commissions_due`. |
| **Meta** | `goal_settings` | Meta financeira mensal do dono. `UNIQUE(user_id, month, year)`. |
| **Onboarding** | `onboarding_progress` | Wizard de 5 steps para novos usuários. |

---

## Termos de negócio

| Termo | Definição |
|---|---|
| **Slot** | Horário disponível na agenda de um profissional. Calculado a partir de `business_hours` + `duration_minutes` do serviço - agendamentos existentes. |
| **Comissão** | Percentual do valor do serviço que o profissional recebe. Definido por `commission_rate` no `team_members`. |
| **Fechamento de comanda** | Ação de concluir um agendamento, registrando o pagamento e gerando o registro financeiro. Usa RPC `complete_appointment`. |
| **Espelhamento** | Processo de sincronizar dados entre `public_bookings`/`public_clients` e `appointments`/`clients`. Feito via RPCs com `SECURITY DEFINER`. |
| **Upsell** | Serviço adicional sugerido junto com o serviço principal. Relação N:N via `service_upsells`. |
| **Churn** | Cliente que parou de agendar. Detectado por `get_marketing_opportunities`. |
| **Fidelidade (loyalty)** | Tier de fidelidade do cliente (`loyalty_tier` no `clients`). |
| **Horário comercial** | Configurado em `business_hours` (JSONB) no `business_settings`. Define slots disponíveis. |
| **Slug** | Identificador público legível (ex: `joao-barbeiro`). Usado em URLs de booking e queue. |
| **AIOS** | Sistema de agentes IA do AGENX. Features pós-MVP — não priorizar no momento. |

---

## Status e fluxos

### Agendamento (appointments)
```
Pending → Confirmed → Completed
                   → Cancelled
```

### Fila virtual (queue_entries)
```
waiting → calling → serving → completed
                              → cancelled
                              → no_show
```

### Onboarding (5 steps)
```
Step 1: Dados do negócio
Step 2: Horário de funcionamento
Step 3: Serviços
Step 4: Equipe
Step 5: Conclusão
```

---

## Termos técnicos do projeto

| Termo | Definição |
|---|---|
| **RLS** | Row Level Security — isolamento de dados por `company_id` no Supabase. Quebra silenciosamente (retorna vazio, não erro). |
| **SECURITY DEFINER** | RPC que executa com permissões do criador, não do chamador. Usada para contornar RLS em fluxos públicos. |
| **BrutalCard/BrutalButton** | Componentes base que se adaptam ao tema (barber/beauty). Toda UI usa esses componentes. |
| **isBeauty** | Flag booleana (`userType === 'beauty'`) que controla tema visual. Usada extensivamente em condicionais Tailwind. |
| **region** | Região do negócio: `BR` (Brasil, R$) ou `PT` (Portugal, EUR). Afeta formatação de moeda. |
