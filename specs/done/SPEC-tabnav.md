# SPEC: TabNav — Segmented Control Reutilizável

**Status:** ready
**Criado:** 2026-04-19
**Prioridade:** alta

---

## O que o cliente final vê

No Finance, os 3 botões quadrados e escuros de hoje (Visão Geral / Histórico / Comissões) viram
um segmented control arredondado — um "trilho" com pílulas, estilo iOS. A aba ativa tem fundo
dourado (barber) ou roxo (beauty) com texto preto. As inativas são neutras, com hover sutil.
Uma 4ª aba "Insights" é adicionada (veja SPEC-finance-insights).

---

## Design System — Intent

**Humano:** barbeiro entre um corte e outro, celular na mão. Sem tempo para ler labels longos.
**Tarefa:** mudar de Visão Geral → Histórico em 1 toque.
**Sensação:** ferramenta de profissional — precisa, sem decoração.

**Por que segmented control?**
A SettingsLayout mobile já usa `rounded-full` pills com o mesmo accent-gold. O Finance usava
`bg-neutral-800` sharp — dois sistemas coexistindo. O segmented unifica e eleva.

**Manter `font-mono uppercase`:** é a assinatura Brutal. Não remover.

---

## O que muda no sistema

### Criar `components/TabNav.tsx`

```tsx
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  accentBg: string;   // ex: 'bg-accent-gold' | 'bg-beauty-neon'
  className?: string;
}
```

**Container:** `inline-flex bg-black/40 border border-white/[0.06] rounded-full p-1`
— O `border border-white/[0.06]` cria efeito de trilho inset sem parecer card.

**Tab ativa:**
```
${accentBg} text-black rounded-full px-4 py-1.5
font-mono text-xs uppercase tracking-wide
flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap
```

**Tab inativa:**
```
text-neutral-400 hover:text-white hover:bg-white/5
rounded-full px-4 py-1.5
font-mono text-xs uppercase tracking-wide
flex items-center gap-1.5 transition-all duration-200 whitespace-nowrap
```

**Ícones:** `w-3.5 h-3.5 flex-shrink-0`

**Overflow mobile:** envolver em `<div className="overflow-x-auto pb-1 -mb-1">` quando passado
via `className` ou como wrapper no uso.

### Aplicar em `pages/Finance.tsx`

Substituir bloco de botões `linhas 495–530` por:

```tsx
<TabNav
  tabs={[
    { id: 'overview', label: isStaff ? 'Meu Financeiro' : 'Visão Geral', icon: <Calendar /> },
    ...(!isStaff ? [
      { id: 'history', label: 'Histórico', icon: <History /> },
      { id: 'commissions', label: 'Comissões', icon: <Users /> },
      { id: 'insights', label: 'Insights', icon: <BarChart2 /> },
    ] : []),
  ]}
  activeTab={activeTab}
  onChange={(id) => setActiveTab(id as FinanceTabType)}
  accentBg={accentBg}
/>
```

Atualizar tipo: `type FinanceTabType = 'overview' | 'history' | 'commissions' | 'insights'`

---

## O que NÃO muda

- Lógica de fetch por aba (`useEffect` existente)
- Guards de role (`isStaff`)
- Conteúdo de cada aba
- Qualquer outra página (Finance é a única com tabs atualmente)

---

## Edge cases

- **1 tab (staff):** render de 1 pílula sem visual de "trilho dividido" — ok, é apenas 1 pílula ativa permanentemente
- **Tab sem ícone:** renderizar `label` sem `gap` (`gap-1.5` com ícone undefined não causa erro — ícone é `ReactNode | undefined`)
- **Label longo:** `whitespace-nowrap` + container `overflow-x-auto` no uso

---

## Teste E2E

```
1. Finance como owner → 4 pílulas: Visão Geral / Histórico / Comissões / Insights
2. Clicar em cada aba → conteúdo troca, pílula ativa fica dourada (barber) / roxa (beauty)
3. Finance como staff → apenas "Meu Financeiro" (1 pílula)
4. Mobile 375px → pílulas não causam scroll horizontal na página (container scroll interno)
5. Theme beauty → accent roxo correto em vez de dourado
```

---

## Arquivos envolvidos

- `components/TabNav.tsx` — CRIAR
- `pages/Finance.tsx` linhas 495–530 — substituir botões manuais
- `pages/Finance.tsx` linha 17 — atualizar `FinanceTabType`

---

## Done when

- [ ] Componente aceita qualquer array de tabs via props
- [ ] Ativo: fundo `accentBg` + `text-black` + `rounded-full`
- [ ] Inativo: neutro, hover `bg-white/5`
- [ ] Aplicado em Finance sem quebra de funcionalidade de nenhuma aba
- [ ] Staff vê apenas 1 aba
- [ ] Testado em mobile Chrome 375px — zero scroll horizontal na página
- [ ] Beauty theme renderiza com `bg-beauty-neon`
