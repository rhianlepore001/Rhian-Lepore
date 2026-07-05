// components/onboarding/WizardProgress.tsx
import React from 'react';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  accentColor?: string;
}

export const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep, totalSteps, accentColor }) => {
  const percentage = (currentStep / totalSteps) * 100;
  const themeVariant: ThemeVariant = accentColor === 'beauty-neon' ? 'beauty' : 'barber';
  const { accent } = useBrutalTheme({ override: themeVariant });

  return (
    <div
      className="mb-6"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Passo ${currentStep} de ${totalSteps}`}
    >
      {/* Texto de progresso */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Passo {currentStep} de {totalSteps}
        </span>
        <span className={`text-xs font-bold tabular-nums ${accent.text}`}>
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Barra de progresso com track mais visível */}
      <div className="w-full h-2 bg-muted/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${accent.bg}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step indicators com labels e conexão */}
      <div className="flex items-center mt-4 relative">
        {/* Linha de conexão entre steps */}
        <div className="absolute left-0 right-0 top-[7px] h-[2px] bg-muted/60 -z-0" />

        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;

          return (
            <div key={step} className="flex-1 flex flex-col items-center gap-2 relative z-10">
              <div
                className={`
                  w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center
                  ${isCompleted
                    ? `${accent.bg} ${accent.border}`
                    : isCurrent
                    ? `bg-background ${accent.border} scale-110`
                    : 'bg-background border-muted'
                  }
                `}
              >
                {isCompleted && (
                  <svg className={`w-2.5 h-2.5 ${isCompleted ? 'text-black' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isCurrent && (
                  <div className={`w-1.5 h-1.5 rounded-full ${accent.bg}`} />
                )}
              </div>
              <span
                className={`
                  text-xs font-medium uppercase tracking-wider transition-colors duration-300
                  ${isCompleted || isCurrent ? accent.text : 'text-muted-foreground/60'}
                `}
              >
                {step === 1 ? 'Início' : 'Serviços'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
