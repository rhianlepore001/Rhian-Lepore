# Agenda colunas — Context

**Gathered:** 2026-09-02
**Spec:** `specs/active/agenda-colunas-espacamento/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Compactar o chrome da Agenda e unificar mobile/desktop numa grade horário × colaborador. Sem tracker de pontos, sem schema novo, sem CTA extra no mobile.

---

## Implementation Decisions

### Experiência única mobile + desktop

- Uma grade, dois breakpoints de densidade — não lista no mobile e grade no desktop.
- Referência visual: agenda tipo Fresha/Booksy (colunas de recurso), **melhorando** a tabela estreita da imagem 1 (anti-exemplo de espaçamento).
- Prints 2 e 3: ar morto entre dias, avatares e empty state — o empty card some; a grade ocupa o espaço.

### Layout da grade

- Gutter de horário sticky à esquerda (~48px mobile, 64px desktop).
- Colunas com snap-start no mobile; `min-w-[152px]` mobile, `min-w-[176px]` desktop; `flex-1` quando couber.
- Cabeçalho de coluna sticky no topo (avatar 28px + primeiro nome).
- Linha: `h-12` mobile / `h-14` desktop.
- “Não atribuído” permanece na primeira coluna quando Todos (não criar coluna extra).

### Chrome

- Chips de dia: `w-11 h-14` (44×56), manter drag/scroll atual.
- Avatares do filtro: `w-11 h-11`, `gap-3`, `title` com nome completo.
- Remover o dot verde decorativo (não é presença real — ruído).
- Página: `space-y-3 md:space-y-4`.
- Sem EmptyState `py-10` no corpo da agenda; hint `text-xs` se o dia estiver vazio.

### Agent's Discretion

- Extração para `components/agenda/AgendaResourceGrid.tsx`.
- Tokens via `useBrutalTheme` / CSS vars — zero hex.
- Microinterações: hover/focus já existentes no empty slot; snap CSS nativo.

---

## Specific References

- Imagem 1 (WhatsApp): tabela de datas numa coluna estreita — **o que não repetir**.
- Imagens 2–3 (Agenda atual): chips grandes, gap entre avatares e empty card, filtro Todos.
- Design system: `design-system/MASTER.md` — spacing 4px, `text-xs` mínimo, touch ≥44px, `rounded-2xl` em containers, shadows só tokens (`shadow-lite-glass` mobile).
- Agente UX: `.github/agents/ux-design-expert.agent.md` (tokens, a11y, atomic).

---

## Deferred Ideas

- Unificar date strip + avatares num único overflow-x (spec Agenda v2).
- Drag entre colunas.
- Coluna dedicada “Não atribuído”.
- Visão mensal de pontos/produção.
