# SPEC: AppointmentWizard — Step Indicator + Service Cards

**Status:** ready
**Criado:** 2026-04-19
**Prioridade:** alta

---

## O que o cliente final vê

### Step Indicator
No header do modal "Novo Atendimento", em vez do texto "Cliente → Serviços → Horário → Confirmar"
(desktop) e "Passo 2/4" (mobile), aparece um stepper visual unificado:

- 4 nós circulares conectados por linhas finas
- Nó **concluído:** círculo dourado sólido com ✓ branco/preto
- Nó **atual:** ring dourado com ponto central preenchido
- Nó **futuro:** ring neutro `border-white/20`
- Labels abaixo de cada nó (visíveis em desktop, ocultos em mobile)
- Uma linha conectora fina (`h-px bg-white/10`) entre cada par de nós

O stepper funciona igual em mobile e desktop — elimina a bifurcação de código.

### Service Cards (tema barber)
Os cards de serviço **inativo** deixam de ser invisíveis (preto sobre preto).
Agora têm fundo sutil distinguível e borda visível ao hover.

Os **headers de categoria** saem do padrão `border-b` genérico e ganham
`border-l-2` com accent-gold — hierarquia visual mais forte.

---

## Design System — Intent

**Problema raiz dos cards:** `bg-brutal-card border-transparent` = mesma elevação do fundo
do wizard (`bg-neutral-900`). Preto sobre preto — zero contraste.

**Princípio aplicado (interface-design skill):** Surface elevation whisper-quiet.
O inativo precisa ser distinguível, não chamativo. `bg-white/[0.06]` é sutil mas funcional
em monitores com brilho baixo (celular no sol).

**Category headers:** `border-l-2` com accent cria âncora visual para grupos de serviço.
Mais hierárquico que `border-b` que se confunde com separadores de conteúdo.

---

## O que muda no sistema

### 1. Step Indicator — `components/AppointmentWizard.tsx` linhas 208–218

**Remover** o bloco atual:
```tsx
<div className="flex items-center gap-2 text-xs md:text-sm text-neutral-400 mt-1">
  <span className={step >= 1 ? accentColor : ''}>Cliente</span>
  <span>→</span>
  ...
  <span className="md:hidden text-white font-bold ml-1">Passo {step}/4</span>
</div>
```

**Substituir** por stepper de nós:
```tsx
const STEPS = ['Cliente', 'Serviços', 'Horário', 'Confirmar'];
const accentRing = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';
const accentFill = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';

<div className="flex items-center gap-0 mt-2">
  {STEPS.map((label, idx) => {
    const n = idx + 1;
    const isDone    = step > n;
    const isCurrent = step === n;
    return (
      <React.Fragment key={n}>
        <div className="flex flex-col items-center">
          {/* Nó */}
          <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
            isDone
              ? `${accentFill} border-0`
              : isCurrent
                ? `border-2 ${accentRing} bg-transparent`
                : 'border border-white/20 bg-transparent'
          }`}>
            {isDone && <Check className="w-3 h-3 text-black" />}
            {isCurrent && <div className={`w-2 h-2 rounded-full ${accentFill}`} />}
          </div>
          {/* Label (apenas desktop) */}
          <span className={`hidden md:block text-[9px] font-mono uppercase mt-1 ${
            isCurrent ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold')
            : isDone ? 'text-neutral-400' : 'text-neutral-600'
          }`}>{label}</span>
        </div>
        {/* Linha conectora (exceto após o último) */}
        {idx < STEPS.length - 1 && (
          <div className={`flex-1 h-px mx-1 mb-3 md:mb-5 ${step > n ? (isBeauty ? 'bg-beauty-neon/40' : 'bg-accent-gold/40') : 'bg-white/10'}`} />
        )}
      </React.Fragment>
    );
  })}
</div>
```

Adicionar import: `import { Check } from 'lucide-react'` (já importado, verificar).
Definir `STEPS` fora do JSX, no corpo do componente.

### 2. Service Cards (barber) — `components/appointment/ServiceList.tsx` linha 124

**Remover** classe do inativo barber:
```
'bg-brutal-card border-transparent hover:border-neutral-700'
```

**Substituir por:**
```
'bg-white/[0.06] border border-white/[0.09] hover:bg-white/[0.10] hover:border-white/[0.16]'
```

Beauty mantém o que tem (`bg-beauty-card/30 border-white/5 hover:border-beauty-neon/30 hover:bg-beauty-card/50`) — já correto.

### 3. Category Headers — `components/appointment/ServiceList.tsx` linha 100

**Remover:**
```
className="text-lg font-heading text-white uppercase tracking-tight border-b border-white/10 pb-2"
```

**Substituir por:**
```
className={`text-sm font-mono uppercase tracking-widest pb-2 border-l-2 pl-3 ${
  isBeauty ? 'text-beauty-neon/70 border-beauty-neon/40' : 'text-neutral-400 border-accent-gold/40'
}`}
```

---

## O que NÃO muda

- Lógica de steps, navegação e validação (`step > 1` para voltar, guards por step)
- Cards **selecionados** — já têm `bg-neutral-900 border-accent-gold shadow-heavy-sm` (barber), funciona
- Beauty service cards — apenas category headers atualizam para `border-beauty-neon/40`
- Props e interface de `ServiceList`

---

## Edge cases

| Situação | Comportamento |
|---|---|
| Step 1/4 | Nó 1: ring+dot. Nós 2/3/4: ring neutro. Nenhuma linha conectora preenchida |
| Step 4/4 | Nós 1/2/3: sólido+✓. Nó 4: ring+dot |
| Beauty theme | `accentFill = bg-beauty-neon`, `accentRing = border-beauty-neon` |
| 1 categoria de serviço | Header de categoria exibe mesmo com 1 grupo |
| Sem serviços na categoria | Empty state já existente, não afetado |

---

## Teste E2E

```
1. Abrir modal Novo Atendimento → stepper no header, nó 1 com ring+dot
2. Avançar step → nó anterior fica com ✓, próximo fica com ring+dot
3. Voltar step → nó volta a ativo (ring+dot), anterior volta a concluído
4. Step 2 (Serviços) → cards de serviço claramente distinguíveis do fundo
5. Hover sobre card inativo → borda levemente mais visível
6. Selecionar serviço → card fica dourado (barber) / roxo (beauty)
7. Verificar em mobile 375px — stepper não causa overflow horizontal
8. Theme beauty → nós e linhas usam beauty-neon
```

---

## Arquivos envolvidos

- `components/AppointmentWizard.tsx` linhas 208–218 — substituir step labels por stepper visual
- `components/appointment/ServiceList.tsx` linha 100 — category header
- `components/appointment/ServiceList.tsx` linha 124 — card inativo barber

---

## Done when

- [ ] Stepper visual: 4 nós + linhas conectoras, estados corretos por step
- [ ] Funciona igual em mobile e desktop (elimina o `Passo X/4` mobile)
- [ ] Beauty: nós e dot em `beauty-neon`
- [ ] Service cards barber: fundo sutil visível, hover funcional
- [ ] Category headers com `border-l-2` accent
- [ ] Seleção de serviço continua funcionando normalmente
- [ ] Testado em mobile Chrome 375px
