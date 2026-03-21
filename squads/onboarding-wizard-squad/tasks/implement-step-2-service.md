# Task: implement-step-2-service
> Agent: core-developer | Phase: 3 | elicit: false
> depends_on: [implement-wizard-engine]

## Objetivo

Implementar o Step 2 do wizard: cadastro do primeiro serviço (nome, duração, preço).

## Arquivo a Criar

`components/onboarding/steps/Step2FirstService.tsx`

## Pointer Target

- **elementId:** `service-name-input`
- **position:** `bottom`
- **message:** "Qual serviço você mais oferece?"

## Campos do Formulário

| Campo | Tipo | Obrigatório | Tabela Supabase |
|-------|------|-------------|-----------------|
| Nome do serviço | text | ✅ | `services.name` |
| Duração | select | ✅ | `services.duration_minutes` |
| Preço | number | ✅ | `services.price` |

## Opções de Duração

```tsx
const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
];
```

## Lógica de Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const { error } = await supabase
      .from('services')
      .insert({
        company_id: user!.company_id,
        name: serviceName.trim(),
        duration_minutes: duration,
        price: parseFloat(price),
        is_active: true,
      });
    if (error) throw error;

    await saveOnboardingStep(user!.company_id, 3, [1, 2]);
    dispatch({ type: 'COMPLETE_STEP', step: 2 });
  } catch {
    showAlert('Erro ao cadastrar serviço. Tente novamente.', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

## Checklist de Conclusão

- [ ] ID `service-name-input` no campo de nome para o pointer
- [ ] Select de duração com as 6 opções listadas
- [ ] Campo de preço aceita decimais (R$)
- [ ] Validação: nome + preço obrigatórios
- [ ] Insere em `services` com `company_id` do contexto
- [ ] Persiste progresso: step 3 como next, completedSteps [1, 2]
- [ ] Dispatch `COMPLETE_STEP` step 2
- [ ] Responsivo: bottom sheet mobile / card desktop
