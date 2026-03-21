# Especificação Técnica e Visual — Overlay Engine do Wizard de Onboarding

> **Agente:** Luma (ux-wizard-designer) | **Squad:** onboarding-wizard-squad
> **Fase:** 1 — Design & Schema | **Data:** 2026-03-20
> **Entregável para:** `core-developer` (Rex) — implementação do `WizardOverlay.tsx` e `WizardPointer.tsx`

---

## 1. Visão Geral

O **Overlay Engine** é o sistema visual central do Onboarding Wizard Guiado do Beauty OS. Ele é responsável por:

1. **Escurecer** a interface ao redor do elemento em foco, mantendo visibilidade de contexto
2. **Destacar** o elemento DOM alvo com um efeito spotlight (recorte luminoso)
3. **Apontar** com uma seta animada exatamente onde o usuário deve interagir
4. **Apresentar** o painel de instrução (WizardPanel) com título, descrição e botões de ação
5. **Progredir** de forma suave entre os 5 steps do wizard

### Princípios fundamentais

| Princípio | Implementação |
|-----------|---------------|
| **Sem libs externas** | 100% React + Tailwind + CSS customizado (sem Driver.js, Shepherd.js, Intro.js) |
| **Glassmorphism** | Padrão visual do Beauty OS: `backdrop-blur`, bordas translúcidas, fundo semi-opaco |
| **Tema adaptável** | Funciona no tema Brutal (barbearias, dark) e Beauty (salões, clean) |
| **Mobile-first** | Comportamento diferenciado abaixo de 768px (bottom sheet) |
| **Acessibilidade** | ARIA labels, foco por teclado, touch targets mínimos de 44x44px |
| **Performance** | Pure CSS transitions, sem re-renders desnecessários, `position: fixed` fora do fluxo normal |

### Como funciona (fluxo resumido)

```
[Usuário faz primeiro login]
         │
         ▼
[AuthContext detecta: onboarding não completo]
         │
         ▼
[Redirect → /#/onboarding]
         │
         ▼
[WizardOverlay renderiza sobre toda a UI]
         │
    ┌────┴────┐
    │         │
    ▼         ▼
[Overlay    [WizardPointer posiciona sobre elementId
Background]  via getBoundingClientRect()]
    │         │
    │    [Spotlight recorta o elemento no overlay]
    │         │
    └────┬────┘
         │
         ▼
[WizardPanel exibe instrução + botões]
         │
         ▼
[Usuário interage → dispatch COMPLETE_STEP → próximo step]
         │
         ▼
[Step 5 concluído → onboarding_progress.is_completed = true → Dashboard]
```

---

## 2. Z-Index Layer System

O sistema de camadas é crítico para garantir que cada elemento apareça na posição correta, sem conflitos com modais, toasts ou outros overlays do Beauty OS.

### Tabela de Z-Index

| Z-Index | Constante CSS | Componente | Arquivo | Descrição |
|---------|--------------|------------|---------|-----------|
| `z-[9999]` | `--z-wizard-pointer` | `WizardPointer` | `WizardPointer.tsx` | Seta + tooltip de instrução — sempre no topo absoluto |
| `z-[9998]` | `--z-wizard-spotlight` | Spotlight element | `WizardOverlay.tsx` | Elemento DOM destacado com box-shadow recortado |
| `z-[9997]` | `--z-wizard-panel` | `WizardPanel` | Step components | Card glassmorphism com instrução e botões |
| `z-[9996]` | `--z-wizard-overlay` | Overlay Background | `WizardOverlay.tsx` | Fundo escuro que cobre toda a tela |
| `z-base` | — | UI do Beauty OS | Todo o app | Desabilitada/não-interativa durante o wizard |

### Variáveis CSS (definir em `index.css`)

```css
:root {
  --z-wizard-pointer:   9999;
  --z-wizard-spotlight: 9998;
  --z-wizard-panel:     9997;
  --z-wizard-overlay:   9996;
}
```

### Conflitos conhecidos a evitar

| Componente do Beauty OS | Z-index atual | Resolução |
|------------------------|--------------|-----------|
| Modais (`AppointmentEditModal`) | `z-50` (= 50) | Sem conflito — wizard está em z-[9996]+ |
| Toasts / AlertsContext | `z-[100]` | Sem conflito — wizard está em z-[9996]+ |
| Sidebar mobile | `z-30` | Sem conflito |
| Header | `z-20` | Sem conflito |

> **Regra:** O wizard SEMPRE aparece acima de todos os outros elementos do app. Nenhum outro componente deve usar z-index acima de `z-[9995]`.

---

## 3. Componentes Visuais

### 3.1 Overlay Background

O fundo escuro que cobre toda a tela, criando o contraste necessário para o spotlight.

#### Especificação visual

| Propriedade | Valor | Tailwind class |
|-------------|-------|----------------|
| Cor de fundo | `rgba(0, 0, 0, 0.75)` | `bg-black/75` |
| Backdrop blur | `blur(2px)` | `backdrop-blur-sm` |
| Posição | `fixed`, cobrindo toda a viewport | `fixed inset-0` |
| Z-index | `9996` | `z-[9996]` |
| Transição de entrada | `opacity 300ms ease-in-out` | `transition-opacity duration-300` |
| Pointer events | `none` no fundo, mas ativo nos filhos | `pointer-events-none` |

