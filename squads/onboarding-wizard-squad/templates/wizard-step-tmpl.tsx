// Template: wizard-step-tmpl.tsx
// Uso: copiar e renomear para StepN{Name}.tsx, substituir TODO

import { useState } from 'react';
import { useWizard } from '@/components/onboarding/WizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { saveOnboardingStep } from '@/lib/onboarding';
import { WizardProgress } from '@/components/onboarding/WizardProgress';

// TODO: Definir número e título do step
const STEP_NUMBER = 0 as 1 | 2 | 3 | 4 | 5;
const STEP_TITLE = 'TODO: Título do Step';
const STEP_DESCRIPTION = 'TODO: Descrição da ação';
const STEP_ICON = '⚙️';

export function StepTemplate() {
  const { dispatch } = useWizard();
  const { companyId } = useAuth();

  // TODO: Adicionar campos do formulário como estado
  const [field, setField] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // TODO: Validação dos campos
    if (!field.trim()) {
      setErrorMsg('TODO: Mensagem de campo obrigatório');
      return;
    }

    if (!companyId) {
      setErrorMsg('Empresa não identificada. Faça login novamente.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    try {
      // TODO: Salvar dados no Supabase
      const { error } = await supabase
        .from('TODO_tabela')
        .insert({
          company_id: companyId, // SEMPRE do contexto
          // TODO: campos da tabela
        });
      if (error) throw error;

      // TODO: Atualizar progresso
      // saveOnboardingStep(company_id, NEXT_STEP, COMPLETED_STEPS_ARRAY)
      await saveOnboardingStep(companyId, (STEP_NUMBER + 1) as 1 | 2 | 3 | 4 | 5, [STEP_NUMBER]);

      // Avançar wizard
      dispatch({ type: 'COMPLETE_STEP', step: STEP_NUMBER });

    } catch (_err) {
      setErrorMsg('TODO: Mensagem de erro ao salvar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Mobile: bottom sheet | Desktop: card próximo ao elemento alvo
    <div className="fixed bottom-0 left-0 right-0 z-[9997] md:relative md:bottom-auto
                    bg-black/90 backdrop-blur-xl border-t border-white/10
                    md:border md:rounded-2xl p-6 md:max-w-md md:mx-auto md:mt-8">

      {/* Barra de progresso */}
      <WizardProgress currentStep={STEP_NUMBER} totalSteps={5} />

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">
          {STEP_ICON} {STEP_TITLE}
        </h2>
        <p className="text-white/60 text-sm mt-1">{STEP_DESCRIPTION}</p>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* TODO: Campos do formulário */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="TODO-field-id"
            className="text-sm text-white/70"
          >
            TODO: Label do campo *
          </label>
          <input
            id="TODO-field-id"
            type="text"
            value={field}
            onChange={(e) => setField(e.target.value)}
            placeholder="TODO: Placeholder"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                       text-white placeholder-white/30 focus:outline-none
                       focus:border-amber-400 transition-colors"
            required
          />
        </div>

        {errorMsg && (
          <p className="text-red-400 text-sm">{errorMsg}</p>
        )}

        {/* Botão de submit */}
        <button
          type="submit"
          disabled={isLoading || !field.trim()}
          className="w-full bg-amber-400 text-black font-semibold py-3 rounded-xl
                     hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200 mt-2"
        >
          {isLoading ? 'Salvando...' : 'Salvar e Continuar →'}
        </button>
      </form>
    </div>
  );
}
