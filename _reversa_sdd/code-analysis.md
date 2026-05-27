# Análise Técnica — agendix

> Gerado pelo Archaeologist em 2026-05-03
> Nível de documentação: **Detalhado**

---

## Módulo: auth

### Visão Geral

Sistema de autenticação e autorização baseado em Supabase Auth, com suporte a múltiplos perfis (Owner/Staff), dual theme (Barber/Beauty), trial de 7 dias, rate limiting anti-brute force e flag de desenvolvedor.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `contexts/AuthContext.tsx` | Provider de autenticação, estado global, lógica de login/logout/registro |
| `pages/Login.tsx` | Tela de login com gateway de seleção de segmento (barber/beauty) |
| `pages/Register.tsx` | Tela de registro de novo usuário |
| `pages/ForgotPassword.tsx` | Recuperação de senha |
| `pages/UpdatePassword.tsx` | Redefinição de senha (pós-email) |
| `hooks/use2FA.ts` | Hook de autenticação de dois fatores |
| `components/security/TwoFactorSetup.tsx` | UI de configuração de 2FA |

---

### Fluxo de Controle

#### Login (`AuthContext.login`)

```
1. Verifica rate limit via RPC `check_login_rate_limit(p_email)`
   → Se bloqueado: retorna erro "Muitas tentativas... aguarde 1 minuto"
   → Se falha na RPC: fail-open (não bloqueia usuário legítimo)
2. Executa `supabase.auth.signInWithPassword({email, password})`
3. Retorna { error }
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:187-205`

#### Busca de Perfil (`fetchProfileData`)

```
1. Query na tabela `profiles` por id do usuário
2. Se perfil encontrado:
   a. Determina role (owner vs staff)
   b. Se owner: carrega user_type, region, business_name, subscription_status, trial_ends_at
   c. Se staff:
      - Herda subscription_status e trial_ends_at do owner (query adicional em profiles)
      - Herda user_type e business_name do owner
      - Busca team_member_id vinculado ao staff_user_id
      - Fallback: se owner não encontrado, marca como 'subscriber' sem trial
3. Seta estados correspondentes
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:66-130`

#### Registro (`AuthContext.register`)

```
1. Cria usuário no Supabase Auth (`signUp`)
   - metadata: full_name, business_name
2. Insere registro em `profiles`:
   - trial_ends_at = now + 7 dias
   - subscription_status = 'trial'
   - role = 'staff' se companyId presente, senão 'owner'
   - company_id = companyId || authData.user.id
   - aios_enabled = true
3. Se companyId (registro de staff):
   - Insere em `team_members` vinculado ao owner (user_id = companyId)
   - Gera slug a partir do nome + número aleatório
   - Erro em team_members é logado mas não impede criação da conta
4. Retorna { error }
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:236-310`

#### Tela de Login (`Login.tsx`)

```
1. Estado inicial: gateway de seleção de segmento (barber/beauty)
2. Ao selecionar: seta loginTheme e esconde gateway
3. Formulário de login:
   - Validação implícita (required via UI)
   - Toggle show/hide password
   - Chama AuthContext.login
4. Pós-login:
   - Busca business_settings.onboarding_completed
   - Se não completou: redirect /onboarding
   - Se completou: redirect /
```

> 🟢 **CONFIRMADO** — `pages/Login.tsx`

---

### Algoritmos e Lógica

#### Cálculo de Assinatura Ativa (`isSubscriptionActive`)

```typescript
isSubscriptionActive = 
  subscriptionStatus === 'active' 
  || subscriptionStatus === 'subscriber'
  || (
    subscriptionStatus === 'trial'
    && !!trialEndsAt
    && new Date() < parseDate(trialEndsAt)
  )
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:330-337`

#### Geração de Slug para Staff

```typescript
slug = fullName
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]/g, '-')
  + '-'
  + Math.floor(Math.random() * 1000)
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:295`

#### Detecção de Dev

```typescript
isDev = session.user.email === 'rleporesilva@gmail.com'
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:160`

#### Override de Tipo por Dev

```typescript
activeUserType = (isDev && devUserType) ? devUserType : userType
devUserType persistido em localStorage ('rhian_lepore_dev_type')
```

> 🟢 **CONFIRMADO** — `AuthContext.tsx:312-317`

---

### Estruturas de Dados

#### AuthContextType (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| isAuthenticated | boolean | `!!session` |
| user | User \| null | Usuário do Supabase Auth |
| userType | UserType | 'barber' \| 'beauty' (ou override dev) |
| region | Region | 'BR' \| 'PT' |
| businessName | string | Nome do negócio |
| fullName | string | Nome completo do usuário |
| avatarUrl | string \| null | URL da foto (photo_url) |
| tutorialCompleted | boolean | Flag de tutorial visto |
| subscriptionStatus | enum | 'trial' \| 'active' \| 'past_due' \| 'canceled' \| 'subscriber' |
| trialEndsAt | string \| null | ISO date string |
| isSubscriptionActive | boolean | Computado a partir do status e data |
| role | enum | 'owner' \| 'staff' |
| companyId | string \| null | ID do owner (ou próprio ID se owner) |
| teamMemberId | string \| null | ID do registro em team_members |
| isDev | boolean | Flag de desenvolvedor |
| aiosEnabled | boolean | Flag de acesso ao AIOS |
| setDevUserType | fn | Override de tema para dev |
| loading | boolean | Estado de carregamento inicial |
| login | fn | `(email, password) => Promise<{error}>` |
| logout | fn | `() => Promise<void>` |
| markTutorialCompleted | fn | `() => Promise<void>` |
| register | fn | `(data) => Promise<{error}>` |

> 🟢 **CONFIRMADO** — `AuthContext.tsx:9-41`

#### Tabela `profiles` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | FK para auth.users |
| full_name | string | não | |
| business_name | string | não | |
| user_type | string | não | 'barber' \| 'beauty' |
| region | string | não | 'BR' \| 'PT' |
| phone | string | não | |
| tutorial_completed | boolean | não | default false |
| subscription_status | string | não | 'trial' \| 'active' \| 'past_due' \| 'canceled' \| 'subscriber' |
| trial_ends_at | timestamp | não | |
| role | string | não | 'owner' \| 'staff' |
| company_id | uuid | não | FK para profiles.id (owner) |
| photo_url | string | não | |
| aios_enabled | boolean | não | default true |

> 🟡 **INFERIDO** — a partir dos campos acessados em `fetchProfileData` e `register`

#### Tabela `team_members` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| user_id | uuid | sim | FK profiles.id (owner) |
| staff_user_id | uuid | sim | FK auth.users (staff) |
| name | string | sim | |
| role | string | sim | ex: 'Profissional' |
| active | boolean | sim | |
| is_owner | boolean | sim | |
| commission_rate | number | sim | default 0 |
| slug | string | sim | Gerado automaticamente |

> 🟡 **INFERIDO** — a partir do insert em `register`

---

### Metadados e Configurações

- **Rate Limit RPC:** `check_login_rate_limit(p_email)` — proteção anti-brute force
- **Trial padrão:** 7 dias (`Date.now() + 7 * 24 * 60 * 60 * 1000`)
- **Flag dev:** hardcoded email `'rleporesilva@gmail.com'`
- **LocalStorage key:** `rhian_lepore_dev_type`
- **Onboarding redirect:** verifica `business_settings.onboarding_completed`

---

### Regras de Negócio

1. **Staff herda do Owner:** userType, businessName, subscriptionStatus, trialEndsAt
2. **Staff sem owner:** fallback para 'subscriber' sem trial
3. **Trial ativo:** status 'trial' + trialEndsAt no futuro
4. **Rate limiting:** RPC no login, fail-open em erro de sistema
5. **Registro de staff:** cria conta em auth + profile + team_members (3 operações atômicas, sem transação explícita)

---

### Dependências do Módulo

- `lib/supabase.ts` — cliente Supabase
- `utils/date.ts` — `parseDate`
- `@supabase/supabase-js` — tipos Session, User

---

> ⚠️ **Checkpoint:** Análise do módulo `auth` concluída. 

---

## Módulo: agenda

### Visão Geral

