# UI Surface Map — AgendiX

**Run:** `20260610_120000`  
**Fase:** 1 — UI Mapper ✅

---

## Stack detectada

| Camada | Tecnologia |
|--------|------------|
| Framework | React 19 + Vite 6 + TypeScript |
| Roteamento | HashRouter (`/#/rota`) |
| Estilo | Tailwind via CDN (`index.html`) + `design-system/tokens.css` |
| Tema | `data-theme` (barber/beauty) + `data-mode` (dark/light) via `useBrutalTheme` |
| Estado | React Context + TanStack Query |
| Ícones | Lucide React |
| Gráficos | Recharts |

**Nota crítica:** existem **3 fontes de tokens** — `tokens.css`, `useBrutalTheme.ts` e `tailwind.config` inline no `index.html`. Isso explica inconsistências visuais entre telas.

---

## Superfícies mapeadas — 35 rotas

### App autenticado (shell: Sidebar + Header + BottomMobileNav)

| Rota | Tipo | Arquivo principal | Prioridade |
|------|------|-------------------|------------|
| `/#/` | Dashboard | `pages/Dashboard.tsx` | Crítica |
| `/#/agenda` | Calendário | `pages/Agenda.tsx` | Crítica |
| `/#/financeiro` | Financeiro | `pages/Finance.tsx` | Crítica |
| `/#/clientes` | Lista | `pages/Clients.tsx` | Alta |
| `/#/clientes/:id` | CRM | `pages/ClientCRM.tsx` | Alta |
| `/#/fila` | Fila | `pages/QueueManagement.tsx` | Alta |
| `/#/produtos` | CRUD | `pages/Products.tsx` | Média |
| `/#/marketing` | Campanhas | `pages/Marketing.tsx` | Média |
| `/#/insights` | Relatórios | `pages/Reports.tsx` | Média |
| `/#/meus-insights` | Staff dash | `pages/StaffInsights.tsx` | Média |

### Configurações (shell: SettingsLayout — sem sidebar principal)

12 rotas em `pages/settings/` — destaque: `GeneralSettings`, `ServiceSettings`, `SubscriptionSettings`, `UiPreview` (catálogo do DS).

### Público / standalone

| Rota | Tipo | Prioridade |
|------|------|------------|
| `/#/book/:slug` | Agendamento público | Crítica |
| `/#/login`, `/#/register` | Auth | Alta |
| `/#/queue/:slug`, `/#/queue-status/:id` | Fila digital | Média |
| `/#/minha-area/:slug` | Portal cliente | Média (débito legado alto) |
| Onboarding (3 rotas) | Setup | Alta |

---

## Componentes compartilhados

### Canônicos (`components/ui/`)

Button, Input, Select, Card, Modal, Table, Tabs, Badge, EmptyState, Skeleton, ErrorState, ConfirmModal, Toast.

**Problema:** subutilizados. `UiPreview` os cataloga, mas a maior parte do app usa componentes legados.

### Legado (ainda dominante)

| Componente | Uso aprox. | Observação |
|------------|------------|------------|
| `BrutalCard` | ~50 arquivos | Card padrão de facto |
| `BrutalButton` | ~40 arquivos | Modais, forms, ações |
| `Modal.tsx` (root) | paralelo a `ui/Modal` | Shell diferente |
| `EmptyState.tsx` (root) | duplicata | vs `ui/EmptyState` |
| `SettingsSection` | settings | wrapper próprio |

---

## Sistema de temas (4 combinações)

```
barber + dark   → dourado sobre #121212 (default)
barber + light  → dourado sobre #F5F1E8
beauty + dark   → roxo sobre #1F1B2E
beauty + light  → roxo sobre fundo claro
```

**Infra pronta:** `tokens.css` define as 4 combinações; `ThemeContext` faz toggle dark/light.

**Gap:** ~80 arquivos ainda usam `isBeauty` / `user_type === 'beauty'` com classes hardcoded — light mode e consistência quebram nessas telas.

**Maiores débitos legados:**
- `pages/ClientArea.tsx` (~85 branches isBeauty)
- `pages/Finance.tsx`, `pages/Login.tsx`, `pages/PublicBooking.tsx`
- `components/AppointmentWizard.tsx`, `components/TeamMemberForm.tsx`

---

## Inconsistências sistêmicas (9 padrões)

1. **Card ×3** — BrutalCard, ui/Card, divs inline com `colors.card`
2. **Button ×3** — BrutalButton, ui/Button, classes accent soltas
3. **Modal ×4** — ui/Modal, Modal root, ConfirmModal, shells custom (Checkout, Commission)
4. **EmptyState ×2** — duplicata root vs ui/
5. **Theme branching ×2** — useBrutalTheme vs isBeauty espalhado
6. **Border-radius ×4** — lg / xl / 2xl / 3xl sem escala fixa
7. **Side-stripe accent** — `border-l-4` em ~20 locais (PublicLinkCard, Queue, MeuDia)
8. **Loading ×3** — Skeleton ui, SkeletonLoader, animate-pulse inline
9. **Settings layout ×2** — SettingsLayout vs BrutalCard manual

---

## AI slop tells detectados

- Grids de cards idênticos (Dashboard KPIs, StaffInsights, Reports)
- Overlays gradiente fantasma em BrutalCard (`from-white/[0.02]`)
- Hero metrics genéricos (faturamento hoje, meta do mês)
- Side-stripe `border-l-4` como único diferenciador
- `rounded-2xl` em tudo — falta hierarquia de forma
- `animate-in fade-in` uniforme em toda página (Layout)
- Cards aninhados (BrutalCard dentro de BrutalCard)
- Stack vertical de widgets sem ritmo visual

---

## Hotspots para auditoria (Fase 2–3)

1. **Dashboard** — primeira impressão, KPI grid, mobile 390px
2. **Agenda** — fluxo diário do barbeiro, TimeGrid, wizard
3. **Financeiro** — densidade de dados, BrutalCard heavy
4. **Public Booking** — face pública, 42+ radius hardcoded
5. **Login/Register** — auth standalone, tema duplicado
6. **Settings Geral** — SettingsLayout vs resto do app
7. **Client CRM** — detail view, isBeauty legacy
8. **Fila** — side-stripe heavy, mobile queue UX

---

## Shell da aplicação

```
Layout
├── BrutalBackground (CSS vars)
├── TrialBanner (fixed top)
├── Sidebar (desktop, hidden em settings)
├── Header
├── main (p-3 md:p-8 max-w-7xl)
└── BottomMobileNav (mobile, hidden em settings/billing)
```

Settings usa `SettingsLayout` separado — experiência visual distinta do app principal.

---

## Próximo passo

Fase 2 — 6 auditores UI/UX em paralelo (heurística, visual-system, components, states, a11y, copy).
