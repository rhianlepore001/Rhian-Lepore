// components/onboarding/WizardPointer.tsx
import React, { useEffect, useState } from 'react';

interface PointerTarget {
  elementId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
}

interface WizardPointerProps {
  target: PointerTarget;
}

interface PointerCoords {
  top: number;
  left: number;
}

const POINTER_SVGS: Record<PointerTarget['position'], React.ReactElement> = {
  bottom: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 28 L16 8 M16 8 L8 16 M16 8 L24 16"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  top: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M16 4 L16 24 M16 24 L8 16 M16 24 L24 16"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  right: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M28 16 L8 16 M8 16 L16 8 M8 16 L16 24"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  left: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M4 16 L24 16 M24 16 L16 8 M24 16 L16 24"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function WizardPointer({ target }: WizardPointerProps) {
  const [coords, setCoords] = useState<PointerCoords>({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const POINTER_SIZE = 32;
    const GAP = 12;

    function calculate(): boolean {
      const isMobileViewport = window.innerWidth < 768;
      setIsMobile(isMobileViewport);

      const el = document.getElementById(target.elementId);
      if (!el) {
        setCoords({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        setRect(null);
        return false;
      }

      const elRect = el.getBoundingClientRect();
      if (elRect.width === 0 && elRect.height === 0) {
        setCoords({ top: window.innerHeight / 2, left: window.innerWidth / 2 });
        setRect(null);
        return false;
      }

      setRect(elRect);

      const positionMap: Record<PointerTarget['position'], PointerCoords> = {
        bottom: {
          top: elRect.bottom + GAP,
          left: elRect.left + elRect.width / 2 - POINTER_SIZE / 2,
        },
        top: {
          top: elRect.top - POINTER_SIZE - GAP,
          left: elRect.left + elRect.width / 2 - POINTER_SIZE / 2,
        },
        right: {
          top: elRect.top + elRect.height / 2 - POINTER_SIZE / 2,
          left: elRect.right + GAP,
        },
        left: {
          top: elRect.top + elRect.height / 2 - POINTER_SIZE / 2,
          left: elRect.left - POINTER_SIZE - GAP,
        },
      };

      setCoords(positionMap[target.position]);
      return true;
    }

    function applySpotlight() {
      const el = document.getElementById(target.elementId);
      if (!el) return;

      const previous = document.querySelector('[data-wizard-spotlight]');
      if (previous && previous !== el) {
        previous.removeAttribute('data-wizard-spotlight');
        (previous as HTMLElement).style.boxShadow = '';
        (previous as HTMLElement).style.zIndex = '';
        (previous as HTMLElement).style.position = '';
        (previous as HTMLElement).style.borderRadius = '';
        (previous as HTMLElement).style.transition = '';
      }

      el.setAttribute('data-wizard-spotlight', 'true');
      el.style.position = 'relative';
      el.style.zIndex = '9998';
      el.style.boxShadow = '0 0 0 9999px rgba(0,0,0,0.75), 0 0 0 4px #F59E0B';
      el.style.borderRadius = '8px';
      el.style.transition = 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Tentar imediatamente
    const found = calculate();
    if (found) {
      applySpotlight();
    }

    // Se o elemento ainda não existe (Suspense carregando), observar o DOM
    let observer: MutationObserver | null = null;
    if (!found) {
      observer = new MutationObserver(() => {
        const success = calculate();
        if (success) {
          applySpotlight();
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.addEventListener('resize', calculate);

    return () => {
      window.removeEventListener('resize', calculate);
      observer?.disconnect();

      const spotlightEl = document.getElementById(target.elementId);
      if (spotlightEl) {
        spotlightEl.removeAttribute('data-wizard-spotlight');
        spotlightEl.style.boxShadow = '';
        spotlightEl.style.zIndex = '';
        spotlightEl.style.position = '';
        spotlightEl.style.borderRadius = '';
        spotlightEl.style.transition = '';
      }
    };
  }, [target.elementId, target.position]);

  const isVertical = target.position === 'top' || target.position === 'bottom';

  if (isMobile && rect) {
    return (
      <div
        className="fixed z-[9999] w-8 h-8 rounded-full border-2 border-amber-400
                   animate-[wizard-pulse_1.5s_ease-in-out_infinite]"
        style={{
          top: rect.top + rect.height / 2 - 16,
          left: rect.left + rect.width / 2 - 16,
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className={`fixed z-[9999] flex flex-col items-center gap-1 pointer-events-none ${
        isVertical
          ? 'animate-[wizard-pointer-bounce_1s_ease-in-out_infinite]'
          : 'animate-[wizard-pointer-bounce-x_1s_ease-in-out_infinite]'
      }`}
      style={{ top: coords.top, left: coords.left }}
      aria-hidden="true"
    >
      {POINTER_SVGS[target.position]}
      <span
        className="text-xs text-amber-300 bg-black/80 px-2 py-1 rounded-full
                   whitespace-nowrap max-w-[200px] text-center leading-tight"
      >
        {target.message}
      </span>
    </div>
  );
}
