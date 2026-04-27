// components/onboarding/WizardOverlay.tsx
import { ReactNode } from 'react';
import FocusTrap from 'focus-trap-react';

interface WizardOverlayProps {
  isActive: boolean;
  children: ReactNode;
}

export function WizardOverlay({ isActive, children }: WizardOverlayProps) {
  if (!isActive) return null;

  return (
    <FocusTrap
      focusTrapOptions={{
        allowOutsideClick: true,
        escapeDeactivates: false,
        fallbackFocus: '[data-wizard-panel]',
      }}
    >
      <div
        className="fixed inset-0 z-[9996] bg-background text-foreground
                   transition-opacity duration-300 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-label="Assistente de configuração inicial"
        data-wizard-panel
      >
        {children}
      </div>
    </FocusTrap>
  );
}
