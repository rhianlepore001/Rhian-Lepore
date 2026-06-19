# Playbook — Migração das telas deferred (S8)

**Run:** `20260610_120000` | **Sprint:** S8 | **Findings:** UI-012, UI-031, UI-033  
**Pré-requisitos concluídos:** S1 (tokens), S2 (componentes `ui/*`), S3 (shell PageHeader/Layout)  
**Escopo:** guia de migração — **não** implementação completa neste ciclo.

---

## 1. Protocolo padrão (todas as telas)

Repita em cada PR de migração deferred:

1. **Imports** — trocar `BrutalCard` → `Card`, `BrutalButton` → `Button`, `BrutalInput` → `Input` de `@/components/ui` ou `components/ui/*`.
2. **Tokens** — usar `useBrutalTheme()` (`colors`, `accent`, `density`, `classes`, `status`); remover hex/`text-white`/`isBeauty ? 'text-beauty-neon' : 'text-accent-gold'` quando houver token equivalente.
3. **Layout** — `PageHeader` (1 CTA primário) + `density.pagePadding` no container da página.
4. **Estados** — `Skeleton`/`SkeletonCard` em loading; `EmptyState` em vazio; `ErrorState` + `mapError()` em erro (nunca `error.message` cru).
5. **Modais** — `ui/Modal` (`open`, `size`, slots header/body/footer); policy/checkout → `size="full"` se ocupar fluxo inteiro.
6. **Tabelas** — `ui/Table` com `<th scope="col">`, `stickyHeader`, `density.tableRowPy`.
7. **Copy** — sentence case; CTAs: `Adicionar`, `Salvar alterações`, `Excluir`, `Continuar` (SPEC §9).
8. **Verificação** — `grep BrutalCard|BrutalButton` na pasta da tela = 0; typecheck + lint + build; smoke 390px × 4 temas.

**Wrappers @deprecated:** `components/BrutalCard.tsx` e `BrutalButton.tsx` reexportam `ui/*` — telas não migradas continuam funcionando até o grep zerar.

---

## 2. Clients — `pages/Clients.tsx`

**Rota:** `/#/clientes` | **Finding:** UI-012 (empty state)

### Inventário Brutal* (baseline)

| Legado | Ocorrências | Alvo canônico |
|--------|-------------|---------------|
| `BrutalCard` | 1 (grid de cards de cliente) | `Card variant="outlined"` |
| `BrutalButton` | 2 (header + modal footer) | `Button` (`primary` / `secondary`) |

### Já migrado parcialmente

- `EmptyState` de `components/ui/EmptyState` já usado — ver quick win em `quick-wins/clients-empty-state.md`.
- `Button` já importado para ação do empty state.

### Passos

1. Substituir card de cliente por `Card variant="outlined"` com hover via `colors.surfaceHover` (sem `border-l-4`, sem `hover:border-white/40`).
2. `PageHeader`: título "Clientes", CTA único `Adicionar cliente` (`Button variant="primary"`).
3. Avatar: usar `radius.avatar` + `accent.borderDim` em vez de classes Tailwind hardcoded por segmento.
4. Filtros de tipo: `Button variant="outline"` / estado ativo com `classes.buttonPrimary`.
5. Loading: trocar texto "Carregando clientes..." por `SkeletonCard` × 3 no grid.
6. Modal de cadastro: `ui/Modal` + `Input`/`Select`; footer com `Salvar alterações` / `Cancelar`.

### Aceite local

- [ ] `grep Brutal` em `Clients.tsx` = 0  
- [ ] EmptyState copy conforme UI-012  
- [ ] 4 modos legíveis em 390px  

---

## 3. Public Booking — `pages/PublicBooking.tsx`

**Rota:** `/#/booking/:id` | **Findings:** UI-033 (tipografia), modais custom

### Inventário Brutal*

| Legado | Ocorrências | Alvo canônico |
|--------|-------------|---------------|
| `BrutalCard` | 0 | — |
| `BrutalButton` | 0 | — |

> Superfície já usa `useBrutalTheme` + `ConfirmModal`; débito principal é **modais custom** e tipografia micro.

### Passos

1. **Policy modal** (linhas ~1664): substituir `fixed inset-0` custom por `ui/Modal size="lg"` ou `full` no mobile.
2. **Bottom sheet / chat flow** (~1411): extrair para `ui/Modal size="full"` com `preventClose` no passo de confirmação.
3. **Summary cards** (~887): envolver blocos em `Card variant="outlined"`; remover `shadow-2xl` → `shadow.modal` / tokens.
4. **Tipografia:** `text-[9px]`/`text-[10px]`/`text-[11px]` → `text-xs` (12px mínimo — DESIGN-SYSTEM §1.4).
5. **CTAs públicos:** manter conversão — 1 primário por step; secundários `outline` ou `ghost`.
6. **`ClientAuthModal`:** migrar wrapper externo para `ui/Modal` (componente compartilhado).

### Aceite local

- [ ] 0 modais `fixed inset-0` sem `ui/Modal`  
- [ ] 0 `text-[9px|10px|11px]` na página  
- [ ] Smoke booking completo (serviço → horário → confirmar) nos 4 temas  

