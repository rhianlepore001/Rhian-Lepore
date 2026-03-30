# Task: design-overlay-engine
> Agent: ux-wizard-designer | Phase: 1 | elicit: false

## Objetivo

Especificar o sistema de overlay customizado do wizard: comportamento visual,
componentes, z-index layers, sistema de pointer/seta e animações.

## Output Esperado

Documento de especificação técnica + visual que o `core-developer` usará para implementar.

## Spec do Overlay Engine

### Z-Index Layers

```
z-[9999]  → WizardPointer (seta + tooltip)
z-[9998]  → Spotlight (buraco no overlay — elemento destacado)
z-[9997]  → WizardPanel (card com instrução + botões)
z-[9996]  → Overlay background (fundo escuro)
z-[base]  → Resto da UI (desabilitada durante o wizard)
```

### Componentes Visuais

#### 1. Overlay Background
```
- Cor: rgba(0, 0, 0, 0.75)
- Backdrop: blur(2px)
- Position: fixed, full screen
- Transition: opacity 300ms ease-in-out
```

#### 2. Spotlight (elemento destacado)
```
- Técnica: box-shadow inset gigante recortando o elemento
- box-shadow: 0 0 0 9999px rgba(0,0,0,0.75)
- border-radius: herdar do elemento alvo
- padding: 8px ao redor do elemento
- Transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1)
```

#### 3. Pointer (seta animada)
```
- Forma: SVG arrow (↓ ← → ↑ conforme posição)
- Cor: #F59E0B (amber-400) — destaque sem agredir
- Animação: bounce vertical 1s infinite (CSS keyframes)
- Tamanho: 32x32px
- Posição: calculada via getBoundingClientRect() do elemento alvo
```

#### 4. Wizard Panel (card de instrução)
```
- Background: glassmorphism (rgba(15,15,15,0.9) + backdrop-blur-xl)
- Border: 1px solid rgba(255,255,255,0.1)
- Border-radius: 16px
- Padding: 24px
- Width: min(400px, 90vw)
- Posição: próximo ao elemento destacado (oposto ao pointer)
- Conteúdo: ícone do step + título + descrição + botões
```

### Animações CSS

```css
@keyframes wizard-pointer-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes wizard-fade-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes wizard-step-transition {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
```

### Responsividade Mobile

```
- Mobile (< 768px): WizardPanel sempre no bottom (fixed bottom-0)
- Pointer simplificado: apenas pulsing circle no elemento
- Spotlight: border animado em vez de box-shadow recorte
- Touch target: mínimo 44x44px em todos os botões
```

### Progress Indicator

```
- Posição: topo do WizardPanel
- Formato: "Step 1 de 5" + barra de progresso (Tailwind bg-amber-400)
- Width da barra: (currentStep / 5) * 100%
- Transition: width 400ms ease
```

## Entrega

Criar arquivo `docs/onboarding-overlay-spec.md` com esta especificação formatada
para o `core-developer` usar como referência durante a implementação.
