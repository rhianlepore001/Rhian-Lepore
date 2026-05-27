# Spec: Agenda Redesign

## Objetivo

Elevar a experiência da Agenda de nota 5/10 para 9/10. O objetivo é tornar a visualização diária mais respirada, com avatares circulares, glassmorphism sutil, empty states elegantes e um wizard de criação/editação mais fluido.

---

## Scope

### In
- `pages/Agenda.tsx` — layout, lista, filtros, modais.
- `components/AppointmentWizard.tsx` — criação de agendamentos.
- `components/AppointmentEditModal.tsx` — edição.
- `components/CheckoutModal.tsx` — checkout/faturamento.
- `components/TimeGrid.tsx` — grid de horários.

### Out
- Backend / Supabase queries (manter existentes).
- Lógica de notificações WhatsApp (manter).

---

## Technical Approach

1. **Lista de Agendamentos (Mobile-First)**
   - Em mobile: transformar lista densa em cards verticais com:
     - Avatar circular do profissional (foto ou iniciais).
     - Horário em destaque (font-mono, bold).
     - Nome do cliente e serviço com truncamento elegante.
     - Badge de status (Confirmado, Pendente, Concluído) com cor semântica.
   - Em desktop: manter lista horizontalizada com hover states, mas com mais respiro (padding maior, bordas suaves).

2. **Glassmorphism Sutil**
   - Cards de agendamento com `bg-white/[0.02]`, `backdrop-blur-sm`, borda `border-white/5`.
   - Hover: elevação sutil (`shadow-promax-glass`) sem translação brusca.

3. **Filtro de Profissionais**
   - Substituir dropdown genérico por chips horizontais scrolláveis com avatar + nome.
   - Chip ativo com borda do tema (`accent-gold` ou `beauty-neon`).

4. **Empty State**
   - `EmptyAgendaState`: ilustração do calendário (Lucide `Calendar`), mensagem "Sua agenda está livre hoje.", CTA "Novo Agendamento".
   - Animar entrada com `fade-in zoom-in-95`.

5. **Wizard e Modais**
   - Aplicar novos tokens do Design System (radius, sombras, inputs com focus ring).
   - Reorganizar steps do wizard para mobile (1 coluna, botões full-width).
   - Manter lógica de desconto, seleção múltipla de serviços e envio de WhatsApp.

6. **Agendamentos Atrasados (Overdue)**
   - Manter seção de atrasados, mas com design premium: card vermelho sutil, ícone `AlertTriangle`, ações claras.

---

## Component List

| Componente | Descrição |
|------------|-----------|
| `AgendaListItem` | Card de agendamento com avatar, horário, status |
| `ProfessionalFilter` | Chips scrolláveis de profissionais |
| `EmptyAgendaState` | Empty state animado para dias vazios |
| `AgendaDayHeader` | Header do dia com navegação e data |
| `AgendaOverdueCard` | Card premium para agendamentos atrasados |

---

## Data Requirements

- `appointments` (com `client_id`, `professional_id`, `status`).
- `team_members` (com `photo_url`).
- `services`, `clients`, `categories`.
- Nenhuma mudança no schema.

---

## Acceptance Criteria

- [ ] Agenda funciona sem erros em mobile (390px) e desktop.
- [ ] Filtro de profissionais exibe avatares e é scrollável horizontalmente.
- [ ] Empty state aparece quando não há agendamentos no dia.
- [ ] Wizard de novo agendamento mantém todas as funcionalidades (desconto, WhatsApp, múltiplos serviços).
- [ ] Testes existentes (`AppointmentReview.test.tsx`, `CheckoutModal.test.tsx`) passam.
- [ ] `company_id` / `user_id` preservados em todas as queries.
- [ ] Dark/Light ok para ambos os temas.

---

## Estimativa

**Tamanho:** L (1 sprint)  
**Justificativa:** Alta complexidade de interação (wizard, modais, filtros) e necessidade de manter compatibilidade com múltiplos estados.
