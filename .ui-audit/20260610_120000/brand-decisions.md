# Brand Decisions — AgendiX UI Audit

**Run:** `20260610_120000` | **Aprovado:** conversa Fase 0 + confirmação Fase 3

---

## Decisões fechadas

| Decisão | Escolha | Notas |
|---------|---------|-------|
| **Cor primária barber** | Manter | Dourado — dark `#C29B40`, light `#A07A2A` |
| **Cor primária beauty** | Manter | Roxo — dark `#A78BFA`, light `#7C3AED` |
| **Logo e ícones** | Fixos | Não evoluir neste ciclo |
| **Tema** | Ambos × ambos | barber dark+light, beauty dark+light (4 combinações) |
| **Densidade** | Compacto mobile-first | Barbeiro no celular entre atendimentos; info crítica em 390px |
| **Fontes** | Manter | Chivo (heading) + Inter (body) |
| **Escopo visual** | Craft, não rebranding | Elevar hierarquia, componentes, estados — cores de marca fixas |

---

## Decisões derivadas (audit)

| Decisão | Escolha | Rationale |
|---------|---------|-----------|
| **Estratégia de cor** | Restrained | Accent ≤10% superfície; tokens fixos não permitem Full palette |
| **Substituir genericidade** | Composição + componentes | Não via nova paleta |
| **Telas remediação** | 4 | Dashboard, Agenda, Login, Financeiro |
| **Ordem implementação** | Login → Dashboard → Agenda → Financeiro | Menor superfície primeiro; prova 4 temas cedo |
| **Componente canônico** | `components/ui/*` | Brutal* → deprecated wrappers |
| **Side-stripe / ghost cards** | Remover | Impeccable product bans |

---

## Abertas para Fase 4 (Design Direction)

Estas definem *como* aplicar craft sem mudar brand:

1. **Barber vs beauty — diferenciação além da cor**
   - ✅ **A — Radius:** barber sharp (`rounded-lg`), beauty soft (`rounded-2xl`)
   - ✅ **B — Density:** barber compacto (Stripe/Linear), beauty respirado (Notion)

2. **Dark vs light — personalidade**
   - Dark: industrial/premium (barber), elegante/noturno (beauty)
   - Light: papel limpo (barber warm white), spa luminoso (beauty lavender tint)
   - Já definido em tokens.css — Fase 4 valida se craft comunica isso

3. **Referências visuais**
   - Não informado pelo user — Fase 4 pode sugerir: Fresha (mobile ops), Stripe (dados), Linear (densidade)

---

## Intocáveis confirmados

- Logo AgendiX
- Paleta accent gold/purple
- Font stack Chivo/Inter
- Funcionalidades e rotas existentes

---

## Assinatura

Decisões consolidadas a partir do `product-context.md` e confirmação explícita do usuário em 2026-06-10.
