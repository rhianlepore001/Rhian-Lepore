---
id: US-018
título: Especificação Completa do Frontend
status: pending
estimativa: 1.5h
prioridade: high
agente: ux-design-expert
assignee: "@ux-design-expert"
blockedBy: []
epic: EPIC-002
---

# US-018: Especificação Completa do Frontend

## Por Quê

O projeto tem 20+ pages e 50+ components. Não há inventário centralizado de:
- Quais pages existem e qual seu propósito?
- Quais components são reutilizáveis vs específicos?
- Design system está completo (colors, typography, spacing)?
- Mobile responsiveness está ok?
- Accessibility (WCAG 2.1) está em conformidade?

Documentar tudo = base para refatorações e novas features.

## O Que

Mapear frontend completamente:

1. **Page Inventory (20+)**
   - Dashboard, Agenda, Finance, Reports, ClientCRM, Marketing
   - Settings pages (7 páginas)
   - Public pages (PublicBooking, QueueJoin, QueueStatus, ProfessionalPortfolio)
   - Outros + links de routing

2. **Component Inventory (50+)**
   - Modal components (AppointmentEditModal, ClientAuthModal, etc.)
   - Feature components (CommissionsManagement, BusinessHoursEditor, etc.)
   - Styled components (BrutalCard, BrutalButton, etc.)
   - Utility components

3. **Design System**
   - Color palette (Brutal theme vs Beauty theme)
   - Typography scale (Tailwind sizing)
   - Spacing system (8px grid)
   - Border radius, shadows, etc.
   - Icons used (Lucide React)
   - Charts library (Recharts)

4. **Accessibility Audit**
   - WCAG 2.1 AA compliance check
   - Color contrast ratios (4.5:1 for normal text)
   - Keyboard navigation
   - Screen reader support
   - Alt text inventory
   - ARIA labels

5. **Performance**
   - Bundle size analysis
   - Code splitting strategy
   - Lazy loading patterns
   - Mobile optimization

## Critérios de Aceitação

- [ ] `docs/architecture/frontend-spec.md` criado (600+ linhas)
- [ ] Todas as 20+ pages documentadas com propósito
- [ ] Todas as 50+ componentes categorizadas e listadas
- [ ] Design system completamente especificado
- [ ] Accessibility gaps identificados e priorizados
- [ ] Mobile responsiveness issues documentadas
- [ ] Bundle size breakdown analisado
- [ ] Color contrast issues catalogadas
- [ ] Arquivo tem screenshots ou referências para cada seção

## Arquivos Impactados

**Novos:**
- `docs/architecture/frontend-spec.md` (criar)

**Referenciados (read-only):**
- `pages/` (todas as páginas)
- `components/` (todos os componentes)
- `App.tsx` (routing)
- Tailwind config

## Progresso Atual

- [ ] 0% — Não iniciado

## Definição de Pronto

- [ ] `frontend-spec.md` criado com inventário completo
- [ ] Accessibility gaps documentados (color contrast, ARIA, alt text)
- [ ] Performance issues identificadas
- [ ] Mobile responsiveness issues catalogadas
- [ ] Design system totalmente especificado

## Notas

**Referência canônica:** `.agent/memory/PHASE_4_BROWNFIELD_PLAN.md` → Fase 4.3

**Tools:** Browser dev tools, Lighthouse, WAVE accessibility checker

**Próximo:** Output alimenta US-019 e US-021
