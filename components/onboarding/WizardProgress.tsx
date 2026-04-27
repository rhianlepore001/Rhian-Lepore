// components/onboarding/WizardProgress.tsx

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function WizardProgress({ currentStep, totalSteps }: WizardProgressProps) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div
      className="mb-4"
      role="progressbar"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Passo ${currentStep} de ${totalSteps}`}
    >
      {/* Texto de progresso */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Passo {currentStep} de {totalSteps}
        </span>
        <span className="text-xs font-bold text-primary">
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-[400ms] ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Dots indicadores */}
      <div className="flex justify-between mt-3 px-1">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              step < currentStep
                ? 'bg-primary'
                : step === currentStep
                ? 'bg-primary scale-125 shadow-[0_0_8px_rgba(var(--primary),0.5)]'
                : 'bg-muted'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
