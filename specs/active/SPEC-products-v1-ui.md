# SPEC — Produtos v1 (UI)

**Tarefa:** O2 · **Data:** 2026-06-07
**Status:** READY-FOR-SHIP → handoff **C2** (`pages/Products.tsx` + rota) e **G4** (RLS)
**Fonte de verdade visual:** `design-system/MASTER.md`

> Escopo: especificação visual e de comportamento da tela. **Sem SQL/RLS** (isso é G4).
> Data layer já existe: `types/catalog.ts`, `services/catalog.ts`, `hooks/useCatalog.ts`.
> Paridade obrigatória: `_reversa_sdd/migration/parity_tests/10-products.feature`.

---

## 1. Objetivo

Tela para o salão gerir o catálogo de produtos e registrar **vendas avulsas** (produto vendido fora de um atendimento). Mobile-first — o dono usa no celular no balcão.

Funcionalidades v1:
1. **Lista** de produtos (com destaque de estoque baixo).
2. **Cadastro / edição** de produto (só owner).
3. **Venda avulsa** (owner e staff).
4. **Sinalização de estoque baixo**.

Fora do escopo v1 (não construir agora):
- Venda vinculada a atendimento (`appointment_id`) — vive no fluxo de finalizar atendimento (Agenda), não nesta tela. Cenário 4 do `.feature` é validado lá.
- Histórico de vendas / relatórios de produto.
- Categorias de produto.

---

## 2. Data layer disponível (não reimplementar)

| Hook | Uso na tela |
|------|-------------|
| `useProducts({ companyId, includeInactive })` | Lista. `includeInactive: false` por padrão (só ativos). |
| `useCreateProduct()` | Cadastro (owner). |
| `useUpdateProduct()` | Edição + desativar (`isActive: false`). |
| `useSellProduct()` | Venda avulsa (`{ productId, quantity }`). Invalida `['finance']` automático. |

**Campos do `Product`:** `name`, `sale_price`, `cost_price`, `stock_quantity`, `min_stock_quantity`, `is_active`.

`companyId` vem **sempre** de `useAuth()` (nunca de URL/form). `role` de `useAuth()` define owner vs staff.

Moeda: `formatCurrency(value, region === 'PT' ? 'PT' : 'BR')` + símbolo `€`/`R$` (padrão já usado no Dashboard/Finance).

---

## 3. Regras de papel (owner vs staff)

Derivado do cenário *"Staff vende produto sem poder editar catalogo"* do `.feature`:

| Ação | Owner | Staff |
|------|-------|-------|
| Ver lista de produtos | ✅ | ✅ |
| Ver **preço de venda** e estoque | ✅ | ✅ |
| Ver **custo / margem** | ✅ | ❌ ocultar (dado sensível) |
| Vender (avulsa) | ✅ | ✅ |
| Cadastrar produto | ✅ | ❌ |
| Editar preço/custo/estoque mín. | ✅ | ❌ |
| Desativar produto | ✅ | ❌ |

> Staff: esconder botão "Cadastrar", ações de editar/desativar, e a coluna/linha de custo e margem. Não basta desabilitar — **ocultar** custo.

---

## 4. Layout mobile-first

### 4.1 Estrutura da página

```
┌──────────────────────────────────────────┐
│  Header                                    │
│   Produtos                  [+ Cadastrar]  │  ← botão só owner
│   "Catálogo e vendas avulsas"              │
├──────────────────────────────────────────┤
│  Barra: [busca por nome 🔍]  [filtro ▾]    │  ← filtro: Todos | Estoque baixo
├──────────────────────────────────────────┤
│  (opcional) Banner estoque baixo: "3       │
│   produtos abaixo do mínimo"   [Ver]       │
├──────────────────────────────────────────┤
│  Lista                                     │
│   mobile  → cards empilhados               │
│   ≥ md    → tabela (ui/Table)              │
└──────────────────────────────────────────┘
```