---

## 4. Settings — `pages/settings/*.tsx`

**Rota:** `/#/settings/*` | **Finding:** UI-031 (herda shell pós-S3)

### Inventário Brutal* por arquivo

| Arquivo | BrutalCard | BrutalButton | Notas |
|---------|------------|--------------|-------|
| `AuditLogs.tsx` | 5 | 3 | Tabela manual → `ui/Table` |
| `RecycleBin.tsx` | 6 | 2 | Remover `border-l-4` side-stripe |
| `CommissionsSettings.tsx` | 6 | 6 | Formulários densos |
| `SecuritySettings.tsx` | 2 | 4 | 2FA section |
| `ServiceSettings.tsx` | 1 | 2 | Lista de serviços |
| `TeamSettings.tsx` | 2 | 1 | Empty team → `EmptyState` |
| `FinancialSettings.tsx` | 1 | 1 | |
| `SubscriptionSettings.tsx` | 1 | 1 | |
| `PublicBookingSettings.tsx` | 0 | 1 | |
| `GeneralSettings.tsx` | 0* | 0* | Usa `SettingsSection` → BrutalCard interno |

\* `SettingsSection` (`components/SettingsSection.tsx`) ainda wrapa `BrutalCard` — migrar o wrapper **uma vez** e todas as sub-páginas herdam.

### Passos (ordem sugerida)

1. **Migrar `SettingsSection`** → compor com `Card variant="outlined"` + header slot (desbloqueia GeneralSettings e similares).
2. **`SettingsLayout`** — confirmar `density.pagePadding` e sidebar tokens (S3); sem `animate-in` no shell.
3. Lote por sub-página (1 PR cada): Team → Services → Financial → Commissions → Security → Subscription → Audit → Recycle.
4. Em cada lote: `SaveFooter` / botões salvar → `Button variant="primary"` com label **Salvar alterações**.
5. Tabelas (Audit, Recycle): `ui/Table` + `EmptyState`.
6. **`UiPreview.tsx`** — manter como matriz de regressão visual × 4 temas após cada lote.

### Aceite global Settings

- [ ] `grep BrutalCard` em `pages/settings/` + `SettingsSection.tsx` = 0  
- [ ] Nenhum `alert()`/`confirm()` nativo  
- [ ] OwnerRouteGuard intacto  

---

## 5. Onboarding — `pages/OnboardingWizard.tsx` + `components/onboarding/*`

**Rotas:** `/#/onboarding-wizard`, `/#/onboarding` | **Finding:** UI-031

### Inventário Brutal*

| Legado | Ocorrências | Alvo canônico |
|--------|-------------|---------------|
| `BrutalCard` | 0 direto | Steps usam `classes.*` |
| `BrutalButton` | 0 direto | Verificar `WizardEngine` / steps |

### Débito principal

- Loading screen hardcoded (`bg-neutral-950`, spinner com `border-beauty-neon` / `border-accent-gold`).
- Steps passam `accentColor: string` — migrar para `useBrutalTheme().accent` sem prop string.
- `OnboardingLayout` — alinhar padding/radius a `density` + `PageHeader` simplificado.

### Passos

1. Loading → `Skeleton` centralizado + copy sentence case ("Preparando sua configuração inicial").
2. Remover prop `accentColor` dos steps; consumir `accent` do hook dentro de cada step.
3. Botões "Continuar" / "Pular" → `Button` (`primary` / `ghost`); touch ≥44px.
4. Progress (`WizardProgress`) — tokens `accent.bg` / `colors.textMuted`.
5. Tela de sucesso (`StepSuccess`) — `Card variant="elevated"` hero + 1 CTA para dashboard.

### Aceite local

- [ ] 0 ternários `isBeauty ? 'beauty-neon' : 'accent-gold'` nos steps  
- [ ] Fluxo wizard completo nos 4 temas  
- [ ] Sem `animate-in fade-in duration-500` no layout  

---

## 6. Ordem de execução recomendada

| # | Tela | Esforço | Motivo |
|---|------|---------|--------|
| 1 | Clients empty + cards | Baixo | Quick win UI-012; prova EmptyState |
| 2 | SettingsSection + TeamSettings | Médio | Desbloqueia hub settings |
| 3 | Public Booking modais | Médio | Face pública; alto tráfego |
| 4 | Settings restantes | Alto | Muitos arquivos; lote por PR |
| 5 | Onboarding wizard | Médio | Fluxo único; menos superfície |

---

## 7. Referências

- Design lock: `.ui-audit/20260610_120000/DESIGN-SYSTEM.md`
- Copy: `.ui-audit/20260610_120000/UI-REMEDIATION-SPEC.md` §9
- Telas críticas já migradas (referência): Login S4, Dashboard S5, Agenda S6, Financeiro S7
- Componentes: `components/ui/` + `hooks/useBrutalTheme.ts`

---

## 8. Rastreabilidade

| Finding | Sprint | Regra DS |
|---------|--------|----------|
| UI-012 empty Clients | S8 | §3.6 EmptyState |
| UI-031 onboarding/settings | S8 | §4.1 shell + tokens |
| UI-033 copy/title | S8 | §9 copy PT-BR |
