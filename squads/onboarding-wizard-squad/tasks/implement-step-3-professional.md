# Task: implement-step-3-professional
> Agent: core-developer | Phase: 3 | elicit: false
> depends_on: [implement-wizard-engine]

## Objetivo

Implementar o Step 3 do wizard: adicionar o primeiro profissional (nome, especialidade, foto).

## Arquivo a Criar

`components/onboarding/steps/Step3FirstProfessional.tsx`

## Pointer Target

- **elementId:** `professional-name-input`
- **position:** `bottom`
- **message:** "Adicione você mesmo ou seu primeiro colaborador"

## Campos do Formulário

| Campo | Tipo | Obrigatório | Tabela Supabase |
|-------|------|-------------|-----------------|
| Nome | text | ✅ | `team_members.name` |
| Especialidade | select | ❌ | `team_members.specialty` |
| Foto | file upload | ❌ | `team_members.avatar_url` (Storage) |

## Opções de Especialidade

```tsx
const SPECIALTY_OPTIONS = [
  'Cabeleireiro(a)',
  'Barbeiro',
  'Manicure',
  'Pedicure',
  'Esteticista',
  'Maquiador(a)',
  'Colorista',
  'Outro',
];
```

## Lógica de Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const { error } = await supabase
      .from('team_members')
      .insert({
        company_id: user!.company_id,
        name: professionalName.trim(),
        specialty: specialty || null,
        is_active: true,
      });
    if (error) throw error;

    await saveOnboardingStep(user!.company_id, 4, [1, 2, 3]);
    dispatch({ type: 'COMPLETE_STEP', step: 3 });
  } catch {
    showAlert('Erro ao adicionar profissional. Tente novamente.', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

## Checklist de Conclusão

- [ ] ID `professional-name-input` no campo de nome para o pointer
- [ ] Select de especialidade com as opções listadas
- [ ] Validação: nome obrigatório
- [ ] Insere em `team_members` com `company_id` do contexto
- [ ] Persiste progresso: step 4 como next, completedSteps [1, 2, 3]
- [ ] Dispatch `COMPLETE_STEP` step 3
- [ ] Responsivo: bottom sheet mobile / card desktop