### 4.2 Card de produto (mobile, base 320–390px)

```
┌────────────────────────────────────────┐
│ Nome do Produto          [Estoque baixo]│  ← Badge warning só se baixo
│ R$ 25,00                                 │  ← sale_price (font-mono, tabular-nums)
│ Estoque: 8 un.   ·  mín. 5               │  ← textSecondary; "mín." só owner
│ Margem: R$ 12,00 (48%)                   │  ← SÓ owner (custo/margem)
│ ───────────────────────────────────────│
│ [ Vender ]            [ Editar ]   [ ⋮ ] │  ← Editar/⋮ só owner; Vender todos
└────────────────────────────────────────┘
```

- Card: `<Card>` de `components/ui/` (token `rounded-2xl`, `shadow-promax-glass`).
- Preço: `font-mono tabular-nums` (DESIGN — valores monetários).
- "Vender": `<Button variant="primary" size="sm">` — alvo de toque ≥ 44px (Button `md`=44px; `sm`=36px → usar `md` no mobile p/ touch target, `sm` no desktop).
- "Editar": `<Button variant="ghost" size="sm">` (owner).
- Produto com `stock_quantity === 0`: card com `opacity-70`, botão "Vender" desabilitado, Badge danger "Sem estoque".

### 4.3 Tabela (desktop ≥ md)

`ui/Table` com colunas:

| Produto | Preço venda | Custo* | Margem* | Estoque | Status | Ações |
|---------|-------------|--------|---------|---------|--------|-------|

\* Colunas Custo e Margem **só para owner**. Header `font-mono uppercase` (token). Linha com `hover:bg-white/[0.03]`. Estoque baixo: célula Estoque com Badge warning inline.

---

## 5. Estados (empty / loading / error) — obrigatório

Usar os componentes canônicos de `components/ui/` (não os de `components/` legados).

| Estado | Componente | Conteúdo |
|--------|-----------|----------|
| **Loading** | `ui/Skeleton` | 4–6 cards skeleton (mobile) / linhas skeleton (desktop). Seguir padrão do `Dashboard.tsx`. |
| **Erro (query)** | `ui/ErrorState` | `title="Não foi possível carregar os produtos"`, `onRetry={refetch}`. |
| **Vazio (sem produtos)** | `ui/EmptyState` | icon `Package`, `title="Nenhum produto cadastrado"`, `description="Cadastre seu primeiro produto para vender no balcão."`, `action=<Button>Cadastrar produto</Button>` (**só owner**; staff vê descrição sem CTA). |
| **Vazio (busca/filtro)** | `ui/EmptyState` | icon `Search`, `title="Nenhum produto encontrado"`, `description="Tente outro termo ou limpe o filtro."` (sem CTA de cadastro). |

> `ui/EmptyState` usa props `title`/`description`/`action` (≠ do `components/EmptyState` legado que usa `message`/`ctaLabel`/`onCta`). Usar o de `ui/`.

---

## 6. Fluxos

### 6.1 Cadastrar / Editar produto (owner) — `ui/Modal`

`<Modal open title="Cadastrar produto" size="md">` com `ModalFooter` (Cancelar ghost + Salvar primary).

Campos (`ui/Input`, todos com label + `inputMode` numérico onde aplicável):

| Campo | Input | Validação (espelha `createProductInputSchema`) |
|-------|-------|------------------------------------------------|
| Nome | text | obrigatório, `trim().min(1)` → erro "Informe o nome" |
| Preço de venda | number, `inputMode="decimal"`, prefixo moeda | ≥ 0, obrigatório |
| Custo | number, `inputMode="decimal"`, prefixo moeda | ≥ 0, obrigatório |
| Estoque | number, `inputMode="numeric"` | inteiro ≥ 0 |
| Estoque mínimo | number, `inputMode="numeric"` | inteiro ≥ 0 |

