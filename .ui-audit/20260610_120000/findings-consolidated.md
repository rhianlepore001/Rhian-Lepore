# Findings Consolidados — AgendiX UI Audit

**Run:** `20260610_120000` | **Fase:** 2 + 2.5 ✅  
**Fontes:** heuristic, visual-system, components, states, a11y, copy

---

## Sumário executivo

| Severidade | Qtd |
|------------|-----|
| CRÍTICO | 5 |
| ALTO | 12 |
| MÉDIO | 14 |
| BAIXO | 5 |
| **Total** | **36** |

### Top 3 áreas problemáticas
1. **Componentes** — dual stack Brutal* vs ui/* (Card, Button, Modal, EmptyState)
2. **Visual system** — 3 fontes de tokens; light mode quebrado no legado
3. **Heurística** — dashboard e nav mobile sem hierarquia clara

### Esforço estimado (remediação completa)
- **Quick wins (Baixo):** ~8 findings — 1 sprint
- **Estrutural (Médio/Alto):** migração DS + light mode — 3-4 sprints

### Padrões sistêmicos
- **P1:** BrutalCard/BrutalButton dominam ~50 arquivos enquanto ui/* é o DS "oficial"
- **P2:** ~80 arquivos com `isBeauty` hardcoded — 4 temas não aplicados uniformemente
- **P3:** Side-stripe + ghost gradient + rounded-2xl everywhere = genericidade visual

---

## CRÍTICO

### UI-001: Três fontes de estilo competindo
- **Origem:** visual-system CRÍTICO-001
- **Severidade:** CRÍTICO
- **Evidência:** `design-system/tokens.css`, `hooks/useBrutalTheme.ts`, `index.html:39-80`
- **Problema:** Tokens duplicados (gold, violet, neutrals) em CSS, hook e Tailwind CDN inline
- **Impacto:** Impossível garantir barber/beauty × dark/light consistentes
- **Fix:** DS Lock — tokens.css como única fonte; hook lê CSS vars
- **Esforço:** Alto

### UI-002: Dois Modals — ui/Modal sem focus trap
- **Origem:** components CRÍTICO-002 + a11y CRÍTICO-001 (deduplicado)
- **Severidade:** CRÍTICO
- **Evidência:** `components/ui/Modal.tsx` vs `components/Modal.tsx:82` (FocusTrap)
- **Problema:** APIs `open` vs `isOpen`; a11y inconsistente
- **Impacto:** Tab escapa do dialog; comportamento imprevisível
- **Fix:** Modal canônico único com focus-trap + portal
- **Esforço:** Médio

### UI-003: Dois sistemas de Card coexistem
- **Origem:** components CRÍTICO-001
- **Severidade:** CRÍTICO
- **Evidência:** `BrutalCard.tsx` (~50 usos) vs `ui/Card.tsx` (~18 usos)
- **Problema:** Padding, overlay gradient e headers diferentes
- **Impacto:** Settings vs dashboard parecem apps diferentes
- **Fix:** Deprecar BrutalCard → ui/Card variants
- **Esforço:** Alto

### UI-004: Dashboard owner sem hierarquia de ação primária
- **Origem:** heuristic CRÍTICO-001
- **Severidade:** CRÍTICO
- **Evidência:** `pages/Dashboard.tsx:257-268`
- **Problema:** Copilot, banners, alerts e KPIs competem na mesma dobra
- **Impacto:** Perde proposta "de relance" mobile-first
- **Fix:** 1 hero metric + CTA; secundários na 2ª dobra
- **Esforço:** Médio

### UI-005: Light mode sub-implementado no legado
- **Origem:** visual-system ALTO-002 (elevado — bloqueia objetivo do audit)
- **Severidade:** CRÍTICO
- **Evidência:** `tokens.css:102+`; `pages/ClientArea.tsx`, `pages/Login.tsx` hardcoded dark
- **Problema:** Toggle light quebra em ~80 arquivos isBeauty/dark-assumptive
- **Impacto:** 2 dos 4 temas prometidos não funcionam de verdade
- **Fix:** Migrar hotspots para useBrutalTheme; ban hex backgrounds em pages/
- **Esforço:** Alto

---

## ALTO

### UI-006: BrutalButton vs ui/Button — alturas diferentes
- **Origem:** components ALTO-003
- **Evidência:** BrutalButton md `h-12` vs ui/Button md `h-11`
- **Fix:** Button canônico; sizes tokenizados
- **Esforço:** Médio

### UI-007: EmptyState duplicado (APIs diferentes)
- **Origem:** components ALTO-004
- **Evidência:** `components/EmptyState.tsx` vs `components/ui/EmptyState.tsx`
- **Fix:** Unificar em ui/EmptyState
- **Esforço:** Baixo

### UI-008: Accent como decoração everywhere
- **Origem:** visual-system ALTO-003
- **Evidência:** BrutalCard gradient; PublicLinkCard border-l-4
- **Fix:** Accent ≤10%; ban side-stripe
- **Esforço:** Médio

### UI-009: Navegação mobile inconsistente com desktop
- **Origem:** heuristic ALTO-002
- **Evidência:** BottomMobileNav vs Sidebar/NAVIGATION_ITEMS
- **Fix:** Reordenar bottom nav por tarefas PRD
- **Esforço:** Médio

### UI-010: Settings é ilha visual
- **Origem:** heuristic ALTO-003
- **Evidência:** Layout.tsx oculta sidebar em settings
- **Fix:** Shell visual unificado
- **Esforço:** Médio

### UI-011: Loading global spinner dark-only
- **Origem:** states ALTO-001
- **Evidência:** `App.tsx:51-55`
- **Fix:** Skeleton route-level + tokens
- **Esforço:** Médio

### UI-012: Clients empty sem CTA
- **Origem:** states ALTO-002 + copy MÉDIO-005 (deduplicado)
- **Evidência:** `pages/Clients.tsx:234`
- **Fix:** EmptyState + "Adicionar cliente"
- **Esforço:** Baixo

### UI-013: Bottom nav touch targets / labels
- **Origem:** a11y ALTO-002 + ALTO-003
- **Evidência:** BottomMobileNav.tsx; BrutalButton sm h-9
- **Fix:** min 44px mobile; aria-labels
- **Esforço:** Baixo

### UI-014: Erros técnicos expostos ao usuário
- **Origem:** copy ALTO-001
- **Evidência:** Agenda.tsx, ProfessionalCommissionDetails.tsx
- **Fix:** Mapa de erros → copy humana
- **Esforço:** Médio

### UI-015: CTAs inconsistentes (Salvar/Cadastrar/Confirmar)
- **Origem:** copy ALTO-002
- **Fix:** Guia de voz DS para ações primárias
- **Esforço:** Baixo

### UI-016: Modais custom (Checkout, Commission) fora do shell
- **Origem:** components MÉDIO-006 (elevado)
- **Evidência:** CheckoutModal.tsx, CommissionPaymentHistory.tsx
- **Fix:** Modal size=full + slots
- **Esforço:** Médio

### UI-017: KPI grid genérico no Dashboard
- **Origem:** heuristic MÉDIO-004 (elevado — hotspot)
- **Evidência:** PremiumKpiCard repetido
- **Fix:** 1 hero + secundários compactos
- **Esforço:** Baixo

---

## MÉDIO (seleção — ver findings/ para lista completa)

| ID | Título | Esforço |
|----|--------|---------|
| UI-018 | Link `/finance` quebrado no banner comissões | Baixo |
| UI-019 | Escala tipográfica inconsistente | Médio |
| UI-020 | Border-radius arbitrário (4 variantes) | Baixo |
| UI-021 | Ghost card gradient (BrutalCard) | Baixo |
| UI-022 | Skeleton triplicado | Baixo |
| UI-023 | Toast erro agenda sem retry | Médio |
| UI-024 | BrutalButton sem aria-busy | Baixo |
| UI-025 | Dashboard KPI flash $0 loading | Baixo |
| UI-026 | z-index 999 arbitrário | Baixo |
| UI-027 | prefers-reduced-motion parcial | Baixo |
| UI-028 | Tabelas custom sem th semântico | Médio |
| UI-029 | Títulos UPPERCASE genéricos | Baixo |
| UI-030 | PT-BR inconsistente (Ticket medio, Setup) | Baixo |
| UI-031 | Onboarding desconectado do app | Alto |

---

## BAIXO

| ID | Título |
|----|--------|
| UI-032 | Animação fade-in uniforme (Layout) |
| UI-033 | UiPreview ≠ produção |
| UI-034 | Placeholder notificações no nav |
| UI-035 | index.html title genérico |
| UI-036 | Botão fechar banner "x" literal |

---

## Recomendação para Fase 3

Priorizar telas que concentram findings CRÍTICO/ALTO:

1. **Dashboard** — UI-004, UI-017, UI-018
2. **Agenda** — UI-014, UI-023
3. **Financeiro** — UI-003, UI-006, UI-016
4. **Login/Register** — UI-005 (light/dark × barber/beauty)
5. **Clients** — UI-012
6. **Public Booking** — UI-005 (legado hardcoded)

Sugerido **4 telas** para redesign (limite recomendado do pipeline).