#### Implementação Tailwind

```tsx
// WizardOverlay.tsx — camada de fundo
<div
  className="fixed inset-0 z-[9996] bg-black/75 backdrop-blur-sm
             transition-opacity duration-300 pointer-events-none"
  aria-hidden="true"
/>
```

#### Estados

| Estado | Opacity | Transform | Duração |
|--------|---------|-----------|---------|
| Oculto | `opacity-0` | — | — |
| Entrando | `opacity-0` → `opacity-100` | — | 300ms |
| Visível | `opacity-100` | — | — |
| Saindo | `opacity-100` → `opacity-0` | — | 300ms |

---

### 3.2 Spotlight (Elemento Destacado)

O spotlight cria um "buraco" visual no overlay, revelando o elemento DOM alvo com clareza total.

#### Técnica: box-shadow inset gigante

A técnica usa `box-shadow` com spread enorme para pintar "fora" do elemento em vez de "dentro", criando o efeito de recorte sem precisar de Canvas ou SVG complexo.

```css
/* O elemento alvo recebe estas propriedades via classe dinâmica */
box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.75);
```

**Por que esta técnica:**
- Pure CSS — sem re-render de Canvas
- Animável com `transition: box-shadow 400ms cubic-bezier(0.4, 0, 0.2, 1)`
- Herda automaticamente o `border-radius` do elemento alvo
- Funciona com qualquer formato de elemento (botão redondo, card, input)

#### Especificação completa

| Propriedade | Valor | Notas |
|-------------|-------|-------|
| `box-shadow` | `0 0 0 9999px rgba(0,0,0,0.75)` | Spread de 9999px garante cobertura total |
| `border-radius` | Herdar do elemento alvo | Via `border-radius: inherit` ou computed |
| `padding` virtual | `8px` ao redor do elemento | Aplicado via `margin: -8px` ou posicionamento |
| `transition` | `all 400ms cubic-bezier(0.4, 0, 0.2, 1)` | Suaviza transição entre elementos |
| `z-index` | `9998` | Acima do overlay, abaixo do pointer |
| `position` | Relativo ao elemento no DOM | O elemento recebe a classe, não um wrapper |

#### Implementação

```tsx
// O elemento alvo é clonado/referenciado com estilo adicional
// Abordagem: aplicar className via querySelector após getBoundingClientRect

// Em WizardOverlay.tsx
function applySpotlight(elementId: string): void {
  // Remover spotlight anterior
  const previous = document.querySelector('[data-wizard-spotlight]');
  if (previous) {
    previous.removeAttribute('data-wizard-spotlight');
    (previous as HTMLElement).style.removeProperty('box-shadow');
    (previous as HTMLElement).style.removeProperty('z-index');
    (previous as HTMLElement).style.removeProperty('position');
  }

  // Aplicar no novo elemento
  const target = document.getElementById(elementId);
  if (target) {
    target.setAttribute('data-wizard-spotlight', 'true');
    target.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.75)';
    target.style.zIndex = '9998';
    target.style.position = 'relative';
    target.style.transition = 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)';
  }
}
```

#### Mobile: substituição da técnica

Em telas menores que 768px, o `box-shadow` de spread pode causar overflow. Usar borda animada em vez disso:

```css
/* Mobile spotlight alternativo */
outline: 2px solid #F59E0B; /* amber-400 */
outline-offset: 4px;
animation: wizard-spotlight-pulse 1.5s ease-in-out infinite;

@keyframes wizard-spotlight-pulse {
  0%, 100% { outline-color: rgba(245, 158, 11, 1); }
  50%       { outline-color: rgba(245, 158, 11, 0.4); }
}
```

---

### 3.3 Pointer / Seta Animada

O ponteiro visual que indica exatamente onde o usuário deve interagir. É o elemento mais expressivo do sistema.

#### Especificação visual

| Propriedade | Valor | Justificativa |
|-------------|-------|---------------|
| Forma | SVG arrow (↓ ← → ↑ dinâmico) | Leve, escalável, vetorial |
| Cor | `#F59E0B` (amber-400) | Destaque sem agredir — padrão do design system |
| Animação | `bounce` vertical/horizontal 1s infinite | Chama atenção sem ser invasivo |
| Tamanho | `32×32px` (desktop) / `24×24px` (mobile) | Touch-friendly, visível |
| Z-index | `9999` | Sempre no topo absoluto |
| Posição | `fixed`, calculada via `getBoundingClientRect()` | Preciso, independente de scroll |

#### SVG do Pointer por direção

```tsx
// WizardPointer.tsx — SVGs para cada direção
const POINTER_SVGS = {
  bottom: (
    // Seta apontando para baixo — elemento está abaixo do panel
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 4 L16 24 M16 24 L8 16 M16 24 L24 16"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  top: (
    // Seta apontando para cima — elemento está acima do panel
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M16 28 L16 8 M16 8 L8 16 M16 8 L24 16"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  right: (
    // Seta apontando para a direita
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M4 16 L24 16 M24 16 L16 8 M24 16 L16 24"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  left: (
    // Seta apontando para a esquerda
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path
        d="M28 16 L8 16 M8 16 L16 8 M8 16 L16 24"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};
```

