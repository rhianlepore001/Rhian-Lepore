# SPEC — Auditoria Mobile-First (O5)

**Tarefa:** O5 · **Data:** 2026-06-07
**Status:** READY-FOR-SHIP (handoff Composer / Q2) · **Sem implementação.**
**Base:** checklist do O1 (`SPEC-ui-audit.md`) + lente mobile.
**Telas:** Agenda, Finance, PublicBooking, QueueManagement, Dashboard.

> Foco do O5 (≠ O1): o que quebra/atrapalha **no celular** — alvos de toque, zoom do iOS, reflow, overflow, áreas tocáveis. Persona: barbeiro usando o celular no balcão (base 320–390px).
> Itens já listados no O1 (radius, sombras, `text-[10px]`, `alert()`) **não** se repetem aqui, exceto quando o impacto mobile muda a prioridade.

---

## 0. Padrão de alvo de toque (referência)

- **Mínimo:** 44×44px (`min-h-[44px]` / `min-w-[44px]`) — guideline Apple/Material, já adotado no `Dashboard.tsx`.
- Botões `ui/Button`: `md` = 44px ✅, `sm` = 36px ⚠️ (usar só em desktop ou onde houver espaçamento suficiente).
- Ícones-botão: `p-1.5` ≈ 30px ❌, `p-1` ≈ 24px ❌ → no mobile devem ter `min-h-[44px] min-w-[44px]` (ou área tocável ampliada).

---

## 1. 🔴 Sistêmico — Zoom do iOS em inputs (P1, afeta TODAS as telas com form)

iOS dá **zoom automático** ao focar input com `font-size < 16px`. Hoje:

- `ui/Input` size **md** = `text-sm` (14px) → **dispara zoom**. `sm` (12px) idem. Só `lg` (16px) é seguro.
- Inputs crus em `Finance.tsx` (920, 938, 954, 971): sem classe de tamanho explícita; o `<select>` e date herdam → risco de zoom.

**Recomendação:** no mobile, inputs ≥ 16px. Opções: (a) `ui/Input` md passar a `text-base` (16px) no mobile via `md:text-sm` — manter 14px só ≥ md; ou (b) usar size `lg` em formulários mobile. Decisão de design system → vale ajustar o `ui/Input` (uma vez, resolve todas as telas). **Handoff:** Composer + nota no `design-system/MASTER.md`.

> Esta é a maior alavanca mobile: 1 ajuste no componente canônico conserta o app inteiro.

---

## 2. AGENDA — `pages/Agenda.tsx`

- [ ] **P1** Ícones-botão abaixo do alvo de toque: detalhes/editar `p-1.5 rounded-md` (1143, 1153), fechar `p-1` (1272), avatares de ação `p-1.5` (923, 931, 1067) → `min-h-[44px] min-w-[44px]`.
- [ ] **P1** Botão "concluir/aceitar" `text-[10px] py-2.5` (1269) — altura ~ok, mas o rótulo 10px é alvo visual minúsculo → `text-xs` + garantir 44px.
- [ ] **P2** Kanban em scroll horizontal `flex-nowrap overflow-x-auto` com colunas `min-w-[300px]` (960, 964, 1030): padrão aceitável, mas no mobile vira scroll lateral por profissional. Confirmar `snap` + indicador visual de "arrasta para o lado" (hoje `scrollbar-hide` esconde a pista). Considerar default empilhado (1 coluna) quando há filtro de profissional.
- [ ] **P2** `max-w-[180px] truncate` em nome de serviço (1171): ok, mas validar que não corta info crítica em telas estreitas.
- [ ] Carrossel de profissionais (809) com `min-w-[72px] snap-start`: largura ok; garantir altura tocável ≥ 44px no chip inteiro.

## 3. FINANCEIRO — `pages/Finance.tsx`

