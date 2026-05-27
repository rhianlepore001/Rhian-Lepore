# Flowchart — Módulo: agenda

## 1. Fluxo Principal — Agenda Interna

```mermaid
flowchart TD
    A[Owner acessa /agenda] --> B[fetchData — busca paralela]
    B --> B1[team_members]
    B --> B2[appointments do dia]
    B --> B3[public_bookings pending]
    B --> B4[clients]
    B --> B5[services + categories]
    B --> B6[business_settings]
    
    C{Ações na Agenda} --> D[Novo Agendamento]
    C --> E[Aceitar Booking Público]
    C --> F[Completar Appointment]
    C --> G[Cancelar Appointment]
    C --> H[Editar Appointment]
    
    D --> D1[AppointmentWizard 4 etapas]
    D1 --> D2[create_secure_booking RPC]
    D2 --> D3{Sucesso?}
    D3 -->|Sim| D4[WhatsApp confirmation?]
    D4 --> D5[Evento system-activated se primeiro]
    D3 -->|Não| D6[Alert com mensagem]
    
    E --> E1[Busca cliente por telefone 3 formatos]
    E1 --> E2{Cliente existe?}
    E2 -->|Sim| E3[Atualiza foto se necessário]
    E2 -->|Não| E4[Cria cliente + busca foto em public_clients]
    E3 --> E5[Busca nomes dos serviços por ID]
    E4 --> E5
    E5 --> E6[Auto-atribui profissional se necessário]
    E6 --> E7{is_edit?}
    E7 -->|Sim| E8[UPDATE appointment original por client_id + original_appointment_time]
    E7 -->|Não| E9[INSERT novo appointment]
    E8 --> E10[UPDATE public_bookings status=confirmed]
    E9 --> E10
    E10 --> E11[WhatsApp confirmation?]
    
    F --> F1[CheckoutModal]
    F1 --> F2[Seleciona método pagamento]
    F2 --> F3[Calcula taxa maquininha se aplicável]
    F3 --> F4[complete_appointment RPC]
    F4 --> F5{Sucesso?}
    F5 -->|Sim| F6[Atualiza UI]
    F5 -->|Não| F7[Fallback client-side: UPDATE status + INSERT finance_records]
    
    G --> G1[UPDATE appointments SET status=Cancelled]
    G1 --> G2{Staff e status Completed?}
    G2 -->|Sim| G3[Bloqueado — fala com dono]
    G2 -->|Não| G4[Cancelado com sucesso]
```

## 2. Fluxo — Booking Público

```mermaid
flowchart TD
    A[Cliente acessa /book/:slug] --> B[Busca business por slug]
    B --> C[Busca services + categories + professionals + settings + gallery]
    C --> D[Welcome message conversacional]
    D --> E{Steps}
    
    E --> E1[Serviços — toggle multi-select]
    E1 --> E2[Data/Hora — CalendarPicker + TimeGrid]
    E2 --> E3[Contato — nome + telefone + foto + política]
    E3 --> E4[Revisão + Submit]
    
    E4 --> F[handleSubmit]
    F --> F1[Upload foto se fornecida]
    F1 --> F2[Register cliente público best-effort]
    F2 --> F3{É edição?}
    F3 -->|Não| F4{Já tem booking ativo?}
    F4 -->|Sim| F5[Mostra booking existente]
    F4 -->|Não| F6[Professional=any? → get_first_available_professional]
    F3 -->|Sim| F7[UPDATE public_bookings com is_edit=true]
    F6 --> F8[INSERT public_bookings status=pending]
    F7 --> F9[Realtime subscription no booking]
    F8 --> F9
    F9 --> G[Aguarda aprovação do owner]
    G --> G1{Status muda para confirmed?}
    G1 -->|Sim| G2[Tela de sucesso]
    G1 -->|cancelled| G3[Tela de cancelado]
```

## 3. Fluxo — Fila Digital

```mermaid
flowchart TD
    A[Cliente acessa /queue/:slug] --> B[Preenche nome + telefone + serviço]
    B --> C[INSERT queue_entries status=waiting]
    C --> D[Redireciona para /queue-status/:id]
    
    D --> E[get_queue_position RPC]
    E --> F[Countdown: position × 20min]
    F --> G[Realtime subscription em queue_entries]
    
    G --> H{Status muda?}
    H -->|calling| I[Alerta sonoro + animação]
    H -->|serving| J[Tela Em Atendimento]
    H -->|completed| K[Tela Finalizado]
    
    L[Owner acessa /fila] --> M[Busca queue_entries do dia]
    M --> N[Lista: waiting + calling + serving]
    N --> O{Ações}
    
    O --> O1[Chamar: status=calling]
    O --> O2[Atender: status=serving]
    O --> O3[Finalizar: openFinishModal]
    O --> O4[Não compareceu: status=no_show]
    
    O3 --> P[Seleciona serviço + preço + profissional]
    P --> Q{Cliente existe em clients?}
    Q -->|Sim| R[Usa clientId existente]
    Q -->|Não| S[Cria novo em clients]
    R --> T[INSERT appointment status=Completed]
    S --> T
    T --> U[INSERT finance_records]
    U --> V[UPDATE queue_entries status=completed]
```

## 4. Fluxo — Disponibilidade de Horários (RPC)

```mermaid
sequenceDiagram
    participant C as ScheduleSelection
    participant S as Supabase RPC
    participant DB as PostgreSQL
    
    C->>S: get_available_slots(p_business_id, p_date, p_professional_id?, p_duration_min)
    S->>DB: Verifica horário de funcionamento
    DB->>DB: Busca appointments existentes para o profissional/data
    DB->>DB: Calcula slots livres considerando duração
    S->>C: { slots: ["08:00", "08:30", ...] }
    
    C->>S: get_full_dates(p_business_id, p_start_date, p_end_date, p_professional_id?, p_duration_min)
    S->>DB: Para cada data no range, verifica se todos os slots estão ocupados
    S->>C: ["2026-05-10", "2026-05-15", ...]
```

## 5. Fluxo — Edição de Booking pelo Cliente

```mermaid
flowchart TD
    A[Cliente acessa /book/:slug?edit=BOOKING_ID] --> B[Busca public_booking por ID]
    B --> C[handleEditBooking]
    C --> D[Popula estado com dados do booking]
    D --> E[Seta originalTimeISO]
    E --> F[Cliente escolhe o que modificar]
    
    F --> F1[Mudar Horário]
    F --> F2[Editar Serviços]
    F --> F3[Mudar Ambos]
    
    F1 --> G[Step datetime]
    F2 --> G2[Step services]
    F3 --> G3[Step services → datetime]
    
    G --> H[handleSubmit com editingBookingId]
    G2 --> H
    G3 --> H
    
    H --> I[UPDATE public_bookings SET is_edit=true, original_appointment_time=...]
    I --> J[Owner recebe booking com is_edit=true]
    J --> K[Agenda: detecta is_edit, busca appointment original]
    K --> K1{Encontrou?}
    K1 -->|Sim| K2[UPDATE appointment com novos dados]
    K1 -->|Não| K3[INSERT novo appointment]
```