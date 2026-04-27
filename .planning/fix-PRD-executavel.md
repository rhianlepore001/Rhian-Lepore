# PRD Executável — UI Fixes AgenX

**Criado:** 2026-04-19
**Branch target:** ui
**Referência:** `.planning/fix-PRD.md` (original com contexto)

Itens sem ambiguidade de implementação. Cada um com arquivo exato, linha e mudança precisa.
Podem ser executados em qualquer ordem — sem dependências entre si.
Exceto: **Item 10** depende do `TabNav` estar pronto (SPEC-tabnav).

---

## Item 3 — Modal Detalhes: Header Dark

**Arquivo:** `pages/Agenda.tsx` linha ~1702

### Header
```diff
- `p-6 ${isBeauty ? 'bg-gradient-to-r from-beauty-neon/20 to-transparent' : 'bg-white text-black'}`
+ `p-6 border-b ${isBeauty ? 'border-beauty-neon/20' : 'border-white/10'}`
```
Texto do título (linha ~1705): remover `${isBeauty ? 'text-white' : 'text-black'}` → sempre `text-white`.
Botão fechar (linha ~1716): remover `${isBeauty ? ... : 'text-black'}` → sempre `text-white`.

### Badge status (linha ~1708)
```tsx
// Antes: bg-black text-white para Confirmed
// Depois:
const statusStyle =
  showingDetailsAppointment.status === 'Completed'  ? 'text-green-400 bg-green-500/10 border border-green-500/20'  :
  showingDetailsAppointment.status === 'Cancelled'  ? 'text-red-400 bg-red-500/10 border border-red-500/20'        :
  /* Confirmed */                                     'text-amber-400 bg-amber-500/10 border border-amber-500/20';

const statusLabel =
  showingDetailsAppointment.status === 'Completed' ? '✓ Concluído' :
  showingDetailsAppointment.status === 'Cancelled' ? '✕ Cancelado' : '● Confirmado';

<span className={`text-xs font-mono font-bold px-3 py-0.5 rounded-full inline-block ${statusStyle}`}>
  {statusLabel}
</span>
```

### Avatar (linha ~1727)
Adicionar `ring-2 ring-accent-gold/40` (barber) / `ring-beauty-neon/40` (beauty) ao className do div.

### Telefone (linha ~1736)
```diff
- <span className="text-xs text-neutral-400 font-mono bg-neutral-800 px-2 py-0.5 rounded">
+ <span className="text-xs text-neutral-400 font-mono flex items-center gap-1">
+   <Phone className="w-3 h-3" />
```
Importar `Phone` do lucide se não existir.

**Done when:** Modal no barber nunca exibe header branco. Badge Confirmado=âmbar, Concluído=verde, Cancelado=vermelho.

---

## Item 4 — Agenda Header: Botões Responsivos

**Arquivo:** `pages/Agenda.tsx` linhas ~1120–1148

```tsx
// Histórico
<BrutalButton variant="secondary" icon={<History />} onClick={...} className="flex-1 md:flex-none">
  <span className="hidden md:inline">Histórico</span>
</BrutalButton>

// Todos Agendamentos
<BrutalButton variant="secondary" icon={<Calendar />} onClick={...} className="flex-1 md:flex-none">
  <span className="hidden md:inline">Todos Agendamentos</span>
</BrutalButton>

// Novo Agendamento — oculto em mobile (FAB cobre)
<BrutalButton
  id="btn-new-appointment"
  variant="primary"
  icon={<Plus />}
  onClick={...}
  className="hidden md:flex"   // ← adicionar hidden md:flex, remover flex-1
>
  Novo Agendamento
</BrutalButton>
```

**Done when:** Mobile 375px — header não causa scroll horizontal. FAB de Novo Agendamento presente e funcional.

---

## Item 5 — Settings Mobile Nav: Gradient Fade

**Arquivo:** `components/SettingsLayout.tsx` linhas ~123–147

Envolver `<div className="px-4 pb-4 overflow-x-auto hide-scrollbar">` em container `relative`:
```tsx
<div className="relative">
  <div className="px-4 pb-4 overflow-x-auto hide-scrollbar">
    <div className="flex gap-3 min-w-max px-2">
      {menuItems.map(item => (
        <NavLink
          ...
          className={({ isActive }) => `
            ...
            ${isActive ? ... : 'bg-white/5 border-white/5 text-neutral-400 opacity-80'}
          `}     {/* opacity-60 → opacity-80 */}
        >
          ...
        </NavLink>
      ))}
    </div>
  </div>
  {/* Gradient fade right */}
  <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10
    bg-gradient-to-l from-neutral-900 to-transparent md:hidden" />
</div>
```

**Done when:** Última pílula visível tem fade indicando mais itens à direita. `md:hidden` garante que não aparece no desktop.

---

## Item 6 — Remover FinancialSettings

### `constants.ts`
Remover linha: `{ label: 'Financeiro', path: '/configuracoes/financeiro', icon: DollarSign }`

### `App.tsx`
Remover linha 28: `const FinancialSettings = React.lazy(...)`
Remover linha 180: `<Route path="/configuracoes/financeiro" element={...} />`

### `pages/settings/FinancialSettings.tsx`
Deletar arquivo — verificar antes que não há outros imports apontando para ele:
```bash
grep -r "FinancialSettings" --include="*.tsx" --include="*.ts" .
```

**Done when:** Rota `/configuracoes/financeiro` retorna 404/redirect. Item "Financeiro" sumiu do menu de Ajustes.

---

## Item 7 — Acesso Restrito Dev

**Arquivo principal:** `constants.ts` + `components/SettingsLayout.tsx` + `App.tsx`

