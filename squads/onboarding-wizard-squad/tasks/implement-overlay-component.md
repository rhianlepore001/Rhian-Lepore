# Task: implement-overlay-component
> Agent: core-developer | Phase: 2 | elicit: false
> depends_on: [design-overlay-engine, schema-onboarding-state]

## Objetivo

Implementar os componentes React do sistema de overlay customizado:
`WizardOverlay.tsx` e `WizardPointer.tsx`.

## Arquivos a Criar

- `components/onboarding/WizardOverlay.tsx`
- `components/onboarding/WizardPointer.tsx`
- `components/onboarding/WizardProgress.tsx`

## Implementação

### WizardPointer.tsx

```tsx
// components/onboarding/WizardPointer.tsx
import { useEffect, useState } from 'react';

interface PointerTarget {
  elementId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
}

interface WizardPointerProps {
  target: PointerTarget;
}

export function WizardPointer({ target }: WizardPointerProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const el = document.getElementById(target.elementId);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const offset = 16;

    const positions = {
      bottom: { top: rect.bottom + offset, left: rect.left + rect.width / 2 - 16 },
      top:    { top: rect.top - offset - 32, left: rect.left + rect.width / 2 - 16 },
      right:  { top: rect.top + rect.height / 2 - 16, left: rect.right + offset },
      left:   { top: rect.top + rect.height / 2 - 16, left: rect.left - offset - 32 },
    };

    setCoords(positions[target.position]);

    // Highlight do elemento alvo via spotlight
    el.style.position = 'relative';
    el.style.zIndex = '9998';
    el.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px #F59E0B';
    el.style.borderRadius = '8px';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    return () => {
      el.style.boxShadow = '';
      el.style.zIndex = '';
      el.style.position = '';
      el.style.borderRadius = '';
    };
  }, [target.elementId, target.position]);

  const arrowMap = {
    bottom: '↓', top: '↑', right: '→', left: '←',
  };

  return (
    <div
      className="fixed z-[9999] flex flex-col items-center gap-1 pointer-events-none"
      style={{ top: coords.top, left: coords.left }}
    >
      <span
        className="text-3xl text-amber-400 animate-bounce"
        role="presentation"
        aria-hidden="true"
      >
        {arrowMap[target.position]}
      </span>
      <span className="text-xs text-amber-300 bg-black/80 px-2 py-1 rounded-full
                       whitespace-nowrap max-w-[200px] text-center">
        {target.message}
      </span>
    </div>
  );
}
```

### WizardOverlay.tsx

```tsx
// components/onboarding/WizardOverlay.tsx
import { ReactNode } from 'react';

interface WizardOverlayProps {
  isActive: boolean;
  children: ReactNode;
}

export function WizardOverlay({ isActive, children }: WizardOverlayProps) {
  if (!isActive) return null;

  return (
    <div
      className="fixed inset-0 z-[9996] bg-black/75 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-label="Assistente de configuração inicial"
    >
      {children}
    </div>
  );
}
```

### WizardProgress.tsx

```tsx
// components/onboarding/WizardProgress.tsx
interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex justify-between text-xs text-white/60">
        <span>Configuração inicial</span>
        <span>Step {currentStep} de {totalSteps}</span>
      </div>
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

## Checklist de Conclusão

- [ ] `WizardPointer` posiciona-se corretamente em relação ao elemento alvo
- [ ] Spotlight via box-shadow funciona no elemento destacado
- [ ] Animação de bounce suave no pointer
- [ ] Cleanup correto ao trocar de step (useEffect return)
- [ ] `WizardOverlay` bloqueia interação com o fundo
- [ ] `WizardProgress` anima a barra corretamente
- [ ] Funciona em mobile (pointer adapta posição)
- [ ] `npm run typecheck` passa sem erros