Sistema de agendamento completo com três fluxos distintos: (1) Agenda interna do dono/staff, (2) Booking público via link, (3) Fila digital. Suporta dual theme (barber/beauty), múltiplos profissionais, booking público com aceitação/rejeição, fila em tempo real, integração com WhatsApp, e checkout com método de pagamento.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Agenda.tsx` | Página principal da agenda interna — aprovador de bookings, CRUD de appointments, checkout, real-time |
| `pages/PublicBooking.tsx` | Booking público via slug — fluxo conversacional, seleção de serviços/data/profissional, edição de reserva |
| `pages/QueueManagement.tsx` | Gerenciamento da fila digital pelo dono — chamar, atender, finalizar, QR code |
| `pages/QueueJoin.tsx` | Entrada pública na fila — seleção de serviço/profissional, form nome+telefone |
| `pages/QueueStatus.tsx` | Acompanhamento em tempo real da posição na fila — countdown, notificação sonora |
| `components/AppointmentWizard.tsx` | Wizard 4 etapas para criar atendimento — cliente, serviço, horário, revisão |
| `components/AppointmentEditModal.tsx` | Modal de edição de appointment existente |
| `components/CheckoutModal.tsx` | Modal de checkout — pagamento, método, taxa de maquininha |
| `components/CalendarPicker.tsx` | Calendário mensal com indisponibilidade |
| `components/TimeGrid.tsx` | Grid de horários disponíveis (manhã/tarde) |
| `components/ProfessionalSelector.tsx` | Seletor de profissional com foto e rating |
| `components/UpsellSection.tsx` | Cross-sell de serviços complementares |
| `components/PublicBusinessHeader.tsx` | Header do estabelecimento no booking público (logo, rating, galeria) |
| `components/ChatBubble.tsx` | Bolha de chat para fluxo conversacional no booking |
| `components/ClientAuthModal.tsx` | Autenticação de cliente público (telefone → registro) |
| `contexts/PublicClientContext.tsx` | Context para sessão de cliente público |
| `components/appointment/*.tsx` | Sub-componentes do wizard (ServiceSearchBar, CategoryFilter, ServiceList, ClientSelection, ScheduleSelection, AppointmentReview) |

---

### Fluxo de Controle

#### Agenda Interna — Busca de Dados (`fetchData`)

```
1. Paralelamente: fetchTeamMembers, fetchAppointments, fetchPublicBookings, fetchClients, fetchServices, fetchCategories, fetchBusinessProfile, fetchCheckoutData
2. Cada query filtra por effectiveUserId (companyId ?? user.id)
3. fetchAppointments: busca serviços para mapear preços → query appointments com status [Confirmed, Pending, Completed]
4. fetchPublicBookings: status 'pending' (aguardando aprovação do dono)
5. fetchCheckoutData: busca team_members + business_settings para pré-preencher checkout
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:287-299`

#### Aceitar Booking Público (`handleAcceptBooking`)

```
1. Busca cliente existente por telefone (3 formatos: raw, BR, PT)
2. Se encontrado: atualiza foto se booking tem foto e cliente não
3. Se não encontrado: busca foto em public_clients → cria novo em clients
4. Busca nomes dos serviços a partir de service_ids
5. Auto-atribui professional_id se "qualquer" (se 1 pro, attribui; se múltiplos, attribui o primeiro)
6. Se é edição (is_edit=true):
   a. Busca appointment original por client_id + original_appointment_time
   b. Se encontrado: UPDATE com novos dados
   c. Se não: INSERT novo
7. Se é novo: INSERT em appointments com status 'Confirmed'
8. UPDATE public_bookings SET status='confirmed'
9. Pergunta se quer enviar WhatsApp de confirmação
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:534-761`

#### Criar Appointment via Wizard (`AppointmentWizard.handleSubmit`)

```
1. Valida: clientId, date, time, proId obrigatórios
2. Combina data+hora via combineDateAndTime
3. Calcula duração total (soma duration_minutes dos serviços)
4. Chama RPC create_secure_booking com todos os dados
5. Se !result.success: alerta com mensagem de erro
6. Se sendWhatsapp=true: gera link WhatsApp com mensagem temática (barber/beauty)
7. Se primeiro agendamento: dispara evento 'system-activated'
8. Dispara evento 'setup-step-completed' com stepId='appointment'
9. Chama onSuccess e onClose
```

> 🟢 **CONFIRMADO** — `components/AppointmentWizard.tsx:108-196`

#### Completar Appointment — Checkout (`CheckoutModal`)

```
1. Seleciona método de pagamento (PIX/Dinheiro/Débito/Crédito para BR; Dinheiro/MBWay/Débito/Crédito para PT)
2. Seleciona quem recebeu (team_members ativos)
3. Se maquininha: calcula taxa automática (debit_fee_percent ou credit_fee_percent)
4. Preço editável com desconto opcional
5. Chama RPC complete_appointment com: appointment_id, payment_method, received_by, completed_by, machine_fee_percent, machine_fee_amount
6. Fallback client-side se RPC falhar: UPDATE status + INSERT finance_records
```

> 🟢 **CONFIRMADO** — `components/CheckoutModal.tsx`, `pages/Agenda.tsx:778-867`

#### Booking Público — Criação (`PublicBooking.handleSubmit`)

```
1. Valida: businessId, customerName, customerPhone, selectedDate, selectedTime, acceptedPolicy
2. Upload de foto de perfil para storage (client_photos)
3. Registra cliente público (best-effort, não bloqueia se falhar)
4. Se NÃO editando: verifica duplicata via get_active_booking_by_phone
5. Se professional='any': chama get_first_available_professional
6. Se EDITANDO: UPDATE public_bookings com is_edit=true e original_appointment_time
7. Se NOVO: INSERT em public_bookings com status='pending'
8. Real-time: subscreve no canal do booking para atualização de status
```

> 🟢 **CONFIRMADO** — `pages/PublicBooking.tsx:591-682`

#### Fila Digital — Fluxo Completo

```
QueueJoin: INSERT em queue_entries (status='waiting')
  ↓
QueueStatus: Subscreve real-time em queue_entries
  ↓ POLLING a cada 10s (fallback)
  ↓ get_queue_position RPC → position * 20min = estimativa
  ↓
QueueManagement:
  → chamar: UPDATE status='calling' + som
  → atender: UPDATE status='serving'
  → finalizar: criar client (se não existe) + INSERT appointment (status='Completed') + INSERT finance_record + UPDATE queue_entries status='completed'
  → não compareceu: UPDATE status='no_show'
```

> 🟢 **CONFIRMADO** — `pages/QueueManagement.tsx:103-304`, `pages/QueueJoin.tsx:109-135`, `pages/QueueStatus.tsx:58-134`

#### Disponibilidade de Horários (`get_available_slots`)

```
RPC que recebe: p_business_id, p_date, p_professional_id (null=any), p_duration_min
Retorna: { slots: string[] } — horários disponíveis em formato "HH:MM"
Lógica server-side: verifica appointments existentes + configurações de horário do negócio
```

> 🟢 **CONFIRMADO** — chamado em `components/appointment/ScheduleSelection.tsx` e `pages/PublicBooking.tsx`

#### Edição de Booking Público (`PublicBooking.handleEditBooking`)

```
1. Popula estado com dados do booking existente (serviços, profissional, data/hora)
2. Registra originalTimeISO para âncora de edição
3. Se is_edit=true: UPDATE public_bookings com novos dados
4. O Agenda.handleAcceptBooking detecta is_edit e busca appointment original por client_id + original_appointment_time
5. UPDATE do appointment existente em vez de INSERT novo
```

> 🟢 **CONFIRMADO** — `pages/PublicBooking.tsx:561-589`, `pages/Agenda.tsx:645-695`

---

### Algoritmos e Lógica

#### Cálculo de Preço com Desconto

```typescript
basePrice = sum of selected services prices
discountRate = parseFloat(discountPercentage) / 100
finalPrice = basePrice * (1 - (isNaN(discountRate) ? 0 : discountRate))
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:229-231`

#### Detecção de Desconto/Preço Customizado (Exibição)

```typescript
hasDiscount = apt.basePrice && apt.price < apt.basePrice
discountAmount = apt.basePrice - apt.price
discountPercentage = Math.round((discountAmount / apt.basePrice) * 100)
isCustomPriceHigher = apt.basePrice && apt.price > apt.basePrice
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:1074-1103`

#### Grid de Horários (8h às 20h30, intervalos de 30min)

```typescript
for (let hour = 8; hour <= 20; hour++) {
  timeSlots.push(`${hour}:00`);
  if (hour < 20) timeSlots.push(`${hour}:30`);
}
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:1040-1046`

#### Cálculo de Tempo Estimado na Fila

```typescript
seconds = position * 20 * 60
// Countdown regressivo, pode ir negativo
```

> 🟢 **CONFIRMADO** — `pages/QueueStatus.tsx:48-53`

#### Filtro de Timezone para Datas

```typescript
// URLs usam data em ISO; ao criar Date a partir de string, ajusta com timezoneOffset
const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:64-75`

#### Busca de Cliente por Telefone (3 formatos)

```typescript
// Na aceitação de booking, tenta 3 formatos de telefone:
rawPhone = booking.customer_phone
formattedPhoneBR = formatPhone(rawPhone, 'BR')
formattedPhonePT = formatPhone(rawPhone, 'PT')
orFilter = `phone.eq.${rawPhone},phone.eq.${formattedPhoneBR},phone.eq.${formattedPhonePT}`
```

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:546-551`

---

### Estruturas de Dados

#### Appointment (Interface local — Agenda.tsx)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK |
| client_id | string | FK clients.id |
| clientName | string | Nome do cliente (denormalizado) |
| clientPhone | string | Telefone (via join) |
| service | string | Nomes dos serviços separados por vírgula |
| appointment_time | string | ISO datetime |
| price | number | Preço final (após desconto) |
| status | string | Confirmed/Pending/Completed/Cancelled |
| professional_id | string\|null | FK team_members.id |
| basePrice | number? | Preço original (para cálculo de desconto) |
| notes | string? | Observações |
| payment_method | string\|null | Método de pagamento |

> 🟢 **CONFIRMADO** — `pages/Agenda.tsx:22-34`

#### PublicBooking — BusinessProfile (Interface local)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK (profiles.id) |
| business_name | string | Nome do estabelecimento |
| user_type | string | barber/beauty |
| google_rating | number | Rating Google |
| total_reviews | number | Total de reviews |
| phone | string | Telefone |
| enable_upsells | boolean | Flag de cross-sell |
| enable_professional_selection | boolean | Flag de escolha de profissional |
| region | string? | BR/PT |
| cover_photo_url | string? | Foto de capa |
| logo_url | string? | Logo |
| address_street | string? | Endereço |
| instagram_handle | string? | Instagram |

> 🟢 **CONFIRMADO** — `pages/PublicBooking.tsx:53-67`

#### QueueEntry (Tipo global)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK |
| business_id | string | FK profiles.id |
| client_id | string? | FK clients.id (null se sem cadastro) |
| client_name | string | Nome do cliente |
| client_phone | string | Telefone |
| service_id | string? | FK services.id |
| professional_id | string? | FK team_members.id |
| status | string | waiting/calling/serving/completed/cancelled/no_show |
| joined_at | string | ISO datetime |
| estimated_wait_time | number? | Minutos estimados |

> 🟢 **CONFIRMADO** — `types.ts`

#### Tabela `appointments` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| user_id | uuid | sim | FK profiles.id (owner) |
| client_id | uuid | sim | FK clients.id |
| professional_id | uuid | não | FK team_members.id |
| service | text | sim | Nomes separados por vírgula |
| appointment_time | timestamptz | sim | |
| price | numeric | sim | Preço final |
| status | text | sim | Confirmed/Pending/Completed/Cancelled |
| notes | text | não | |
| payment_method | text | não | |
| duration_minutes | integer | não | Default 30 |
| base_price | numeric | não | Para cálculo de desconto |
| received_by | uuid | não | FK team_members.id |
| completed_by | uuid | não | FK auth.users.id |
| machine_fee_percent | numeric | não | |
| machine_fee_amount | numeric | não | |
| public_booking_id | uuid | não | FK public_bookings.id |

> 🟡 **INFERIDO** — a partir dos campos acessados em múltiplos componentes

#### Tabela `public_bookings` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| business_id | uuid | sim | FK profiles.id |
| customer_name | text | sim | |
| customer_phone | text | sim | |
| customer_email | text | não | |
| customer_photo_url | text | não | |
| service_ids | uuid[] | sim | Array de FK services.id |
| professional_id | uuid | não | FK team_members.id (null = qualquer) |
| appointment_time | timestamptz | sim | |
| total_price | numeric | sim | |
| status | text | sim | pending/confirmed/cancelled |
| duration_minutes | integer | não | |
| is_edit | boolean | não | Flag de edição de reserva existente |
| original_appointment_time | timestamptz | não | Âncora para update do appointment original |
| updated_at | timestamptz | não | |

> 🟡 **INFERIDO** — a partir dos campos de INSERT/UPDATE em Agenda e PublicBooking

#### Tabela `queue_entries` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK (auto-generated) |
| business_id | uuid | sim | FK profiles.id |
| client_id | uuid | não | FK clients.id |
| client_name | text | sim | |
| client_phone | text | sim | Default '0000000000' |
| service_id | uuid | não | FK services.id |
| professional_id | uuid | não | FK team_members.id |
| status | text | sim | waiting/calling/serving/completed/cancelled/no_show |
| joined_at | timestamptz | sim | |

> 🟡 **INFERIDO** — a partir de QueueJoin INSERT e QueueManagement queries

---

### Metadados e Configurações

- **Dual theme**: `isBeauty` (userType === 'beauty') controla tema "silk" vs "obsidian"
- **Region-aware**: `region` (BR/PT) controla moeda (R$/€), métodos de pagamento, formatação de telefone
- **Time slots**: faixa 8:00-20:30, intervalos de 30 min
- **Queue countdown**: posição × 20 minutos
- **Real-time subscriptions**: `public_bookings_agenda`, `booking_status_{id}`, `queue_manage`, `queue_{id}`
- **WhatsApp deep links**: protocolo `https://wa.me/{phone}?text={message}`
- **Public booking edit**: parâmetro URL `?edit=BOOKING_ID` + `original_appointment_time`
- **Public booking rebook**: parâmetro URL `?rebook=serviceId1,serviceId2`
- **Professional slug**: `profiles.business_slug` para URLs públicas (`/book/:slug`, `/queue/:slug`)
- **Machine fee**: `business_settings.machine_fee_enabled`, `debit_fee_percent`, `credit_fee_percent`

---

### Regras de Negócio

1. **Dual booking system**: public_bookings (pendente) → appointments (confirmado). Owner aceita/rejeita.
2. **Auto-atribuição de profissional**: se 1 pro no time, atribui automaticamente; se múltiplos e "qualquer", usa `get_first_available_professional`.
3. **Prevenção de duplicata**: `get_active_booking_by_phone` RPC impede booking duplicado para mesmo telefone.
4. **Espelhamento de cliente público**: `mirror_public_client_to_crm` RPC sincroniza public_clients → clients (SECURITY DEFINER).
5. **Finalização de fila = criação de appointment + finance_record**: queue finish flow cria client (se necessário), appointment Completed e finance_record em sequência.
6. **Filtro de timezone**: datas vindas de URL são ajustadas com `getTimezoneOffset` para evitar erro de dia.
7. **Desconto/preço customizado**: basePrice (do serviço) vs price (final). Se price < basePrice → desconto. Se price > basePrice → preço customizado.
8. **Staff não pode cancelar appointment Completed**: guard em `handleCancelAppointment`.
9. **Checkout com taxa de maquininha**: calculada sobre preço final com percentuais diferentes para débito e crédito.
10. **Real-time updates**: Supabase Realtime (postgres_changes) mantém agenda, fila e status do booking atualizados.

---

### Dependências do Módulo

- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — useAuth (user, userType, region, role, companyId, businessName)
- `contexts/UIContext.tsx` — useUI (setModalOpen)
- `contexts/PublicClientContext.tsx` — usePublicClient (client, register, login)
- `utils/date.ts` — parseDate, formatDateForInput, combineDateAndTime
- `utils/formatters.ts` — formatCurrency, formatPhone, formatDuration, Region type
- `utils/Logger.ts` — logger
- `components/BrutalCard.tsx` — Card component
- `components/BrutalButton.tsx` — Button component
- `components/PhoneInput.tsx` — Phone input with region mask
- `components/SearchableSelect.tsx` — Search/select dropdown
- `@supabase/supabase-js` — Realtime channel, RPC calls
- `lucide-react` — Icons

---

> ⚠️ **Checkpoint:** Análise do módulo `agenda` concluída.

---

## Módulo: clients/crm

### Visão Geral

Sistema de gestão de clientes e CRM com duas facetas: (1) Lista de clientes do dono com sincronização automática de public_clients, criação, edição, soft delete, classificação (VIP/Novos/Inativo), tier de fidelidade e IA de reativação; (2) Portal de autoatendimento do cliente público (ClientArea) com autenticação via telefone, histórico de bookings, reagendamento e perfil. Inclui memória semântica (RAG com embeddings via Gemini) para preferências de clientes e diagnóstico AIOS para detecção de churn.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Clients.tsx` | Lista de clientes do dono — busca, filtros, criação manual, sincronização public_clients, WhatsApp, soft delete |
| `pages/ClientCRM.tsx` | Perfil individual do cliente — histórico, LTV, previsão de visita, notas com memória semântica, IA de reativação, edição, soft delete |
| `pages/ClientArea.tsx` | Portal do cliente público — autenticação via telefone, histórico de bookings, reagendamento, cancelamento, edição de perfil |
| `components/ClientBookingCard.tsx` | Card de booking individual no ClientArea — status, serviços, cancelamento, re-compra |
| `components/ClientWhatsAppFAB.tsx` | Botão flutuante WhatsApp no ClientArea |
| `components/AISemanticInsights.tsx` | Painel de insights semânticos do cliente — memória RAG com embeddings |
| `contexts/PublicClientContext.tsx` | Context de sessão do cliente público — login via telefone, registro, espelhamento para CRM |
| `hooks/useAIOSDiagnostic.ts` | Hook de diagnóstico AIOS — clientes em risco, gaps de agenda, receita recuperável |
| `hooks/useSemanticMemory.ts` | Hook de memória semântica — salvar/buscar memórias com embeddings via Gemini |
| `utils/tierSystem.ts` | Sistema de fidelidade — cálculo de tier, previsão de próxima visita |
| `utils/aiosCopywriter.ts` | Gerador de mensagens de reativação — frameworks ABT e StoryBrand |

---

### Fluxo de Controle

#### Sincronização de Clientes Públicos (`Clients.fetchClients`)

```
1. Busca todos os public_clients do negócio (business_id = effectiveUserId)
2. Busca clientes existentes (clients) com telefone preenchido
3. Para cada public_client com telefone:
   a. Compara telefone em 3 formatos (raw, finalização mútua)
   b. Se não encontrado em clients → marca para inserção
4. Insere novos clientes com:
   - loyalty_tier: 'Bronze'
   - total_visits: 0
   - notes: 'Registrado via link público'
   - photo_url: herdado do public_client
5. Busca appointments Completed para contar visitas reais
6. Merge: actual_visits = count(appointments Completed)
7. Filtra clientes inativos (is_active ≠ false)
```

> 🟢 **CONFIRMADO** — `pages/Clients.tsx:33-130`

#### Criação Manual de Cliente (`Clients.handleCreateClient`)

```
1. Validação: phone OU email obrigatório
2. Se tem foto: upload para bucket 'client_photos' com path {userId}/{timestamp}.{ext}
3. Se upload falha: alert, mas prossegue sem foto
4. INSERT em clients com:
   - loyalty_tier: 'Prata' se origin='Antigo', senão 'Bronze'
   - total_visits: 1 se 'Antigo', senão 0
   - notes: 'Cliente migrado de outro sistema' se 'Antigo', senão ''
5. Reset do form e refresh da lista
```

> 🟢 **CONFIRMADO** — `pages/Clients.tsx:143-214`

#### Perfil do Cliente — Carregamento (`ClientCRM.fetchClient`)

```
1. Chama RPC get_client_profile(p_client_id)
2. Recebe: client data, ltv, appointments_history, hair_history
3. Calcula totalVisits (length of appointments_history)
4. Calcula lastVisit (primeira appointment_data formatada)
5. Chama calculateNextVisitPrediction(appointments_history) para previsão
6. Popula estados: nome, telefone, email para edição
```

> 🟢 **CONFIRMADO** — `pages/ClientCRM.tsx:57-107`

#### Previsão de Próxima Visita (`calculateNextVisitPrediction`)

```
1. Se < 2 appointments: retorna 'Dados insuficientes'
2. Ordena appointments cronologicamente
3. Calcula média de dias entre visitas consecutivas
4. Adiciona média ao lastVisit → predictedDate
5. Compara com hoje:
   - Se passado: 'Atrasado'
   - Se hoje: 'Hoje'
   - Se amanhã: 'Amanhã'
   - Se ≤ 7 dias: '{n} dias'
   - Senão: data formatada 'dd MMM yyyy'
```

> 🟢 **CONFIRMADO** — `utils/tierSystem.ts:60-103`

#### WhatsApp de Reativação (`ClientCRM.handleWhatsAppClick`)

```
1. Se cliente está em risco (isAtRisk) e AIOS habilitado:
   a. Log da campanha via logCampaignActivity(clientId, agentName, 'reactivation_spark')
   b. Gera mensagem via generateReactivationMessage (ABT ou StoryBrand)
   c. Abre WhatsApp com mensagem personalizada
2. Senão: abre WhatsApp com mensagem vazia
```

> 🟢 **CONFIRMADO** — `pages/ClientCRM.tsx:159-186`

#### Mensagens de Reativação (AIOS Copywriter)

```
Segmentação POR LTV:
- LTV > R$500: StoryBrand framework (cliente = herói, negócio = guia)
- LTV ≤ R$500: ABT framework (And... But... Therefore...)

ABT: "Oi, {firstName}! Você sempre cuida do seu {lastService} com a gente E sua última visita foi incrível, MAS já faz {daysMissing} dias. PORTANTO, separei horários exclusivos."

StoryBrand: "{firstName}, você merece estar na sua melhor versão. No {businessName}, nosso plano é simples: {goal} e garantir que você saia incrível."
```

> 🟢 **CONFIRMADO** — `utils/aiosCopywriter.ts:14-49`

#### Memória Semântica (`useSemanticMemory.saveMemory`)

```
1. Gera embedding via Gemini (generateEmbedding)
2. INSERT em client_semantic_memory com:
   - client_id, observation, embedding, context_type ('style'|'preference'|'habit')
3. Busca: RPC match_client_memories(client_id, query_embedding, threshold=0.5, limit=5)
4. Retorna memórias similares com score de similaridade
```

> 🟢 **CONFIRMADO** — `hooks/useSemanticMemory.ts:20-79`

#### Portal do Cliente — Autenticação (`ClientArea` + `PublicClientContext`)

```
1. Passo 1 (phone): chama PublicClientContext.login(phone, businessId)
   a. RPC get_public_client_by_phone(p_business_id, p_phone)
   b. Se encontrado: seta client no state + localStorage
   c. Se não encontrado: exibe formulário de registro
2. Passo 2 (register): chama PublicClientContext.register(data)
   a. Verifica se já existe via RPC get_public_client_by_phone
   b. Se existe: UPDATE dados + espelhar para CRM via mirror_public_client_to_crm
   c. Se não existe: INSERT em public_clients
   d. Em ambos: espelhar para CRM via mirror_public_client_to_crm (SECURITY DEFINER)
   e. Se erro 23505 (unique constraint): tenta login como fallback
3. Armazena client em localStorage ('rhian_public_client')
4. Logout: remove client + localStorage
```

> 🟢 **CONFIRMADO** — `contexts/PublicClientContext.tsx:30-175`, `pages/ClientArea.tsx:158-207`

#### Histórico de Bookings do Cliente (`ClientArea.fetchBookings`)

```
1. RPC get_client_bookings_history(p_phone, p_business_id)
2. Real-time subscription no canal public_bookings_{phone}
   - UPDATE: atualiza status e appointment_time no estado local
3. Separa:
   - upcoming: status=pending/confirmed E data >= hoje
   - history: status=completed OU data < hoje (exceto cancelled)
4. Paginação: ITEMS_PER_PAGE = 8, lazy loading via "Carregar mais"
```

> 🟢 **CONFIRMADO** — `pages/ClientArea.tsx:96-148`, `components/ClientBookingCard.tsx`

#### Cancelamento de Booking pelo Cliente (`ClientBookingCard.handleCancel`)

```
1. UPDATE public_bookings SET status='cancelled' WHERE id=bookingId
2. Atualiza estado local via callback onCancelled
```

> 🟢 **CONFIRMADO** — `components/ClientBookingCard.tsx:87-102`

---

### Algoritmos e Lógica

#### Sistema de Tiers de Fidelidade

```typescript
Bronze:   0-5 visitas    → text-amber-700
Silver:   6-15 visitas   → text-gray-400
Gold:     16-30 visitas  → text-accent-gold
Platinum: 31+ visitas    → text-white
```

> 🟢 **CONFIRMADO** — `utils/tierSystem.ts:14-47`

#### Classificação de Clientes (Filtros)

```typescript
VIP:     actual_visits >= 5
Novos:   actual_visits > 0 && < 5
Inativo: actual_visits === 0
Todos:   sem filtro
```

> 🟢 **CONFIRMADO** — `pages/Clients.tsx:218-229`

#### Soft Delete de Cliente

```
UPDATE clients SET is_active = false WHERE id = clientId AND user_id = ownerId
– Preserva histórico financeiro e appointments
– Clientes inativos são filtrados na listagem (neq is_active, false)
```

> 🟢 **CONFIRMADO** — `pages/ClientCRM.tsx:216-239`

#### Deduplicação de Telefones (Sincronização)

```
Para cada public_client.phone:
  phoneRaw = pc.phone.replace(/\D/g, '')
  Para cada existing.phone:
    existingRaw = existing.phone.replace(/\D/g, '')
    Se existingRaw === phoneRaw → duplicata
    Se ambos tem >= 8 dígitos E um termina com o outro → duplicata
```

> 🟢 **CONFIRMADO** — `pages/Clients.tsx:49-66`

---

### Estruturas de Dados

#### Tabela `clients` (atualizada com campos adicionais)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| user_id | uuid | sim | FK profiles.id (owner). RLS filter |
| name | text | sim | Nome completo |
| phone | text | não | Telefone (múltiplos formatos, deduplicação flexível) |
| email | text | não | Email |
| photo_url | text | não | URL da foto (storage bucket: client_photos) |
| loyalty_tier | text | não | Bronze/Silver/Gold/Platinum. Default: 'Bronze' |
| total_visits | integer | não | Contador de visitas (0 para novos, 1 para migrados) |
| notes | text | não | Observações do profissional |
| source | text | não | Fonte: 'manual', 'agendamento_online'. Default: 'manual' |
| rating | numeric | não | Rating do cliente (0-5 estrelas) |
| is_active | boolean | não | Soft delete. Default: true |
| company_id | uuid | não | FK profiles.id (owner). Para RLS multi-tenant |
| last_visit | timestamptz | não | Data da última visita |
| hair_history | text | não | Histórico capilar (legacy) |
| created_at | timestamptz | não | now() |
| updated_at | timestamptz | não | now() |

> 🟢 **CONFIRMADO** — clients table + migrations 20260405, 20260318

Constraint única: `clients_user_id_phone_unique` ON (user_id, phone)

#### Tabela `public_clients`

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| business_id | uuid | sim | FK profiles.id (owner). ON DELETE CASCADE |
| name | varchar(255) | sim | Nome do cliente público |
| phone | varchar(50) | sim | Telefone. UNIQUE(business_id, phone) |
| email | varchar(255) | não | Email |
| photo_url | text | não | URL da foto |
| google_id | varchar(255) | não | OAuth Google ID |
| last_booking_at | timestamptz | não | Última reserva |
| created_at | timestamptz | não | now() |

> 🟢 **CONFIRMADO** — migration 20260218_professional_booking_system.sql

#### Tabela `client_semantic_memory`

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK |
| client_id | uuid | sim | FK clients.id. RLS: company isolation |
| observation | text | sim | Texto da observação/preferência |
| embedding | vector | sim | Embedding gerado via Gemini |
| context_type | text | não | 'style' \| 'preference' \| 'habit' |
| created_at | timestamptz | não | now() |

> 🟡 **INFERIDO** — a partir de `hooks/useSemanticMemory.ts` + migration 20260318

#### Interface `AIOSDiagnostic`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| recoverable_revenue | number | Receita recuperável total |
| at_risk_clients | Array | Clientes em risco de churn |
| agenda_gaps | Array | Gaps na agenda |
| diagnostic_date | string | Data do diagnóstico |

> 🟡 **INFERIDO** — `hooks/useAIOSDiagnostic.ts`

#### Interface `ClientBooking` (ClientArea)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK |
| appointment_time | string | ISO datetime |
| status | string | pending/confirmed/completed/cancelled |
| service_ids | string[] | IDs dos serviços |
| service_names | string[] | Nomes dos serviços |
| professional_id | string\|null | FK team_members.id |
| professional_name | string\|null | Nome do profissional |
| total_price | number | Preço total |
| duration_minutes | number | Duração em minutos |
| created_at | string | ISO datetime |

> 🟢 **CONFIRMADO** — `components/ClientBookingCard.tsx:10-21`

---

### Metadados e Configurações

- **Tier tiers**: Bronze (0-5), Silver (6-15), Gold (16-30), Platinum (31+)
- **Filtro de clientes**: VIP (≥5 visitas), Novos (1-4), Inativo (0), Todos
- **Storage bucket**: `client_photos` — fotos de perfil dos clientes
- **LocalStorage key**: `rhian_public_client` — sessão do cliente público
- **AIOS flag**: `aiosEnabled` do AuthContext controla funcionalidades de IA
- **AIOS RPCs**: `get_aios_diagnostic`, `log_aios_campaign`
- **Gemini embeddings**: `generateEmbedding()` em `lib/gemini.ts`
- **RLS em client_semantic_memory**: isolamento por company_id via subquery em clients

---

### Regras de Negócio

1. **Sincronização automática**: public_clients são espelhados para clients via fetchClients (client-side) e mirror_public_client_to_crm (RPC SECURITY DEFINER)
2. **Deduplicação flexível**: comparação de telefones ignora formatação e sufixos de país (55/351)
3. **Soft delete**: clientes desativados (is_active=false) são filtrados na listagem mas preservam histórico financeiro
4. **Tier automático**: cliente migrado de outro sistema começa como 'Prata' com 1 visita para não ser classificado como inativo
5. **Previsão de visita**: algoritmo baseado na média de intervalos entre visitas consecutivas
6. **Reativação AIOS**: clientes em risco (at_risk_clients) recebem mensagens personalizadas por WhatsApp — framework ABT (LTV ≤ 500) ou StoryBrand (LTV > 500)
7. **Memória semântica**: observações salvas com embeddings permitem busca por similaridade (threshold 0.4-0.5) para resgatar preferências passadas
8. **ClientArea auth**: tela de telefone → se não existe, formulário de registro → espelhamento automático para CRM
9. **Self-rescheduling**: controlado por `business_settings.enable_self_rescheduling` (default: true)
10. **Unique constraint**: `clients_user_id_phone_unique` ON (user_id, phone) garante unicidade de cliente por negócio

---

### Dependências do Módulo

- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — useAuth (user, userType, region, companyId, businessName, aiosEnabled)
- `contexts/PublicClientContext.tsx` — usePublicClient (client, login, register, logout)
- `hooks/useAIOSDiagnostic.ts` — useAIOSDiagnostic (diagnostic, logCampaignActivity)
- `hooks/useSemanticMemory.ts` — useSemanticMemory (saveMemory, searchMemories)
- `utils/tierSystem.ts` — calculateTier, getTierConfig, calculateNextVisitPrediction
- `utils/aiosCopywriter.ts` — generateReactivationMessage, getWhatsAppUrl
- `utils/formatters.ts` — formatCurrency, formatPhone
- `lib/gemini.ts` — generateEmbedding
- `components/BrutalCard.tsx`, `components/BrutalButton.tsx` — UI components
- `components/PhoneInput.tsx` — Phone input with region mask
- `lucide-react` — Icons

---

> ⚠️ **Checkpoint:** Análise do módulo `clients/crm` concluída.

---

## Módulo: dashboard

### Visão Geral

Dashboard principal do sistema Agendix, com visão dual (owner vs staff). Para owners: exibe saudação personalizada, receita do dia, agenda de hoje, meta mensal, saúde do negócio (Financial Doctor), oportunidades de ação, setup copilot, campanhaes AIOS, smart rebooking, e múltiplos modais (meta, histórico de lucros, todos os agendamentos). Para staff: exibe widget "Meu Dia" com agendamentos do profissional e card de ganhos. Inclui sistema de data maturity progressivo, tour guiado (driver.js), banners contextuais (comissões, atendimentos não concluídos), e componente de diagnóstico AIOS.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Dashboard.tsx` | Página principal do dashboard — orquestra widgets, banners, modais e condicional owner/staff |
| `hooks/useDashboardData.ts` | Hook central de dados — fetch de appointments, stats, goal, profit, actions, data maturity, financial doctor |
| `components/dashboard/DashboardHero.tsx` | Header com saudação, avatar, badge de receita recuperável AIOS, botões de estratégia e agendar |
| `components/dashboard/ProfitMetrics.tsx` | Card de receita do dia — mostra todayRevenue, com card de aprendizado se sem dados |
| `components/dashboard/ActionCenter.tsx` | Centro de ações — lista oportunidades do dia (recovery, gap, upsell) geradas pela RPC get_dashboard_actions |
| `components/dashboard/MeuDiaWidget.tsx` | Widget do staff — lista do dia com 1-touch complete, resumo (concluídos/pendentes/faturamento) |
| `components/dashboard/SetupCopilot.tsx` | Guia de setup progressivo — 6 steps (serviços, equipe, clientes, horários, link, primeiro agendamento) |
| `components/dashboard/BusinessHealthCard.tsx` | Card de saúde do negócio — ticket médio, taxa de retorno, churn risk, serviço mais pedido |
| `components/dashboard/SmartRebooking.tsx` | Smart rebooking — sugere clientes para chamar de volta com base na cadência preditiva |
| `components/dashboard/FinancialDoctorPanel.tsx` | Painel do Financial Doctor — score de saúde, insights contextuais, gauge visual |
| `components/dashboard/DataMaturityBadge.tsx` | Badge de maturidade de dados — progresso circular, itens desbloqueados, mensagem contextual |
| `components/dashboard/ComandoDoDia.tsx` | Comando do dia — saudação, mensagem contextual, quick stats com navegação |
| `components/dashboard/AIOSDiagnosticCard.tsx` | Card de diagnóstico AIOS — clientes em risco, receita recuperável, CTA para CRM |
| `components/dashboard/AIOSCampaignStats.tsx` | Estatísticas de campanhas AIOS — mensagens enviadas, receita recuperada |
| `components/dashboard/modals/GoalSettingsModal.tsx` | Modal de configuração de meta mensal |
| `components/dashboard/modals/MonthlyProfitModal.tsx` | Modal de histórico de lucro mensal (12 meses via get_finance_stats) |
| `components/dashboard/modals/AllAppointmentsModal.tsx` | Modal com todos os agendamentos futuros |
| `components/dashboard/modals/GoalHistoryModal.tsx` | Modal de histórico de metas mensais |
| `components/dashboard/modals/AIOSStrategyModal.tsx` | Modal de playbook AIOS — 3 dicas de crescimento |
| `hooks/useMeuDiaData.ts` | Hook do widget Meu Dia — fetch appointments do dia por profissional, 1-touch complete |
| `hooks/useSmartRebooking.ts` | Hook de smart rebooking — calcula cadência preditiva de retorno dos clientes |
| `hooks/useFinancialDoctor.ts` | Hook do Financial Doctor — calcula health score e gera insights contextuais |
| `hooks/useAppTour.ts` | Hook de tour guiado — driver.js com contexto (dashboard/agenda/settings) |

---

### Fluxo de Controle

#### Busca de Dados do Dashboard (`useDashboardData`)

```
1. useEffect on [user]:
   a. Busca profile (business_slug, monthly_goal) e goal_settings (mês atual) em paralelo
   b. Effective goal = goal_settings.monthly_goal ?? profile.monthly_goal ?? 15000
   c. Busca próximos 5 appointments (Confirmed, future, ordered by time)
   d. Em paralelo:
      - RPC get_dashboard_stats(p_user_id) → stats (profit, growth, maturity, doctor)
      - RPC get_dashboard_actions(p_user_id) → action items (non-fatal se falhar)
      - Query appointments Completed do dia → todayRevenue
   e. Popula estados: profit, currentMonthRevenue, weeklyGrowth, profitMetrics,
      dataMaturity, financialDoctor, actionItems
2. fetchGoalHistory (em paralelo com fetchData):
   a. Para cada um dos últimos 6 meses:
      - RPC get_finance_stats(p_user_id, startOfMonth, endOfMonth) → revenue
      - Query goal_settings (month, year) → goal
      - Calcula percentage e success
```

> 🟢 **CONFIRMADO** — `hooks/useDashboardData.ts:74-248`

#### Meta Mensal — Upsert (`updateGoal`)

```
1. Upsert em goal_settings: {user_id, month, year, monthly_goal}
   ON CONFLICT (user_id, month, year)
2. UPDATE profiles SET monthly_goal = newGoal WHERE id = user.id
3. Atualiza estado local
```

> 🟢 **CONFIRMADO** — `hooks/useDashboardData.ts:250-273`

#### Widget Meu Dia — Staff (`useMeuDiaData`)

```
1. Busca appointments do dia filtrados por professional_id (teamMemberId ?? user.id)
   - user_id = ownerId (companyId ?? user.id)
   - professional_id = teamMemberId ?? user.id
   - appointment_time entre 00:00 e 23:59 do dia atual
   - Ordenado por appointment_time ASC
2. Calcula resumo:
   - completed: appointments com status Completed/Concluído
   - pending: appointments com status Confirmed/Confirmado
   - dailyEarnings: soma de price dos completed
3. markAsCompleted (1-touch):
   - Optimistic update visual (status → Completed)
   - UPDATE appointments SET status='Completed' WHERE id
   - Em erro: reverte estado
   - Recarrega totais
```

> 🟢 **CONFIRMADO** — `hooks/useMeuDiaData.ts:30-131`

#### Smart Rebooking (`useSmartRebooking`)

```
1. Busca todos os appointments (Confirmed/Completed/Done) com join clients
2. Agrupa por client_id, calcula:
   - visits: lista de datas de visitas
   - totalSpent: soma de total_price
3. Para cada cliente com ≥2 visitas:
   a. Calcula intervalo médio entre visitas (avgCadence)
   b. Calcula daysSinceLastVisit
   c. Calcula daysUntilSuggested = avgCadence - daysSinceLastVisit
   d. Se daysUntil <= 5:
      - urgency 'now' se daysUntil <= -5
      - urgency 'soon' se daysUntil <= 0
      - urgency 'upcoming' se daysUntil > 0
4. Ordena: agora > em breve > próximamente, depois por daysUntilSuggested
```

> 🟢 **CONFIRMADO** — `hooks/useSmartRebooking.ts:29-143`

#### Financial Doctor — Score (`calculateHealthScore`)

```
Base: 50 pontos (neutro)
+ até 20 por crescimento semanal (>10: +20, >0: +10, <-10: -20, <0: -10)
+ até 15 por taxa de retorno (≥50%: +15, ≥25%: +8, <10%: -5)
- risco de churn (≥5: -15, ≥2: -8)
+ até 15 por progresso na meta (≥100%: +15, ≥70%: +8, ≥50%: +3, <25%: -5) [vírgula corrigida]
+ até 5 por volume (≥30 services: +5, ≥15: +2)
Clamp para [0, 100]
Se dataMaturityScore < 30: retorna 0
```

> 🟢 **CONFIRMADO** — `hooks/useFinancialDoctor.ts:15-57`

#### Financial Doctor — Insights (`generateInsights`)

```
Gera até 5 insights ordenados por impacto (high > medium > low):
- Churn risk ≥ 2 + maturity ≥ 25 → "N clientes sumidos" (risk, high)
- Crescimento > 5% + account ≥ 14 dias → "Crescendo X%" (achievement)
- Crescimento < -10% + account ≥ 14 dias → "Faturamento caiu X%" (risk, high)
- Meta ≥ 100% → "Meta atingida!" (achievement)
- Meta ≥ 70% → "Faltam R$ X" (opportunity)
- Meta < 30% + account ≥ 14 dias → "Meta em risco" (risk, high)
- RepeatClientRate < 20% + ≥ 10 appointments → "Poucos clientes voltando" (opportunity, high)
- RepeatClientRate ≥ 50% → "X% de fidelidade" (achievement)
- AvgTicket < 50 + ≥ 10 appointments → "Ticket médio pode crescer" (opportunity)
- CampaignsSent === 0 + ≥ 5 appointments → "IA ociosa" (opportunity, high)
- TopService exists + ≥ 10 completions → "Serviço em destaque" (opportunity, low)
```

> 🟢 **CONFIRMADO** — `hooks/useFinancialDoctor.ts:59-217`

#### Setup Copilot (`SetupCopilot`)

```
1. Verifica progresso via getSetupStatus(user.id):
   - hasServices, hasTeam, hasClients, hasBusinessHours, hasBookingSlug, hasAppointments, isActivated
2. Step "booking" auto-completa ao clicar (localStorage flag)
3. Se allDone: UPDATE profiles SET setup_completed=true, activation_completed=true, activated_at=now()
4. Detecta último step visitado via getOnboardingProgress para oferecer retomada
5. Se já ativado: oculta automaticamente
6. Escuta evento custom 'setup-step-completed' para re-checar progresso
```

> 🟢 **CONFIRMADO** — `components/dashboard/SetupCopilot.tsx:54-162`

#### Tour Guiado (`useAppTour`)

```
1. Auto-start: dashboard se sem tour_completed em localStorage
2. Contextos: dashboard (8 steps), agenda (3 steps), settings (3 steps)
3. Transição entre contextos via navigate + localStorage (tour_step_${userId})
4. Persiste tour_completed_${userId} em localStorage ao completar
5. Usa driver.js com tema customizado (isBeauty → neon, default → gold)
```

> 🟢 **CONFIRMADO** — `hooks/useAppTour.ts:29-289`

#### Banner de Comissões (Dashboard)

```
1. Busca business_settings.commission_settlement_day_of_month
2. Se hoje === settlementDay - 1 (ou dia anterior ao dia 1): exibe banner amarelo
3. Apenas para owner (não staff)
4. Navega para /finance ao clicar
```

> 🟢 **CONFIRMADO** — `pages/Dashboard.tsx:52-67`

#### Banner de Atendimentos Não Concluídos

```
1. Apenas após 20h
2. Query appointments do dia (user_id, hoje, status ≠ Completed e ≠ Cancelled)
3. Se count > 0: exibe banner laranja
4. Navega para /agenda ao clicar
```

> 🟢 **CONFIRMADO** — `pages/Dashboard.tsx:70-86`

---

### Algoritmos e Lógica

#### Data Maturity Score (Calculado na RPC get_dashboard_stats)

```typescript
// Os fatores exatos são computed server-side, mas os thresholds usados no frontend:
appointmentsTotal < 5 → "X agendamentos para desbloquear métricas avançadas"
accountDaysOld < 14 → "X dias para comparativos semanais"
score >= 75 → "Dados Maduros" (badge oculto)
score >= 50 → "Em Crescimento"
score >= 25 → "Em Aprendizado"
score < 25 → "Início de Jornada"
```

> 🟡 **INFERIDO** — `hooks/useDashboardData.ts:7-13`, `components/dashboard/DataMaturityBadge.tsx:11-16`

#### Health Score do Financial Doctor

```typescript
// Score 0-100, base 50
// Cálculo detalhado em generateInsights acima
// Labels:
// score >= 80 → "Saúde Excelente" (verde)
// score >= 60 → "Saúde Boa" (azul)
// score >= 40 → "Atenção Necessária" (amarelo)
// score < 40 → "Intervenção Urgente" (vermelho)
// score < 30 (data maturity) → não exibe dados
```

> 🟢 **CONFIRMADO** — `hooks/useFinancialDoctor.ts:15-57`, `components/dashboard/FinancialDoctorPanel.tsx`

#### Cadência Preditiva de Retorno (Smart Rebooking)

```typescript
// Para cada cliente com ≥2 visitas:
avgCadence = média dos intervalos entre visitas consecutivas (em dias)
daysSince = (hoje - última visita) em dias
daysUntil = avgCadence - daysSince
// Filtrar: daysUntil <= 5
// Urgência: <= -5 → 'now', <= 0 → 'soon', > 0 → 'upcoming'
```

> 🟢 **CONFIRMADO** — `hooks/useSmartRebooking.ts:82-131`

---

### Estruturas de Dados

#### ProfitMetricsData (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| totalProfit | number | Lucro total (RPC) |
| recoveredRevenue | number | Receita recuperada via campanhas |
| avoidedNoShows | number | Faltas evitadas |
| filledSlots | number | Vagas preenchidas |
| weeklyGrowth | number | Crescimento semanal (%) |
| campaignsSent | number | Campanhas enviadas |
| currentMonthRevenue | number | Receita do mês atual |
| monthScheduledValue | number | Valor agendado do mês |
| todayRevenue | number | Receita do dia (calculada client-side) |

> 🟢 **CONFIRMADO** — `hooks/useDashboardData.ts:16-25`

#### DataMaturity (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| appointmentsTotal | number | Total de agendamentos |
| appointmentsThisMonth | number | Agendamentos este mês |
| completedThisMonth | number | Completados este mês |
| hasPublicBookings | boolean | Tem bookings públicos |
| accountDaysOld | number | Idade da conta em dias |
| score | number | Score de maturidade 0-100 |

> 🟢 **CONFIRMADO** — `hooks/useDashboardData.ts:7-13`

#### FinancialDoctorData (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| avgTicket | number | Ticket médio por atendimento |
| churnRiskCount | number | Clientes em risco de churn |
| topService | string | Serviço mais pedido |
| repeatClientRate | number | Taxa de retorno (%) |

> 🟢 **CONFIRMADO** — `hooks/useDashboardData.ts:28-32`

#### FinancialInsight (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador único do insight |
| category | 'growth' \| 'risk' \| 'opportunity' \| 'achievement' | Categoria do insight |
| title | string | Título curto |
| description | string | Descrição detalhada |
| action | string | Ação sugerida (opcional) |
| impact | 'high' \| 'medium' \| 'low' | Nível de impacto |
| value | string | Valor monetário ou percentual (opcional) |

> 🟢 **CONFIRMADO** — `hooks/useFinancialDoctor.ts:4-12`

#### RebookingSuggestion (Interface)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| clientId | string | ID do cliente |
| clientName | string | Nome do cliente |
| clientPhone | string | Telefone |
| avgCadenceDays | number | Intervalo médio entre visitas |
| daysSinceLastVisit | number | Dias desde a última visita |
| daysUntilSuggested | number | Dias até a sugestão de contato |
| urgency | 'now' \| 'soon' \| 'upcoming' | Nível de urgência |
| avgTicket | number | Ticket médio |
| totalVisits | number | Total de visitas |
| lastVisitDate | string | Data da última visita |

> 🟢 **CONFIRMADO** — `hooks/useSmartRebooking.ts:6-17`

#### ActionItem (Tipo global)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | Identificador |
| type | 'recovery' \| 'gap' \| 'upsell' | Tipo de ação |
| title | string | Título da ação |
| description | string | Descrição |
| time | string | Horário (opcional) |

> 🟡 **INFERIDO** — `components/dashboard/ActionCenter.tsx`

#### Tabela `goal_settings` (inferida do código)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| user_id | uuid | sim | FK profiles.id |
| month | integer | sim | Mês (0-11) |
| year | integer | sim | Ano |
| monthly_goal | numeric | sim | Valor da meta mensal |

> 🟡 **INFERIDO** — `hooks/useDashboardData.ts:88-89,257-264`
> Unique constraint: (user_id, month, year)

#### Tabela `business_settings` (campos usados no dashboard)

| Campo | Tipo | Observação |
|-------|------|------------|
| commission_settlement_day_of_month | integer | Dia do mês para pagamento de comissões (1-28) |
| onboarding_completed | boolean | Flag de onboarding completo |

> 🟡 **INFERIDO** — `pages/Dashboard.tsx:56-60`, `components/dashboard/SetupCopilot.tsx`

---

### Metadados e Configurações

- **Data Maturity Guard**: funcionalidades avançadas só aparecem quando score ≥ threshold (30 para doctor, 50 para campanhas, 75 para badge oculto)
- **Effective user ID**: `companyId ?? user.id` — staff usa owner ID para queries
- **RPC get_dashboard_stats**: retorna total_profit, current_month_revenue, weekly_growth, recovered_revenue, avoided_no_shows, filled_slots, campaigns_sent, appointments_total, appointments_this_month, completed_this_month, has_public_bookings, account_days_old, data_maturity_score, avg_ticket, churn_risk_count, top_service, repeat_client_rate, month_scheduled_value
- **RPC get_dashboard_actions**: retorna action items com id, type, title, description, time
- **RPC get_finance_stats**: recebe p_user_id, p_start_date, p_end_date → retorna revenue, expenses, profit
- **Goal default**: 15000 se sem meta configurada
- **Goal storage**: goal_settings (prioridade) > profiles.monthly_goal (fallback)
- **Dual theme**: isBeauty (userType === 'beauty') controla tema e cores
- **Region-aware**: region (BR/PT) controla moeda e formatação
- **Staff mode**: dashboard simplificado com MeuDiaWidget + StaffEarningsCard
- **Tour**: driver.js com localStorage persistence (tour_completed_${userId}, tour_step_${userId})
- **Smart Notifications**: componente SmartNotificationsBanner injetado no topo
- **Optimistic UI**: markAsCompleted em MeuDiaWidget reverte em caso de erro

---

### Regras de Negócio

1. **Dual dashboard**: owner vê dashboard completo; staff vê MeuDiaWidget + ganhos próprios
2. **Banner de comissões**: exibido 1 dia antes do settlement day, apenas para owner, com link para /finance
3. **Banner de não concluídos**: exibido após 20h, apenas se houver appointments não Completed/Cancelled no dia
4. **Data Maturity**: funcionalidades desbloqueadas progressivamente baseadas no score (0-100)
5. **Goal cascade**: goal_settings.monthly_goal > profiles.monthly_goal > 15000 (default)
6. **Financial Doctor**: health score base 50, ajustado por crescimento, retorno, churn, meta, volume
7. **Smart Rebooking**: clientes com ≥2 visitas e cadência próxima ou ultrapassada são sugeridos para contato via WhatsApp
8. **Setup Copilot**: 6 steps progressivos, auto-completa ao navegar, persiste onboarding progress em getOnboardingProgress/saveOnboardingStep, marca activation_completed quando todos steps completos
9. **1-touch complete**: staff pode marcar appointment como Completed com um toque, optimistic update com rollback
10. **Monthly Profit Modal**: busca 12 meses de dados via get_finance_stats, calcula growth% vs mês anterior
11. **Goal History**: busca 6 meses de histórico, calcula percentage e success por mês

---

### Dependências do Módulo

- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — useAuth (user, userType, region, role, companyId, businessName, fullName, avatarUrl, aiosEnabled)
- `contexts/AlertsContext.tsx` — useAlerts (alerts)
- `hooks/useDashboardData.ts` — useDashboardData (appointments, profit, profitMetrics, dataMaturity, financialDoctor, actionItems, goalHistory, updateGoal)
- `hooks/useMeuDiaData.ts` — useMeuDiaData (appointments, summary, markAsCompleted, fetchAllAppointments)
- `hooks/useSmartRebooking.ts` — useSmartRebooking (suggestions, loading)
- `hooks/useFinancialDoctor.ts` — useFinancialDoctor (healthScore, insights, healthLabel, hasData)
- `hooks/useAIOSDiagnostic.ts` — useAIOSDiagnostic (diagnostic, loading)
- `hooks/useAppTour.ts` — useAppTour (startTour)
- `lib/onboarding.ts` — getOnboardingProgress, saveOnboardingStep, getSetupStatus
- `utils/formatters.ts` — formatCurrency, Region type
- `utils/Logger.ts` — logger
- `components/BrutalCard.tsx` — Card component
- `components/BrutalButton.tsx` — Button component
- `components/SkeletonLoader.tsx` — Skeleton component
- `components/SmartNotifications.tsx` — SmartNotificationsBanner
- `components/HelpButtons.tsx` — InfoButton
- `components/StaffEarningsCard.tsx` — Earnings card for staff
- `components/Modal.tsx` — Modal component
- `lucide-react` — Icons
- `driver.js` — Tour library

---

> ⚠️ **Checkpoint:** Análise do módulo `dashboard` concluída.

---

## Módulo: finance

### Visão Geral

Sistema financeiro completo com visão dual (owner/staff), gestão de comissões por profissional, registro manual de receitas/despesas, taxas de maquininha, assinaturas Stripe, insights avançados e exportação CSV. Owner vê dashboard financeiro completo; staff vê apenas seus próprios atendimentos e ganhos.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Finance.tsx` | Página principal financeira — tabs: Visão Geral, Insights, Comissões, Histórico |
| `components/CommissionsManagement.tsx` | Gestão de comissões — pendentes, pagas, liquidação, cálculo de período |
| `components/CommissionDetailReport.tsx` | Relatório detalhado por profissional com taxa de maquininha |
| `components/CommissionPaymentHistory.tsx` | Histórico de pagamentos de comissões por profissional |
| `components/CommissionShareModal.tsx` | Compartilhamento de resumo via WhatsApp/cópia/imagem |
| `components/ProfessionalCommissionDetails.tsx` | Detalhes de serviços e comissões por profissional com edição inline |
| `components/FinanceInsights.tsx` | Insights financeiros — projeção, taxa de retorno, horário de pico, ranking |
| `components/MonthlyHistory.tsx` | Histórico mensal de receita/despesa/lucro com growth% |
| `pages/settings/CommissionsSettings.tsx` | Config: dia de acerto, taxa de comissão por profissional, taxa maquininha |
| `pages/settings/SubscriptionSettings.tsx` | Página de assinatura Stripe — planos Solo/Team, checkout |
| `pages/settings/FinancialSettings.tsx` | Config simplificada de taxa de maquininha (débito/crédito) |
| `hooks/useSubscription.ts` | Hook de status de assinatura (trial, ativa, expirada) |
| `supabase/functions/create-checkout-session/index.ts` | Edge Function Stripe — cria checkout session |
| `pages/StaffInsights.tsx` | Card de ganhos do staff (total de comissões) |

---

### Fluxo de Controle

#### fetchFinanceData (`Finance.tsx:127-233`)
1. Calcula `startOfMonth` e `endOfMonth` com base no mês/ano selecionado
2. Usa `companyId` (owner) ou `user.id` (owner) para query multi-tenant; staff usa owner ID
3. Chama RPC `get_finance_stats(p_user_id, p_start_date, p_end_date)` para obter dados consolidados
4. Se owner: chama novamente com mês anterior para calcular growth%
5. Mapeia transações: tipo `revenue`/`expense`; despesas: `commission_paid === true` = pago
6. Staff: filtra apenas transações do próprio `fullName` e recalcula resumo local
7. Filtros client-side: `filterType` e `filterPaymentMethod`

#### fetchMonthlyHistory (`Finance.tsx:236-279`)
1. Chama RPC `get_monthly_finance_history(p_user_id, p_months_count: 12)`
2. Traduz nomes de mês para pt-BR
3. Calcula growth% mês a mês (revenue[n] / revenue[n-1] - 1)

#### handleCreateTransaction (`Finance.tsx:402-471`)
1. Cria registro manual em `finance_records` via INSERT direto
2. Despesas: `type: 'expense'`, `commission_value: amount`, `commission_rate: 0`
3. Receitas: `type: 'revenue'`, default `payment_method: 'Dinheiro'`
4. Despesas pendentes: `commission_paid: false`, `due_date` preenchido
5. Despesas pagas: `commission_paid: true`, `commission_paid_at: now`

#### handleDeleteTransaction (`Finance.tsx:281-332`)
1. Verifica se a transação existe em `finance_records`
2. Se sim e tem `appointment_id`: deleta também o appointment vinculado (cascade)
3. Se não está em `finance_records`: é receita automática de agendamento → deleta da tabela `appointments`
4. Always filtra por `user_id` ( garantir ownership)

#### Comissões — fetchCommissionsDue (`CommissionsManagement.tsx:142-178`)
1. RPC `get_commissions_due(p_user_id)` retorna métricas por profissional
2. Faz query em `team_members` para buscar CPF de cada profissional
3. Filtra `is_owner === false` (owner não aparece na lista de pendentes)
4. Exibe: saldo atual, faturação do mês, liquidado, serviços pendentes

#### Comissões — handlePayCommissions (`CommissionsManagement.tsx:287-316`)
1. RPC `mark_commissions_as_paid(p_user_id, p_professional_id, p_amount, p_start_date, p_end_date)`
2. Marca todas as `finance_records` do profissional no período como `commission_paid: true`
3. Cria registro na tabela `commission_payments` com `status: 'paid'`

#### Comissões — calcCommissionPeriod (`CommissionsManagement.tsx:46-71`)
- Algoritmo: dado `settlementDay` (ex: 5), se hoje > dia 5, período é (5+1 do mês passado) até (5 deste mês)
- Se hoje <= dia 5, período é (5+1 de 2 meses atrás) até (5 do mês passado)

#### Comissões — calculateAmountForDates (`CommissionsManagement.tsx:266-285`)
- Soma `commission_value` de `finance_records` where `professional_id`, `type='revenue'`, `commission_paid=false`, data within range
- Permite ao owner ajustar o valor manualmente no modal de pagamento

#### CommissionDetailReport — fetchRecords (`CommissionDetailReport.tsx:57-108`)
1. Query em `finance_records` + JOIN com `appointments` (para `machine_fee_percent`)
2. Calcula `commission_base = amount - machine_fee_amount` (se maquininha habilitada)
3. `commission_value = commission_base * commission_rate / 100`

#### handleSaveInlineRate (`CommissionsManagement.tsx:236-264`)
- Se profissional sem `commission_rate`, exibe prompt inline para definir%
- Salva em `team_members.commission_rate`

#### Comissões — handleUpdateCommission (`ProfessionalCommissionDetails.tsx:152-208`)
- Edição inline de comissão de serviço individual
- Se `finance_record_id` existe: RPC `update_commission_record(p_record_id, p_new_value, p_new_rate)`
- Se não existe (auto-repair): INSERT em `finance_records` com dados do appointment

#### Assinatura — handleSubscribe (`SubscriptionSettings.tsx:74-100`)
1. Chama Edge Function `create-checkout-session` via `supabase.functions.invoke`
2. Envia `priceId`, `successUrl`, `cancelUrl`, `mode: 'subscription'`

#### Stripe Checkout — Edge Function (`create-checkout-session/index.ts`)
1. Verifica `STRIPE_SECRET_KEY`
2. Autentica via `supabaseClient.auth.getUser()`
3. Verifica se `profiles.stripe_customer_id` existe
4. Se não: busca por email no Stripe, cria customer se necessário
5. Salva `stripe_customer_id` no profile
6. Cria `stripe.checkout.sessions.create()` com `automatic_payment_methods`, `allow_promotion_codes`
7. Retorna `{ url: session.url }`

#### useSubscription (`hooks/useSubscription.ts`)
- Hook que expõe `subscriptionStatus`, `trialDaysRemaining`, `isTrial`, `isExpired`, `isSubscriptionActive`
- `getTrialDaysRemaining()`: calcula dias restantes do trial via `parseDate(trialEndsAt)`

---

### Algoritmos e Lógica

1. **Cálculo de Growth%**: `((currentRevenue - previousRevenue) / previousRevenue) * 100`; se previousRevenue === 0, growth = 0
2. **Período de Acerto (calcCommissionPeriod)**: lógica de dia de corte mensal, navegando mês anterior quando antes do dia
3. **Comissão com Maquininha**: `commission_base = price - (price * machine_fee_percent / 100)`; `commission_value = commission_base * commission_rate / 100`
4. **Projeção Mensal**: `(monthRevenue / currentDay) * daysInMonth` — apenas após dia 15
5. **Taxa de Retorno**: clientes com >1 transação no mês / total de clientes únicos
6. **Horário de Pico**: conta frequência por hora das transações de receita
7. **Ranking de Profissionais**: agrupa receita por `professionalName`, ordena desc
8. **Self-repair de Commission Records**: se `finance_record_id` não existe ao editar, cria o registro automaticamente via INSERT

---

### Regras de Negócio

| Regra | Local | Confiança |
|-------|-------|-----------|
| Dual view: owner vê tudo, staff vê apenas seus próprios atendimentos | Finance.tsx:69, :198-226 | 🟢 CONFIRMADO |
| Staff não vê abas de Comissões, Histórico nem Insights | Finance.tsx:510-518 | 🟢 CONFIRMADO |
| Período de comissão baseado em `business_settings.commission_settlement_day_of_month` (default: 5) | CommissionsManagement.tsx:89-138 | 🟢 CONFIRMADO |
| Comissão = taxa × base de cálculo; base pode descontar taxa de maquininha se `machine_fee_enabled=true` | CommissionDetailReport.tsx:79-99 | 🟢 CONFIRMADO |
| Owner pode pagar comissões em lote via RPC `mark_commissions_as_paid`, que marca records e cria `commission_payments` | CommissionsManagement.tsx:287-316 | 🟢 CONFIRMADO |
| Transações manuais (despesas/receitas) são INSERT diretamente em `finance_records`, sem appointment vinculado | Finance.tsx:402-471 | 🟢 CONFIRMADO |
| Deleção de receita automática = deletar appointment vinculado; deleção de finance_record = deletar o record | Finance.tsx:281-332 | 🟢 CONFIRMADO |
| Despesas pendentes podem ser liquidadas via RPC `mark_expense_as_paid` | Finance.tsx:758-763 | 🟢 CONFIRMADO |
| Taxa de maquininha: debit_fee_percent/applied em débito, credit_fee_percent em crédito, ambas configuráveis em business_settings | CommissionsSettings.tsx:28-33, FinancialSettings.tsx:18-20 | 🟢 CONFIRMADO |
| Exportação CSV de transações: formato Data, Descrição, Tipo, Valor | Finance.tsx:339-355 | 🟢 CONFIRMADO |
| Assinatura via Stripe Checkout Session com auto-provisionamento de customer (lookup por email, create se não existe) | create-checkout-session/index.ts:49-83 | 🟢 CONFIRMADO |
| Preços regionais: BR (R$ 34,90 Solo / R$ 59,90 Team) e PT (€9,90 Solo / €19,90 Team) | SubscriptionSettings.tsx:28-36 | 🟢 CONFIRMADO |
| Owner pode definir taxa de comissão inline ao pagar (se profissional sem taxa) | CommissionsManagement.tsx:212-264 | 🟢 CONFIRMADO |
| Compartilhamento de resumo de comissão via WhatsApp/cópia/imagem (html2canvas) | CommissionShareModal.tsx:42-112 | 🟢 CONFIRMADO |
| Region awareness: moeda (R$/€), métodos de pagamento (Pix/MBWay), formatação | Finance.tsx:98-99, FinanceInsights.tsx:127-137 | 🟢 CONFIRMADO |
| RPC `recalculate_pending_commissions` chamada ao alterar taxa de comissão de profissional | CommissionsSettings.tsx:146-154 | 🟢 CONFIRMADO |
| Banner de comissões no Dashboard: mostra 1 dia antes do settlement day | Dashboard.tsx:53-67 | 🟢 CONFIRMADO |

---

### Entidades

#### FinanceRecord (🟢 CONFIRMADO)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK profiles.id (owner). RLS |
| appointment_id | uuid | não | null | FK appointments.id (cascade) |
| professional_id | uuid | não | null | FK team_members.id |
| barber_name | text | sim | — | Nome do profissional (denormalizado) |
| client_name | text | não | null | Nome do cliente (denormalizado) |
| service_name | text | não | null | Nome do serviço (denormalizado) |
| revenue | numeric | não | 0 | Valor da receita (para type='revenue') |
| commission_value | numeric | não | 0 | Valor da comissão |
| commission_rate | numeric | não | 0 | Percentual da comissão |
| commission_paid | boolean | não | false | Se a comissão foi paga ao profissional |
| commission_paid_at | timestamptz | não | null | Data de pagamento da comissão |
| type | text | sim | — | 'revenue' ou 'expense' |
| expense | numeric | não | 0 | Valor da despesa |
| status | text | não | 'paid' | 'paid' ou 'pending' (para despesas) |
| due_date | timestamptz | não | null | Vencimento (para despesas pendentes) |
| description | text | não | null | Descrição manual da transação |
| payment_method | text | não | null | pix, dinheiro, debito, credito, mbway |
| created_at | timestamptz | sim | now() | Data/hora do registro |

#### commission_payments (🟡 INFERIDO)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| company_id | uuid | sim | — | FK profiles.id (owner) |
| collaborator_id | uuid | sim | — | FK team_members.id |
| period_start | timestamptz | sim | — | Início do período de referência |
| period_end | timestamptz | sim | — | Fim do período de referência |
| net_amount | numeric | sim | — | Valor líquido pago |
| commission_percent | numeric | sim | — | Taxa no momento do pagamento |
| status | text | sim | 'paid' | Status do pagamento |
| paid_at | timestamptz | sim | — | Data do pagamento |

#### business_settings — campos finance (🟢 CONFIRMADO)

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|-------------|--------|-----------|
| commission_settlement_day_of_month | integer | não | 5 | Dia do mês para acerto de comissões |
| machine_fee_enabled | boolean | não | false | Se taxa de maquininha é repassada ao colaborador |
| debit_fee_percent | numeric | não | 0 | % taxa débito |
| credit_fee_percent | numeric | não | 0 | % taxa crédito |

---

### Dependências

- `supabase` — RPCs: `get_finance_stats`, `get_monthly_finance_history`, `get_commissions_due`, `mark_commissions_as_paid`, `mark_expense_as_paid`, `update_commission_record`, `recalculate_pending_commissions`
- `contexts/AuthContext` — `useAuth()`: user, userType, region, role, companyId, fullName
- `hooks/useSubscription` — status de assinatura
- `lib/supabase` — client Supabase
- `utils/formatters` — formatCurrency, Region
- `utils/Logger` — logger
- `components/BrutalCard`, `BrutalButton`, `Modal`, `MonthYearSelector`, `TabNav`, `InfoButton`, `HelpButtons`
- `recharts` — AreaChart, BarChart, PieChart
- `@stripe/stripe-js` — loadStripe (apenas em SubscriptionSettings)
- `html2canvas` — exportação de imagem (CommissionShareModal)

---

### Complexidade: **ALTA**

Módulo com 7+ componentes, 7+ RPCs, lógica de período de acerto, cálculo de comissão com maquininha, edição inline de commissions, auto-repair, dual view owner/staff, region-aware, exportação CSV/imagem, Stripe checkout com provisionamento de customer.

> ⚠️ **Checkpoint:** Análise do módulo `finance` concluída.

---

## Módulo: marketing / AIOS

### Visão Geral

Sistema de marketing preditivo (AIOS — AgendiX Intelligence & Operations System) com diagnóstico de churn, campanhas de reativação via WhatsApp, copywriting automatizado (frameworks ABT e StoryBrand), e página placeholder para campanhas futuras. O módulo é condicional: só ativa quando `aiosEnabled=true` no profile. A página `/marketing` é um placeholder "Em breve".

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Marketing.tsx` | Placeholder — "Em breve" para campanhas de marketing |
| `hooks/useAIOSDiagnostic.ts` | Hook que busca diagnóstico de churn via RPC e loga campanhas |
| `utils/aiosCopywriter.ts` | Geração de mensagens de reativação (ABT para LTV≤500, StoryBrand para LTV>500) |
| `components/ChurnRadar.tsx` | Grid de clientes em risco com botão "Chamar de volta" via WhatsApp |
| `components/marketing/CampaignModal.tsx` | Modal de campanha com mensagem gerada, copiar e enviar via WhatsApp |
| `components/marketing/OpportunityCard.tsx` | Card de oportunidade (emergency/high-value/strategy) |
| `components/dashboard/AIOSDiagnosticCard.tsx` | Card no dashboard com diagnóstico de clientes em risco e receita recuperável |
| `components/dashboard/AIOSStrategyModal.tsx` | Modal de estratégia AIOS (lazy loaded) |
| `components/dashboard/AIOSCampaignStats.tsx` | Card de estatísticas de campanhas enviadas |

---

### Fluxo de Controle

#### AIOS Diagnostic (`useAIOSDiagnostic.ts`)
1. Verifica `aiosEnabled === true` no AuthContext; se false, não executa
2. Chama RPC `get_aios_diagnostic(p_establishment_id: user.id)`
3. Retorna `AIOSDiagnostic`: `{ recoverable_revenue, at_risk_clients[], agenda_gaps[], diagnostic_date }`
4. Cada cliente em risco: `{ id, name, phone, last_visit, total_visits, avg_ticket, days_since_last_visit }`

#### logCampaignActivity (`useAIOSDiagnostic.ts:56-70`)
1. Chama RPC `log_aios_campaign(p_client_id, p_agent_name, p_campaign_type)`
2. Usado para atribuição de ROI quando owner envia reativação

#### ChurnRadar — handleReactivate (`ChurnRadar.tsx:24-58`)
1. Gera mensagem via `generateReactivationMessage`
2. Loga campanha via `logCampaignActivity(client.id, 'AIOSMarketingAgent', 'whatsapp_reactivation')`
3. Abre WhatsApp via `getWhatsAppUrl(phone, message)`

#### CampaignModal (`CampaignModal.tsx`)
1. Gera mensagem ao abrir via `generateReactivationMessage`
2. Permite editar manualmente
3. Copiar para clipboard (com fallback para mobile e `navigator.share`)
4. Enviar via WhatsApp (`wa.me/phone?text=message`)

#### AIOSDiagnosticCard (`AIOSDiagnosticCard.tsx`)
1. Só renderiza se `aiosEnabled && diagnostic && diagnostic.recoverable_revenue > 0`
2. Exibe número de clientes em risco, receita recuperável estimada, gasto médio por visita
3. Botão "Recuperar Agora" navega para `/crm`

---

### Algoritmos e Lógica

1. **Segmentação ABT vs StoryBrand**: Clientes com `ltv > 500` recebem StoryBrand; demais recebem ABT
2. **ABT Framework**: `[Conexão] E [Frequência] MAS [Ausência] PORTANTO [CTA]`
3. **StoryBrand Framework**: `[Nome], você merece... No [businessName], nosso plano é: agendar, [objetivo] e garantir. Que tal agendar agora?`
4. **WhatsApp URL**: `https://wa.me/{cleanPhone}?text={encodedMessage}` — remove não-dígitos do telefone
5. **Diagnostic gating**: AIOS só ativa se `profile.aios_enabled === true`; usado no dashboard e ChurnRadar

---

### Regras de Negócio

| Regra | Local | Confiança |
|-------|-------|-----------|
| AIOS só ativa se `profiles.aios_enabled === true` | hooks/useAIOSDiagnostic.ts:32, components/dashboard/AIOSDiagnosticCard.tsx:16 | 🟢 CONFIRMADO |
| Clientes em risco:LTE 30 dias sem retorno | RPC get_aios_diagnostic (server-side) | 🟡 INFERIDO |
| Segmentação por LTV: >500 usa StoryBrand, ≤500 usa ABT | utils/aiosCopywriter.ts:39-41 | 🟢 CONFIRMADO |
| Campanhas logadas via RPC log_aios_campaign para atribuição de ROI | hooks/useAIOSDiagnostic.ts:56-70 | 🟢 CONFIRMADO |
| Página /marketing é placeholder "Em breve" | pages/Marketing.tsx | 🟢 CONFIRMADO |
| Marketing opt-in em booking público: `acceptedMarketing` checkbox | pages/PublicBooking.tsx:1339-1341 | 🟡 INFERIDO |

---

### Entidades

#### AIOSDiagnostic (🟡 INFERIDO — via RPC)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| recoverable_revenue | number | Receita estimada recuperável com clientes em risco |
| at_risk_clients | AtRiskClient[] | Lista de clientes em risco |
| agenda_gaps | AgendaGap[] | Lacunas na agenda detectadas |
| diagnostic_date | string | Data do diagnóstico |

#### ClientContext — aiosCopywriter (🟢 CONFIRMADO)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| name | string | sim | Nome do cliente |
| daysMissing | number | sim | Dias desde a última visita |
| userType | string | sim | 'barber' ou 'beauty' |
| businessName | string | não | Nome do estabelecimento |
| lastService | string | não | Último serviço realizado |
| ltv | number | não | Lifetime value do cliente |

---

### Dependências

- `supabase` — RPCs: `get_aios_diagnostic`, `log_aios_campaign`
- `contexts/AuthContext` — `useAuth()`: user, aiosEnabled, businessName, userType, region
- `utils/aiosCopywriter` — generateReactivationMessage, getWhatsAppUrl
- `components/BrutalCard`, `BrutalButton`, `Modal`

---

### Complexidade: **MÉDIA**

Módulo condicional com 2 RPCs, framework de copywriting com segmentação ABT/StoryBrand, integração WhatsApp, e placeholder para campanhas futuras. Menos componentes que finance, mas orquestração cross-module (dashboard, CRM, marketing).

> ⚠️ **Checkpoint:** Análise do módulo `marketing` concluída.

---

## Módulo: onboarding

### Visão Geral

Sistema de onboarding dual com duas implementações paralelas: um **wizard novo** (2 steps: Boas-vindas + Serviços) persistido na tabela `onboarding_progress` via RPC `upsert_onboarding_progress`, e um **wizard legado** (5 steps: BusinessInfo + Serviços + Equipe + Meta Mensal + Sucesso) persistido em `business_settings.onboarding_step/onboarding_completed` via RPC `update_onboarding_step`. Inclui onboarding simplificado para staff, SetupCopilot pós-wizard com 6 milestones, guided mode com spotlight/pointer, e ativação condicional via `profiles.activation_completed`.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/Onboarding.tsx` | Página do wizard novo, restaura progresso e renderiza WizardEngine |
| `pages/OnboardingWizard.tsx` | Página do wizard legado (5 steps com OnboardingLayout) |
| `pages/StaffOnboarding.tsx` | Tela de boas-vindas para staff (sem steps) |
| `components/onboarding/WizardContext.tsx` | Reducer de estado do wizard (SET_STEP, COMPLETE_STEP, etc.) |
| `components/onboarding/WizardEngine.tsx` | Orquestrador do wizard novo, renderiza steps com lazy loading |
| `components/onboarding/WizardOverlay.tsx` | Overlay full-screen com focus trap |
| `components/onboarding/WizardProgress.tsx` | Barra de progresso com indicadores de step |
| `components/onboarding/WizardPointer.tsx` | Spotlight/tooltip animado sobre elementos DOM |
| `components/onboarding/StandaloneWizardPointer.tsx` | Pointer via portal + overlay de sucesso + toast |
| `components/onboarding/ActivationBanner.tsx` | Banner "Sistema Ativado" via evento customizado |
| `components/onboarding/StepBusinessInfo.tsx` | Step 1 (Welcome): carrega business_name do profile |
| `components/onboarding/StepServices.tsx` | Step 2: CRUD de serviços com ServiceModal |
| `components/onboarding/StepTeam.tsx` | Step 3 (legado): adição de profissionais |
| `components/onboarding/StepMonthlyGoal.tsx` | Step 4 (legado): meta mensal de receita |
| `components/onboarding/StepSuccess.tsx` | Step 5 (legado): tela de conclusão com CTAs |
| `components/onboarding/StepBusinessHours.tsx` | Step 3 (alt): editor de horários de funcionamento |
| `components/OnboardingLayout.tsx` | Layout decorativo wrapper (legado) |
| `contexts/GuidedModeContext.tsx` | Context do guided mode com persistência em sessionStorage |
| `hooks/useOnboardingState.ts` | Hook legado: lê/gravar business_settings.onboarding_step |
| `lib/onboarding.ts` | Data layer: getOnboardingProgress, saveOnboardingStep, completeOnboarding, getSetupStatus |
| `constants/WIZARD_TARGETS.ts` | Fonte de verdade dos IDs e mensagens do guided mode |
| `components/dashboard/SetupCopilot.tsx` | Card de milestones pós-wizard com 6 steps de setup |

---

### Fluxo de Controle

#### Wizard Novo — Onboarding.tsx → WizardEngine

```
Usuário acessa /onboarding
  → OnboardingInner: getOnboardingProgress(companyId)
  → Se is_completed=true → markTutorialCompleted() → navigate('/')
  → Se current_step > 1 → dispatch SET_STEP (restaura progresso)
  → WizardEngine renderiza step atual
  → Usuario completa Step 1 (StepWelcome) → completeStep(1)
  → saveOnboardingStep(companyId, 2, [1])
  → Step 2 (StepServices) → completeStep(2)
  → completeOnboarding(companyId) + markTutorialCompleted()
  → navigate('/')
```

#### Wizard Legado — OnboardingWizard.tsx → useOnboardingState

```
useOnboardingState() → fetch business_settings.onboarding_step
  → Se onboarding_completed=true → markTutorialCompleted() → navigate('/')
  → Step 1: StepBusinessInfo → goToStep(2) → update_onboarding_step(p_user_id, 2)
  → Step 2: StepServices → goToStep(3) → update_onboarding_step(p_user_id, 3)
  → Step 3: StepTeam → goToStep(4)
  → Step 4: StepMonthlyGoal → goToStep(5) ou onSkip→goToStep(5)
  → Step 5: StepSuccess → completeOnboarding → update_onboarding_step(p_user_id, 5, p_completed=true)
```

#### Staff Onboarding — StaffOnboarding.tsx

```
Staff acessa /staff-onboarding
  → Carrega business_name do profiles da company
  → handleStart() → markTutorialCompleted() → navigate('/')
```

#### SetupCopilot (pós-wizard)

```
Dashboard → SetupCopilot verifica 6 milestones via getSetupStatus:
  1. hasServices (services count > 0)
  2. hasTeam (team_members count > 0)
  3. hasClients (clients count > 0)
  4. hasBusinessHours (business_settings.business_hours não vazio)
  5. hasBookingSlug (profiles.business_slug existe)
  6. hasAppointments (appointments count > 0)

Se todos completos → UPDATE profiles SET activation_completed = true
→ Dispatch 'system-activated' event
→ ActivationBanner mostra toast (auto-hide 8s)
```

#### Guided Mode — GuidedModeContext

```
SetupCopilot ativa guided mode → startGuide(stepId)
  → GuidedModeContext salva estado em sessionStorage
  → Salva last_guided_step em onboarding_progress.step_data via saveOnboardingStep
  → WizardPointer aplica spotlight no elemento DOM alvo (WIZARD_TARGETS)
  → Usuário completa ação → 'setup-step-completed' event
  → StandaloneWizardPointer mostra overlay de sucesso + toast
```

---

### Algoritmos e Lógica

#### 1. Wizard Reducer (WizardContext)

- `SET_STEP`: Atualiza `currentStep` diretamente
- `COMPLETE_STEP`: Adiciona step ao Set de `completedSteps`, calcula `nextStep = min(step + 1, 5)`
- `SET_LOADING`: Toggle de carregamento
- `CLOSE_WIZARD`: Desativa overlay
- `COMPLETE_WIZARD`: Marca como completo e desativa

#### 2. Persistência de Progresso

- **Novo**: `onboarding_progress` table com `upsert_onboarding_progress` RPC (SECURITY DEFINER). Merge JSONB com `||` preserva dados de steps anteriores.
- **Legado**: `business_settings` columns `onboarding_step`/`onboarding_completed` via `update_onboarding_step` RPC. Usa `GREATEST(step_atual, novo_step)` para nunca regredir.
- **Clamp**: Hook legado garante `Math.min(Math.max(step, 1), 5)`. Migration garante `CHECK (current_step BETWEEN 1 AND 5)`.

#### 3. Setup Status (getSetupStatus)

6 queries paralelas (Promise.all) verificam:
- `services`: count > 0
- `team_members`: count > 0
- `clients`: count > 0
- `business_settings`: business_hours não vazio + public_booking_enabled
- `profiles`: business_slug + activation_completed
- `appointments`: count > 0

#### 4. Redirect Guards

- **Login**: Verifica `business_settings.onboarding_completed` → redirect para `/onboarding`
- **ProtectedLayout**: Verifica `activation_completed` no profile → redirect para `/onboarding` (owner) ou `/staff-onboarding` (staff)
- **OnboardingInner**: Se `is_completed=true` → `markTutorialCompleted()` (elimina redirect loop)

#### 5. Focus Trap

- `WizardOverlay` usa `focus-trap-react` com `escapeDeactivates: false`, impedindo que o usuário saia do wizard via Tab ou Escape.

#### 6. Spotlight Mechanism

- `WizardPointer` aplica `box-shadow: 0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px #F59E0B` no alvo
- Usa `MutationObserver` para aguardar elementos que ainda não renderizaram (lazy loading/Suspense)

---

### Estruturas de Dados

#### onboarding_progress (🟢 CONFIRMADO — migration 20260320)

| Campo | Tipo | Obrigatório | Default | Descrição |
|-------|------|-------------|---------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| company_id | uuid | sim | — | FK → companies(id), UNIQUE |
| current_step | smallint | sim | 1 | CHECK (BETWEEN 1 AND 5) |
| completed_steps | smallint[] | sim | '{}' | Array de steps concluídos |
| is_completed | boolean | sim | false | Wizard completo |
| is_skipped | boolean | sim | false | Wizard pulado |
| started_at | timestamptz | sim | now() | Início do wizard |
| completed_at | timestamptz | não | null | Timestamp de conclusão |
| last_activity | timestamptz | sim | now() | Última interação |
| step_data | jsonb | sim | '{}' | Dados por step (merge com \|\|) |

> Índices: `idx_onboarding_progress_company_id`, `idx_onboarding_progress_active` (parcial WHERE is_completed = FALSE)
> RLS: 3 policies (select, insert, update) filtrando por company_id via subquery em profiles

#### business_settings.onboarding_* (🟢 CONFIRMADO — migration 20260218, legado)

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| onboarding_completed | boolean | false | Flag de conclusão (legado) |
| onboarding_step | integer | 1 | Step atual (legado, clamp 1-5) |

#### WizardState (frontend, 🟢 CONFIRMADO)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| currentStep | WizardStep (1\|2\|3\|4\|5) | Step ativo atual |
| completedSteps | WizardStep[] | Steps concluídos |
| isActive | boolean | Overlay visível |
| isCompleted | boolean | Wizard finalizado |
| isLoading | boolean | Carregando dados |

#### OnboardingProgress (frontend, 🟢 CONFIRMADO)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | ID do registro |
| company_id | string | Tenant |
| current_step | number | Step atual |
| completed_steps | number[] | Steps concluídos |
| is_completed | boolean | Concluído |
| completed_at | string \| null | Data de conclusão |
| step_data | Record<string, unknown> | Dados flexíveis por step |

#### GuidedModeState (frontend, 🟢 CONFIRMADO)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| activeStep | WizardStepId \| null | Step ativo do guided mode |
| targetElementId | string \| null | ID do elemento DOM alvo |
| position | 'top'\|'bottom'\|'left'\|'right' | Posição do tooltip |
| message | string | Mensagem exibida |
| isGuideActive | boolean | Guide ativo |

#### WizardStepId e WizardTarget (🟢 CONFIRMADO)

| Step ID | elementId | path | message |
|---------|-----------|------|---------|
| services | btn-add-service | /configuracoes/servicos | "Clique aqui para adicionar um serviço" |
| team | btn-add-team-member | /configuracoes/equipe | "Adicione os profissionais da sua equipe" |
| hours | business-hours-section | /configuracoes/geral | "Configure seus dias e horários de atendimento" |
| profile | profile-logo-upload | /configuracoes/geral | "Adicione a logo e foto de capa do seu espaço" |
| booking | toggle-public-booking | /configuracoes/agendamento | "Ative para receber agendamentos online" |
| appointment | btn-new-appointment | /agenda | "Crie seu primeiro agendamento aqui" |

---

### Metadados e Configurações

- **Dual theme**: `accentColor = isBeauty ? 'beauty-neon' : 'accent-gold'` — propagado para todos os Step* components
- **Focus trap**: `focus-trap-react` com `escapeDeactivates: false`
- **Lazy loading**: StepWelcome e StepServices carregados via `React.lazy()` + `Suspense`
- **sessionStorage**: GuidedModeState persiste em chave `guided_mode_state`
- **Custom events**: `setup-step-completed` (SetupCopilot → StandaloneWizardPointer), `system-activated` (SetupCopilot → ActivationBanner)
- **booking_visited**: localStorage key `booking_visited_{userId}` para milestone de booking

---

### Dependências

- `supabase` — RPCs: `upsert_onboarding_progress`, `update_onboarding_step`, tabela `onboarding_progress`, `business_settings`
- `contexts/AuthContext` — `useAuth()`: user, companyId, userType, markTutorialCompleted
- `react-router-dom` — navegação entre rotas e redirect guards
- `focus-trap-react` — focus trapping no WizardOverlay
- `lucide-react` — ícones nos componentes visuais
- `constants/WIZARD_TARGETS` — definições de alvos do guided mode
- `dashboard/SetupCopilot` — integração pós-wizard

---

### Complexidade: **ALTA**

Dois sistemas paralelos de persistência (novo `onboarding_progress` + legado `business_settings`), reducer state machine, guided mode com sessionStorage + Supabase, spotlight mechanism com MutationObserver, 6 milestones com queries paralelas, focus trapping, lazy loading, eventos customizados para comunicação entre componentes, merge JSONB server-side, RLS multi-tenant com SECURITY DEFINER, redirect guards em múltiplos pontos de entrada.

> ⚠️ **Checkpoint:** Análise do módulo `onboarding` concluída.

---

## Módulo: staff/team

### Visão Geral

Sistema de gestão de equipe com dois papéis (owner/staff), convite via link compartilhável, modelo de permissões baseado em `company_id` (multi-tenant RLS), portfólio público de profissionais, comissões por profissional e experiência dedicada para staff (Meu Dia, Meus Resultados, ganhos pendentes). O módulo cobre desde o cadastro de profissionais no onboarding até a visualização restrita de dados para colaboradores.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/settings/TeamSettings.tsx` | Página de gestão de equipe — lista members separados (owners/staff), convite via link, CRUD de profissionais |
| `components/TeamMemberForm.tsx` | Modal de criação/edição de profissional — nome, cargo, slug, bio, foto (team_photos), comissão, is_owner, active, especialidades, CPF |
| `components/TeamMemberCard.tsx` | Card de membro — avatar, badges (Dono/Inativo), comissão, ações editar/excluir |
| `components/onboarding/StepTeam.tsx` | Step do onboarding wizard — escolha "Sou eu quem atende" ou "Tenho equipe", adição de membros |
| `components/StaffEarningsCard.tsx` | Card de comissões pendentes no dashboard staff — busca `finance_records` onde `commission_paid=false` e `professional_id=teamMemberId` |
| `pages/StaffInsights.tsx` | Página de insights do staff — atendimentos, clientes únicos, comissões, top serviços, filtrado por período |
| `pages/StaffOnboarding.tsx` | Onboarding de staff — saudação com business name do owner, marca tutorial_completed, redirect para `/` |
| `hooks/useMeuDiaData.ts` | Hook do widget Meu Dia — appointments filtrados por `professional_id=teamMemberId`, 1-touch complete |
| `contexts/AuthContext.tsx` | Provider de auth — registro de staff (insert em team_members com `staff_user_id`), busca de `teamMemberId` no login, herança de dados do owner |
| `components/ProfileModal.tsx` | Modal de perfil — sincroniza nome/foto do owner para o `team_members` com `is_owner=true` |
| `pages/ProfessionalPortfolio.tsx` | Portfólio público do profissional — busca por slug, exibe foto, bio, especialidades |

---

### Fluxo de Controle

#### Cadastro de Profissional — Owner (`TeamMemberForm.handleSubmit`)

```
1. Validação: nome e cargo obrigatórios
2. Se tem foto: upload para bucket team_photos (path: {userId}/{timestamp}.{ext})
3. Monta teamMemberData:
   - user_id = owner.id
   - name, role, slug (auto-gerado se vazio), bio, active, photo_url
   - commission_rate = isOwner ? 0 : Number(commissionRate) [owner não tem comissão]
   - is_owner, specialties (array de strings), cpf
4. Se initialData.id: UPDATE team_members WHERE id = initialData.id AND user_id = user.id
5. Se não: INSERT em team_members
6. Dispara evento 'setup-step-completed' com stepId='team'
7. onSave callback → fetchMembers
```

> 🟢 **CONFIRMADO** — `components/TeamMemberForm.tsx:72-140`

#### Convite de Staff — Link Compartilhável (`TeamSettings.handleCopyInviteLink`)

```
1. Gera link: {origin}/#/register?company={user.id}
2. Se mobile com Web Share API: navigator.share({title, text, url})
3. Fallback: Clipboard API (navigator.clipboard.writeText)
4. Fallback final: textarea + document.execCommand('copy')
5. Feedback visual: "Link Copiado!" por 2 segundos
```

> 🟢 **CONFIRMADO** — `pages/settings/TeamSettings.tsx:61-110`

#### Registro de Staff — Fluxo Completo (`Register → AuthContext.register`)

```
1. Staff acessa link de convite: /#/register?company={ownerId}
2. Register.tsx detecta companyId na URL, marca isInvitedStaff=true
3. RPC get_company_for_invite({p_company_id: companyId}) → business_name, user_type
4. AuthContext.register({email, password, fullName, companyId}):
   a. supabase.auth.signUp({email, password, data: {full_name, business_name}})
   b. INSERT em profiles: {role: 'staff', company_id: companyId, ...}
   c. INSERT em team_members: {user_id: companyId, staff_user_id: authData.user.id, name: fullName, commission_rate: 0, active: true, is_owner: false, slug: gerado}
   d. Erro em team_members é logado mas NÃO impede criação da conta
5. Redirect para /staff-onboarding
```

> 🟢 **CONFIRMADO** — `contexts/AuthContext.tsx:236-310`, `pages/Register.tsx`

#### Onboarding de Staff (`StaffOnboarding`)

```
1. Busca business_name do owner via profiles WHERE id = companyId
2. Exibe saudação: "Olá, {firstName}! Você foi adicionado à equipe da {businessName}"
3. Dois cards informativos: "Sua Agenda" e "Sua Equipe"
4. Botão "Acessar minha agenda" chama markTutorialCompleted()
5. Redirect para /
```

> 🟢 **CONFIRMADO** — `pages/StaffOnboarding.tsx:1-116`

#### Login de Staff — Busca de teamMemberId (`AuthContext.fetchProfileData`)

```
1. Após autenticação, busca profile → role = 'staff'
2. Busca dados do owner: profiles WHERE id = companyId
3. Herda: subscriptionStatus, trialEndsAt, userType, businessName do owner
4. Busca teamMemberId: SELECT id FROM team_members WHERE staff_user_id = userId AND user_id = companyId
5. Se teamMemberId = null: exibe "Vinculação pendente" no StaffInsights
6. Seta estado global: {role: 'staff', companyId, teamMemberId, ...herdadoDoOwner}
```

> 🟢 **CONFIRMADO** — `contexts/AuthContext.tsx:66-130`

#### Insights do Staff (`StaffInsights`)

```
1. Se role='owner': redirect para /insights (não pode acessar)
2. Se teamMemberId=null: exibe mensagem "Vinculação pendente"
3. Busca paralela (3 queries):
   a. appointments WHERE professional_id = teamMemberId (período selecionado)
   b. appointments WHERE professional_id = teamMemberId (hoje, status Confirmed/Pending)
   c. finance_records (período selecionado, para comissões)
4. Calcula: completedCount, uniqueClients, totalCommissions
5. Top serviços: agrupa por service, ordena por count, top 5
6. Períodos: day (hoje), week (semana atual), month (mês atual)
```

> 🟢 **CONFIRMADO** — `pages/StaffInsights.tsx:39-100`

#### Comissões Pendentes do Staff (`StaffEarningsCard`)

```
1. SELECT commission_value FROM finance_records WHERE professional_id = teamMemberId AND commission_paid = false
2. Soma commission_value → ganhos pendentes
3. Exibe card com valor formatado + label do mês corrente
```

> 🟢 **CONFIRMADO** — `components/StaffEarningsCard.tsx:18-46`

#### Portfólio Público do Profissional (`ProfessionalPortfolio`)

```
1. Busca team_members WHERE slug = routeSlug AND active = true
2. JOIN com profiles para obter business info
3. Exibe: foto, nome, bio, especialidades, business name
4. Botão "Agendar com {name}" linka para /book/{businessSlug}?professional={slug}
```

> 🟡 **INFERIDO** — padrão de URL e dados exibidos

#### 1-Touch Complete — Staff (`useMeuDiaData.markAsCompleted`)

```
1. Optimistic update: status → 'Completed' no estado local
2. UPDATE appointments SET status='Completed' WHERE id = appointmentId
3. Em erro: reverte estado local (rollback)
4. Recalcula resumo (completed count, earnings)
```

> 🟢 **CONFIRMADO** — `hooks/useMeuDiaData.ts:101-131`

---

### Algoritmos e Lógica

#### Geração de Slug para Profissional

```typescript
// Se slug vazio no form:
slug = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-')
// Se preenchido pelo usuário: sanitização no onChange
slug = value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
```

> 🟢 **CONFIRMADO** — `components/TeamMemberForm.tsx:106,287`

#### Auto-Preenchimento de Owner ("Sou eu quem atende")

```
1. Botão "Sou eu quem atende (Usar meu perfil)"
2. Preenche: name = fullName, role = 'Dono / Profissional', photo = avatarUrl, commission_rate = 100, is_owner = true
```

> 🟢 **CONFIRMADO** — `components/TeamMemberForm.tsx:64-70`

#### Sincronização Owner → TeamMember (ProfileModal)

```
1. Quando owner edita nome ou foto no ProfileModal:
   UPDATE team_members SET name = fullName, photo_url = avatarUrl
   WHERE user_id = user.id AND is_owner = true
```

> 🟢 **CONFIRMADO** — `components/ProfileModal.tsx`

#### Período de Comissões (calcCommissionPeriod)

```typescript
// settlement_day: dia do mês configurado em business_settings
// Se settlement_day > dia atual: período anterior
// Se settlement_day <= dia atual: período atual
// Retorna: {start, end, label}
```

> 🟢 **CONFIRMADO** — `components/CommissionsManagement.tsx`

---

### Estruturas de Dados

#### Tabela `team_members` (completa — migration evolution)

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| id | uuid | sim | PK, DEFAULT uuid_generate_v4() |
| user_id | uuid | sim | FK auth.users (owner) — empresa à qual pertence |
| name | text | sim | Nome do profissional |
| role | text | sim | Cargo (ex: 'Barbeiro', 'Dono / Profissional') |
| bio | text | não | Biografia curta |
| photo_url | text | não | URL da foto (bucket team_photos) |
| active | boolean | sim | default true — profissionais inativos ficam cinzas |
| is_owner | boolean | não | Flag de proprietor — badge "Dono" no card |
| commission_rate | numeric | não | Percentual de comissão (0-100). Owner = 0 no form, exibido como 100 |
| slug | text | sim | Link personalizado (ex: /pro/joao-silva) |
| specialties | text[] | não | Array de especialidades |
| cpf | text | não | CPF para comissões |
| staff_user_id | uuid | não | FK auth.users — conta do staff. Parcial index WHERE NOT NULL |
| business_id | uuid | não | FK auth.users — mesmo que user_id para owners |
| display_order | integer | não | default 0 — ordem de exibição |
| created_at | timestamp | não | default now() |
| updated_at | timestamp | não | default now() |

> 🟢 **CONFIRMADO** — `20260218_team_setup.sql`, `20260307_staff_user_id.sql`, `20260130_fix_staff_and_reporting.sql`, `components/TeamMemberForm.tsx`

#### Tabela `profiles` — campos staff-related

| Campo | Tipo | Observação |
|-------|------|-----------|
| role | text | 'owner' ou 'staff', default 'owner' |
| company_id | text | ID do owner (para staff). Para owner = próprio ID |

> 🟢 **CONFIRMADO** — `20260307_us015b_multi_user_rls.sql`

---

### RLS e Permissões

#### Funções SQL Auxiliares

| Função | Retorno | Descrição |
|--------|---------|-----------|
| `get_auth_company_id()` | text | Retorna COALESCE(company_id, id) de profiles para o usuário autenticado. Owner → próprio ID; Staff → ID do owner |
| `get_auth_role()` | text | Retorna 'owner' ou 'staff' de profiles para o usuário autenticado |
| `is_staff_of(p_business_id UUID)` | boolean | Verifica se auth.uid() é membro ativo do time com business_id = p_business_id |

> 🟢 **CONFIRMADO** — `20260307_us015b_multi_user_rls.sql`, `20260130_fix_staff_and_reporting.sql`

#### Políticas RLS por Tabela

| Tabela | Política | Regra | Tipo |
|--------|----------|-------|------|
| team_members | company isolation | `user_id = get_auth_company_id()` | ALL |
| team_members | staff read company | `profiles.company_id = team_members.user_id AND role='staff'` OU `staff_user_id = auth.uid()` | SELECT |
| appointments | company isolation | `user_id = get_auth_company_id()` | ALL |
| appointments | staff read company | `profiles.company_id = appointments.user_id AND role='staff'` | SELECT |
| clients | company isolation | `user_id = get_auth_company_id()` | ALL |
| clients | staff read company | `profiles.company_id = clients.user_id AND role='staff'` | SELECT |
| services | company isolation | `user_id = get_auth_company_id()` | ALL |
| services | staff read company | `profiles.company_id = services.user_id AND role='staff'` | SELECT |
| finance_records | company isolation | `user_id = get_auth_company_id()` | ALL |
| finance_records | staff own commissions | `team_members.staff_user_id = auth.uid() AND team_members.id = professional_id` | SELECT |
| campaigns | company isolation | `user_id = get_auth_company_id()` | ALL |

> 🟢 **CONFIRMADO** — `20260307_us015b_multi_user_rls.sql`, `20260417_staff_commission_rls.sql`, `20260420_staff_read_company_data.sql`

#### Restrições de Rota (OwnerRouteGuard)

| Rota | Acesso |
|------|--------|
| `/financeiro` | Owner only |
| `/fila` | Owner only |
| `/marketing` | Owner only |
| `/insights` | Owner only (staff redirecionado para `/meus-insights`) |
| `/configuracoes/*` (exceto Servicos) | Owner only |
| `/meus-insights` | Staff only |
| `/staff-onboarding` | Staff only |

> 🟢 **CONFIRMADO** — `App.tsx`, `components/Sidebar.tsx`, `components/SettingsLayout.tsx`

---

### Regras de Negócio

1. **Dois papéis apenas**: `owner` e `staff`. Sem hierarquia intermediária. Owner tem acesso total; staff tem acesso restrito.
2. **Convite sem tabela**: sistema usa link compartilhável com owner UUID como parâmetro, sem tabela `team_invitations` nem tokens de aceite.
3. **Herança de dados do owner**: staff recebe `subscriptionStatus`, `trialEndsAt`, `userType`, `businessName` do perfil do owner no login.
4. **company_id como isolamento**: todas as queries de staff usam `companyId` (= owner ID) em vez de `user.id`. RLS garante que staff só acessa dados da empresa.
5. **teamMemberId como ponte**: o `team_members.id` é usado como `professional_id` em appointments e `finance_records`, fazendo a ponte entre auth e registros de negócio.
6. **Staff não completa appointments**: check `apt.status === 'Completed' && role === 'staff'` impede staff de usar o checkout completo. Staff usa 1-touch complete no MeuDiaWidget.
7. **Comissões separadas**: staff vê apenas `finance_records` onde `professional_id` = seu `teamMemberId` e `commission_paid = false`. Owner vê todas as comissões.
8. **Vinculação pendente**: se `teamMemberId` é null no login, StaffInsights exibe mensagem de vinculação pendente.
9. **Auto-preenchimento owner**: botão "Sou eu quem atende" preenche dados do perfil do owner no TeamMemberForm com `is_owner=true` e `commission_rate=100`.
10. **Storage de fotos**: bucket `team_photos` com políticas — público para leitura, upload/update/delete restrito ao owner (auth.uid() = folder do path).
11. **Sincronização de perfil**: ProfileModal atualiza nome/foto no `team_members` do owner (`is_owner=true`) automaticamente.
12. **Staff onboarding**: página dedicada `/staff-onboarding` com saudação e marcação de `tutorial_completed`.

---

### Dependências do Módulo

- `lib/supabase.ts` — cliente Supabase
- `contexts/AuthContext.tsx` — useAuth (user, role, companyId, teamMemberId, fullName, avatarUrl, businessName)
- `components/SettingsLayout.tsx` — layout de configurações (owner-only)
- `components/BrutalCard.tsx`, `components/BrutalButton.tsx` — UI components
- `utils/formatters.ts` — formatCurrency
- `lucide-react` — Icons

---

### Complexidade: **MÉDIA**

Sistema de dois papéis com RLS company-based, convite via link, experiência dual (owner/staff). Sem hierarquia complexa, sem tokens de convite, sem fluxo de aceite. A principal complexidade está na evolução das migrations de RLS (6 migrations) e no mapeamento de `teamMemberId` como ponte entre auth e dados de negócio.

> ⚠️ **Checkpoint:** Análise do módulo `staff/team` concluída.

---

## Módulo: settings

### Visão Geral

Hub de configurações do sistema com 10 sub-páginas organizadas sob `SettingsLayout` (sidebar + mobile drawer). Gerencia perfil do negócio, horários de funcionamento, agendamento público, equipe, serviços, comissões, financeiro, segurança, auditoria e lixeira. Apenas owners têm acesso total; staff vê apenas `/configuracoes/servicos`. Contas dev acessam páginas extras (auditoria, erros, lixeira). Dual theme (barber/beauty) propagado via `useBrutalTheme`.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/settings/GeneralSettings.tsx` | Perfil do negócio: nome, telefone, endereço, Instagram, logo, capa, horários, política de cancelamento |
| `pages/settings/PublicBookingSettings.tsx` | Configurações de agendamento público: toggle on/off, upsells, seleção de profissional, lead time, limite por dia, lembretes e-mail, reagendamento autônomo |
| `pages/settings/TeamSettings.tsx` | Gestão de equipe: lista de membros, convite via link compartilhável, organização owner/staff |
| `pages/settings/ServiceSettings.tsx` | Gestão de serviços e categorias: CRUD de categorias, serviços com imagem, preço, duração, ativo/inativo |
| `pages/settings/CommissionsSettings.tsx` | Configuração de comissões: taxa por profissional, dia de acerto mensal, taxas de maquininha (débito/crédito) |
| `pages/settings/FinancialSettings.tsx` | Configurações financeiras: toggle de repasse de taxa de maquininha, percentuais débito/crédito |
| `pages/settings/SubscriptionSettings.tsx` | Gestão de assinatura Stripe: planos Solo/Equipe, preços por região (BRL/EUR), checkout session |
| `pages/settings/SecuritySettings.tsx` | Segurança: 2FA TOTP (enroll/verify/unenroll), alteração de senha (placeholder) |
| `pages/settings/AuditLogs.tsx` | Logs de auditoria: filtros (ação/recurso/data), diff de mudanças, exportação CSV |
| `pages/settings/SystemLogs.tsx` | Monitoramento de erros do sistema (system_errors): severity, stack trace, contexto, detalhe expansível |
| `pages/settings/RecycleBin.tsx` | Lixeira: itens soft-deleted com countdown de 30 dias, restauração via RPC por tipo de recurso |
| `components/SettingsLayout.tsx` | Layout wrapper: sidebar com NAV de settings, mobile drawer + horizontal scroll, role-based menu filtering |
| `components/BusinessHoursEditor.tsx` | Editor de horário de funcionamento: 7 dias com blocos de horário, abertura/fechamento |
| `components/BrandIdentitySection.tsx` | Seção de logo e capa com upload para Supabase Storage |
| `components/BusinessGalleryManager.tsx` | Gerenciador de galeria de fotos do negócio |
| `components/PublicLinkCard.tsx` | Card com link público de agendamento (slug-based) |
| `components/ServiceModal.tsx` | Modal de criação/edição de serviço |
| `components/TeamMemberCard.tsx` | Card de membro da equipe |
| `components/TeamMemberForm.tsx` | Formulário de criação/edição de membro da equipe |
| `components/security/TwoFactorSetup.tsx` | UI de setup de 2FA com QR code |
| `hooks/use2FA.ts` | Hook de 2FA: enroll, verify, unenroll |
| `hooks/useSubscription.ts` | Hook de assinatura: status, trial, dias restantes |
| `lib/auditLogs.ts` | Biblioteca de auditoria: CRUD de logs, formatação, diff, exportação CSV |
| `constants.ts` | NAVIGATION_ITEMS e SETTINGS_ITEMS com ícones e rotas |

---

### Fluxo de Controle

#### GeneralSettings - Salvamento

```
1. fetchSettings(): carrega profiles + business_settings em paralelo
2. Componentes controlados com useState para cada campo
3. hasChanges: detectado via useEffect que compara com loading
4. handleSave():
   a. Upload de arquivos (logo/cover) para Supabase Storage
   b. UPDATE profiles (business_name, phone, address, instagram, logo_url, cover_photo_url)
   c. UPSERT business_settings (cancellation_policy, business_hours) com onConflict: user_id
   d. UPDATE auth.user metadata (business_name, phone)
   e. Dispatch custom events: 'setup-step-completed' para 'hours' e 'profile'
5. SaveFooter: barra fixa com status (idle/saving/saved/error)
```

> 🟢 **CONFIRMADO** — `GeneralSettings.tsx:127-176`

#### PublicBookingSettings - Toggle e Persistência

```
1. fetchSettings(): carrega business_settings.* + profiles.business_slug
2. Flags booleanas: enableUpsells, enableProfessionalSelection, publicBookingEnabled, enableEmailReminders, enableSelfRescheduling
3. Parâmetros numéricos: leadTimeHours (default 2), maxBookingsPerDay (null = ilimitado)
4. handleSave(): UPSERT business_settings com todas as flags + parâmetros
5. Dispatch: 'setup-step-completed' para 'booking'
```

> 🟢 **CONFIRMADO** — `PublicBookingSettings.tsx:67-92`

#### CommissionsSettings - Taxas e Acerto

```
1. fetchData(): carrega team_members (ativos) + business_settings (commission_settlement_day_of_month, machine_fee_*)
2. handleSaveCommissionRate():
   a. Valida taxa (0-100%)
   b. UPDATE team_members (commission_rate, commission_payment_frequency, commission_payment_day)
   c. RPC: recalculate_pending_commissions(p_professional_id, p_new_rate)
3. handleSaveSettlementDay(): UPSERT business_settings.commission_settlement_day_of_month
4. handleSaveMachineFee(): UPSERT business_settings (machine_fee_enabled, debit_fee_percent, credit_fee_percent)
```

> 🟢 **CONFIRMADO** — `CommissionsSettings.tsx:44-217`

#### SubscriptionSettings - Checkout Stripe

```
1. Pricing config: hardcoded com priceIds Stripe por região (BRL/EUR)
2. handleSubscribe(planId, priceId):
   a. supabase.functions.invoke('create-checkout-session') com priceId, successUrl, cancelUrl, mode='subscription'
   b. Redirect para data.url (Stripe Checkout)
3. Status: trial/active/past_due/canceled → badge visual
4. Trial: mostra dias restantes + botão "Começar Assinatura"
5. Active: botão "Alterar Plano"
```

> 🟢 **CONFIRMADO** — `SubscriptionSettings.tsx:74-100`

#### SecuritySettings - 2FA

```
1. use2FA(): lista fatores TOTP via supabase.auth.mfa.listFactors()
2. Enroll: supabase.auth.mfa.enroll({factorType: 'totp'}) → QR code
3. Verify: challenge + verify com código TOTP
4. Unenroll: supabase.auth.mfa.unenroll({factorId})
5. Alteração de senha: placeholder (disabled)
```

> 🟢 **CONFIRMADO** — `SecuritySettings.tsx:1-148`, `hooks/use2FA.ts:1-75`

#### AuditLogs - Consulta e Exportação

```
1. getAuditLogs(): RPC get_audit_logs com filtros (action, resource_type, start_date, end_date, limit)
2. Exibição: lista com cor por ação (CREATE=verde, UPDATE=azul, DELETE=vermelho, LOGIN/LOGOUT=roxo)
3. calculateDiff(): compara old_values vs new_values, gera lista de mudanças campo a campo
4. Exportação: generateCSV() → downloadLogsAsCSV()
5. Acesso: DevRouteGuard (apenas contas dev)
```

> 🟢 **CONFIRMADO** — `AuditLogs.tsx:1-359`, `lib/auditLogs.ts:1-184`

#### RecycleBin - Soft Delete e Restauração

```
1. loadDeletedItems(): RPC get_deleted_items(p_resource_type) → lista com resource_type, name, deleted_at, days_until_permanent
2. handleRestore(): RPC dinâmica mapeando resource_type → função:
   - appointments → restore_appointment
   - clients → restore_client
   - services → restore_service
   - financial_records → restore_financial_record
   - team_members → restore_team_member
3. Retenção: 30 dias. Countdown em vermelho se ≤7, laranja se ≤15, verde se >15
4. Acesso: DevRouteGuard
```

> 🟢 **CONFIRMADO** — `RecycleBin.tsx:1-278`

#### SettingsLayout - Roteamento e RBAC

```
1. Menu filtrado por role: staff vê apenas /configuracoes/servicos
2. Menu filtrado por isDev: itens devOnly (auditoria, erros, lixeira) ocultos para não-dev
3. Todas as rotas settings (exceto servicos) envolvidas por OwnerRouteGuard
4. Rota /configuracoes/financeiro redireciona para /configuracoes/comissoes
5. Sidebar desktop (64rem desktop) + drawer mobile + horizontal scroll nav
6. useBrutalTheme: aplica cores accent por userType (barber/beauty)
7. useAppTour: contexto 'settings' para tour guiado
```

> 🟢 **CONFIRMADO** — `SettingsLayout.tsx:1-157`, `App.tsx:185-197`, `constants.ts:14-32`

---

### Algoritmos e Lógica

#### Política de Cancelamento Templates

```
Templates hardcoded:
- flexible: "Cancelamentos com até 24h de antecedência sem custo..."
- moderate: "Cancelamentos com 48h de antecedência..."
- strict: "Cancelamentos com menos de 72h sem reembolso..."
Seleção altera textarea; texto editável manualmente.
```

> 🟢 **CONFIRMADO** — `GeneralSettings.tsx:47-51`

#### Upload de Imagem (logo/cover)

```
1. Validação de tamanho: máx 10MB
2. Storage buckets separados: 'logos' e 'covers'
3. Path: {userId}/{timestamp}.{ext}
4. Upload → getPublicUrl → atualiza preview
5. No delete explícito — sobrescreve ou nullifica
```

> 🟢 **CONFIRMADO** — `GeneralSettings.tsx:100-126`

#### Convite de Equipe (TeamSettings)

```
1. Gera link: {origin}/#/register?company={userId}
2. Mobile-first: navigator.share (Android/iOS) com fallback para clipboard
3. Fallback: document.execCommand('copy') para contexts não-HTTPS
4. Sem tabela team_invitations — convite é aberto
```

> 🟢 **CONFIRMADO** — `TeamSettings.tsx:61-110`

#### Serviços e Categorias (ServiceSettings)

```
1. Categorias: CRUD em service_categories com display_order
2. Serviços: service_categories inner join, modal de criação/edição
3. Predefined services: PREDEFINED_SERVICES por userType (barber/beauty)
4. Imagem de serviço: image_url opcional com preview
5. Filtro: serviços agrupados por category_id
6. Delete com confirm(), sem soft delete explícito
```

> 🟢 **CONFIRMADO** — `ServiceSettings.tsx:1-279`

#### Cálculo de Comissão com Taxa de Maquininha

```
Se machine_fee_enabled:
  comissão = valor × (commission_rate/100) × (1 - machine_fee_percent/100)
  → calculado server-side via recalculate_pending_commissions RPC
Senão:
  comissão = valor × (commission_rate/100)
```

> 🟢 **CONFIRMADO** — `CommissionsSettings.tsx:120-154`

#### Dia de Acerto Mensal

```
1. settlementDay: número 1-31 (default: 5)
2. Validação: se NaN ou fora de range, fallback para 5
3. Stored em business_settings.commission_settlement_day_of_month
4. Alerta no dashboard 2 dias antes
```

> 🟢 **CONFIRMADO** — `CommissionsSettings.tsx:89-118`

---

### Estruturas de Dados

#### Entidades

| Entidade | Tabela | Confiança |
|----------|--------|-----------|
| business_settings | business_settings | 🟢 CONFIRMADO |
| service_categories | service_categories | 🟢 CONFIRMADO |
| services | services | 🟢 CONFIRMADO |
| team_members | team_members | 🟢 CONFIRMADO |
| audit_logs | audit_logs | 🟢 CONFIRMADO |
| system_errors | system_errors | 🟢 CONFIRMADO |
| goal_settings | goal_settings | 🟢 CONFIRMADO |

#### business_settings

| Campo | Tipo | Obrigatório | Default | Confiança |
|-------|------|-------------|---------|-----------|
| user_id | uuid (FK profiles) | sim | — | 🟢 |
| business_hours | jsonb | não | null | 🟢 |
| cancellation_policy | text | não | null | 🟢 |
| public_booking_enabled | boolean | não | true | 🟢 |
| enable_upsells | boolean | não | false | 🟢 |
| enable_professional_selection | boolean | não | true | 🟢 |
| enable_email_reminders | boolean | não | true | 🟢 |
| enable_self_rescheduling | boolean | não | true | 🟢 |
| lead_time_hours | integer | não | 2 | 🟢 |
| max_bookings_per_day | integer | não | null | 🟢 |
| commission_settlement_day_of_month | integer | não | 5 | 🟢 |
| machine_fee_enabled | boolean | não | false | 🟢 |
| debit_fee_percent | numeric | não | 0 | 🟢 |
| credit_fee_percent | numeric | não | 0 | 🟢 |
| onboarding_completed | boolean | não | false | 🔴 LACUNA |
| onboarding_progress | jsonb | não | null | 🔴 LACUNA |

#### service_categories

| Campo | Tipo | Obrigatório | Default | Confiança |
|-------|------|-------------|---------|-----------|
| id | uuid | sim | gen_random_uuid | 🟢 |
| user_id | uuid (FK profiles) | sim | — | 🟢 |
| name | text | sim | — | 🟢 |
| display_order | integer | não | 0 | 🟢 |

#### services

| Campo | Tipo | Obrigatório | Default | Confiança |
|-------|------|-------------|---------|-----------|
| id | uuid | sim | gen_random_uuid | 🟢 |
| user_id | uuid (FK profiles) | sim | — | 🟢 |
| name | text | sim | — | 🟢 |
| description | text | não | null | 🟢 |
| price | numeric | sim | — | 🟢 |
| duration_minutes | integer | não | 30 | 🟢 |
| category_id | uuid (FK service_categories) | não | null | 🟢 |
| is_active | boolean | não | true | 🟢 |
| image_url | text | não | null | 🟢 |
| upsell_text | text | não | null | 🔴 LACUNA |
| combo_discount | numeric | não | null | 🔴 LACUNA |

#### audit_logs

| Campo | Tipo | Obrigatório | Default | Confiança |
|-------|------|-------------|---------|-----------|
| id | uuid | sim | gen_random_uuid | 🟢 |
| company_id | uuid | sim | — | 🟢 |
| user_id | uuid | não | null | 🟢 |
| user_name | text | não | null | 🟢 |
| action | text | sim | — | 🟢 |
| resource_type | text | sim | — | 🟢 |
| resource_id | uuid | não | null | 🟢 |
| old_values | jsonb | não | null | 🟢 |
| new_values | jsonb | não | null | 🟢 |
| ip_address | text | não | null | 🟢 |
| user_agent | text | não | null | 🟢 |
| metadata | jsonb | não | null | 🟢 |
| created_at | timestamptz | sim | now() | 🟢 |

#### system_errors

| Campo | Tipo | Obrigatório | Default | Confiança |
|-------|------|-------------|---------|-----------|
| id | uuid | sim | gen_random_uuid | 🟢 |
| error_message | text | sim | — | 🟢 |
| stack_trace | text | não | null | 🟢 |
| severity | text | sim | 'error' | 🟢 |
| context | jsonb | não | null | 🟢 |
| resolved | boolean | não | false | 🟢 |
| user_id | uuid | não | null | 🟢 |
| created_at | timestamptz | sim | now() | 🟢 |

---

### Metadados e Configurações

| Constante | Tipo | Uso | Confiança |
|-----------|------|-----|-----------|
| `SETTINGS_ITEMS` | SettingsItem[] | Menu lateral de settings com ícones e rotas | 🟢 |
| `PREDEFINED_SERVICES` | Record<string, ServiceDef[]> | Templates de serviços por userType (barber/beauty) | 🟢 |
| `policyTemplates` | Record<string, string> | Templates de política de cancelamento (flexible/moderate/strict) | 🟢 |

#### Feature Flags (em business_settings)

| Flag | Tipo | Default | Efeito | Confiança |
|------|------|---------|--------|-----------|
| public_booking_enabled | boolean | true | Habilita/desabilita agendamento público | 🟢 |
| enable_upsells | boolean | false | Sugere serviços extras no booking | 🟢 |
| enable_professional_selection | boolean | true | Permite cliente escolher profissional | 🟢 |
| enable_email_reminders | boolean | true | Envia lembrete 24h antes via Edge Function | 🟢 |
| enable_self_rescheduling | boolean | true | Permite reagendamento autônomo pelo cliente | 🟢 |
| machine_fee_enabled | boolean | false | Calcula comissão sobre valor líquido (com desconto de maquininha) | 🟢 |

---

### Dependências

- `supabase` — Auth, Storage, DB, Edge Functions
- `@stripe/stripe-js` — Checkout de assinatura
- `lucide-react` — Ícones
- `react-router-dom` — Roteamento e NavLink
- `contexts/AuthContext` — useAuth (user, userType, region, role, isDev)
- `hooks/use2FA` — 2FA integration
- `hooks/useSubscription` — Status de assinatura
- `hooks/useBrutalTheme` — Tema dual barber/beauty
- `hooks/useAppTour` — Tour guiado

---

### Complexidade: **MÉDIA**

O módulo de settings é um hub de configurações com 10 sub-páginas. A complexidade está na diversidade de domínios (perfil, serviços, comissões, segurança, auditoria) e nas interações cruzadas (business_settings é lido/escrito por múltiplas páginas). Highlights: convite via link aberto (sem tabela de convites), RLS com role-based filtering no menu, dual theme propagado, Stripe checkout com preços por região, soft delete com restore via RPC, auditoria com diff de mudanças. Não há lógica de negócio intrincada — a maioria das operações é CRUD direto com validação simples.

> ⚠️ **Checkpoint:** Análise do módulo `settings` concluída.

---

## Módulo: security/audit

### Visão Geral

Sistema de segurança, auditoria e monitoramento composto por três sub-sistemas: (1) Autenticação de Dois Fatores (2FA/TOTP via Supabase MFA), (2) Logs de Auditoria com rastreamento completo de ações (CREATE/UPDATE/DELETE/LOGIN/LOGOUT) e diff campo-a-campo, e (3) Monitoramento de Erros do Sistema com níveis de severidade. Inclui ainda o subsitema de Lixeira (soft delete com restauração em 30 dias). Acesso protegido por role: auditoria, erros e lixeira são `DevRouteGuard` (apenas dev), segurança é `OwnerRouteGuard` (apenas owner).

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `pages/settings/SecuritySettings.tsx` | Página de configuração de 2FA — listagem de fatores, ativação/desativação |
| `components/security/TwoFactorSetup.tsx` | UI de setup de 2FA em 3 passos (intro → scan QR → verify) |
| `hooks/use2FA.ts` | Hook para operações MFA do Supabase (enroll, verify, unenroll, listFactors) |
| `pages/settings/AuditLogs.tsx` | Página de visualização de audit logs com filtros e diff |
| `lib/auditLogs.ts` | Lib de CRUD de audit logs — criação, busca, formatação, diff, CSV export |
| `pages/settings/SystemLogs.tsx` | Página de monitoramento de erros com detalhamento técnico |
| `utils/Logger.ts` | Serviço de logger — loga para console e envia erros para Supabase |
| `pages/settings/RecycleBin.tsx` | Página de lixeira — listagem, filtro e restauração de soft-deleted items |

### Migrações SQL

| Arquivo | Descrição |
|---------|------------|
| `supabase/migrations/20260214_audit_system.sql` | Criação da tabela audit_logs, triggers, funções RPC, views |
| `supabase/migrations/20260214_soft_delete.sql` | Colunas deleted_at, funções soft_delete/restore/get_deleted_items, cleanup |
| `supabase/migrations/20260216_error_tracking.sql` | Tabela system_errors, RLS, função log_error RPC |
| `supabase/migrations/20260318_fix_audit_logs_integrity.sql` | Fix de vulnerabilidade de fabricação de logs — RLS rigorosa, service_role only |
| `supabase/migrations/20260320_us0303_fix_audit_logs_insert_policy.sql` | Fix adicional — WITH CHECK validando user_id = auth.uid() e company_id |
| `supabase/migrations/20260318_add_rpc_ownership_checks.sql` | Ownership checks em soft_delete_client/appointment, função validate_company_access, log_rpc_call |

---

### Fluxo de Controle

#### 2FA — Setup Flow (`TwoFactorSetup` → `use2FA`)

```
1. Intro: usuário clica "Configurar 2FA Agora"
2. enroll():
   a. supabase.auth.mfa.enroll({ factorType: 'totp' })
   b. Retorna { id, totp: { uri, secret } }
   c. Gera QR code via qrcode.toDataURL(totp.uri)
   d. Exibe QR code + opção de copiar secret
3. Verify:
   a. Usuário digita código de 6 dígitos
   b. supabase.auth.mfa.challenge({ factorId })
   c. supabase.auth.mfa.verify({ factorId, challengeId, code })
   d. Sucesso → onComplete callback
4. Unenroll (remover fator):
   a. Confirm dialog
   b. supabase.auth.mfa.unenroll({ factorId })
```

> 🟢 **CONFIRMADO** — `hooks/use2FA.ts:1-75`, `components/security/TwoFactorSetup.tsx:1-180`

#### Audit Logs — Busca (`AuditLogs` → `getAuditLogs`)

```
1. Usuário define filtros: action, resource_type, date_range
2. getAuditLogs(filters):
   a. supabase.rpc('get_audit_logs', { p_limit, p_offset, p_action, p_resource_type, p_start_date, p_end_date })
   b. RPC é SECURITY DEFINER — roda como service_role
   c. Filtra por company_id via JOIN com profiles
   d. Retorna AuditLog[] com user_name (JOIN com profiles)
3. calculateDiff(old_values, new_values):
   a. Compara chaves dos JSONB
   b. Retorna array de { field, old, new } para campos que divergem
4. Exportação CSV:
   a. downloadLogsAsCSV(logs, filename)
   b. Gera CSV com: Data/Hora, Usuário, Ação, Recurso, ID do Recurso
   c. Cria Blob e trigger de download
```

> 🟢 **CONFIRMADO** — `lib/auditLogs.ts:1-184`, `pages/settings/AuditLogs.tsx:1-359`

#### System Errors — Log (`Logger` → `log_error` RPC)

```
1. Logger.error(message, error?, context?):
   a. Console.error local (sempre)
   b. Monta errorData: { p_message, p_stack, p_component_stack, p_severity, p_context }
   c. p_context inclui: url, userAgent, rawError, ...context
   d. supabase.rpc('log_error', errorData) — fire-and-forget
2. Logger.critical(message, error?, context?):
   a. Console.error com prefixo [CRITICAL]
   b. Chama this.error com severity=critical no context
3. SystemLogs.tsx:
   a. supabase.from('system_errors').select('*').order('created_at', { ascending: false }).limit(50)
   b. Exibe lista com severity color-coded
   c. Detalhes expandíveis: context (JSON), stack_trace
```

> 🟢 **CONFIRMADO** — `utils/Logger.ts:1-78`, `pages/settings/SystemLogs.tsx:1-161`

#### Soft Delete / Lixeira (`RecycleBin` → RPCs)

```
1. Listar itens deletados:
   a. supabase.rpc('get_deleted_items', { p_resource_type })
   b. Retorna: { id, resource_type, name, deleted_at, days_until_permanent }
   c. Calcula days_until_permanent = 30 - EXTRACT(DAY FROM NOW() - deleted_at)
   d. Filtra deleted_at > NOW() - INTERVAL '30 days'
2. Restaurar item:
   a. Mapeia resource_type para função RPC:
      - appointments → restore_appointment
      - clients → restore_client
      - services → restore_service
      - financial_records → restore_financial_record
      - team_members → restore_team_member
   b. supabase.rpc(functionName, { p_id: item.id })
   c. Remove item da lista local após sucesso
3. Limpeza automática:
   a. cleanup_old_deleted_items() — DELETE WHERE deleted_at < NOW() - 30 days
   b. Deve ser executada por cronjob (não há scheduler automático)
```

> 🟢 **CONFIRMADO** — `pages/settings/RecycleBin.tsx:1-278`, `supabase/migrations/20260214_soft_delete.sql:1-410`

#### Audit Trail — Trigger Automático

```
1. trigger_audit_log() — SECURITY DEFINER trigger
   a. Dispara AFTER INSERT OR UPDATE OR DELETE em:
      - appointments, clients, financial_records, services, team_members, profiles
   b. Para cada operação:
      - Captura auth.uid(), TG_OP, TG_TABLE_NAME, COALESCE(NEW.id, OLD.id)
      - INSERT: old_values=NULL, new_values=row_to_json(NEW)
      - UPDATE: old_values=row_to_json(OLD), new_values=row_to_json(NEW)
      - DELETE: old_values=row_to_json(OLD), new_values=NULL
   c. Insere em audit_logs automaticamente
2. create_audit_log() — RPC SECURITY DEFINER para criação manual
3. get_audit_logs() — RPC SECURITY DEFINER com filtros
4. cleanup_old_audit_logs() — DELETE WHERE created_at < NOW() - 180 days
```

> 🟢 **CONFIRMADO** — `supabase/migrations/20260214_audit_system.sql:138-230`, `supabase/migrations/20260318_fix_audit_logs_integrity.sql:1-168`

---

### Algoritmos e Lógica

#### Diff de Mudanças (`calculateDiff`)

Calcula diferenças campo-a-campo entre `old_values` e `new_values` (JSONB):

```typescript
function calculateDiff(oldValues?, newValues?): { field, old, new }[]
  allKeys = Set([...Object.keys(oldValues), ...Object.keys(newValues)])
  para cada key em allKeys:
    se oldValues[key] !== newValues[key]:
      diff.push({ field: key, old: oldValues[key], new: newValues[key] })
  return diff
```

> 🟢 **CONFIRMADO** — `lib/auditLogs.ts:126-146`

#### Ownership Validation para Soft Delete

As funções RPC de soft_delete foram corrigidas na migração `20260318_add_rpc_ownership_checks.sql` para validar `company_id` do JWT contra o `company_id` do recurso:

```sql
v_jwt_company_id := (auth.jwt()->>'company_id')::UUID;
v_resource_company_id := (SELECT company_id FROM tabela WHERE id = p_id);
IF v_jwt_company_id != v_resource_company_id THEN
  RAISE EXCEPTION 'Unauthorized: Cannot delete from a different company.';
END IF;
```

> 🟢 **CONFIRMADO** — `supabase/migrations/20260318_add_rpc_ownership_checks.sql:82-173`

#### RLS Audit Logs — Evolução em 3 Etapas

1. **Criação original** (2026-02-14): RLS básica — usuários veem próprios logs, INSERT aberto (`WITH CHECK (true)`)
2. **Fix US-029** (2026-03-18): Vulnerabilidade de fabricação — RLS rigorosa, service_role only para INSERT/UPDATE/DELETE, trigger `prevent_direct_audit_insert()`
3. **Fix US-0303** (2026-03-20): FIX adicional — política INSERT para authenticated com `WITH CHECK (user_id = auth.uid() AND company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()))`

> 🟢 **CONFIRMADO** — `supabase/migrations/20260214_audit_system.sql`, `20260318_fix_audit_logs_integrity.sql`, `20260320_us0303_fix_audit_logs_insert_policy.sql`

---

### Estruturas de Dados

#### AuditLog (Frontend — `lib/auditLogs.ts`)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:----------:|-----------|
| id | string (UUID) | sim | Identificador único |
| user_id | string (UUID) | sim | ID do usuário que realizou a ação |
| user_name | string | não | Nome do usuário (JOIN com profiles) |
| action | string | sim | Tipo: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE, EMAIL_CHANGE, EXPORT, IMPORT, BACKUP |
| resource_type | string | sim | Nome da tabela afetada |
| resource_id | string (UUID) | não | ID do recurso afetado |
| old_values | Record<string, unknown> | não | Estado anterior (JSONB) |
| new_values | Record<string, unknown> | não | Estado novo (JSONB) |
| ip_address | string | não | Endereço IP da requisição |
| user_agent | string | não | User-Agent do navegador |
| metadata | Record<string, unknown> | não | Dados adicionais (JSONB) |
| created_at | string (TIMESTAMPTZ) | sim | Data/hora do evento |

> 🟢 **CONFIRMADO** — `lib/auditLogs.ts:3-16`

#### audit_logs (Database)

| Coluna | Tipo | Constraint | Descrição |
|--------|------|------------|-----------|
| id | UUID | PK DEFAULT gen_random_uuid() | Identificador |
| user_id | UUID | FK → auth.users(id) ON DELETE SET NULL | Usuário |
| company_id | UUID | NOT NULL (adicionado em US-029) | Multi-tenant |
| action | VARCHAR(50) | NOT NULL, CHECK (enum) | Tipo de ação |
| resource_type | VARCHAR(100) | NOT NULL, length > 0 | Tabela afetada |
| resource_id | UUID | NULLABLE | ID do recurso |
| old_values | JSONB | NULLABLE | Estado anterior |
| new_values | JSONB | NULLABLE | Estado novo |
| ip_address | INET | NULLABLE | IP da requisição |
| user_agent | TEXT | NULLABLE | User-Agent |
| request_method | VARCHAR(10) | NULLABLE | Método HTTP |
| request_path | TEXT | NULLABLE | Path da requisição |
| metadata | JSONB | DEFAULT '{}' | Metadados adicionais |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260214_audit_system.sql:9-44`

#### system_errors (Database)

| Coluna | Tipo | Constraint | Descrição |
|--------|------|------------|-----------|
| id | UUID | PK DEFAULT gen_random_uuid() | Identificador |
| error_message | TEXT | NOT NULL | Mensagem de erro |
| stack_trace | TEXT | NULLABLE | Stack trace |
| component_stack | TEXT | NULLABLE | React component stack |
| severity | VARCHAR(20) | CHECK (info/warning/error/critical), DEFAULT 'error' | Nível de severidade |
| context | JSONB | DEFAULT '{}' | Metadados (URL, browser, OS, etc.) |
| user_id | UUID | FK → auth.users(id) ON DELETE SET NULL | Usuário que reportou |
| resolved | BOOLEAN | DEFAULT FALSE | Se o erro foi resolvido |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW() | Timestamp |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260216_error_tracking.sql:9-19`

#### DeletedItem (Frontend — `RecycleBin.tsx`)

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:----------:|-----------|
| id | string (UUID) | sim | ID do item deletado |
| resource_type | string | sim | appointments, clients, services, financial_records, team_members |
| name | string | sim | Nome formatado do item |
| deleted_at | string (TIMESTAMPTZ) | sim | Data de exclusão |
| days_until_permanent | number | sim | Dias restantes até exclusão permanente (30 - dias passados) |

> 🟢 **CONFIRMADO** — `pages/settings/RecycleBin.tsx:13-19`

---

### Enums e Constantes

#### Audit Actions (`audit_logs.action` CHECK constraint)

``'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_CHANGE' | 'EMAIL_CHANGE' | 'EXPORT' | 'IMPORT' | 'BACKUP'``

#### Action Display Map (`formatAction`)

| Key | Value |
|-----|-------|
| CREATE | Criou |
| UPDATE | Atualizou |
| DELETE | Deletou |
| LOGIN | Fez login |
| LOGOUT | Fez logout |
| LOGIN_FAILED | Tentativa de login falhou |
| PASSWORD_CHANGE | Alterou senha |
| EMAIL_CHANGE | Alterou email |
| EXPORT | Exportou dados |
| IMPORT | Importou dados |
| BACKUP | Criou backup |

#### Resource Type Display Map (`formatResourceType`)

| Key | Value |
|-----|-------|
| appointments | Agendamento |
| clients | Cliente |
| financial_records | Registro Financeiro |
| services | Serviço |
| team_members | Membro da Equipe |
| profiles | Perfil |
| categories | Categoria |

#### Severity Levels (`SystemError.severity`)

`'info' | 'warning' | 'error' | 'critical'`

#### Resource Map (Restore — `RecycleBin`)

| resource_type | RPC de restauração |
|---------------|-------------------|
| appointments | restore_appointment |
| clients | restore_client |
| services | restore_service |
| financial_records | restore_financial_record |
| team_members | restore_team_member |

> 🟢 **CONFIRMADO**

---

### Metadados e Configurações

#### Rotas e Guards

| Rota | Guard | Descrição |
|------|-------|-----------|
| `/configuracoes/seguranca` | OwnerRouteGuard | Apenas owner pode configurar 2FA |
| `/configuracoes/auditoria` | DevRouteGuard | Apenas dev pode ver audit logs |
| `/configuracoes/erros` | DevRouteGuard | Apenas dev pode ver system errors |
| `/configuracoes/lixeira` | DevRouteGuard | Apenas dev pode acessar lixeira |

#### Requisição de Permissões DevRouteGuard

```
isDev && isAuthenticated → permite acesso
!isDev → redireciona para /configuracoes
!isAuthenticated → redireciona para /login
```

> 🟢 **CONFIRMADO** — `App.tsx:105-111, 193-196`

#### Requisição de Permissões OwnerRouteGuard

```
role !== 'staff' && isAuthenticated → permite acesso
role === 'staff' → redireciona para / com toast
!isAuthenticated → redireciona para /login
```

> 🟢 **CONFIRMADO** — `App.tsx:114-125`

#### Soft Delete Retenção

- Período de retenção: **30 dias** (hardcoded no frontend e nas RPCs)
- Limpeza automática: `cleanup_old_deleted_items()` — requer cronjob externo
- Audit logs retenção: **180 dias** — `cleanup_old_audit_logs()` — requer cronjob externo

> 🟡 **INFERIDO** — Não há evidência de cronjob configurado; as funções existem mas não são chamadas automaticamente

---

### Dependências

- `supabase` — Auth (MFA), DB (queries, RPCs)
- `@supabase/supabase-js` — `AuthMFAEnrollResponse`, `AuthMFAChallengeResponse` types
- `qrcode` — Geração de QR code para 2FA (QRCode.toDataURL)
- `lucide-react` — Ícones
- `contexts/AuthContext` — useAuth (userType, isDev)
- `components/BrutalCard`, `components/BrutalButton`, `components/SettingsLayout` — UI components

---

### Complexidade: **MÉDIA**

O módulo security/audit combina 4 sub-sistemas (2FA, auditoria, erros, lixeira) com lógica分别为 bem definida. A complexidade está na evolução das políticas RLS de audit_logs (3 migrações corrigindo vulnerabilidades), no sistema de triggers automático de auditoria que cobre 6 tabelas, e nas RPCs de soft delete com ownership validation via JWT. O 2FA segue o fluxo padrão Supabase MFA (enroll → challenge → verify). A lixeira tem mapeamento dinâmico resource_type → restore function. Pontos de atenção: ausência de cronjob para limpeza automática, e `get_audit_logs` filtra por `user_id = auth.uid()` (não company_id), exceto na versão US-029 que adicionou company_id check.

> ⚠️ **Checkpoint:** Análise do módulo `security/audit` concluída.

---

## Módulo: ai-assistant

### Visão Geral

Sistema de inteligência artificial multi-camada com 5 sub-sistemas: (1) **AI Assistant Chat** — chatbot contextual via OpenRouter (Gemini 2.0 Flash Lite) com system prompt baseado em dados do negócio, (2) **AIOS Diagnostic** — diagnóstico de churn com clientes em risco e receita recuperável via RPC Supabase, (3) **Semantic Memory (RAG)** — memória vetorial de clientes com embeddings Gemini (text-embedding-004, 768 dim) para busca semântica de preferências/estilos/hábitos, (4) **Content Calendar** — geração de calendário de conteúdo via OpenRouter com feriados brasileiros, (5) **Gemini Direct** — análise de fotos, geração de conteúdo social e campanhas de marketing via Gemini SDK. Inclui feature flag `aiosEnabled` no profile para ativação condicional.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `hooks/useAIAssistant.ts` | Hook do chatbot IA — envia mensagens via OpenRouter com system prompt contextual |
| `lib/ai-assistant-prompts.ts` | Templates de prompt — BusinessContext e buildSystemPrompt |
| `components/AIAssistantChat.tsx` | UI do chat flutuante (FAB + painel) com quick questions |
| `components/HelpButtons.tsx` | AIAssistantButton — mini-assistente mock contextual |
| `hooks/useAIOSDiagnostic.ts` | Hook para diagnóstico AIOS — get_aios_diagnostic RPC e log_aios_campaign |
| `components/dashboard/AIOSDiagnosticCard.tsx` | Card de alerta de clientes em risco e receita recuperável |
| `components/dashboard/AIOSCampaignStats.tsx` | Card de estatísticas de campanhas AIOS (enviadas × faturado de volta) |
| `components/dashboard/modals/AIOSStrategyModal.tsx` | Modal com "playbooks" de sucesso — dicas estáticas de estratégia |
| `lib/gemini.ts` | SDK Gemini — embeddings, cache semântico, análise de fotos, conteúdo social, calendário, campanhas |
| `lib/openrouter.ts` | Serviço OpenRouter — ideias Instagram, análise de fotos, tendências mensais |
| `hooks/useContentCalendar.ts` | Hook do calendário de conteúdo — geração via OpenRouter com feriados BR |
| `hooks/useSemanticMemory.ts` | Hook de memória semântica RAG — save e search via embeddings |
| `components/AISemanticInsights.tsx` | Componente de insights semânticos por cliente |

### Migrações SQL

| Arquivo | Descrição |
|---------|------------|
| `20260221_aios_foundation.sql` | Criação da tabela aios_logs e coluna aios_enabled em profiles |
| `20260221_aios_diagnostic_rpc.sql` | RPC get_aios_diagnostic com cálculo de churn e receita recuperável |
| `20260221_aios_roi_tracking.sql` | RPC log_aios_campaign para tracking de ROI de campanhas |
| `20260222_enable_vector_and_semantic_memory.sql` | Criação das tabelas ai_knowledge_base e client_semantic_memory (VECTOR 1536) |
| `20260222_fix_vector_dimensions_and_rpc.sql` | Correção de dimensões VECTOR para 768 (Gemini text-embedding-004) e RPCs match_kb_content e match_client_memories |
| `20260222_data_maturity_guard.sql` | Guard de data maturity — features AIOS só ativas com dados suficientes |
| `20260315_rag_2_0_tables.sql` | Tabelas RAG 2.0: rag_context_strategic, rag_context_architecture, rag_context_operational, rag_context_conversational |
| `20260318_fix_rls_client_semantic_memory.sql` | Fix RLS — client_semantic_memory isolada por company_id |

---

### Fluxo de Controle

#### AI Chat — useAIAssistant

```
1. Usuário digita mensagem e envia
2. buildContext() coleta:
   a. businessName, userType, region (AuthContext)
   b. currentMonthRevenue, profitMetrics (DashboardData)
   c. appointments, diagnostic (AIOSDiagnostic)
   d. avgTicket, topService (FinancialDoctor)
3. buildSystemPrompt(ctx) → prompt com:
   - Regras: pt-BR, max 3 frases, sem jargões, sugestões práticas
   - Dados reais do negócio (receita, clientes, serviços, etc.)
4. Envia para OpenRouter API:
   - model: google/gemini-2.0-flash-lite-001
   - max_tokens: 300, temperature: 0.7
   - Histórico: últimos 6 mensagens + system prompt
5. Resposta adicionada ao estado de messages
6. Erros → logger.error + mensagem fallback
```

> 🟢 **CONFIRMADO** — `hooks/useAIAssistant.ts:1-121`, `lib/ai-assistant-prompts.ts:1-50`

#### AIOS Diagnostic — useAIOSDiagnostic

```
1. useEffect dispara fetchDiagnostic() se user && aiosEnabled
2. supabase.rpc('get_aios_diagnostic', { p_establishment_id: user.id })
3. Retorna AIOSDiagnostic:
   - recoverable_revenue: receita potencial recuperável
   - at_risk_clients[]: clientes sem visita há 30+ dias
   - agenda_gaps[]: buracos na agenda
   - diagnostic_date: data do diagnóstico
4. logCampaignActivity(clientId, agentName, campaignType):
   - supabase.rpc('log_aios_campaign', { p_client_id, p_agent_name, p_campaign_type })
5. AIOSDiagnosticCard: renderiza se aiosEnabled && diagnostic.recoverable_revenue > 0
   - Botão "Recuperar Agora" → /crm
```

> 🟢 **CONFIRMADO** — `hooks/useAIOSDiagnostic.ts:1-77`, `components/dashboard/AIOSDiagnosticCard.tsx:1-69`

#### Semantic Memory (RAG) — useSemanticMemory + Gemini

```
1. saveMemory(clientId, observation, contextType):
   a. generateEmbedding(observation) → embedding[768] via Gemini text-embedding-004
   b. INSERT INTO client_semantic_memory (client_id, observation, embedding, context_type)
2. searchMemories(clientId, query, limit=5, threshold=0.5):
   a. generateEmbedding(query) → queryEmbedding[768]
   b. supabase.rpc('match_client_memories', { p_client_id, query_embedding, match_threshold, match_count })
   c. Retorna SemanticMemory[] com similarity score
3. AISemanticInsights: componente que busca preferências de cliente automaticamente
   - searchMemories(clientId, 'preferências, estilo, gostos, hábitos', 3, 0.4)
   - Renderiza como cards com ícone por context_type e % de similaridade
4. Semantic Cache (lib/gemini.ts):
   a. getSemanticCache(query, threshold=0.92) → busca em ai_knowledge_base
   b. saveSemanticCache(query, response, metadata) → salva resposta em ai_knowledge_base
   c. Usado por generateSocialContent() e generateContentCalendar() para reduzir chamadas à API
```

> 🟢 **CONFIRMADO** — `hooks/useSemanticMemory.ts:1-80`, `lib/gemini.ts:34-92`, `components/AISemanticInsights.tsx:1-108`

#### Content Calendar — useContentCalendar

```
1. generatePosts(year, month):
   a. getDaysInMonth(year, month) + getHolidaysForMonth(month)
   b. Prompt para OpenRouter: "Gere N posts para Instagram, um por dia"
   c. Adapta para feriados brasileiros quando houver
   d. response_format: { type: 'json_object' }
   e. max_tokens: 4000
   f. Mapeia para CalendarPost com gradients cíclicos
2. Não usa cache semântico (cada mês é diferente)
```

> 🟢 **CONFIRMADO** — `hooks/useContentCalendar.ts:1-105`

#### Gemini Direct — gemini.ts

```
1. generateEmbedding(text):
   - genAI.getGenerativeModel({ model: 'text-embedding-004' })
   - model.embedContent(text) → number[] (768 dim)
2. analyzePhoto(imageBase64):
   - genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
   - Retorna GeminiPhotoAnalysis (suggestions, background_options, quality_score, recommended_edits)
3. generateSocialContent(imageDescription, businessType, businessName, customRequest?):
   - modelo: gemini-2.0-flash-lite
   - semantic cache → getSemanticCache() → se hit, retorna sem chamar API
   - Gera: caption, hashtags[], cta
   - Salva no cache → saveSemanticCache()
4. generateContentCalendar(businessType, businessName):
   - modelo: gemini-2.0-flash-lite (via REST API direta com API key)
   - semantic cache
   - Gera: GeminiCalendarDay[] (7 dias)
5. analyzeCampaignOpportunities(clients, appointments, businessType, businessName):
   - modelo: gemini-2.0-flash-lite
   - Analisa dados reais: aniversários, clientes inativos, dias de pico
   - Retorna: GeminiMarketingCampaign[] (3-5 campanhas)
6. imageToBase64(file): utilitário de conversão
```

> 🟢 **CONFIRMADO** — `lib/gemini.ts:1-389`

---

### Algoritmos e Lógica

#### Semantic Cache (Token Stewardship)

Sistema de cache semântico para reduzir chamadas à API Gemini:

```
1. Antes de chamar a API, gera embedding da query
2. Busca em ai_knowledge_base via match_kb_content (cosine similarity threshold=0.92)
3. Se match encontrado (similarity > 0.92): retorna resposta cacheada
4. Se não: chama API, salva resposta + embedding em ai_knowledge_base
5. Próxima busca com query similar retorna do cache
```

> 🟢 **CONFIRMADO** — `lib/gemini.ts:49-92`

#### AIOS Diagnostic Algorithm

A RPC `get_aios_diagnostic` calcula:
- Clientes em risco: sem visita há 30+ dias
- Receita recuperável: soma de avg_ticket × at_risk_clients
- Agenda gaps: dias com poucos agendamentos

> 🟡 **INFERIDO** — Baseado no hook e component; RPC não foi lida diretamente

#### Data Maturity Guard

Features AIOS são habilitadas progressivamente conforme volume de dados:
- O guard verifica quantidade de appointments e clientes antes de ativar

> 🟡 **INFERIDO** — Referência em `20260222_data_maturity_guard.sql`

---

### Estruturas de Dados

#### BusinessContext (System Prompt)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| businessName | string | Nome do negócio |
| userType | 'barber' \| 'beauty' | Segmento |
| currentMonthRevenue | number | Receita do mês atual |
| previousMonthRevenue | number | Receita do mês anterior |
| monthlyGoal | number | Meta mensal |
| totalClients | number | Total de clientes |
| appointmentsThisMonth | number | Agendamentos no mês |
| clientsAtRisk | number | Clientes em risco (churn) |
| avgTicket | number | Valor médio por atendimento |
| topService | string | Serviço mais popular |
| emptySlots | number | Horários vazios |
| currencySymbol | string | 'R$' ou '€' baseado em region |

> 🟢 **CONFIRMADO** — `lib/ai-assistant-prompts.ts:6-19`

#### AIOSDiagnostic

| Campo | Tipo | Descrição |
|-------|------|-----------|
| recoverable_revenue | number | Receita potencial recuperável |
| at_risk_clients | Array | Clientes sem visita há 30+ dias |
| at_risk_clients[].id | string | ID do cliente |
| at_risk_clients[].name | string | Nome do cliente |
| at_risk_clients[].phone | string | Telefone |
| at_risk_clients[].last_visit | string | Data da última visita |
| at_risk_clients[].total_visits | number | Total de visitas |
| at_risk_clients[].avg_ticket | number | Ticket médio |
| at_risk_clients[].days_since_last_visit | number | Dias desde última visita |
| agenda_gaps | Array | Buracos na agenda |
| agenda_gaps[].date | string | Data |
| agenda_gaps[].appointments_count | number | Agendamentos no dia |
| agenda_gaps[].gap_type | string | Tipo de gap |
| diagnostic_date | string | Data do diagnóstico |

> 🟢 **CONFIRMADO** — `hooks/useAIOSDiagnostic.ts:6-22`

#### SemanticMemory

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | UUID |
| client_id | string | FK → clients.id |
| observation | string | Texto da observação/preferência |
| context_type | 'style' \| 'preference' \| 'habit' | Tipo de contexto |
| created_at | string | Timestamp |
| similarity | number (optional) | Score de similaridade coseno |

> 🟢 **CONFIRMADO** — `hooks/useSemanticMemory.ts:4-11`

#### ChatMessage

| Campo | Tipo | Descrição |
|-------|------|-----------|
| role | 'user' \| 'assistant' | Papel na conversa |
| content | string | Conteúdo da mensagem |
| timestamp | Date | Timestamp |

> 🟢 **CONFIRMADO** — `hooks/useAIAssistant.ts:12-16`

#### CalendarPost

| Campo | Tipo | Descrição |
|-------|------|-----------|
| day | number | Dia do mês |
| caption | string | Legenda do Instagram |
| hashtags | string | Hashtags separadas |
| theme | string | Tema do post |
| holiday | string? | Feriado (opcional) |
| bgGradient | string | Classe CSS do gradiente |
| textColor | string | Classe CSS da cor do texto |

> 🟢 **CONFIRMADO** — `hooks/useContentCalendar.ts:10-18`

---

### Enums e Constantes

#### AI Models

| Serviço | Modelo | Dimensão Embedding |
|---------|--------|--------------------|
| OpenRouter Chat | google/gemini-2.0-flash-lite-001 | — |
| Gemini Embedding | text-embedding-004 | 768 |
| Gemini Vision | gemini-1.5-flash | — |
| Gemini Content | gemini-2.0-flash-lite | — |

#### Semantic Memory Context Types

`'style' | 'preference' | 'habit'`

#### Cache Thresholds

- Semantic Cache hit: 0.92 (getSemanticCache)
- Memory search threshold: 0.5 (searchMemories default)
- AIOS Memory search threshold: 0.4 (AISemanticInsights)

#### Quick Questions (AI Chat)

```typescript
['Como foi meu mês?', 'Tenho clientes para recuperar?', 'Qual meu melhor serviço?', 'Como melhorar meu faturamento?']
```

---

### Metadados e Configurações

#### Feature Flag

`aiosEnabled` (boolean, default: false) — coluna em `profiles`, controla visibilidade dos componentes AIOS.

> 🟢 **CONFIRMADO** — `supabase/migrations/20260221_aios_foundation.sql:6`, `components/dashboard/AIOSDiagnosticCard.tsx:16`

#### API Keys (Environment)

| Variável | Serviço | Uso |
|----------|---------|-----|
| VITE_OPENROUTER_API_KEY | OpenRouter | Chat AI, Content Calendar, Photo Analysis, Monthly Trends |
| VITE_GEMINI_API_KEY | Google Gemini | Embeddings, Social Content, Calendar, Photo Analysis, Campaigns |

#### Integrações

- **OpenRouter**: chat completions (model: google/gemini-2.0-flash-lite-001)
- **Google Gemini**: embeddings (text-embedding-004), vision (gemini-1.5-flash), content (gemini-2.0-flash-lite)
- **Supabase**: RPCs (get_aios_diagnostic, log_aios_campaign, match_kb_content, match_client_memories), tabelas (ai_knowledge_base, client_semantic_memory, aios_logs, rag_context_*)

#### Route Guard

AIAssistantChat é renderizado globalmente (FAB fixo) sem guard específico. AIOSDiagnosticCard é condicional pelo `aiosEnabled`. AIAssistantButton é um mini-chat mock usado em Finance.

---

### Dependências

- `@google/generative-ai` — Gemini SDK (embeddings, vision, content)
- `supabase` — DB, RPCs, vector search (pgvector)
- `lucide-react` — Ícones
- `contexts/AuthContext` — useAuth (user, businessName, userType, region, aiosEnabled)
- `hooks/useDashboardData` — currentMonthRevenue, profitMetrics, appointments
- `hooks/useAIOSDiagnostic` — diagnostic, logCampaignActivity
- `utils/brazilianHolidays` — getHolidaysForMonth, getDaysInMonth
- `utils/Logger` — logger.error
- `utils/formatters` — formatCurrency

---

### Complexidade: **ALTA**

O módulo ai-assistant é o mais complexo do sistema. Combina múltiplas integrações de IA (OpenRouter, Gemini SDK), sistema RAG com embeddings vetoriais (pgvector), cache semântico para economia de tokens, diagnóstico de churn com dados reais, geração de conteúdo social com cache, calendário de conteúdo com feriados brasileiros, análise de fotos, e campanhas de marketing. A complexidade está em: (1) orquestração de múltiplos providers de IA com fallbacks, (2) sistema de embeddings 768-dimensionais com busca por similaridade coseno, (3) feature flag progressiva (aiosEnabled + data maturity guard), (4) evolução do RLS em client_semantic_memory (3 migrações corrigindo isolamento multi-tenant), (5) cache semântico com threshold de 0.92 para evitar chamadas API duplicadas. Pontos de atenção: API keys expostas no frontend (VITE_*), embeddings sem batch, e dependência de RPCs que podem não estar disponíveis (fallback silencioso em useAIOSDiagnostic).

> ⚠️ **Checkpoint:** Análise do módulo `ai-assistant` concluída.

---

## Módulo: supabase-backend

### Visão Geral

Infraestrutura backend completa em Supabase com 96 migrações, 2 Edge Functions (Deno/TypeScript), e sistema RLS multi-tenant evoluído ao longo de 5 fases. O backend cobre: schema core com 15+ tabelas, 50+ RPCs, políticas RLS em 18 migrações (incluindo migração massiva para company-isolation), sistema de storage com 5 buckets, triggers de auto-auditoria, rate limiting anti-brute-force, e mecanismos de clean-up.

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|------------------|
| `supabase/functions/create-checkout-session/index.ts` | Edge Function Stripe — cria checkout session, gerencia customer, retorna URL |
| `supabase/functions/send-appointment-reminder/index.ts` | Edge Function Resend — envia lembrete de agendamento por email |
| `supabase/migrations/20260218_reset_and_setup.sql` | Schema core — profiles, business_settings, team_members, services + auth trigger |
| `supabase/migrations/20260218_full_schema_fix.sql` | Schema completo — todas as tabelas, RLS, handle_new_user, storage buckets |
| `supabase/migrations/20260307_us015b_multi_user_rls.sql` | **Migração crítica** — multi-tenant foundation: role/company_id em profiles, get_auth_company_id(), get_auth_role() |
| `supabase/migrations/20260129_consolidate_rls_final.sql` | Consolidação RLS — drops ALL policies, cria company-isolation para cada tabela |
| `supabase/migrations/20260218_security_fix.sql` | Reset RLS com user-isolation + fix get_dashboard_stats |

### Migrações por Categoria (96 total)

#### 1. Core Schema (10 migrações)
Criação das tabelas principais: profiles, business_settings, team_members, services, service_categories, service_upsells, onboarding_progress, activation milestones. Storage buckets: logos, covers, service_images, team_photos, client_photos. Auth trigger handle_new_user.

#### 2. RLS Policies (18 migrações) — 🟢 **Área de maior complexidade**
Evolução de RLS em 5 fases:
- **Fase 1**: user-isolation (uid = user_id)
- **Fase 2**: owner-only para settings/finance/marketing
- **Fase 3**: public access para bookings/queue
- **Fase 4**: strict financial isolation
- **Fase 5**: company-isolation (get_auth_company_id()) ← **migração crítica US-015B**

Migrações notáveis:
- `20260307_us015b_multi_user_rls.sql` — Adiciona role/company_id a profiles, cria helpers get_auth_company_id() e get_auth_role(), substitui todas as políticas user-isolation por company-isolation
- `20260320_us0302_remove_permissive_rls_policy.sql` — Remove todas as políticas permissivas de profiles
- `20260321_fix_public_bookings_rls_definitive.sql` — RLS definitivo para public_bookings (owner-manage + anon-insert)
- `20260417_staff_commission_rls.sql` — Staff vê apenas próprias comissões via staff_user_id

#### 3. RPCs/Functions (9 migrações)
- `get_available_slots()` — Geração de slots com business hours + verificação de conflito
- `create_secure_booking()` — Insert atômico com proteção contra double-booking (evoluído em 3 versões: UUID params, TEXT params, custom_service_name)
- `complete_appointment()` e `complete_appointment_v2()` — Marca como concluído com checkout fields
- `get_commissions_due()` — Comissões devidas por período com earnings mensais
- `upsert_onboarding_progress()` — Progress tracking do wizard
- `update_commission_record()` — Com auth.uid() ownership check

#### 4-5. Finance (19 migrações)
Sistema financeiro com 5 versões de `get_finance_stats`:
- v1: get_finance_stats(UUID, date, date)
- v2: get_finance_stats(TEXT, TEXT, TEXT) — com AIOS attribution
- v3: get_finance_stats(TEXT, TEXT, TEXT) — COALESCE safety, NULLIF TRIM
- v4: get_dashboard_stats — com data maturity + financial doctor
- v5: clarify_dashboard_revenue — separa completed revenue de scheduled pipeline

Outros RPCs: mark_expense_as_paid, get_monthly_finance_history, recalculate_pending_commissions, get_dashboard_actions.
Tabelas: commission_payments, finance_records com machine_fee.

#### 6. Booking/Appointments (8 migrações)
- `create_secure_booking()` — 3 versões (UUID, TEXT, custom_service)
- `public_clients` — tabela separada para clientes do booking público
- `queue_entries` — fila virtual com position tracking
- `get_queue_position()` — posição na fila
- `find_client_by_phone_normalized()` — deduplicação de telefone
- `get_active_booking_by_phone()` — previne agendamento duplicado
- `get_booking_by_id()` — para edit flow com validação de telefone
- `get_full_dates()` — datas indisponíveis no calendário
- `mirror_public_client_to_crm()` — upsert automático de public_client → clients

#### 7. Client/CRM (5 migrações)
- Campos adicionais: photo_url, rating, last_visit, next_prediction, is_active, notes, source
- hair_records table
- UNIQUE(user_id, phone) constraint com dedup
- `get_client_insights()` — crescimento mensal, top 10, retenção

#### 8. Dashboard/Stats (6 migrações)
- `get_dashboard_stats()` — 5 versões (v1→v5)
- `get_dashboard_insights()` — top barbers/services, appointments by day
- `get_dashboard_actions()` — recommended actions com AIOS attribution
- goal_settings table — metas mensais por mês/ano
- Data maturity score — progressivo conforme volume de dados

#### 9. Security/Audit (2 migrações, fora as já cobertas)
- `20260214_rate_limiting.sql` — rate_limits UNLOGGED table + token bucket + check_login_rate_limit
- `20260216_factory_reset.sql` — TRUNCATE de todas as tabelas operacionais + email confirmation trigger

#### 10. Onboarding (2 migrações)
- onboarding_progress table (current_step, completed_steps[], step_data JSONB) + RLS
- activation_completed/activated_at em profiles

#### 11. Marketing (2 migrações)
- content_calendar + marketing_assets tables
- `get_marketing_opportunities()` — empty schedule slots + churn-risk clients

#### 12. Misc (3 migrações)
- Índices críticos CONCURRENTLY (business_slug, company+status, professional+date)
- staff_user_id em team_members (link auth account)
- search_path = public em SECURITY DEFINER functions

---

### Edge Functions

#### create-checkout-session (Deno)
```
1. Recebe: { priceId, successUrl, cancelUrl, mode }
2. Autentica via Authorization header
3. Busca stripe_customer_id em profiles
4. Se não encontrado: busca por email no Stripe ou cria novo customer
5. Salva stripe_customer_id em profiles
6. Cria checkout session com allow_promotion_codes
7. Retorna: { url: session.url }
```

> 🟢 **CONFIRMADO** — `supabase/functions/create-checkout-session/index.ts:1-117`

#### send-appointment-reminder (Deno + Resend)
```
1. Autentica via SERVICE_ROLE_KEY
2. Busca bookings confirmados para amanhã
3. Filtra: business_settings.enable_email_reminders = true
4. Para cada booking:
   a. Extrai clientEmail, clientName, serviceName, businessName
   b. Gera HTML template com dados do agendamento
   c. Envia via Resend (from: nao-responda@seudominio.com)
   d. Marca resultado (sent/failed/skipped_no_email)
5. Retorna: { results: [...] }
```

> 🟡 **INFERIDO** — Email domain "seudominio.com" é placeholder. Sem coluna reminder_sent_at implementada (comentada no código).

---

### Estrutura de Dados — Tabelas Principais (não cobertas em outros módulos)

#### onboarding_progress

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|:---------:|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK → auth.users.id |
| current_step | integer | sim | 0 | Passo atual do wizard |
| completed_steps | text[] | não | '{}' | Array de steps completados |
| step_data | jsonb | não | '{}' | Dados do wizard por step |
| created_at | timestamptz | sim | now() | Timestamp |
| updated_at | timestamptz | sim | now() | Última atualização |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260320_onboarding_wizard.sql`

#### goal_settings

| Campo | Tipo | Obrigatório | Padrão | Descrição |
|-------|------|:---------:|--------|-----------|
| id | uuid | sim | gen_random_uuid() | PK |
| user_id | uuid | sim | — | FK → auth.users.id |
| month | integer | sim | — | Mês (1-12) |
| year | integer | sim | — | Ano |
| revenue_goal | numeric | não | null | Meta de faturamento |
| clients_goal | integer | não | null | Meta de clientes |
| created_at | timestamptz | sim | now() | Timestamp |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260306_goal_settings_and_dashboard_stats_v4.sql`

#### commission_payments

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| company_id | uuid | FK → profiles.company_id |
| professional_id | uuid | FK → team_members.id |
| period_start | date | Início do período de acerto |
| period_end | date | Fim do período de acerto |
| total_commission | numeric | Valor total de comissões no período |
| status | text | 'pending' ou 'paid' |
| paid_at | timestamptz | Data do pagamento |
| created_at | timestamptz | Timestamp |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260416_commission_payments.sql`

#### rate_limits

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| identifier | text | Email ou IP |
| action_type | text | 'login' |
| attempt_count | integer | Número de tentativas |
| last_attempt_at | timestamptz | Última tentativa |
| created_at | timestamptz | Timestamp |

> 🟢 **CONFIRMADO** — `supabase/migrations/20260214_rate_limiting.sql`

---

### Algoritmos e Lógica

#### Token Bucket Rate Limiting

```
check_login_rate_limit(p_email):
  1. Busca rate_limits WHERE identifier = p_email AND action_type = 'login'
  2. Se não encontrado: INSERT (attempt_count = 1)
  3. Se encontrado E attempt_count >= 5 E last_attempt_at < NOW() - INTERVAL '1 minute':
     → RESET: attempt_count = 1, last_attempt_at = NOW()
     → Retorna { allowed: true }
  4. Se encontrado E attempt_count >= 5:
     → Retorna { allowed: false, message: 'Muitas tentativas... aguarde 1 minuto' }
  5. Se encontrado E attempt_count < 5:
     → INCREMENT attempt_count, UPDATE last_attempt_at
     → Retorna { allowed: true }
```

> 🟢 **CONFIRMADO** — `supabase/migrations/20260214_rate_limiting.sql`

#### Multi-tenant RLS Evolution (5 fases)

```
Fase 1: user_id isolation
  USING (user_id = auth.uid())
  Problema: staff não consegue acessar dados do owner

Fase 2: owner-only
  USING (user_id = auth.uid()) para settings/finance/marketing
  Problema: staff sem acesso a nada

Fase 3: public access
  Para bookings/queue (anon pode inserir)
  Problema: sem isolamento multi-tenant

Fase 4: strict financial isolation
  Finance records owner-only
  Problema: staff não vê comissões

Fase 5: company-isolation (US-015B) ← atual
  USING (company_id = get_auth_company_id())
  get_auth_company_id() extrai company_id do JWT
  get_auth_role() extrai role do JWT
  Staff vê dados da empresa, owner vê tudo
```

> 🟢 **CONFIRMADO** — `20260307_us015b_multi_user_rls.sql`

#### Double-Booking Prevention

```
create_secure_booking(p_data):
  1. LOCK appointments WHERE professional_id = p_professional_id
     AND appointment_time::date = p_appointment_time::date
  2. Verifica se horário já está ocupado
  3. Se disponível: INSERT em appointments + cria finance_record
  4. Se ocupado: RAISE EXCEPTION 'Horário não disponível'
```

> 🟢 **CONFIRMADO** — `20260130_fix_availability_rpc.sql`, `20260217_fix_secure_booking_resilient.sql`

---

### Dependências (Backend)

- **Supabase** — Auth, Postgres, Storage, Edge Functions, Realtime, pgvector
- **Stripe** — Checkout sessions via Edge Function (Deno)
- **Resend** — Email reminders via Edge Function (Deno)
- **Google Gemini** — Embeddings (text-embedding-004, 768 dim)
- **OpenRouter** — Chat completions (gemini-2.0-flash-lite-001)

---

### Complexidade: **MUITO ALTA**

O módulo supabase-backend é o mais complexo do sistema. 96 migrações em 12 categorias, com evolução de RLS em 5 fases (culminando em company-isolation), 50+ RPCs SECURITY DEFINER, sistema de rate limiting token bucket, triggers de auto-audit, Edge Functions para Stripe e Resend, índices vetoriais ivfflat (768 dim), data maturity guards, e múltiplas correções de bugs de segurança (3 migrações dedicadas a audit_logs). Destaques de complexidade: (1) migração US-015B que redefine TODAS as políticas RLS de user-isolation para company-isolation, (2) create_secure_booking com 3 versões corrigindo bugs de typed parameters, (3) get_finance_stats com 5 versões iterativas (v1→v5), (4) factory reset que trunca todas as tabelas operacionais.

> ⚠️ **Checkpoint:** Análise do módulo `supabase-backend` concluída.