#### Posicionamento calculado

```tsx
// Em WizardPointer.tsx — cálculo de posição via getBoundingClientRect
interface PointerCoords {
  top: number;
  left: number;
  direction: 'top' | 'bottom' | 'left' | 'right';
}

function calculatePointerPosition(
  elementId: string,
  position: PointerTarget['position']
): PointerCoords | null {
  const target = document.getElementById(elementId);
  if (!target) return null;

  const rect = target.getBoundingClientRect();
  const POINTER_SIZE = 32;
  const GAP = 12; // px entre o pointer e o elemento

  const coords: Record<PointerTarget['position'], PointerCoords> = {
    bottom: {
      top: rect.bottom + GAP,
      left: rect.left + rect.width / 2 - POINTER_SIZE / 2,
      direction: 'bottom',
    },
    top: {
      top: rect.top - POINTER_SIZE - GAP,
      left: rect.left + rect.width / 2 - POINTER_SIZE / 2,
      direction: 'top',
    },
    right: {
      top: rect.top + rect.height / 2 - POINTER_SIZE / 2,
      left: rect.right + GAP,
      direction: 'right',
    },
    left: {
      top: rect.top + rect.height / 2 - POINTER_SIZE / 2,
      left: rect.left - POINTER_SIZE - GAP,
      direction: 'left',
    },
  };

  return coords[position];
}
```

#### Mobile: substituição por pulsing circle

Em mobile (< 768px), o pointer SVG é simplificado para um círculo pulsante sobre o elemento:

```tsx
// Mobile: anel pulsante no centro do elemento
<div
  className="fixed z-[9999] w-8 h-8 rounded-full border-2 border-amber-400
             animate-[wizard-pulse_1.5s_ease-in-out_infinite]"
  style={{ top: rect.top + rect.height / 2 - 16, left: rect.left + rect.width / 2 - 16 }}
/>
```

---

### 3.4 Wizard Panel (Card de Instrução)

O painel flutuante que apresenta o conteúdo de cada step: ícone, título, descrição e botões de ação.

#### Especificação visual — Glassmorphism Beauty OS

| Propriedade | Valor | Tailwind class |
|-------------|-------|----------------|
| Background | `rgba(15, 15, 15, 0.90)` | `bg-black/90` |
| Backdrop blur | `blur(24px)` (xl) | `backdrop-blur-xl` |
| Border | `1px solid rgba(255,255,255,0.10)` | `border border-white/10` |
| Border-radius | `16px` | `rounded-2xl` |
| Padding | `24px` | `p-6` |
| Largura | `min(400px, 90vw)` | `w-full max-w-sm md:max-w-md` |
| Z-index | `9997` | `z-[9997]` |
| Sombra | `0 25px 50px rgba(0,0,0,0.5)` | `shadow-2xl` |

#### Posicionamento do painel

O WizardPanel se posiciona **no lado oposto ao pointer**, próximo ao elemento destacado:

| Posição do pointer | Posição do panel |
|-------------------|-----------------|
| `bottom` (seta aponta para baixo) | Panel acima do elemento |
| `top` (seta aponta para cima) | Panel abaixo do elemento |
| `right` (seta aponta para direita) | Panel à esquerda do elemento |
| `left` (seta aponta para esquerda) | Panel à direita do elemento |

Em **mobile** (< 768px): independente da posição do pointer, o panel sempre ocupa o `bottom` da tela como um bottom sheet.

#### Estrutura de conteúdo do painel

```tsx
// Estrutura interna do WizardPanel
<div className="fixed z-[9997] bg-black/90 backdrop-blur-xl border border-white/10
                rounded-2xl p-6 shadow-2xl w-full max-w-sm md:max-w-md
                transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)]
                // Mobile: bottom sheet fixo
                bottom-0 left-0 right-0 rounded-b-none
                // Desktop: posicionado próximo ao elemento
                md:bottom-auto md:rounded-2xl md:left-auto md:right-auto">

  {/* Barra de progresso — sempre no topo do panel */}
  <WizardProgress currentStep={currentStep} totalSteps={5} />

  {/* Header do step */}
  <div className="flex items-center gap-3 mb-4 mt-4">
    <span className="text-2xl" role="img" aria-label="ícone do step">
      {STEP_ICON}
    </span>
    <div>
      <h2 className="text-lg font-bold text-white leading-tight">
        {STEP_TITLE}
      </h2>
      <p className="text-white/60 text-sm mt-0.5">
        {STEP_DESCRIPTION}
      </p>
    </div>
  </div>

  {/* Conteúdo do step (formulário) — varia por step */}
  {children}

  {/* Botões de ação */}
  <div className="flex gap-3 mt-6">
    {currentStep > 1 && (
      <button
        onClick={() => dispatch({ type: 'PREV_STEP' })}
        className="flex-1 py-3 rounded-xl border border-white/10 text-white/70
                   hover:bg-white/5 transition-all duration-200 text-sm"
      >
        ← Voltar
      </button>
    )}
    <button
      type="submit"
      form={`step-${currentStep}-form`}
      className="flex-1 bg-amber-400 text-black font-semibold py-3 rounded-xl
                 hover:bg-amber-300 transition-all duration-200 min-h-[44px]"
    >
      Salvar e Continuar →
    </button>
  </div>
</div>
```

