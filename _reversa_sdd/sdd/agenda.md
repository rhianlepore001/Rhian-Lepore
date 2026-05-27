# Agenda, Booking Público e Fila Digital (agenda)

## Visão Geral
Sistema de agendamento completo com três fluxos distintos: (1) Agenda interna do dono/staff para CRUD de agendamentos, aceite de reservas públicas e checkout com pagamento; (2) Booking público via link compartilhável onde o cliente final escolhe serviços, data, profissional e acompanha status em tempo real; (3) Fila digital com QR code para clientes sem agendamento prévio, com gestão de espera em tempo real pelo owner. Inclui dual booking system (`public_bookings` → `appointments`), real-time via Supabase, integração WhatsApp e checkout com taxa de maquininha.

## Responsabilidades
- CRUD de agendamentos internos (appointments) com wizard de 4 etapas
- Aceitar/rejeitar reservas públicas (`public_bookings`) com sincronização automática de cliente
- Checkout de atendimento com registro de pagamento, taxa de maquininha e comissão
- Gestão da fila digital: chamar, atender, finalizar (cria appointment + finance_record)
- Booking público: fluxo conversacional de reserva com upload de foto, edição e real-time
- Disponibilidade de horários server-side via RPC considerando horário de funcionamento e agendamentos existentes
- Integração WhatsApp para confirmações de agendamento
- Real-time subscriptions para agenda, fila e status de booking

## Interface

### Entradas
| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| client_id | uuid | Cliente do CRM |
| professional_id | uuid \| null | Profissional (null = qualquer) |
| service_ids | uuid[] | Array de IDs dos serviços |
| appointment_time | ISO datetime | Data e hora do agendamento |
| price | numeric | Preço final (após desconto) |
| base_price | numeric | Preço original dos serviços |
| discount_percentage | numeric | Desconto aplicado (0-100) |
| notes | text | Observações |
| payment_method | 'pix' \| 'dinheiro' \| 'debito' \| 'credito' \| 'mbway' | Método de pagamento |
| received_by | uuid | Quem recebeu o pagamento (team_members.id) |
| machine_fee_percent | numeric | Percentual da taxa de maquininha |
| customer_name | string | Nome do cliente (booking público) |
| customer_phone | string | Telefone do cliente (booking público) |
| customer_photo_url | string \| null | URL da foto enviada (booking público) |
| is_edit | boolean | Flag de edição de reserva existente |
| original_appointment_time | ISO datetime | Âncora para update do appointment original (edição) |
| queue_entry_id | uuid | ID da entrada na fila digital |

### Saídas
| Saída | Tipo | Descrição |
|-------|------|-----------|
| Appointment | object | Agendamento confirmado/completado/cancelado |
| PublicBooking | object | Reserva pública pending/confirmed/cancelled |
| QueueEntry | object | Entrada na fila com status e posição |
| FinanceRecord | object | Registro financeiro gerado no checkout |
| available_slots | string[] | Horários disponíveis no formato "HH:MM" |
| queue_position | number | Posição numérica na fila |

