# Booking Público (public-booking)

## Visão Geral
Fluxo conversacional de reserva pública onde o cliente final acessa um link compartilhável (`/book/:slug`) do estabelecimento, escolhe serviços, data, profissional e envia uma reserva. A reserva fica pendente até o owner aceitar, momento em que migra para `appointments`. Suporta upload de foto, edição de reserva existente, real-time de status, prevenção de duplicata por telefone e auto-atribuição de profissional.

## Responsabilidades
- Renderizar página pública de booking por `slug` do estabelecimento
- Buscar configurações, serviços, profissionais e galeria do negócio
- Guiar cliente em fluxo conversacional de 4 steps: serviços → data/hora → contato → revisão
- Calcular preço total e duração com base nos serviços selecionados
- Verificar disponibilidade de horários via RPC `get_available_slots`
- Prevenir booking duplicado por telefone via RPC `get_active_booking_by_phone`
- Auto-atribuir profissional quando "qualquer" é selecionado
- Registrar cliente público (`public_clients`) e espelhar para CRM
- Permitir edição de reserva existente (`is_edit` + `original_appointment_time`)
- Subscrever real-time para atualização de status (pending → confirmed/cancelled)

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| slug | string | Slug do estabelecimento (profiles.business_slug) |
| service_ids | uuid[] | IDs dos serviços selecionados |
| selectedDate | Date | Data escolhida |
| selectedTime | string | Horário escolhido ("HH:MM") |
| professional_id | uuid \| 'any' | Profissional ou "qualquer" |
| customer_name | string | Nome do cliente |
| customer_phone | string | Telefone |
| customer_email | string \| null | Email |
| acceptedPolicy | boolean | Aceite da política de cancelamento |
| customer_photo | File \| null | Foto de perfil (upload opcional) |
| is_edit | boolean | Flag de edição |
| original_appointment_time | ISO datetime | Âncora para UPDATE do appointment original |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| PublicBooking | object | Reserva criada com status pending |
| available_slots | string[] | Horários disponíveis no formato "HH:MM" |
| full_dates | string[] | Datas completamente lotadas (YYYY-MM-DD) |
| BusinessProfile | object | Dados do estabelecimento |

## Regras de Negócio
- **R12** Reservas públicas (`public_bookings`) têm status `pending` até aprovação do owner, quando viram `confirmed`. 🟢
- **R13** Cliente pode editar reserva pública via link (flag `is_edit`). O sistema busca o agendamento original por `original_appointment_time`. 🟢
- **R14** Ao aceitar booking, o sistema tenta encontrar cliente existente por telefone (3 formatos: raw, BR, PT). Se não encontrar, cria novo. 🟢
- **R22** Prevenção de duplicata: `get_active_booking_by_phone` RPC impede booking duplicado para mesmo telefone. 🟢
- **R23** Espelhamento de cliente público: `mirror_public_client_to_crm` RPC sincroniza `public_clients` → `clients` (SECURITY DEFINER). 🟢
- **R24** Filtro de timezone: datas vindas de URL são ajustadas com `getTimezoneOffset` para evitar erro de dia. 🟢
- **R30** Horários de agendamento são gerados em intervalos de 30 minutos, das 8h às 20h. 🟢
- **R31** Auto-atribuição de profissional: se 1 pro no time, atribui automaticamente; se múltiplos e "qualquer", usa `get_first_available_professional`. 🟢
- **R32** Upload de foto: enviado para bucket `client_photos` com path `{businessId}/{timestamp}.{ext}`. 🟢
- **R33** Registro de cliente público é best-effort: falha no `public_clients` não bloqueia o booking. 🟢
- **R34** Real-time: subscrição no canal `booking_status_{id}` para atualização de status. 🟢
- **R35** Se `enable_professional_selection = false`, não exibe seletor de profissional. 🟢
- **R36** Se `enable_upsells = true`, exige cross-sell de serviços complementares. 🟢

## Fluxo Principal

### Criação de Booking Público
1. Cliente acessa `/book/:slug`
2. Busca `BusinessProfile` por `slug`: nome, tipo, rating, galeria, configurações
3. Carrega serviços ativos + categorias + profissionais ativos
4. Step 1 — Serviços: cliente seleciona 1+ serviços (toggle multi-select)
   - Se `enable_upsells`: exibe serviços complementares
   - Calcula preço total e duração
5. Step 2 — Data/Hora: `CalendarPicker` + `TimeGrid`
   - Chama RPC `get_full_dates` para marcar dias lotados
   - Ao selecionar data: chama `get_available_slots` considerando duração total
6. Step 3 — Contato: nome, telefone, email, foto, aceite de política
   - Upload de foto para `client_photos` (best-effort)
7. Step 4 — Revisão: resumo de serviços, data, profissional, preço
8. Submit (`handleSubmit`):
   - Valida campos obrigatórios
   - Registra cliente em `public_clients` (best-effort, não bloqueia)
   - Se NÃO editando: verifica duplicata via `get_active_booking_by_phone`
   - Se `professional='any'`: chama `get_first_available_professional`
   - Se EDITANDO: UPDATE `public_bookings` com `is_edit=true`
   - Se NOVO: INSERT em `public_bookings` com `status='pending'`
9. Real-time: subscreve no canal do booking
10. Aguarda aprovação do owner — status muda para `confirmed` ou `cancelled`

### Edição de Booking
1. Cliente acessa `/book/:slug?edit=BOOKING_ID`
2. Sistema busca `public_booking` por ID
3. Popula estado com dados existentes
4. Seta `originalTimeISO` como âncora
5. Cliente altera serviços, data ou profissional
6. Submit com `editingBookingId` + `is_edit=true`
7. UPDATE `public_bookings` com novos dados
8. Owner recebe como novo booking pending
9. Ao aceitar, `Agenda.handleAcceptBooking` detecta `is_edit`
10. Busca appointment original por `client_id` + `original_appointment_time`
11. Se encontrado: UPDATE; se não: INSERT novo