- Validação inline via prop `error` do `ui/Input` (não `alert()`).
- Loading: `<Button loading>` no Salvar durante a mutation.
- Sucesso: fechar modal + `useAlerts().showAlert('Produto salvo', 'success')`. **Sem `alert()` nativo.**
- Editar reusa o mesmo modal pré-preenchido; título "Editar produto"; adiciona ação secundária "Desativar produto" (confirm via modal, nunca `window.confirm`).

### 6.2 Venda avulsa (owner + staff) — `ui/Modal` size `sm`

```
┌─────────────────────────────┐
│ Vender · Nome do Produto    │
│ Disponível: 8 un.           │
│ Preço unit.: R$ 25,00       │
│ ───────────────────────────│
│ Quantidade   [ − ]  2  [ + ]│  ← stepper, mín 1, máx = stock
│ Total:       R$ 50,00       │  ← preço * qtd (atualiza ao vivo)
│ ───────────────────────────│
│        [Cancelar] [Confirmar venda]
└─────────────────────────────┘
```

- Stepper: botões `−`/`+` com alvo ≥ 44px; `+` desabilita ao atingir `stock_quantity`.
- Total ao vivo = `sale_price * quantity` (espelha cenário "revenue = preco_venda * 2").
- Confirmar → `useSellProduct().mutate({ productId, quantity })`; `<Button loading>` enquanto envia.
- Sucesso → fechar + `showAlert('Venda registrada', 'success')`. A invalidação de `['finance']` é automática no hook.

### 6.3 Tratamento de erro de venda (mapear, não vazar)

| Erro do backend | Mensagem ao usuário (showAlert danger / inline no modal) |
|-----------------|----------------------------------------------------------|
| `insufficient_stock` (cenário 3) | "Estoque insuficiente. Disponível: {stock} un." — manter modal aberto, não zerar quantidade |
| erro de autorização / `product_not_found` (cenário "anti-spoofing") | "Produto indisponível. Atualize a página." + `refetch` |
| genérico | `ui/ErrorState` inline ou `showAlert('Não foi possível concluir a venda', 'error')` |

> A UI **não** deve assumir sucesso otimista na venda (estoque crítico). Esperar resposta da RPC antes de fechar.

---

## 7. Estoque baixo

- Regra: `stock_quantity <= min_stock_quantity` (e `> 0`).
- Sinalização: `<Badge variant="warning">Estoque baixo</Badge>` no card/linha.
- Filtro "Estoque baixo" na barra → filtra a lista (client-side, sobre os dados do `useProducts`).
- Banner opcional no topo (owner): "{n} produtos abaixo do mínimo" com ação que aplica o filtro. Não usar `border-b-4` nem sombras fora de token.

---

## 8. Componentes `ui/` a usar (checklist Ship)

- [ ] `ui/Card` — cards de produto
- [ ] `ui/Table` — tabela desktop
- [ ] `ui/Button` — ações (primary/ghost/danger; `loading`; touch ≥ 44px no mobile)
- [ ] `ui/Input` — formulário (com `label`/`error`/`hint`)
- [ ] `ui/Badge` — estoque baixo (warning) / sem estoque (danger) / inativo (neutral)
- [ ] `ui/Modal` (+ `ModalFooter`) — cadastro/edição e venda
- [ ] `ui/EmptyState` — vazio (cadastro / busca)
- [ ] `ui/ErrorState` — erro de carga
- [ ] `ui/Skeleton` — loading
- [ ] `useBrutalTheme()` — zero hardcode de cor; sem `isBeauty ? ...` manual
- [ ] `useAlerts().showAlert` — feedback (proibido `alert()`/`confirm()`)

---

## 9. Acessibilidade / mobile

- Texto mínimo `text-xs` (12px) — proibido `text-[10px]`/`[11px]` (não repetir o débito do O1).
- Alvos de toque ≥ 44px nos botões de ação e no stepper de quantidade.
- `inputMode` correto nos campos numéricos (evita teclado errado no celular).
- Modal já entrega FocusTrap + ESC + scroll lock (`ui/Modal`).
- Valores monetários `tabular-nums`.