## Regras de Negócio
- **R9** Agendamentos têm status: `Confirmed`, `Pending`, `Completed`, `Cancelled`. 🟢
- **R9a** Overdue: hoje o sistema considera overdue imediatamente após `appointment_time < now` para status `Confirmed` ou `Pending`, sem tolerância. **Decisão validada:** adicionar tolerância de 15 minutos — um agendamento só deve ser considerado atrasado se passou mais de 15 minutos do horário marcado sem ser concluído ou cancelado.
- **R10** Staff não pode cancelar agendamentos já finalizados (`Completed`). Guard D-07. 🟢
- **R11** Conclusão de agendamento cria registro financeiro automático via RPC `complete_appointment` (v2). Fallback client-side se RPC falhar. 🟢
- **R12** Reservas públicas (`public_bookings`) têm status `pending` até aprovação do owner, quando viram `confirmed`. 🟢
- **R13** Cliente pode editar reserva pública via link (flag `is_edit`). O sistema busca o agendamento original por `original_appointment_time`. 🟢
- **R14** Ao aceitar booking, o sistema tenta encontrar cliente existente por telefone (3 formatos: raw, BR, PT). Se não encontrar, cria novo. 🟢
- **R15** Horários de agendamento são gerados em intervalos de 30 minutos, das 8h às 20h. 🟢
- **R16** Preço final pode ter desconto percentual aplicado. Se preço for maior que o base, é marcado como "Custom". 🟢
- **R17** Fila tem estados: `waiting`, `calling`, `serving`, `completed`, `cancelled`, `no_show`. 🟢
- **R18** Transição `waiting → calling` dispara som de notificação. 🟢
- **R19** Finalizar atendimento da fila: cria cliente (se não existir), cria agendamento (`Completed`), cria registro financeiro, atualiza fila. Tudo em transação manual (client-side). 🟢
- **R20** Entradas da fila são filtradas por dia atual (`joined_at >= hoje`). 🟢
- **R21** Auto-atribuição de profissional: se 1 pro no time, atribui automaticamente; se múltiplos e "qualquer", usa `get_first_available_professional`. 🟢
- **R22** Prevenção de duplicata: `get_active_booking_by_phone` RPC impede booking duplicado para mesmo telefone. 🟢
- **R23** Espelhamento de cliente público: `mirror_public_client_to_crm` RPC sincroniza `public_clients` → `clients` (SECURITY DEFINER). 🟢
- **R24** Filtro de timezone: datas vindas de URL são ajustadas com `getTimezoneOffset` para evitar erro de dia. 🟢
- **R25** Checkout com taxa de maquininha: calculada sobre preço final com percentuais diferentes para débito e crédito. 🟢
- **R26** Real-time updates: Supabase Realtime (postgres_changes) mantém agenda, fila e status do booking atualizados. 🟢
- **R27** Staff vê apenas agendamentos atribuídos a si (`professional_id = teamMemberId`) ou todos se não houver filtro. 🟢
- **R28** Owner vê todos os agendamentos da empresa. 🟢
- **R29** Agendamento via wizard usa RPC `create_secure_booking` com verificação de colisão de horário. 🟢

## Fluxo Principal

### 1. Criar Agendamento Interno (AppointmentWizard)
1. Usuário abre wizard (botão "Novo Agendamento")
2. Step 1 — Seleção de cliente: busca em `clients` filtrado por `company_id`
3. Step 2 — Seleção de serviços: busca em `services` ativos, soma duração e preço
4. Step 3 — Seleção de data/hora: `CalendarPicker` + `TimeGrid`, chama RPC `get_available_slots`
5. Step 4 — Revisão: exibe resumo, permite desconto percentual
6. Submit: chama RPC `create_secure_booking` com todos os dados
7. Se sucesso: dispara evento `setup-step-completed` (stepId='appointment')
8. Se primeiro agendamento: dispara evento `system-activated`
9. Opcional: envia WhatsApp de confirmação

### 2. Aceitar Booking Público
1. Owner visualiza `public_bookings` com status `pending` na agenda
2. Clica em aceitar: `handleAcceptBooking`
3. Busca cliente existente por telefone (3 formatos: raw, BR, PT)
4. Se encontrado: atualiza foto se booking tem foto e cliente não
5. Se não encontrado: busca foto em `public_clients` → cria novo em `clients`
6. Busca nomes dos serviços a partir de `service_ids`
7. Auto-atribui `professional_id` se "qualquer" (1 pro = atribui; múltiplos = primeiro disponível)
8. Verifica `is_edit`:
   - Se sim: busca appointment original por `client_id` + `original_appointment_time`
   - Se encontrado: UPDATE com novos dados
   - Se não: INSERT novo
   - Se não é edição: INSERT em `appointments` com status `Confirmed`
9. UPDATE `public_bookings` SET `status='confirmed'`
10. Pergunta se quer enviar WhatsApp de confirmação

### 3. Checkout de Atendimento
1. Owner clica em "Concluir" no agendamento
2. Abre `CheckoutModal`
3. Seleciona método de pagamento (PIX/Dinheiro/Débito/Crédito para BR; Dinheiro/MBWay/Débito/Crédito para PT)
4. Seleciona quem recebeu (`team_members` ativos)
5. Se maquininha: calcula taxa automática (`debit_fee_percent` ou `credit_fee_percent`)
6. Preço editável com desconto opcional
7. Chama RPC `complete_appointment` com: `appointment_id`, `payment_method`, `received_by`, `completed_by`, `machine_fee_percent`, `machine_fee_amount`
8. Fallback client-side se RPC falhar: UPDATE `status='Completed'` + INSERT `finance_records`

