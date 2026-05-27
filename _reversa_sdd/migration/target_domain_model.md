---
schemaVersion: 1
generatedAt: 2026-05-17T18:39:00Z
reversa:
  version: "1.0.0"
kind: target_domain_model
producedBy: designer
---

# Target Domain Model

> Modelo de dominio alvo organizado por bounded context, com rastreabilidade para regras do legado.

---

## BC-1: Identity

### Aggregates

#### Profile (root)

- **Invariantes**: email unico; role = owner|staff; company_id obrigatorio; trial_ends_at imutavel apos criacao
- **Comandos**: login, register, updateProfile, logout
- **Entidades**: Profile
- **Value Objects**: SubscriptionStatus (trial|active|past_due|canceled|subscriber), Region (BR|PT), UserType (barber|beauty), Role (owner|staff)

#### Onboarding (root)

- **Invariantes**: is_completed e source of truth; current_step entre 1-5; completed_steps subconjunto de [1,2,3,4,5]
- **Comandos**: advanceStep, completeOnboarding, skipOnboarding
- **Entidades**: OnboardingProgress
- **Value Objects**: OnboardingStep

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| RLS filtra por company_id | 001 | RLS policy (banco) |
| company_id via useAuth | 002 | AuthContext |
| Rate limiting login | 003 | RPC check_login_rate_limit |
| Heranca owner->staff | 004 | authService.fetchProfile() |
| Trial 7 dias | 005 | Profile.trial_ends_at |
| Subscription ativa | 006 | isSubscriptionActive() pura |
| Staff cria team_member | 007 | authService.register() |
| Rate limit fail-open | 008 | authService.login() |
| 2FA TOTP | 009 | use2FA hook |
| Route guards | 010 | OwnerRouteGuard, ProtectedLayout |
| Onboarding source of truth | 048 | onboardingService.isCompleted() |
| Wizard 5 steps | 049 | onboardingService |
| SetupCopilot | 050 | onboardingService |

---

## BC-2: Scheduling

### Aggregates

#### Appointment (root)

- **Invariantes**: status valido (Confirmed|Pending|Completed|Cancelled); preco >= 0; professional_id referencia team_member valido; checkout atomico (appointment + finance_record na mesma transacao)
- **Comandos**: createAppointment, completeAppointment (checkout), cancelAppointment, editAppointment
- **Entidades**: Appointment
- **Value Objects**: AppointmentStatus, PaymentMethod, MachineFee

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| Status enum | 011 | types/scheduling.ts (Zod) |
| Overdue 15min tolerancia | 012 | isOverdue(apt, now) pura |
| Staff nao cancela Completed | 013 | cancelAppointment guard |
| Checkout atomico RPC | 014 | useCheckout mutation -> RPC |
| Desconto + preco custom | 019 | calcPrice() pura |
| Checkout taxa maquininha | 022 | calcMachineFee() pura |
| Real-time | 023 | useRealtimeSubscription |
| Staff ve apenas seus | 024 | query filter |
| Booking RPC com colisao | 025 | useCreateBooking mutation |
| Auto-atribuicao profissional | 026 | assignProfessional() |

---

## BC-3: Public Booking

### Aggregates

#### PublicBooking (root)

- **Invariantes**: status (pending|confirmed|cancelled); telefone obrigatorio; duplicata bloqueada por telefone ativo; is_edit preserva original_appointment_time
- **Comandos**: createBooking, editBooking, acceptBooking, rejectBooking
- **Entidades**: PublicBooking, PublicClient
- **Value Objects**: BookingStatus

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| Pending ate aprovacao | 015 | bookingService.create() |
| Edicao via is_edit | 016 | bookingService.edit() |
| Busca cliente 3 formatos | 017 | clientService.findByPhone() |
| Prevencao duplicata | 020 | RPC get_active_booking_by_phone |
| Espelhamento public->CRM | 021 | RPC mirror_public_client_to_crm |

---

## BC-4: Queue

### Aggregates

#### QueueEntry (root)

- **Invariantes**: status valido; finalizacao atomica (queue + appointment + finance_record); timeout calling 5min -> waiting; duplicata bloqueada por telefone
- **Comandos**: joinQueue, callEntry, serveEntry, finishEntry, markNoShow, cancelEntry
- **Entidades**: QueueEntry
- **Value Objects**: QueueStatus, EstimatedWait

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| Estados da fila | 027 | types/queue.ts (Zod enum) |
| Som em calling | 028 | QueueStatus component |
| Finalizacao atomica RPC | 029 | useFinishQueue mutation -> RPC |
| Filtro dia atual | 030 | queueService.getToday() |
| Tempo estimado | 031 | calcEstimatedWait() pura |
| Fallback polling 10s | 032 | useRealtimeSubscription fallback |
| OwnerRouteGuard | 033 | route guard |