- [ ] **P1** Inputs crus do modal "nova transação" (920, 938, 954, 971) sem tamanho ≥16px → zoom iOS (ver §1). Migrar para `ui/Input`/`ui/Select` resolve tamanho + token + alvo.
- [ ] **P1** `<select>` nativo de status (938): no mobile usar componente `ui/Select` (área tocável + estilo consistente); nativo é pequeno e quebra identidade.
- [ ] **P2** Botões "marcar como paga" dentro das linhas/cards (687, 784): garantir 44px no toque.
- [x] Layout responsivo dos KPIs OK: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` (438) empilha no mobile.
- [x] Tabela → cards no mobile OK: `hidden md:block overflow-x-auto` (619) + cards mobile.

## 4. BOOKING PÚBLICO — `pages/PublicBooking.tsx`

- [ ] **P1** Checkboxes nativos crus (950, 958, 1459, 1467) ≈ 13–16px → alvo de toque insuficiente numa **tela pública de conversão**. Ampliar área tocável (label clicável + `min-h-[44px]`) ou checkbox custom.
- [ ] **P1** Input de nome cru (938, 1447): garantir ≥16px (zoom iOS) e alvo 48px.
- [ ] **P1** `text-[10px]/[11px]` massivo (ver O1) — no mobile é **legibilidade**, não só consistência: subir prioridade aqui. Steps `w-7 h-7` com `text-[10px]` (664, 1017) são indicadores pequenos demais.
- [ ] **P2** Botão fechar modal `X w-8 h-8` sem padding tocável (1661): envolver em alvo 44px.
- [ ] **P2** Chips de categoria em `overflow-x-auto` (693, 1102): ok; manter pista de scroll visível (usa `scrollbar-thin`, melhor que `scrollbar-hide`).
- [ ] **P2** Blobs decorativos `blur-[140px]` (631-632): checar custo de pintura em aparelhos fracos (gama do barbeiro). Avaliar reduzir blur no mobile.

## 5. FILA DIGITAL — `pages/QueueManagement.tsx`

- [ ] **P2** Cards com `hover:scale-[1.01]` (263, 324): hover não existe em touch; sem impacto negativo, mas sem benefício mobile — ok manter.
- [x] Botão principal `min-h-[48px]` (335) ✅ bom alvo.
- [ ] **P1** (herdado O1, prioridade mobile) loading cru `text-white` + spinner (198) — sem skeleton, no mobile a tela fica "branca/vazia" durante carga. Tratar junto do O1.
- [ ] Modais `max-w-sm w-full` (383, 435, 505): largura ok no mobile; confirmar scroll interno em telas baixas (≤ 700px de altura) — adicionar `max-h-[90vh] overflow-y-auto` se faltar.

## 6. DASHBOARD — `pages/Dashboard.tsx` (referência)

- [x] `min-h-[44px]` em todos os CTAs (312, 356, 384, 401, 408) ✅.
- [x] Grids empilham no mobile; `px-4 md:px-0` ✅.
- [ ] **P2** Toast de redirect `bottom-24` (213): confirmar que fica **acima** da bottom-nav e dentro da safe-area do iPhone (`env(safe-area-inset-bottom)`); validar em device com notch.
- [ ] **P2** Verificar `padding-bottom` do conteúdo para não ficar atrás da bottom-nav (a existência de `bottom-24` no toast indica nav fixa).

---

## 7. Checks globais mobile (aplicar no review do Composer)

- [ ] Nenhum input com fonte < 16px no mobile (zoom iOS) — §1.
- [ ] Todos os ícones-botão com alvo ≥ 44px.
- [ ] Sem overflow horizontal não-intencional (carrosséis intencionais ok).
- [ ] Modais com `max-h-[90vh] overflow-y-auto` (telas baixas / teclado aberto).
- [ ] Conteúdo respeita safe-area inferior (bottom-nav + notch).
- [ ] `text-xs` (12px) como piso de legibilidade (reforça O1).

---

## 8. Resumo de handoffs

| Item | Prioridade | Destino |
|------|-----------|---------|
| `ui/Input` md → 16px no mobile (zoom iOS) | **P1** | Composer + `MASTER.md` |
| Checkboxes/inputs PublicBooking (alvo + zoom) | P1 | Composer |
| Ícones-botão Agenda < 44px → 44px | P1 | Composer |
| Inputs crus Finance → `ui/Input`/`ui/Select` | P1 | Composer |
| Loading Queue sem skeleton (impacto mobile) | P1 | Composer (lote O1) |
| Safe-area / bottom-nav (toast + padding) | P2 | Composer / Q2 |
| Kanban Agenda: pista de scroll / default empilhado | P2 | Q2 (decisão UX) |
| Blur pesado PublicBooking em device fraco | P2 | Q2 |

> Nada implementado aqui (O5 = auditoria). Fixes mecânicos → Composer; decisões de UX (kanban, blur) → Q2 (polish final).
