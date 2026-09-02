# Agenda — Grade por colaborador + densidade (mobile e desktop)

## Problem Statement

No mobile, a Agenda esconde a grade por profissional (`md:hidden` lista / empty state) e gasta altura demais no chrome (chips de dia 52×68, avatares 56px, `space-y-6`). Gestor e colaborador não conseguem ler o dia **coluna por coluna**. No desktop a grade existe, mas o chrome empurra o conteúdo para baixo. A referência (tabela apertada de datas) é o anti-exemplo: uma coluna estreita, ilegível — precisamos da mesma ideia (matriz) com densidade profissional.

## Goals

- [ ] Mobile e desktop mostram a **mesma grade**: horário × coluna por colaborador
- [ ] Chrome compacto: dia, equipe e grade cabem no primeiro viewport (~390×844)
- [ ] Dia vazio ainda mostra a grade (slots clicáveis), não um empty state gigante
- [ ] UX/UI alinhada ao Design System (`design-system/MASTER.md`, tokens, touch ≥44px, `text-xs` mínimo)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visão mensal tipo planilha de “pontos” | Job diferente; a referência é densidade, não um tracker de pontos |
| Unificar date strip + avatares num único carrossel | Spec v2 antiga; aqui o gesto da grade (scroll X nas colunas) é o principal |
| Mudança de schema / RLS / fetch | Dados e filtro atuais bastam |
| Novo CTA full-width “+ Novo Agendamento” no mobile | FAB do bottom nav já cobre; pioraria o espaçamento |
| Drag-and-drop de agendamentos entre colunas | Fora deste corte |

---

## User Stories

### P1: Grade coluna por colaborador em qualquer viewport ⭐ MVP

**User Story:** Como gestor ou colaborador, quero ver o dia em colunas (um profissional por coluna, horários nas linhas) no celular e no computador, para comparar a equipe de relance.

**Why P1:** Sem isso, o mobile continua sendo uma lista/empty card e o pedido não se cumpre.

**Acceptance Criteria:**

1. WHEN a Agenda carrega em viewport &lt; `md` (ex. 390px) com “Todos” ativo THEN o sistema SHALL renderizar a grade recurso (horário × colunas), não a lista corrida nem o empty state “Nenhum agendamento neste dia” como bloco principal.
2. WHEN a Agenda carrega em viewport ≥ `md` THEN o sistema SHALL renderizar a mesma grade (não um layout paralelo divergente).
3. WHEN “Todos” está ativo THEN o sistema SHALL mostrar uma coluna por membro em `displayedMembers`.
4. WHEN o gestor seleciona um ou mais profissionais THEN a grade SHALL mostrar só essas colunas.
5. WHEN o utilizador desliza horizontalmente na grade (mobile) THEN as colunas SHALL fazer snap e o gutter de horário SHALL permanecer visível (sticky).
6. WHEN uma célula está vazia THEN o clique/toque SHALL abrir o wizard com profissional + horário (comportamento atual de `AgendaEmptySlotCell`).
7. WHEN uma célula tem agendamento THEN o clique SHALL abrir o modal de detalhes (comportamento atual).

**Independent Test:** Viewport 390 e 1280; “Todos”; colunas visíveis; snap; clique em vazio e em ocupado.

**IDs:** `AGENDA-GRID-01` … `AGENDA-GRID-07`

---

### P1: Chrome compacto (espaçamento do calendário) ⭐ MVP

**User Story:** Como barbeiro no telemóvel, quero menos ar morto entre mês, dias, avatares e a grade, para a agenda começar acima da dobra.

**Why P1:** Os prints mostram o problema; sem compactar o chrome a grade continua empurrada para baixo.

**Acceptance Criteria:**