---

## 4. Animações CSS

Todas as animações são definidas como `@keyframes` customizados. Em Tailwind 3.x com `tailwind.config.js`, adicioná-las como `theme.extend.keyframes` e `theme.extend.animation`. Alternativamente, defini-las diretamente em `index.css`.

### 4.1 Definição de Keyframes

```css
/* index.css — adicionar ao bloco @layer base ou @layer utilities */

/* Bounce do pointer — vertical (direção bottom/top) */
@keyframes wizard-pointer-bounce {
  0%, 100% {
    transform: translateY(0px);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateY(-8px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

/* Bounce horizontal do pointer — para direções left/right */
@keyframes wizard-pointer-bounce-x {
  0%, 100% {
    transform: translateX(0px);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: translateX(-8px);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
}

/* Fade-in do overlay e panel */
@keyframes wizard-fade-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Transição entre steps (desliza da direita para esquerda) */
@keyframes wizard-step-transition {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0px);
  }
}

/* Pulse do spotlight mobile */
@keyframes wizard-spotlight-pulse {
  0%, 100% {
    outline-color: rgba(245, 158, 11, 1.0);
    outline-offset: 4px;
  }
  50% {
    outline-color: rgba(245, 158, 11, 0.3);
    outline-offset: 8px;
  }
}

/* Pulse circle para pointer mobile */
@keyframes wizard-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.6;
  }
}
```

### 4.2 Configuração no Tailwind (tailwind.config.js)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      keyframes: {
        'wizard-pointer-bounce': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        'wizard-pointer-bounce-x': {
          '0%, 100%': { transform: 'translateX(0px)' },
          '50%':       { transform: 'translateX(-8px)' },
        },
        'wizard-fade-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        'wizard-step-transition': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0px)' },
        },
        'wizard-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%':       { transform: 'scale(1.4)', opacity: '0.6' },
        },
      },
      animation: {
        'wizard-pointer-bounce':   'wizard-pointer-bounce 1s ease-in-out infinite',
        'wizard-pointer-bounce-x': 'wizard-pointer-bounce-x 1s ease-in-out infinite',
        'wizard-fade-in':          'wizard-fade-in 300ms ease-out forwards',
        'wizard-step-transition':  'wizard-step-transition 400ms ease-out forwards',
        'wizard-pulse':            'wizard-pulse 1.5s ease-in-out infinite',
      },
    },
  },
};
```

### 4.3 Tabela de uso por componente

| Componente | Animação aplicada | Classe Tailwind |
|------------|------------------|-----------------|
| `WizardOverlay` | Fade-in ao montar | `animate-[wizard-fade-in]` |
| `WizardPanel` | Fade-in ao montar, step-transition ao avançar | `animate-[wizard-fade-in]` → `animate-[wizard-step-transition]` |
| `WizardPointer` (vertical: top/bottom) | Bounce vertical contínuo | `animate-[wizard-pointer-bounce]` |
| `WizardPointer` (horizontal: left/right) | Bounce horizontal contínuo | `animate-[wizard-pointer-bounce-x]` |
| Spotlight mobile | Pulse no outline | CSS direto via `data-wizard-spotlight` |
| Pointer mobile | Pulse circle | `animate-[wizard-pulse]` |

---

## 5. Responsividade Mobile

### 5.1 Breakpoints

| Breakpoint | Viewport | Comportamento |
|-----------|---------|---------------|
| Mobile | `< 768px` | Bottom sheet + pulsing circle |
| Desktop | `>= 768px` | Panel posicionado próximo ao elemento + SVG arrow bounce |

### 5.2 WizardPanel em Mobile (Bottom Sheet)

Em dispositivos móveis, o WizardPanel sempre fica fixo na parte inferior da tela, independente de qual elemento está sendo destacado. Isso evita que o panel cubra o elemento alvo em telas pequenas.

```tsx
// Classe condicional mobile vs desktop
const panelClasses = `
  fixed z-[9997]
  bg-black/90 backdrop-blur-xl
  border-t border-white/10
  p-6 pb-safe
  w-full

  /* Mobile: bottom sheet sem border-radius nas bordas inferiores */
  bottom-0 left-0 right-0
  rounded-t-2xl

  /* Desktop: card flutuante com rounded completo */
  md:bottom-auto md:left-auto md:right-auto
  md:rounded-2xl md:border md:border-white/10
  md:max-w-md md:w-auto

  /* Animação */
  animate-[wizard-fade-in_300ms_ease-out_forwards]
`;
```

### 5.3 WizardPointer em Mobile

```tsx
// Em WizardPointer.tsx — renderização condicional por viewport
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Pulsing circle sobre o elemento alvo
  return (
    <div
      className="fixed z-[9999] w-8 h-8 rounded-full
                 border-2 border-amber-400
                 animate-[wizard-pulse_1.5s_ease-in-out_infinite]"
      style={{
        top:  rect.top  + rect.height / 2 - 16,
        left: rect.left + rect.width  / 2 - 16,
      }}
      aria-hidden="true"
    />
  );
}