### 4. Fila Digital — Finalizar Atendimento
1. Owner acessa `/fila`
2. Visualiza `queue_entries` do dia (status `waiting`, `calling`, `serving`)
3. Clica "Finalizar" na entrada `serving`
4. Abre modal: seleciona serviço + preço + profissional
5. Verifica se cliente existe em `clients`
   - Se sim: usa `client_id` existente
   - Se não: cria novo em `clients`
6. INSERT em `appointments` com status `Completed`
7. INSERT em `finance_records`
8. UPDATE `queue_entries` SET `status='completed'`

### 5. Booking Público — Criação
1. Cliente acessa `/book/:slug`
2. Busca business por `slug`, carrega serviços, profissionais, configurações
3. Fluxo conversacional: serviços → data/hora → contato → revisão
4. Valida: `businessId`, `customerName`, `customerPhone`, `selectedDate`, `selectedTime`, `acceptedPolicy`
5. Upload de foto de perfil para storage (`client_photos`)
6. Registra cliente público (best-effort, não bloqueia se falhar)
7. Se NÃO editando: verifica duplicata via `get_active_booking_by_phone`
8. Se `professional='any'`: chama `get_first_available_professional`
9. Se EDITANDO: UPDATE `public_bookings` com `is_edit=true` e `original_appointment_time`
10. Se NOVO: INSERT em `public_bookings` com `status='pending'`
11. Real-time: subscreve no canal do booking para atualização de status

## Fluxos Alternativos
- **[Booking duplicado detectado]:** Se `get_active_booking_by_phone` retorna booking ativo, exibe booking existente com opção de edição. Não permite novo booking. 🟢
- **[RPC complete_appointment falha]:** Fallback client-side: UPDATE `appointments.status='Completed'` + INSERT `finance_records` manualmente. Risco de inconsistência se UPDATE sucede mas INSERT falha. 🟢
- **[Staff tenta cancelar Completed]:** Guard D-07 bloqueia com toast "Acesso restrito". 🟢
- **[Cliente edita booking já confirmado]:** Cliente acessa link com `?edit=BOOKING_ID`. Sistema popula dados, permite alterar serviços/data. Ao submeter, marca `is_edit=true`. Owner recebe como novo booking pending; ao aceitar, busca appointment original por `client_id` + `original_appointment_time` e faz UPDATE. 🟢
- **[Auto-atribuição de profissional]:** Se apenas 1 profissional no time, atribui automaticamente sem mostrar seletor. Se múltiplos e "qualquer", usa RPC `get_first_available_professional`. 🟢
- **[Fila — não compareceu]:** Owner marca `status='no_show'`. Entrada é removida da lista ativa. Não cria appointment nem finance_record. 🟢
- **[Timezone de URL]:** Datas em ISO vindas de URL são ajustadas com `getTimezoneOffset` para evitar erro de dia (ex: `2026-05-10T00:00:00Z` pode ser 9 de maio no Brasil). 🟢

## Cenários de Borda

### B1 — Aceitar booking com telefone em 3 formatos diferentes
- **Condição:** Cliente cadastrou telefone como "+5511987654321", mas booking veio como "11987654321" ou "55 11 98765-4321".
- **Comportamento:** Sistema tenta 3 formatos (raw, BR formatado, PT formatado) na busca por `clients.phone`. Se qualquer um match, usa cliente existente.
- **Risco:** Médio — se nenhum formato match, cria cliente duplicado.
- **Mitigação:** Deduplicação flexível em `Clients.fetchClients` compara telefones ignorando formatação e sufixos de país.

### B2 — Edição de booking com appointment original já deletado
- **Condição:** Cliente edita booking público (`is_edit=true`), mas o appointment original foi deletado (soft delete) entre a criação e a edição.
- **Comportamento:** `handleAcceptBooking` busca appointment original por `client_id` + `original_appointment_time`. Se não encontrar, faz INSERT de novo appointment em vez de UPDATE.
- **Impacto:** Cliente fica com 2 appointments (o original soft-deleted e o novo). O original pode ser restaurado da lixeira, causando duplicata.
- **Risco:** Baixo — requer concorrência específica e soft delete raro.

