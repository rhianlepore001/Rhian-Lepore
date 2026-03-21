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
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-white/50">
          Passo {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-amber-400 font-medium">
          {Math.round(percentage)}%
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-[400ms] ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Dots indicadores */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              step < currentStep
                ? 'bg-amber-400'
                : step === currentStep
                ? 'bg-amber-400 scale-125'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