// Desktop: SVG arrow direcional com bounce
return (
  <div
    className={`fixed z-[9999] ${
      isVertical ? 'animate-[wizard-pointer-bounce]' : 'animate-[wizard-pointer-bounce-x]'
    }`}
    style={{ top: coords.top, left: coords.left }}
    aria-hidden="true"
  >
    {POINTER_SVGS[coords.direction]}
  </div>
);
```

### 5.4 Touch Targets

Todos os elementos interativos no wizard devem ter **no mínimo 44×44px** de área clicável (WCAG 2.1 AA):

```tsx
// Botões — altura mínima garantida
<button className="min-h-[44px] min-w-[44px] py-3 px-6 ...">
  Salvar e Continuar →
</button>

// Inputs — padding generoso para touch
<input className="py-3 px-4 h-[48px] ..." />
```

### 5.5 Viewport mínima suportada

O wizard foi especificado para funcionar a partir de **380px de largura** (padrão do projeto, conforme `config/tech-decisions.md`).

```css
/* Garantir que o WizardPanel não ultrapasse a viewport */
.wizard-panel {
  max-width: min(400px, calc(100vw - 32px));
  margin: 0 auto;
}
```

---

## 6. Progress Indicator

A barra de progresso é o primeiro elemento visual dentro do WizardPanel, sinalizando continuamente em qual step o usuário está.

### 6.1 Especificação visual

| Propriedade | Valor | Tailwind class |
|-------------|-------|----------------|
| Posição | Topo do WizardPanel | Primeiro filho do panel |
| Formato texto | `"Passo {N} de 5"` | `text-xs text-white/50` |
| Barra container | Full width, `4px` de altura | `w-full h-1 bg-white/10 rounded-full` |
| Barra de progresso | `(currentStep / 5) * 100%` | `h-1 bg-amber-400 rounded-full` |
| Transição de largura | `400ms ease` | `transition-all duration-400` |
| Marcadores (dots) | 5 círculos (completo / atual / pendente) | Custom com `flex gap-2` |

### 6.2 Implementação do componente `WizardProgress`

```tsx
// components/onboarding/WizardProgress.tsx
interface WizardProgressProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
  totalSteps: 5;
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="mb-4" role="progressbar"
         aria-valuenow={currentStep}
         aria-valuemin={1}
         aria-valuemax={totalSteps}
         aria-label={`Passo ${currentStep} de ${totalSteps}`}>

      {/* Texto de progresso */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white/50">
          Passo {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-amber-400 font-medium">
          {Math.round(progressPercentage)}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-[400ms] ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Dots indicadores */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              step < currentStep
                ? 'bg-amber-400'          // Completo
                : step === currentStep
                  ? 'bg-amber-400 scale-125' // Atual
                  : 'bg-white/20'           // Pendente
            }`}
          />
        ))}
      </div>
    </div>
  );
}
```

### 6.3 Valores de progresso por step

| Step | Progresso % | Largura da barra |
|------|------------|------------------|
| 1 | 20% | `width: 20%` |
| 2 | 40% | `width: 40%` |
| 3 | 60% | `width: 60%` |
| 4 | 80% | `width: 80%` |
| 5 | 100% | `width: 100%` |

---

## 7. Positioning Algorithm (Algoritmo de Posicionamento)

O posicionamento preciso do pointer e do panel é calculado via `getBoundingClientRect()`, garantindo que o pointer aponte corretamente mesmo após scroll ou redimensionamento de janela.

### 7.1 Fluxo do algoritmo

```
[Step muda → novo elementId disponível]
         │
         ▼
[useEffect dispara em WizardPointer]
         │
         ▼
[document.getElementById(elementId)]
         │
    ┌────┴────┐
    │ não     │ encontrou
    │ encontrou│
    ▼         ▼
[log warn] [rect = element.getBoundingClientRect()]
[return]         │
                 ▼
    [calcular coords do pointer conforme position]
                 │
                 ▼
    [setPointerStyle({ top, left })]
                 │
                 ▼
    [aplicar spotlight no elemento]
                 │
                 ▼
    [posicionar WizardPanel no lado oposto]
```

### 7.2 Implementação completa

```tsx
// Em WizardPointer.tsx — hook de cálculo de posição
function usePointerPosition(
  elementId: string,
  position: PointerTarget['position']
) {
  const [coords, setCoords] = useState<PointerCoords | null>(null);

  useEffect(() => {
    function calculate() {
      const target = document.getElementById(elementId);
      if (!target) {
        console.warn(`[WizardPointer] Elemento não encontrado: #${elementId}`);
        return;
      }

      const rect = target.getBoundingClientRect();
      const POINTER_SIZE = 32;
      const GAP = 12;

      const positionMap: Record<typeof position, PointerCoords> = {
        bottom: {
          top:       rect.bottom + GAP,
          left:      rect.left + rect.width / 2 - POINTER_SIZE / 2,
          direction: 'bottom',
        },
        top: {
          top:       rect.top - POINTER_SIZE - GAP,
          left:      rect.left + rect.width / 2 - POINTER_SIZE / 2,
          direction: 'top',
        },
        right: {
          top:       rect.top + rect.height / 2 - POINTER_SIZE / 2,
          left:      rect.right + GAP,
          direction: 'right',
        },
        left: {
          top:       rect.top + rect.height / 2 - POINTER_SIZE / 2,
          left:      rect.left - POINTER_SIZE - GAP,
          direction: 'left',
        },
      };

      setCoords(positionMap[position]);
    }

    // Calcular imediatamente
    calculate();

    // Recalcular no resize (ex: rotação de tela no mobile)
    window.addEventListener('resize', calculate);
    return () => window.removeEventListener('resize', calculate);
  }, [elementId, position]);

  return coords;
}
```

### 7.3 Elemento não encontrado no DOM

Se o `elementId` não existir no DOM (ex: elemento ainda não renderizado), o WizardPointer deve:
1. Logar um aviso no console: `[WizardPointer] Elemento não encontrado: #${elementId}`
2. Renderizar em posição centralizada como fallback: `top: 50vh, left: 50vw`
3. Não lançar erro — graceful degradation

