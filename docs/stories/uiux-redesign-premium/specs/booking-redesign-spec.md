# Spec: Booking Público Redesign

## Objetivo

Elevar a experiência do Agendamento Público (Booking) de nota 6/10 para 9/10. Foco em header premium com logo e banner, fluxo direto alternativo ao chat e performance otimizada para mobile (onde os clientes agendam).

---

## Scope

### In
- `pages/PublicBooking.tsx` — fluxo completo de agendamento.
- `components/PublicBusinessHeader.tsx` — header do estabelecimento.
- `components/ChatBubble.tsx` — bolhas de chat.
- `components/ClientAuthModal.tsx` — autenticação do cliente.
- `components/ProfessionalSelector.tsx` — seleção de profissional.
- `components/CalendarPicker.tsx` — calendário de datas.
- `components/TimeGrid.tsx` — grid de horários.

### Out
- Backend / Supabase (`public_bookings`, `public_clients`).
- Lógica de notificações WhatsApp.

---

## Technical Approach

1. **Header Premium**
   - `PublicBusinessHeader` redesenhado:
     - Cover photo em full-width com gradiente overlay (escurecer para legibilidade).
     - Logo centralizado ou à esquerda com borda branca sutil.
     - Nome do negócio em `font-heading text-2xl`.
     - Rating do Google com estrelas e contagem de reviews.
     - Botões de ação rápida: WhatsApp, Instagram, Endereço (maps).
   - Lazy load da cover photo para não bloquear LCP.

2. **Fluxo Direto Alternativo**
   - Criar `QuickBookingFlow`: stepper visual (Serviços → Profissional → Data/Hora → Dados → Confirmação).
   - Manter o chat como opção alternativa (toggle no início: "Agendamento Rápido" vs "Conversar").
   - Stepper com barra de progresso no topo (já existe, mas refinada com novos tokens).

3. **Seleção de Serviços Premium**
   - Cards de serviço com imagem (quando disponível), nome, preço e duração.
   - Seleção múltipla com check visual (badge ou borda do tema).
   - Filtro por categoria em chips scrolláveis.

4. **Seleção de Profissional**
   - Cards com foto circular, nome, especialidades e rating.
   - Opção "Qualquer profissional" destacada.

5. **Calendário e Horários**
   - `CalendarPicker` com dias indisponíveis em tom apagado.
   - `TimeGrid` em formato de cards (não lista densa) para mobile.
   - Indicador de "horário quase lotado" quando poucas vagas restam.

6. **Otimização de Performance**
   - Code-split do booking público (já é rota separada, garantir lazy loading).
   - Otimizar imagens (logo/cover) para WebP com fallback.
   - LCP alvo: < 3 segundos em 4G.

---

## Component List

| Componente | Descrição |
|------------|-----------|
| `PublicHeroV2` | Header premium com cover, logo, rating, ações |
| `QuickBookingFlow` | Stepper de agendamento rápido |
| `ServiceCard` | Card premium de serviço com imagem e seleção |
| `ProfessionalCard` | Card de profissional com foto e rating |
| `BookingStepper` | Barra de progresso do fluxo |

---

## Data Requirements

- `profiles` (business_name, logo, cover, rating, phone, instagram, address).
- `services` (com `image_url`, `category_id`).
- `team_members` (com `photo_url`, `specialties`, `individual_rating`).
- `public_bookings` (criação/atualização).
- Nenhuma mudança no schema.

---

## Acceptance Criteria

- [ ] Header renderiza com logo e banner premium em mobile.
- [ ] Fluxo direto permite agendamento em < 5 toques (serviço → profissional → data → hora → confirmar).
- [ ] Chat continua funcional como alternativa.
- [ ] Temas Obsidian (barber) e Silk (beauty) preservados sem regressão.
- [ ] LCP do header < 3s em emulação 4G.
- [ ] Testes de regressão manuais passam (fluxo completo de agendamento e edição).
- [ ] `npm run typecheck` e `npm run lint` limpos.

---

## Estimativa

**Tamanho:** L (1 sprint)  
**Justificativa:** Fluxo complexo com múltiplos steps, integração com storage de imagens e alta importância de performance. Risco de impacto na conversão de clientes finais.