### B3 — Finalizar fila com falha parcial (appointment criado, finance_record não)
- **Condição:** Owner clica "Finalizar" na fila. Cria appointment com sucesso, mas INSERT em `finance_records` falha (ex: timeout de rede).
- **Comportamento:** Appointment existe com status `Completed`, mas não há registro financeiro. Comissão não é calculada.
- **Impacto:** Dados inconsistentes — atendimento concluído sem receita registrada.
- **Risco:** Médio — transação não é atômica (sem BEGIN/COMMIT explícito no client-side).
- **Mitigação / Decisão validada:** Deve ser movido para uma RPC atômica com transação única: criar/buscar cliente, criar appointment `Completed`, criar `finance_record`, calcular comissão e atualizar `queue_entries` dentro do mesmo fluxo no banco. Se qualquer etapa falhar, tudo deve fazer rollback.

### B4 — Real-time subscription perde conexão
- **Condição:** Supabase Realtime cai (rede instável, restart do servidor).
- **Comportamento:** Fila digital cai para polling a cada 10s como fallback. Agenda e booking público não têm fallback explícito — dados ficam desatualizados até reconexão.
- **Impacto:** Owner não vê novos bookings em tempo real. Cliente na fila não vê mudança de status.
- **Risco:** Médio — depende da estabilidade da conexão WebSocket.
- **Mitigação:** Polling a cada 10s para fila; agenda sem fallback documentado.

### B5 — Checkout com preço customizado maior que base
- **Condição:** Owner altera preço no checkout para valor MAIOR que `base_price`.
- **Comportamento:** Sistema não bloqueia — aceita qualquer preço. UI marca como "Preço Customizado" (ícone de alerta).
- **Impacto:** Comissão é calculada sobre o preço customizado (maior), não sobre o base. Owner pode inadvertidamente pagar comissão maior.
- **Risco:** Baixo — comportamento intencional (flexibilidade de preço).

## Dependências
- `lib/supabase.ts` — cliente Supabase, RPCs, real-time
- `contexts/AuthContext.tsx` — `useAuth` (user, companyId, role, teamMemberId, region)
- `contexts/UIContext.tsx` — `useUI` (modais, toasts)
- `contexts/PublicClientContext.tsx` — `usePublicClient` (sessão de cliente público)
- `utils/date.ts` — `parseDate`, `formatDateForInput`, `combineDateAndTime`
- `utils/formatters.ts` — `formatCurrency`, `formatPhone`, `formatDuration`
- `components/BrutalCard.tsx`, `components/BrutalButton.tsx` — UI base
- `components/PhoneInput.tsx` — Input de telefone com máscara por região
- `components/CalendarPicker.tsx` — Calendário mensal com indisponibilidade
- `components/TimeGrid.tsx` — Grid de horários (8h-20h30, 30min)
- `components/ProfessionalSelector.tsx` — Seletor de profissional
- `lucide-react` — Ícones
- `@supabase/supabase-js` — Realtime channel, RPC calls

## Requisitos Não Funcionais

| Tipo | Requisito inferido | Evidência no código | Confiança |
|------|--------------------|---------------------|-----------|
| Performance | Slots de horário calculados server-side (RPC) para evitar carga no cliente | `get_available_slots` em `ScheduleSelection.tsx` | 🟢 |
| Performance | Fetch paralelo de dados na agenda (team, appointments, bookings, clients, services) | `Agenda.tsx:287-299` | 🟢 |
| Escalabilidade | Real-time subscriptions filtradas por `company_id` para limitar payload | `Agenda.tsx:subscriptions` | 🟢 |
| Disponibilidade | Fallback client-side para checkout se RPC falhar | `Agenda.tsx:778-867` | 🟡 |
| Disponibilidade | Polling a cada 10s como fallback para fila digital | `QueueStatus.tsx:58-134` | 🟢 |
| Segurança | RPC `create_secure_booking` verifica colisão de horário server-side | `AppointmentWizard.tsx:108-196` | 🟢 |
| Segurança | Staff não pode cancelar Completed (guard D-07) | `Agenda.tsx:867-874` | 🟢 |

## Critérios de Aceitação