---

## BC-5: Finance

### Aggregates

#### FinanceRecord (root)

- **Invariantes**: type (revenue|expense); revenue >= 0; comissao calculada sobre base correta; filtro staff por professional_id (nunca nome)
- **Comandos**: createTransaction, deleteTransaction, markExpensePaid
- **Entidades**: FinanceRecord
- **Value Objects**: TransactionType, PaymentMethod, FinanceStats

#### Commission (root)

- **Invariantes**: periodo baseado em settlement_day; dia inexistente = ultimo dia do mes; lote atomico
- **Comandos**: payCommissions, updateCommissionRate
- **Entidades**: CommissionPayment
- **Value Objects**: CommissionPeriod, SettlementDay

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| Filtro por professional_id | 034 | financeService.getStaffRecords() |
| Staff sem abas restritas | 035 | Finance page guard |
| Settlement day + fallback | 036 | calcSettlementDate() pura |
| Comissao = taxa x base | 037 | calcCommission() pura |
| Pagamento lote RPC | 038 | usePayCommissions mutation |
| Transacoes manuais | 039 | financeService.createManual() |
| Delete receita = delete apt | 040 | financeService.deleteRevenue() |
| Despesas liquidaveis | 041 | RPC mark_expense_as_paid |
| Taxa maquininha | 042 | calcMachineFee() |
| Exportacao CSV | 043 | exportToCSV() |
| Stripe subscription | 044 | Edge Function |
| Precos regionais | 045 | config por region |
| Region awareness | 046 | formatCurrency(region) |
| Self-repair commission | 047 | financeService.ensureRecord() |

---

## BC-6: CRM

### Aggregates

#### Client (root)

- **Invariantes**: phone unico por company; loyalty tier derivado de total_visits; deduplicacao por telefone
- **Comandos**: createClient, updateClient, deduplicateClient
- **Entidades**: Client, ClientSemanticMemory
- **Value Objects**: LoyaltyTier (Bronze|Silver|Gold|Platinum)

### Regras de dominio

| Regra alvo | BR-MIGRAR | Localizacao |
|---|---|---|
| Loyalty tier calc | 051 | calcTier(visits) pura |
| Deduplicacao telefone | 052 | clientService.findByPhone() |

---

## BC-7: Team

### Aggregates

#### TeamMember (root)

- **Invariantes**: slug unico; commission_rate >= 0; active flag
- **Comandos**: addMember, removeMember, updateMember
- **Entidades**: TeamMember
- **Value Objects**: Slug, Specialties

---

## BC-8: Catalog

### Aggregates

#### Service (root)

- **Invariantes**: preco >= 0; duracao >= 0; active flag
- **Comandos**: createService, updateService, toggleActive
- **Entidades**: Service, ServiceCategory

#### Product (root) -- NOVO na v1

- **Invariantes**: preco_venda >= 0; custo >= 0; estoque >= 0; estoque_minimo >= 0
- **Comandos**: createProduct, updateProduct, sellProduct, adjustStock
- **Entidades**: Product, ProductSale
- **Value Objects**: StockLevel, ProductPrice, ProductSaleSnapshot
- **Regra contabil**: venda de produto gera `product_sales` como trilha auditavel e `finance_record` como impacto financeiro agregado. `product_sales` preserva preco/custo/quantidade no momento da venda.

---

## BC-9: Observability

Sem aggregates de dominio. Escrita via triggers, leitura via queries dev-only.

- **Entidades**: AuditLog, SystemError, AiosLog, AIKnowledgeBase
- **Regras**: BR-MIGRAR-053, 054, 055

---

## Rastreabilidade para legado

| Tipo | Qtd | Detalhes |
|---|---|---|
| 1-para-1 | 42 | Maioria das regras migra sem mudanca estrutural |
| Corrigido | 4 | BR-029 (atomicidade fila), BR-034 (filtro ID), BR-048 (onboarding), checkout |
| Fundido | 2 | Scheduling = agenda + checkout; Finance = financeiro + comissoes |
| Novo | 1 | Product (BC-8 Catalog) |
| Descartado | 6 | Ver discard_log.md |