### 7.4 Cálculo de posição do WizardPanel (relativo ao elemento)

```tsx
// Posicionamento do panel no lado oposto ao pointer (desktop)
function calculatePanelPosition(
  rect: DOMRect,
  pointerPosition: PointerTarget['position']
): { top: number; left: number } {
  const PANEL_WIDTH  = 400;
  const PANEL_GAP    = 56; // pointer size + gap

  const panelPositionMap = {
    bottom: { // pointer abaixo → panel acima
      top:  rect.top - PANEL_GAP - 200, // estimativa de altura do panel
      left: rect.left + rect.width / 2 - PANEL_WIDTH / 2,
    },
    top: { // pointer acima → panel abaixo
      top:  rect.bottom + PANEL_GAP,
      left: rect.left + rect.width / 2 - PANEL_WIDTH / 2,
    },
    right: { // pointer à direita → panel à esquerda
      top:  rect.top + rect.height / 2 - 100, // metade estimada do panel
      left: rect.left - PANEL_WIDTH - PANEL_GAP,
    },
    left: { // pointer à esquerda → panel à direita
      top:  rect.top + rect.height / 2 - 100,
      left: rect.right + PANEL_GAP,
    },
  };

  return panelPositionMap[pointerPosition];
}
```

---

## 8. Interface TypeScript `PointerTarget`

A interface central que conecta cada step do wizard ao elemento DOM que deve ser destacado.

### 8.1 Definição da interface

```typescript
// types/wizard.ts — definições de tipo do wizard

/** Direções possíveis para o pointer em relação ao elemento alvo */
type PointerDirection = 'top' | 'bottom' | 'left' | 'right';

/** Define qual elemento destacar e como posicionar o pointer */
interface PointerTarget {
  /** ID do elemento DOM a ser destacado (deve existir no DOM quando o step renderizar) */
  elementId: string;

  /** Posição do pointer em relação ao elemento alvo */
  position: PointerDirection;

  /** Mensagem exibida no tooltip do pointer (label de instrução) */
  message: string;
}

/** Estado completo do wizard */
type WizardStep = 1 | 2 | 3 | 4 | 5;

interface WizardState {
  currentStep:    WizardStep;
  completedSteps: WizardStep[];
  isActive:       boolean;
  isCompleted:    boolean;
  pointerTarget:  PointerTarget | null;
}

/** Actions da state machine do wizard */
type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'COMPLETE_STEP'; step: WizardStep }
  | { type: 'SET_POINTER'; target: PointerTarget }
  | { type: 'CLOSE_WIZARD' }
  | { type: 'COMPLETE_WIZARD' };

/** Configuração de cada step */
interface WizardStepConfig {
  step:          WizardStep;
  title:         string;
  description:   string;
  icon:          string;
  pointerTarget: PointerTarget;
}
```

### 8.2 Configuração dos PointerTargets por step

```typescript
// lib/onboarding.ts — mapa de pointer targets por step
export const WIZARD_STEP_CONFIGS: WizardStepConfig[] = [
  {
    step:        1,
    title:       'Configure seu Negócio',
    description: 'Adicione o nome e informações básicas do seu salão ou barbearia',
    icon:        '🏪',
    pointerTarget: {
      elementId: 'business-name-input',  // ID do input de nome do negócio
      position:  'bottom',
      message:   'Comece digitando o nome do seu negócio aqui',
    },
  },
  {
    step:        2,
    title:       'Cadastre seu Primeiro Serviço',
    description: 'Adicione um serviço que você oferece (ex: Corte Masculino)',
    icon:        '✂️',
    pointerTarget: {
      elementId: 'service-name-input',   // ID do input de nome do serviço
      position:  'bottom',
      message:   'Qual é o primeiro serviço que você oferece?',
    },
  },
  {
    step:        3,
    title:       'Adicione um Profissional',
    description: 'Cadastre você mesmo ou um colaborador que realiza os serviços',
    icon:        '👤',
    pointerTarget: {
      elementId: 'professional-name-input', // ID do input de nome do profissional
      position:  'bottom',
      message:   'Digite o nome do profissional',
    },
  },
  {
    step:        4,
    title:       'Crie seu Primeiro Agendamento',
    description: 'Registre um agendamento para ver o sistema em ação',
    icon:        '📅',
    pointerTarget: {
      elementId: 'appointment-client-input', // ID do input de cliente
      position:  'bottom',
      message:   'Digite o nome do seu primeiro cliente',
    },
  },
  {
    step:        5,
    title:       'Configure seu Link de Agendamento',
    description: 'Crie um link público para seus clientes agendarem online',
    icon:        '🔗',
    pointerTarget: {
      elementId: 'booking-slug-input',    // ID do input de slug público
      position:  'bottom',
      message:   'Escolha um endereço único para sua página de agendamentos',
    },
  },
];
```