```gherkin
# Cenário 1: Criar agendamento interno bem-sucedido
Dado que o owner está na agenda
E seleciona um cliente, serviços, data e horário disponível
Quando clica em "Confirmar Agendamento"
Então o sistema chama create_secure_booking
E o agendamento aparece na agenda com status "Confirmed"
E se for o primeiro agendamento, dispara evento system-activated

# Cenário 2: Colisão de horário detectada
Dado que o owner tenta criar agendamento
E o profissional já tem agendamento no mesmo horário
Quando clica em "Confirmar Agendamento"
Então o sistema retorna erro da RPC
E exibe alerta com mensagem de colisão
E o agendamento NÃO é criado

# Cenário 3: Aceitar booking público
Dado que existe um public_booking com status "pending"
Quando o owner clica em "Aceitar"
Então o sistema busca cliente por telefone em 3 formatos
E cria/atualiza o cliente no CRM
E cria appointment com status "Confirmed"
E atualiza public_bookings.status para "confirmed"
E pergunta se quer enviar WhatsApp

# Cenário 4: Checkout com taxa de maquininha
Dado que um agendamento com status "Confirmed" está pronto para checkout
E a taxa de maquininha está habilitada (debit_fee_percent = 2.5)
Quando o owner seleciona pagamento em débito
Então o sistema calcula taxa automática sobre o preço final
E registra machine_fee_percent e machine_fee_amount
E chama complete_appointment RPC
E cria finance_record vinculado

# Cenário 5: Staff tenta cancelar Completed
Dado que um staff está visualizando a agenda
E tenta cancelar um agendamento com status "Completed"
Quando clica em cancelar
Então o sistema bloqueia a ação
E exibe toast "Acesso restrito ao dono da barbearia"
E o status permanece "Completed"

# Cenário 6: Cliente edita booking público
Dado que um cliente tem um booking confirmado
E acessa o link de edição (?edit=BOOKING_ID)
Quando altera a data/hora e submete
Então o sistema marca is_edit=true
E owner recebe novo booking pending
E ao aceitar, o appointment original é atualizado

# Cenário 7: Fila digital — fluxo completo
Dado que um cliente entra na fila via QR code
Quando o owner chama o cliente (status="calling")
Então o cliente vê alerta sonoro e animação na tela de status
E quando o owner inicia atendimento (status="serving")
Então o status muda para "Em Atendimento"
E quando o owner finaliza
Então o sistema cria appointment "Completed"
E cria finance_record
E atualiza fila para "completed"

# Cenário 8: Booking duplicado por telefone
Dado que um cliente já tem booking ativo (pending/confirmed)
Quando tenta criar novo booking com o mesmo telefone
Então o sistema detecta duplicata via get_active_booking_by_phone
E exibe o booking existente
E não permite novo booking
```

## Prioridade

| Requisito | MoSCoW | Justificativa |
|-----------|--------|---------------|
| CRUD de agendamentos | Must | Core do produto — caminho crítico |
| Aceitar/rejeitar booking público | Must | Dual booking system é diferencial do produto |
| Checkout com pagamento | Must | Gera receita — sem checkout, não há finance_record |
| Fila digital | Should | Importante para walk-ins, mas existe alternativa (agendamento manual) |
| Real-time updates | Should | UX essencial, mas polling funciona como fallback |
| Edição de booking público | Should | Conveniente para cliente, mas pode ser feito via WhatsApp |
| WhatsApp integration | Could | Acionado raramente, não impede fluxo principal |
| Auto-atribuição de profissional | Could | Otimização UX, não bloqueia funcionalidade |

## Rastreabilidade de Código

| Arquivo | Função / Classe | Cobertura |
|---------|-----------------|-----------|
| `pages/Agenda.tsx` | `Agenda`, `fetchData`, `handleAcceptBooking`, `handleCompleteAppointment`, `handleCancelAppointment` | 🟢 |
| `pages/PublicBooking.tsx` | `PublicBooking`, `handleSubmit`, `handleEditBooking` | 🟢 |
| `pages/QueueManagement.tsx` | `QueueManagement`, `updateStatus`, `confirmFinish` | 🟢 |
| `pages/QueueJoin.tsx` | `QueueJoin`, `handleSubmit` | 🟢 |
| `pages/QueueStatus.tsx` | `QueueStatus`, real-time subscription | 🟢 |
| `components/AppointmentWizard.tsx` | `AppointmentWizard`, `handleSubmit` | 🟢 |
| `components/AppointmentEditModal.tsx` | `AppointmentEditModal` | 🟢 |
| `components/CheckoutModal.tsx` | `CheckoutModal`, cálculo de taxa | 🟢 |
| `components/CalendarPicker.tsx` | `CalendarPicker` | 🟢 |
| `components/TimeGrid.tsx` | `TimeGrid` | 🟢 |
| `components/ProfessionalSelector.tsx` | `ProfessionalSelector` | 🟢 |
| `contexts/PublicClientContext.tsx` | `PublicClientProvider` | 🟢 |

---

*Gerado pelo Reversa Writer em 2026-05-06. Nível: Detalhado.*
