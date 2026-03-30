# Task: implement-step-4-appointment
> Agent: core-developer | Phase: 3 | elicit: false
> depends_on: [implement-wizard-engine]

## Objetivo

Implementar o Step 4 do wizard: criação do primeiro agendamento de teste.

## Arquivo a Criar

`components/onboarding/steps/Step4FirstAppointment.tsx`

## Pointer Target

- **elementId:** `appointment-client-input`
- **position:** `bottom`
- **message:** "Crie seu primeiro agendamento de teste agora"

## Campos do Formulário

| Campo | Tipo | Obrigatório | Tabela Supabase |
|-------|------|-------------|-----------------|
| Nome do cliente | text | ✅ | `appointments.client_name` |
| Serviço | select | ✅ | `appointments.service_id` |
| Profissional | select | ✅ | `appointments.team_member_id` |
| Data | date | ✅ | `appointments.scheduled_at` |
| Hora | time | ✅ | `appointments.scheduled_at` |

## Lógica de Dados

```typescript
// Buscar serviços e profissionais criados anteriormente
useEffect(() => {
  const fetchOptions = async () => {
    const [servicesRes, professionalsRes] = await Promise.all([
      supabase.from('services').select('id, name').eq('company_id', user!.company_id),
      supabase.from('team_members').select('id, name').eq('company_id', user!.company_id),
    ]);
    setServices(servicesRes.data ?? []);
    setProfessionals(professionalsRes.data ?? []);
  };
  fetchOptions();
}, [user?.company_id]);
```

## Lógica de Submit

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    const scheduledAt = new Date(`${date}T${time}`).toISOString();

    const { error } = await supabase
      .from('appointments')
      .insert({
        company_id: user!.company_id,
        client_name: clientName.trim(),
        service_id: serviceId,
        team_member_id: professionalId,
        scheduled_at: scheduledAt,
        status: 'scheduled',
      });
    if (error) throw error;

    await saveOnboardingStep(user!.company_id, 5, [1, 2, 3, 4]);
    dispatch({ type: 'COMPLETE_STEP', step: 4 });
  } catch {
    showAlert('Erro ao criar agendamento. Tente novamente.', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

## Checklist de Conclusão

- [ ] ID `appointment-client-input` no campo de cliente para o pointer
- [ ] Select de serviço carrega serviços criados no Step 2
- [ ] Select de profissional carrega profissionais do Step 3
- [ ] Data não pode ser anterior a hoje (validação)
- [ ] Insere em `appointments` com `company_id` do contexto
- [ ] Persiste progresso: step 5 como next, completedSteps [1, 2, 3, 4]
- [ ] Dispatch `COMPLETE_STEP` step 4
- [ ] Responsivo: bottom sheet mobile / card desktop