### `constants.ts`
Adicionar flag `devOnly` nos itens restritos:
```ts
{ label: 'Auditoria', path: '/configuracoes/auditoria', icon: ClipboardList, devOnly: true },
{ label: 'Erros',     path: '/configuracoes/erros',     icon: ShieldAlert,   devOnly: true },
{ label: 'Lixeira',   path: '/configuracoes/lixeira',   icon: Trash2,        devOnly: true },
```
Atualizar o tipo do item para incluir `devOnly?: boolean`.

### `components/SettingsLayout.tsx`
```ts
const { userType, role, user } = useAuth();  // adicionar `user`

const DEV_EMAIL = 'rleporesilva@gmail.com';
const isDevAccount = user?.email === DEV_EMAIL;

const menuItems = role === 'staff'
  ? SETTINGS_ITEMS.filter(item => item.path === '/configuracoes/servicos')
  : SETTINGS_ITEMS.filter(item => isDevAccount || !item.devOnly);
```

### `App.tsx`
Nas 3 rotas dev-only, adicionar guard (buscar o `user` via `useAuth` no componente de rota,
ou usar um `DevRouteGuard` inline):
```tsx
// Padrão simples — reutiliza o pattern já existente de OwnerRouteGuard
<Route path="/configuracoes/auditoria"
  element={<DevRouteGuard><AuditLogs /></DevRouteGuard>} />
```

`DevRouteGuard` (criar inline em App.tsx ou arquivo separado):
```tsx
const DEV_EMAIL = 'rleporesilva@gmail.com';
const DevRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.email !== DEV_EMAIL) return <Navigate to="/configuracoes" replace />;
  return <>{children}</>;
};
```

**Done when:** Non-dev não vê Auditoria/Erros/Lixeira no menu. Acesso direto pela URL redireciona para `/configuracoes`.

---

## Item 8 — Remover Card "Comissões Pendentes"

**Arquivo:** `pages/Finance.tsx` linhas ~554–571

Remover o `<BrutalCard>` completo com label "Comissões Pendentes" (bloco `{!isStaff && ...}`
que referencia `summary.commissionsPending`).

Grid em linha ~535: de `md:grid-cols-3` (com 4 cards contando Comissões Pendentes) manter
`md:grid-cols-3` mas agora com apenas 3 cards (Receita / Despesas Pagas / Lucro).
Verificar se o Lucro já é o 3º card ou se precisa ajuste.

**Done when:** Finance Visão Geral exibe 3 cards métrica, sem "Comissões Pendentes".

---

## Item 9 — Modal Edição Agendamento: Grid Responsivo

**Arquivo:** `pages/Agenda.tsx` — localizar modal de edição (buscar pelo label "Data" ou "Desconto")

```diff
- className="grid grid-cols-2 gap-4"
+ className="grid grid-cols-1 sm:grid-cols-2 gap-4"
```

Aplicar nos 2 grids: Data/Horário e Preço/Desconto.

**Done when:** Modal de edição em mobile 375px — campos empilham verticalmente.

---

## Item 10 — Formulário Cadastro Cliente: Design System

**Dependência:** SPEC-tabnav deve estar implementado (para botões NOVO/RECENTE/ANTIGO).

**Arquivo:** localizar via `grep -r "Novo Cliente\|cadastro.*cliente\|ClientForm" --include="*.tsx" .`
Provavelmente em `components/appointment/ClientSelection.tsx` ou modal de CRM.

### Inputs
```tsx
// Padrão para todos os inputs do formulário:
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3
           text-white placeholder-neutral-500
           focus:border-accent-gold/50 focus:outline-none
           transition-colors"
```
Beauty: `focus:border-beauty-neon/50`

### File Input (foto de perfil)
```tsx
<div
  onClick={() => fileInputRef.current?.click()}
  className="cursor-pointer flex items-center gap-3 px-4 py-3 rounded-xl
             bg-neutral-800 border border-neutral-700 border-dashed
             hover:border-neutral-500 transition-colors"
>
  <Upload className="w-4 h-4 text-neutral-400" />
  <span className="text-sm text-neutral-400">{fileName || 'Selecionar foto'}</span>
</div>
<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
```

### Botões NOVO/RECENTE/ANTIGO
Substituir pelos botões usando `TabNav` quando disponível, ou provisoriamente com o pattern
de segmented control direto (mesmas classes do TabNav).

**Done when:** Formulário sem inputs preto puro. File input customizado. Botões de filtro seguem design system.

---

## Item 11 — Remover "Clientes para Recuperar"

**Arquivo:** `pages/Finance.tsx`

Buscar e remover:
```bash
grep -n "ChurnRadar\|useAIOSDiagnostic\|Clientes para Recuperar\|para Recuperar" pages/Finance.tsx
```

Se não houver imports dessas features (confirmado pelo grep anterior — não encontrado),
buscar o bloco JSX com o texto "Clientes para Recuperar" ou "Recuperar" e remover.

Se não existe mais na codebase, este item já está concluído. ✅

**Done when:** Nenhuma referência a "Clientes para Recuperar" na página Finance.

---

## Verificação Final (todos os itens)

```
1. Mobile Chrome 375px: Finance, Agenda, Settings — zero scroll horizontal
2. Agenda modal detalhes: header dark + badges semânticos coloridos
3. Settings mobile: fade gradient visível à direita
4. /configuracoes/financeiro → 404 ou redirect
5. Non-dev: Auditoria/Erros/Lixeira não aparecem no menu
6. Dev (rleporesilva@gmail.com): itens aparecem normalmente
7. Finance Visão Geral: 3 cards métrica (sem Comissões Pendentes)
8. Modal edição: campos empilham em mobile
```
