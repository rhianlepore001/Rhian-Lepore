# Agenda colunas — Tasks

**Design**: `specs/active/agenda-colunas-espacamento/design.md`
**Status**: In Progress — T1–T3 implementados; T4 gates

---

## Execution Plan

### Phase 1: Foundation (paralelo)

```
T1 [P] compactar AgendaDayScroller
T2 [P] criar AgendaResourceGrid + testes
```

### Phase 2: Integração

```
T1 + T2 → T3 (wire Agenda.tsx + filtro compacto)
```

### Phase 3: Gates

```
T3 → T4 (typecheck/lint/build/test + graphify)
```

---

## Task Breakdown

### T1: Compactar chips do AgendaDayScroller [P]

**What**: Reduzir chips de dia para 44×56 sem perder drag/a11y.
**Where**: `components/agenda/AgendaDayScroller.tsx`, `test/components/AgendaDayScroller.test.tsx`
**Depends on**: None
**Reuses**: Componente atual
**Requirement**: AGENDA-GRID-10
**Difficulty**: Baixa
**Model**: composer-2.5

**Done when**:

- [ ] Chip usa `w-11 h-14` (não `h-[68px]` / `w-[52px]`)
- [ ] Label do mês com `mb-1`
- [ ] Testes existentes passam; assert de classes compactas
- [ ] Gate: `npx vitest run test/components/AgendaDayScroller.test.tsx`

**Tests**: unit
**Gate**: quick

---

### T2: Criar AgendaResourceGrid [P]

**What**: Componente único de grade horário × colaborador (mobile + desktop).
**Where**: `components/agenda/AgendaResourceGrid.tsx`, `test/components/AgendaResourceGrid.test.tsx`
**Depends on**: None
**Reuses**: Grade desktop de `pages/Agenda.tsx`, `AgendaEmptySlotCell`, `appointmentStatus`, `formatCurrency`
**Requirement**: AGENDA-GRID-01..07, 20..22
**Difficulty**: Alta
**Model**: claude-sonnet-5-thinking-high

**Done when**:

- [ ] Props do design.md
- [ ] `data-testid="agenda-resource-grid"` e `agenda-col-${id}`
- [ ] Sticky gutter + snap colunas; sem `hidden md:block`
- [ ] Empty slot e appointment disparam callbacks
- [ ] Unassigned na primeira coluna se `showUnassigned`
- [ ] Hint `text-xs` se zero agendamentos
- [ ] Tokens only; `text-xs` mínimo; sem `shadow-sm`
- [ ] Unit tests cobrem colunas, cliques, unassigned, hint
- [ ] Gate: `npx vitest run test/components/AgendaResourceGrid.test.tsx`

**Tests**: unit
**Gate**: quick

---

### T3: Integrar grade e compactar chrome na Agenda

**What**: Trocar lista mobile + grade desktop pelo grid; compactar filtro e `space-y`.
**Where**: `pages/Agenda.tsx`
**Depends on**: T1, T2
**Reuses**: `openNewAppointmentAt`, `displayedMembers`, `timeSlots`
**Requirement**: AGENDA-GRID-01..13
**Difficulty**: Média
**Model**: cursor-grok-4.6-high

**Done when**:

- [ ] Sem `md:hidden` lista do dia e sem EmptyState “Nenhum agendamento neste dia” como corpo
- [ ] `<AgendaResourceGrid>` no lugar
- [ ] Filtro: avatares `w-11 h-11`, `gap-3`, sem dot verde, `title` no nome
- [ ] Root `space-y-3 md:space-y-4`
- [ ] `data-testid="agenda-filter-all"` preservado
- [ ] Gate: typecheck do ficheiro via `npm run typecheck`

**Tests**: none (página; cobertura no T2 + e2e existentes)
**Gate**: quick

---

### T4: Gates do repo + graphify

**What**: typecheck, lint, build, test, `graphify update .`, MEMORY.md
**Where**: repo
**Depends on**: T3
**Requirement**: Success criteria
**Difficulty**: Baixa
**Model**: composer-2.5

**Done when**:

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] graphify atualizado
- [ ] MEMORY.md com o trabalho

**Tests**: full
**Gate**: full

---

## Parallel Execution Map

```
Phase 1 (Parallel):
  ├── T1 [P]  composer-2.5          LOW
  └── T2 [P]  claude-sonnet-5-high  HIGH

Phase 2:
  T3  grok-4.6-high  MEDIUM

Phase 3:
  T4  composer-2.5   LOW
```

## Granularity Check

| Task | Scope | Status |
|------|-------|--------|
| T1 | 1 componente + testes | Granular |
| T2 | 1 componente + testes | Granular |
| T3 | 1 página (wire) | Granular |
| T4 | gates | Granular |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
|------|------------|---------|--------|
| T1 | None | Phase 1 parallel | Match |
| T2 | None | Phase 1 parallel | Match |
| T3 | T1, T2 | Phase 2 | Match |
| T4 | T3 | Phase 3 | Match |

## Test Co-location

| Task | Layer | Tests | Status |
|------|-------|-------|--------|
| T1 | UI component | unit no mesmo task | OK |
| T2 | UI component | unit no mesmo task | OK |
| T3 | page wire | none (matriz: página coberta por unit do grid) | OK |
| T4 | gates | full | OK |