1. WHEN a faixa de dias renderiza THEN cada chip SHALL ter alvo de toque ≥44px e altura visivelmente menor que 68px (alvo: ~44×56 no mobile).
2. WHEN a faixa de profissionais renderiza THEN avatares SHALL ter ≥44px de toque e gap horizontal menor que `gap-5` (alvo: `gap-3`); nomes não cortam no meio da palavra sem `title` com nome completo.
3. WHEN a página Agenda renderiza THEN o espaçamento vertical entre header de página, scroller de dias, filtro e grade SHALL ser `space-y-3` no mobile / `space-y-4` no desktop (não `space-y-6` / `space-y-8`).
4. WHEN não há agendamentos no dia THEN a UI SHALL NOT usar o `EmptyState` de `py-10` como conteúdo principal da agenda.

**Independent Test:** Screenshot 390×844: mês + dias + avatares + início da grade visíveis sem scroll de página (além do header da app).

**IDs:** `AGENDA-GRID-10` … `AGENDA-GRID-13`

---

### P2: Cabeçalho de coluna e densidade dos cards

**User Story:** Como gestor, quero identificar cada coluna (avatar + primeiro nome) e ler cliente/serviço/preço no card compacto, com as cores de status atuais.

**Why P2:** Completa a leitura profissional; o MVP já funciona se os cards atuais forem reusados com densidade.

**Acceptance Criteria:**

1. WHEN a grade renderiza THEN cada coluna SHALL ter cabeçalho sticky com nome (primeiro nome) e iniciais/foto.
2. WHEN um card de agendamento cabe na célula THEN SHALL mostrar cliente (truncate), serviço (truncate) e preço; ícones de status/editado/nota iguais aos atuais.
3. WHEN o dia não tem agendamentos THEN SHALL haver um hint discreto (texto `text-xs`, sem card vazio gigante), mantendo a grade.

**IDs:** `AGENDA-GRID-20` … `AGENDA-GRID-22`

---

## Edge Cases

- WHEN `displayedMembers` está vazio THEN SHALL manter o empty state de perfil não vinculado (já existente).
- WHEN há agendamentos sem `professional_id` e “Todos” está ativo THEN SHALL continuar a mostrá-los na primeira coluna (comportamento atual).
- WHEN há muitos profissionais THEN SHALL scroll horizontal na grade; colunas com `min-width` (mobile ~152px, desktop ~176px).
- WHEN um único profissional está filtrado THEN a coluna SHALL expandir para preencher a largura útil.
- WHEN o horário é `:30` THEN o rótulo de hora no gutter só aparece nas horas cheias (igual hoje).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AGENDA-GRID-01 | P1: Grade viewport &lt; md | Design | Pending |
| AGENDA-GRID-02 | P1: Grade viewport ≥ md | Design | Pending |
| AGENDA-GRID-03 | P1: Coluna por membro em Todos | Design | Pending |
| AGENDA-GRID-04 | P1: Filtro reduz colunas | Design | Pending |
| AGENDA-GRID-05 | P1: Snap + sticky horário | Design | Pending |
| AGENDA-GRID-06 | P1: Slot vazio → wizard | Design | Pending |
| AGENDA-GRID-07 | P1: Slot ocupado → detalhes | Design | Pending |
| AGENDA-GRID-10 | P1: Chips de dia compactos | Design | Pending |
| AGENDA-GRID-11 | P1: Avatares compactos | Design | Pending |
| AGENDA-GRID-12 | P1: space-y da página | Design | Pending |
| AGENDA-GRID-13 | P1: Sem EmptyState gigante | Design | Pending |
| AGENDA-GRID-20 | P2: Header de coluna sticky | Design | Pending |
| AGENDA-GRID-21 | P2: Card denso | Design | Pending |
| AGENDA-GRID-22 | P2: Hint dia vazio | Design | Pending |

---

## Success Criteria

- [ ] Em 390×844, com Todos, vê-se pelo menos uma coluna inteira e o peek da seguinte, com gutter de horário
- [ ] Em 1280×800 a grade preenche a área útil sem lista mobile residual
- [ ] Clique em vazio e em ocupado inalterados
- [ ] typecheck, lint, build e testes passam