---

## 9. Integração com o Beauty OS

### 9.1 Classes Tailwind padrão do projeto

O Beauty OS usa glassmorphism como padrão visual. Estas são as classes exatas para manter consistência:

```tsx
// Glassmorphism padrão (conforme agents/ux-wizard-designer.md)
const GLASS_CLASSES = `
  bg-white/5
  backdrop-blur-xl
  border border-white/10
  rounded-2xl
`;

// Glassmorphism escuro (para o WizardPanel)
const GLASS_DARK_CLASSES = `
  bg-black/90
  backdrop-blur-xl
  border border-white/10
  rounded-2xl
`;

// Cor de destaque principal
// amber-400 (#F59E0B) — usada no pointer, barra de progresso, botão primário

// Input padrão do wizard (alinhado com o template)
const INPUT_CLASSES = `
  w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
  text-white placeholder-white/30
  focus:outline-none focus:border-amber-400
  transition-colors duration-200
`;

// Botão primário (submit)
const BUTTON_PRIMARY_CLASSES = `
  w-full bg-amber-400 text-black font-semibold
  py-3 rounded-xl min-h-[44px]
  hover:bg-amber-300
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200
`;
```

### 9.2 Tema Brutal vs Beauty

O overlay engine deve respeitar o tema ativo do usuário:

| Propriedade | Tema Brutal (barbearia) | Tema Beauty (salão) |
|-------------|------------------------|---------------------|
| Background overlay | `rgba(0, 0, 0, 0.80)` | `rgba(0, 0, 0, 0.70)` |
| Panel background | `rgba(15, 15, 15, 0.92)` | `rgba(20, 15, 30, 0.90)` |
| Panel border | `rgba(255, 255, 255, 0.10)` | `rgba(255, 255, 255, 0.15)` |
| Cor do pointer | `#F59E0B` (amber-400) | `#F59E0B` (amber-400) — igual |
| Tipografia | `font-bold`, `tracking-tight` | `font-semibold`, `tracking-normal` |

```tsx
// Detecção de tema via UIContext (padrão do projeto)
const { theme } = useUI(); // 'brutal' | 'beauty'

const overlayBg = theme === 'brutal'
  ? 'bg-black/80'
  : 'bg-black/70';
```

### 9.3 Contextos do projeto a utilizar

| Contexto | Hook | Uso no wizard |
|----------|------|---------------|
| `AuthContext` | `useAuth()` | Obter `user.company_id`, detectar primeiro login |
| `AlertsContext` | `useAlerts()` | Toast de sucesso/erro em cada step |
| `UIContext` | `useUI()` | Detectar tema ativo (Brutal/Beauty) |

```tsx
// Padrão de uso em cada step (conforme config/tech-decisions.md)
const { user }      = useAuth();
const { showAlert } = useAlerts();
const { theme }     = useUI();
const companyId     = user!.company_id; // SEMPRE do contexto, nunca de URL
```

### 9.4 Rota no HashRouter

```tsx
// App.tsx — adicionar rota lazy-loaded para o wizard
const Onboarding = React.lazy(() => import('./pages/Onboarding'));

// Na lista de rotas:
<Route
  path="/onboarding"
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <Onboarding />
    </Suspense>
  }
/>
```

### 9.5 Detecção de primeiro login (AuthContext)

```typescript
// lib/onboarding.ts — helper de verificação
export async function checkOnboardingStatus(companyId: string): Promise<{
  needsOnboarding: boolean;
  currentStep: WizardStep | null;
}> {
  const { data, error } = await supabase
    .from('onboarding_progress')
    .select('current_step, is_completed')
    .eq('company_id', companyId)
    .maybeSingle(); // null se não existe ainda

  if (error) throw error;

  // Nunca iniciou ou não completou
  if (!data || !data.is_completed) {
    return {
      needsOnboarding: true,
      currentStep: (data?.current_step as WizardStep) ?? 1,
    };
  }

  return { needsOnboarding: false, currentStep: null };
}
```

---

## 10. Handoff para Core Developer (Rex)

### Checklist completo do que foi especificado

#### Overlay Engine

- [x] **Z-index layer system** — 4 camadas documentadas (9996-9999)
- [x] **Overlay Background** — cor, blur, transição, pointer-events
- [x] **Spotlight** — técnica box-shadow, aplicação via `data-wizard-spotlight`, mobile fallback
- [x] **WizardPointer** — SVGs para 4 direções, posicionamento via `getBoundingClientRect()`
- [x] **WizardPanel** — glassmorphism, posicionamento oposto ao pointer, bottom sheet mobile
- [x] **WizardProgress** — barra, dots, transição de 400ms

#### Animações