---

## 10. Rota (handoff C2)

- `App.tsx`: `pages/Products.tsx` via `React.lazy()` dentro de `<Suspense>`.
- HashRouter: link `/#/produtos`.
- Protegida por `ProtectedLayout`. **Não** envolver em `OwnerRouteGuard` — staff acessa (vende), mas a tela esconde as ações de owner conforme §3.
- Item de navegação: rótulo "Produtos", ícone `Package`.

---

## 11. Paridade (`10-products.feature`) — cobertura de UI

| Cenário | Onde a UI cobre |
|---------|-----------------|
| Cadastrar produto | §6.1 (modal, `is_active=true` no service) |
| Venda avulsa | §6.2 (stepper, total ao vivo) |
| Estoque insuficiente | §6.3 (`insufficient_stock`) |
| Produto vinculado a atendimento | **fora desta tela** (fluxo Agenda) |
| Staff vende sem editar | §3 (oculta cadastro/editar/custo) |
| RLS multi-tenant | backend (G4); UI só consome `companyId` do auth |
| Anti-spoofing RPC | §6.3 (erro de autorização tratado) |

---

## 12. Dependências / ordem

- **G4** (RLS `products`/`product_sales` + RPC `sell_product`) deve estar fechado antes do C2 ir a produção — esta spec assume a RPC retornando `insufficient_stock` e erro de autorização.
- **C2** implementa a tela seguindo esta spec.

---

## 13. Revisão de conformidade — C2 (`pages/Products.tsx`, 2026-06-07)

**Veredito: ✅ PASS.** A implementação segue a spec com alta fidelidade.

| Item da spec | Status |
|--------------|--------|
| §3 Role gating (custo/margem/mín./cadastro/editar/desativar só owner; staff só ativos + Vender) | ✅ `isOwner` + `includeInactive: isOwner` |
| §4 Mobile cards / desktop `Table` | ✅ `md:hidden` cards + `hidden md:block` table |
| §5 Estados loading/erro/vazio(2) | ✅ `SkeletonCard`, `ErrorState` c/ retry, dois `EmptyState` |
| §6.1 Cadastro/edição (modal, validação inline, loading, desativar via modal) | ✅ |
| §6.2 Venda (stepper min1/máx estoque, total ao vivo, loading) | ✅ |
| §6.3 Erros (`insufficient_stock` inline; `product_not_found`/auth → alerta + `refetch`; sem sucesso otimista) | ✅ `parseSellError` |
| §7 Estoque baixo (badge + filtro + banner owner) | ✅ |
| §9 a11y/mobile (`text-xs` mín., aria-labels, touch `size md`=44px, `inputMode`) | ✅ |

### Desvios (todos P2 — polish, nenhum bloqueia)

- **D1 — Toast local não-canônico.** `Products.tsx` usa um toast próprio (`useState` + componente fixo) com cores cruas `bg-green-900/90`/`bg-red-900/90` fora de token. **Não é falha do C2:** não existe toast canônico no app (mesmo padrão copiado de `components/CommissionsManagement.tsx`). Ver gap no `SPEC-ui-audit.md` (T2 corrigido).
- **D2 — "Editar" duplicado para owner:** botão inline *e* dentro do menu `⋮` (`MoreVertical`). Escolher um (sugiro manter o `⋮` no mobile e inline no desktop, ou só `⋮`).
- **D3 — Zoom iOS herdado:** `Input` size `md` = 14px → zoom ao focar no iOS. Resolve com o fix sistêmico do O5 §1 (ajustar `ui/Input`).
- **D4 — Toast sem safe-area:** `bottom-24 md:bottom-6` é bom, mas falta `env(safe-area-inset-bottom)` no iPhone com notch.

**Handoff:** D1 depende do toast canônico (ver T2); D2/D4 → Composer (mecânico) ou Q2; D3 → fix global do O5.