## Fluxos Alternativos
- **[Booking duplicado]:** `get_active_booking_by_phone` retorna booking ativo → exibe booking existente com opção de edição. 🟢
- **[Upload de foto falha]:** Alerta, mas prossegue sem foto. 🟢
- **[Registro public_clients falha]:** Não bloqueia booking. Cliente é criado depois pelo owner ao aceitar. 🟢
- **[Professional='any' e 1 pro no time]:** Atribui automaticamente sem mostrar seletor. 🟢
- **[Profissional selecionado não disponível no horário]:** `get_available_slots` filtra por `professional_id`; se não houver slots, exibe mensagem. 🟢
- **[Owner rejeita booking]:** Status muda para `cancelled`. Cliente vê tela de cancelado. 🟢

## Cenários de Borda

### B1 — Cliente tenta booking com telefone já em uso por outro cliente
- **Condição:** Dois clientes diferentes usam o mesmo telefone (ex: telefone da casa, empresa).
- **Comportamento:** `get_active_booking_by_phone` retorna booking ativo para qualquer cliente com aquele telefone. Segundo cliente vê tela de booking existente.
- **Impacto:** Cliente legítimo pode ser impedido de agendar se outra pessoa usou o mesmo telefone.
- **Risco:** Baixo — telefone é identificador único por negócio (`unique(business_id, phone)`).

### B2 — Edição de booking após owner já ter aceitado
- **Condição:** Cliente edita booking (`is_edit=true`) mas o owner já aceitou o booking original e criou o appointment.
- **Comportamento:** Sistema cria NOVO `public_booking` com `is_edit=true`. Owner recebe como novo pending. Ao aceitar, busca appointment original — ENCONTRA (porque foi criado). Faz UPDATE no appointment existente.
- **Impacto:** Appointment original é sobrescrito. Se cliente já foi atendido, dados históricos mudam.
- **Risco:** Médio — requer timing específico.

### B3 — Foto maior que limite do Storage
- **Condição:** Cliente envia foto maior que o limite do Supabase Storage (ex: > 5MB).
- **Comportamento:** Upload falha, alerta é exibido, mas booking prossegue sem foto.
- **Impacto:** Cliente não tem foto no booking, mas owner pode adicionar depois.
- **Risco:** Baixo — comportamento graceful.

## Dependências
- `lib/supabase.ts` — cliente Supabase, RPCs
- `utils/date.ts` — timezone adjustment
- `utils/formatters.ts` — `formatCurrency`, `formatPhone`
- `components/CalendarPicker.tsx` — Calendário
- `components/TimeGrid.tsx` — Grid de horários
- `components/ProfessionalSelector.tsx` — Seletor de profissional
- `components/ChatBubble.tsx` — Bolha conversacional
- `components/PublicBusinessHeader.tsx` — Header do estabelecimento
- `components/UpsellSection.tsx` — Cross-sell
- `components/PhoneInput.tsx` — Input de telefone
- `lucide-react` — Ícones

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Slots calculados server-side | `get_available_slots` RPC | 🟢 |
| Disponibilidade | Upload best-effort (não bloqueia booking) | `PublicBooking.tsx:591-682` | 🟢 |
| Escalabilidade | Real-time subscription por booking individual | `booking_status_{id}` | 🟢 |
| Segurança | Prevenção de duplicata por telefone | `get_active_booking_by_phone` | 🟢 |

## Critérios de Aceitação

```gherkin
# Cenário 1: Booking público bem-sucedido
Dado que um cliente acessa o link público de um estabelecimento
Quando seleciona serviços, data, horário e preenche contato
Então o sistema cria public_booking com status "pending"
E o cliente vê tela de aguardando aprovação
E o owner recebe notificação em tempo real

# Cenário 2: Booking duplicado detectado
Dado que o cliente já tem booking ativo
Quando tenta criar novo booking com o mesmo telefone
Então o sistema exibe o booking existente
E oferece opção de edição
E não cria duplicata

# Cenário 3: Edição de booking
Dado que um cliente tem booking pending
Quando acessa o link de edição e altera a data
Então o sistema marca is_edit=true
E owner recebe novo booking pending
E ao aceitar, o appointment original é atualizado

# Cenário 4: Owner rejeita booking
Dado que um cliente submeteu booking pending
Quando o owner clica em "Recusar"
Então o status muda para "cancelled"
E o cliente vê tela de cancelado
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| Criar booking público | Must | Core do produto — diferencial competitivo |
| Prevenção de duplicata | Must | Evita confusão operacional |
| Edição de booking | Should | Conveniente, mas reagendamento via WhatsApp funciona |
| Upload de foto | Could | UX premium, não bloqueia fluxo |
| Upsells | Could | Revenue optimization, não bloqueia |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/PublicBooking.tsx` | `PublicBooking`, `handleSubmit`, `handleEditBooking` | 🟢 |
| `components/CalendarPicker.tsx` | `CalendarPicker` | 🟢 |
| `components/TimeGrid.tsx` | `TimeGrid` | 🟢 |
| `components/ProfessionalSelector.tsx` | `ProfessionalSelector` | 🟢 |
| `components/ChatBubble.tsx` | `ChatBubble` | 🟢 |
| `components/PublicBusinessHeader.tsx` | `PublicBusinessHeader` | 🟢 |
| `components/UpsellSection.tsx` | `UpsellSection` | 🟢 |
| `components/ClientAuthModal.tsx` | `ClientAuthModal` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
