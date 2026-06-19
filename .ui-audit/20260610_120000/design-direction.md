# Design Direction — AgendiX

**Run:** `20260610_120000` | **Fase:** 4 ✅  
**Decisão user:** Opção **A (radius)** + **B (density)**

---

## Cena física

**Barber — dark/light, compacto**  
Dono de barbearia no celular, entre um cliente e outro, luz de salão (neon quente ou janela lateral). Precisa ver faturamento e próximo horário **sem scroll**. Interface industrial, direta — como bancada de trabalho, não spa.

**Beauty — dark/light, respirado**  
Dono(a) de salão em ambiente mais calmo — recepção com luz difusa, tablet ou celular na mesa. Mesma urgência operacional, mas headspace visual mais amplo: serviços e clientes pedem **respiração**, não compressão.

---

## Color strategy

**Restrained** (floor Impeccable product)

- Accent gold (barber) ou purple (beauty) ≤ **10%** da superfície visível
- Accent só em: CTA primário, estado ativo nav, focus ring, badge de status, progresso de meta
- Backgrounds e cards vêm **100% dos tokens** existentes — sem nova paleta
- Dark: superfícies profundas, texto `--color-text` / `--color-text-secondary`
- Light: contraste reforçado em body text (evitar muted gray washed out)

---

## Diferenciação barber vs beauty

### A — Radius (por tema)

| Token | Barber | Beauty |
|-------|--------|--------|
| `radius.card` | `rounded-lg` (8px) | `rounded-2xl` (16px) |
| `radius.button` | `rounded-lg` | `rounded-xl` |
| `radius.input` | `rounded-md` | `rounded-lg` |
| `radius.modal` | `rounded-xl` | `rounded-2xl` |
| `radius.badge` | `rounded-md` | `rounded-full` |
| `radius.avatar` | `rounded-lg` | `rounded-full` |

Barber = **precisão, ferramenta**. Beauty = **suavidade, cuidado**.

### B — Density (por tema)

| Token | Barber | Beauty |
|-------|--------|--------|
| `density.page-padding` | `p-3 md:p-6` | `p-4 md:p-8` |
| `density.card-padding` | `p-4 md:p-5` | `p-5 md:p-8` |
| `density.gap-section` | `space-y-4 md:space-y-5` | `space-y-6 md:space-y-8` |
| `density.gap-inline` | `gap-2 md:gap-3` | `gap-3 md:gap-4` |
| `density.table-row` | `py-2.5` | `py-3.5` |
| `density.nav-item` | `py-2 px-3` | `py-2.5 px-4` |
| `density.kpi-min-height` | `min-h-[140px]` | `min-h-[160px]` |
| `density.touch-min` | `44px` (ambos mobile) | `44px` |

Barber = **Stripe-like** em listas e KPIs. Beauty = **Notion-like** em seções e cards.

**Regra:** density e radius vêm de `useBrutalTheme().theme` — nunca hardcode por página.

---

## Hierarquia visual (4 telas críticas)

### Login
- 1 decisão clara: escolha barber/beauty (mantém cards atuais, aplica tokens 4 modos)
- Density beauty: cards mais altos, mais padding interno
- Density barber: cards compactos, copy direta

### Dashboard
- **1 hero metric** (faturamento hoje) — largura total mobile
- 2–3 KPIs secundários compactos (barber) ou cards espaçados (beauty)
- MeuDia / SetupCopilot na 2ª dobra
- Banners (comissão, unfinished) — outlined, não competir com hero

### Agenda
- TimeGrid denso barber (slots menores); beauty com mais padding entre slots
- Ações primárias sticky bottom mobile — 44px min

### Financeiro
- Tabela densa barber (ui/Table); beauty com row height maior
- Modais unificados — shell ui/Modal

---

## Tom visual

| Aspecto | Direção |
|---------|---------|
| Motion | Intencional, ease-out; hero only — não fade-in page-wide |
| Shadows | Token `--shadow-card`; glow só variant `accent` |
| Borders | Outlined default; elevated só modais/dropdowns |
| Typography | Sentence case títulos; UPPERCASE banido em labels |
| Icons | Lucide outline consistente; strokeWidth 2 (active 2.5) |

---

## Bans (Impeccable product)

- Side-stripe `border-l-4` accent
- Ghost gradient overlay em todo card
- Nested cards
- `isBeauty` ternaries — só `useBrutalTheme()`
- z-index arbitrário (999) — escala semântica

---

## Referências Open Design

Ver `od-reference.json` — composição only, **não** copiar cores/fontes.

| Tema | Referência | Emprestar |
|------|------------|-----------|
| Barber density | stripe + linear-app | tabelas, KPI row, sidebar item height |
| Beauty density | notion | section spacing, card breathing room, page header |

---

## Matrix de validação (Fase 6 gate)

16 combinações a provar nos artifacts:

```
barber  × dark  × login | dashboard | agenda | financeiro
barber  × light × ...
beauty  × dark  × ...
beauty  × light × ...
```

Cada artifact HTML deve usar **mesmos componentes DS Lock** — só tokens mudam.

---

## Ordem de remediação (confirmada Fase 3)

1. Login → 2. Dashboard → 3. Agenda → 4. Financeiro

---

## Aprovação

- **Radius A:** ✅ barber sharp / beauty soft  
- **Density B:** ✅ barber compact / beauty respirado  
- **Brand:** cores e logo fixos  
- **Próximo:** Fase 5 — DESIGN-SYSTEM + DS Lock
