# Task: implement-step-1-profile
> Agent: core-developer | Phase: 3 | elicit: false
> depends_on: [implement-wizard-engine]

## Objetivo

Implementar o Step 1 do wizard: configuração do perfil do negócio (nome, logo, horários).

## Arquivo a Criar

`components/onboarding/steps/Step1BusinessProfile.tsx`

## Pointer Target

- **elementId:** `business-name-input`
- **position:** `bottom`
- **message:** "Comece digitando o nome do seu negócio aqui"

## Campos do Formulário

| Campo | Tipo | Obrigatório | Tabela Supabase |
|-------|------|-------------|-----------------|
| Nome do negócio | text input | ✅ | `companies.name` |
| Logo | file upload | ❌ | `companies.logo_url` (Storage) |
| Horário seg-sex | time range | ✅ | `companies.business_hours` JSONB |
| Horário sáb | time range | ❌ | `companies.business_hours` JSONB |
| Horário dom | time range | ❌ | `companies.business_hours` JSONB |

## Estrutura do Componente

```tsx
// components/onboarding/steps/Step1BusinessProfile.tsx
import { useState } from 'react';
import { useWizard } from '../WizardContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/contexts/AlertsContext';
import { supabase } from '@/lib/supabase';
import { saveOnboardingStep } from '@/lib/onboarding';
import { WizardProgress } from '../WizardProgress';

export function Step1BusinessProfile() {
  const { state, dispatch } = useWizard();
  const { user } = useAuth();
  const { showAlert } = useAlerts();

  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showAlert('Nome do negócio é obrigatório', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Salvar no companies
      const { error } = await supabase
        .from('companies')
        .update({ name: name.trim() })
        .eq('id', user!.company_id);
      if (error) throw error;

      // 2. Persistir progresso
      await saveOnboardingStep(user!.company_id, 2, [1]);

      // 3. Avançar no wizard
      dispatch({ type: 'COMPLETE_STEP', step: 1 });
    } catch (err) {
      showAlert('Erro ao salvar perfil. Tente novamente.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9997] md:relative md:bottom-auto
                    bg-black/90 backdrop-blur-xl border-t border-white/10
                    md:border md:rounded-2xl p-6 md:max-w-md md:mx-auto md:mt-8">
      <WizardProgress currentStep={1} totalSteps={5} />

      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">🏢 Vamos começar!</h2>
        <p className="text-white/60 text-sm mt-1">
          Conte-nos sobre seu negócio
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="business-name-input" className="text-sm text-white/70">
            Nome do negócio *
          </label>
          <input
            id="business-name-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Salão Bella Vista"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3
                       text-white placeholder-white/30 focus:outline-none
                       focus:border-amber-400 transition-colors"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !name.trim()}
          className="w-full bg-amber-400 text-black font-semibold py-3 rounded-xl
                     hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {isLoading ? 'Salvando...' : 'Salvar e Continuar →'}
        </button>
      </form>
    </div>
  );
}
```

## Checklist de Conclusão

- [ ] Campo `business-name-input` com ID correto para o pointer
- [ ] Validação: nome obrigatório antes de submit
- [ ] Salva em `companies.name` com `company_id` do contexto
- [ ] Persiste progresso via `saveOnboardingStep(companyId, 2, [1])`
- [ ] Dispatch `COMPLETE_STEP` avança para Step 2
- [ ] Toast de erro via `AlertsContext` em caso de falha
- [ ] `isLoading` desabilita o botão durante o submit
- [ ] Responsivo: bottom sheet em mobile, card em desktop