- [x] **`wizard-pointer-bounce`** — keyframe completo (vertical)
- [x] **`wizard-pointer-bounce-x`** — keyframe completo (horizontal)
- [x] **`wizard-fade-in`** — keyframe completo
- [x] **`wizard-step-transition`** — keyframe completo
- [x] **`wizard-spotlight-pulse`** — keyframe completo (mobile)
- [x] **`wizard-pulse`** — keyframe completo (pointer mobile)
- [x] **Configuração Tailwind** — `tailwind.config.js` com todos os keyframes

#### TypeScript

- [x] **`PointerTarget`** interface completa
- [x] **`WizardState`** interface completa
- [x] **`WizardAction`** union type completo
- [x] **`WizardStepConfig`** interface completa
- [x] **`WIZARD_STEP_CONFIGS`** — 5 steps com elementIds e mensagens

#### Responsividade

- [x] **Mobile (< 768px)** — bottom sheet, pulsing circle, touch targets 44x44px
- [x] **Desktop (>= 768px)** — SVG arrow, panel flutuante, bounce animation
- [x] **Viewport mínima** — 380px (padrão do projeto)

#### Integração Beauty OS

- [x] **Classes Tailwind** — glassmorphism escuro, input, botão primário
- [x] **Tema Brutal/Beauty** — diferenças de opacidade e tipografia
- [x] **Contextos** — `useAuth()`, `useAlerts()`, `useUI()`
- [x] **Rota HashRouter** — `/#/onboarding` com lazy-load
- [x] **Detecção de primeiro login** — `checkOnboardingStatus()` via Supabase

### Arquivos que Rex deve criar

```
components/onboarding/
├── WizardOverlay.tsx       ← Container principal + overlay background
├── WizardPointer.tsx       ← Seta animada + lógica de posicionamento
├── WizardProgress.tsx      ← Barra de progresso (este spec, seção 6)
├── WizardEngine.tsx        ← State machine + navegação
├── WizardContext.tsx       ← Context provider + useWizard hook
└── steps/
    ├── Step1BusinessProfile.tsx
    ├── Step2FirstService.tsx
    ├── Step3FirstProfessional.tsx
    ├── Step4FirstAppointment.tsx
    └── Step5BookingLink.tsx

pages/
└── Onboarding.tsx          ← Wrapper da página (rota /#/onboarding)

lib/
└── onboarding.ts           ← checkOnboardingStatus(), saveOnboardingStep()

types/
└── wizard.ts               ← PointerTarget, WizardState, WizardAction, etc.
```

### IDs de elementos DOM obrigatórios (por step)

Rex deve garantir que cada step renderize um elemento com o ID correto para o pointer funcionar:

| Step | ID do elemento | Tipo |
|------|----------------|------|
| 1 | `business-name-input` | `<input>` — nome do negócio |
| 2 | `service-name-input` | `<input>` — nome do serviço |
| 3 | `professional-name-input` | `<input>` — nome do profissional |
| 4 | `appointment-client-input` | `<input>` — nome do cliente |
| 5 | `booking-slug-input` | `<input>` — slug do link público |

### Notas de implementação para Rex

1. **Spotlight cleanup**: Sempre remover o atributo `data-wizard-spotlight` do elemento anterior antes de aplicar no novo
2. **Resize handler**: `useEffect` com `window.addEventListener('resize', recalculate)` para reposicionar em rotação mobile
3. **Graceful degradation**: Se `getBoundingClientRect()` retornar rect zerado (elemento oculto), logar aviso e centrar o pointer na viewport
4. **`position: relative`**: Aplicar no elemento alvo para que o `z-index` do spotlight funcione corretamente
5. **`pointer-events: none`**: O overlay background deve ter `pointer-events: none` para que o elemento alvo (z-[9998]) ainda seja clicável
6. **Scroll para o elemento**: Antes de posicionar o pointer, chamar `element.scrollIntoView({ behavior: 'smooth', block: 'center' })` para garantir que o elemento está visível

---

## Referências

| Arquivo | Relevância |
|---------|-----------|
| `squads/onboarding-wizard-squad/squad.yaml` | Escopo e decisões técnicas do squad |
| `squads/onboarding-wizard-squad/plan.md` | Arquitetura de componentes e fluxo do wizard |
| `squads/onboarding-wizard-squad/config/tech-decisions.md` | Justificativas das decisões técnicas |
| `squads/onboarding-wizard-squad/templates/wizard-step-tmpl.tsx` | Template base para implementação dos steps |
| `squads/onboarding-wizard-squad/agents/core-developer.md` | Perfil e padrões de código do Rex |
| `squads/onboarding-wizard-squad/tasks/implement-overlay-component.md` | Task de implementação do Rex (Phase 2) |
| `components/onboarding/StepSuccess.tsx` | Componente existente — avaliar reuso |
| `contexts/AuthContext.tsx` | `useAuth()` — company_id + detecção de primeiro login |
| `contexts/AlertsContext.tsx` | `useAlerts()` — toasts de sucesso/erro |
| `lib/supabase.ts` | Cliente Supabase para persistência |
| `CLAUDE.md` | Padrões gerais do projeto (HashRouter, Tailwind, TypeScript) |

---

*Documento criado por Luma (ux-wizard-designer) — onboarding-wizard-squad — 2026-03-20*
*Handoff para Rex (core-developer) — task: implement-overlay-component (Phase 2)*
