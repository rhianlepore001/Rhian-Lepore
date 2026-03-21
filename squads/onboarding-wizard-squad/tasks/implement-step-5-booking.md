# Task: implement-step-5-booking
> Agent: core-developer | Phase: 3 | elicit: false
> depends_on: [implement-wizard-engine]

## Objetivo

Implementar o Step 5 (final) do wizard: configurar o link de agendamento público e
concluir o onboarding marcando `is_completed = true`.

## Arquivo a Criar

`components/onboarding/steps/Step5BookingLink.tsx`

## Pointer Target

- **elementId:** `booking-slug-input`
- **position:** `bottom`
- **message:** "Este é seu link exclusivo de agendamento online"

## Campos do Formulário

| Campo | Tipo | Obrigatório | Tabela Supabase |
|-------|------|-------------|-----------------|
| Slug do link | text | ✅ | `companies.booking_slug` |

## Lógica de Slug

```typescript
// Gerar slug automático a partir do nome do negócio
const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

// Verificar disponibilidade do slug
const checkSlugAvailability = async (slug: string) => {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('booking_slug', slug)
    .neq('id', user!.company_id)
    .single();
  return !data; // true = disponível
};
```

## Lógica de Submit (Conclusão do Wizard)

```typescript
const handleComplete = async () => {
  if (!slugAvailable) {
    showAlert('Este slug já está em uso. Escolha outro.', 'error');
    return;
  }
  setIsLoading(true);
  try {
    // 1. Salvar slug na empresa
    const { error } = await supabase
      .from('companies')
      .update({ booking_slug: slug })
      .eq('id', user!.company_id);
    if (error) throw error;

    // 2. Marcar onboarding como completo
    await completeOnboarding(user!.company_id);

    // 3. Finalizar wizard e redirecionar
    dispatch({ type: 'COMPLETE_WIZARD' });
    navigate('/#/dashboard');
    showAlert('🎉 Configuração concluída! Bem-vindo ao Beauty OS!', 'success');
  } catch {
    showAlert('Erro ao finalizar. Tente novamente.', 'error');
  } finally {
    setIsLoading(false);
  }
};
```

## UI do Step 5

```tsx
// Preview do link gerado
<div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
  <p className="text-xs text-white/40 mb-1">Seu link de agendamento:</p>
  <p className="text-amber-400 font-mono text-sm break-all">
    beautyos.app/{slug}
  </p>
  {slugAvailable
    ? <span className="text-emerald-400 text-xs">✅ Disponível</span>
    : <span className="text-red-400 text-xs">❌ Já em uso</span>
  }
</div>

{/* Botões de compartilhamento (após geração do link) */}
<div className="flex gap-2 mt-3">
  <button onClick={copyLink} className="flex-1 ...">
    📋 Copiar link
  </button>
</div>
```

## Checklist de Conclusão

- [ ] ID `booking-slug-input` no campo de slug para o pointer
- [ ] Slug gerado automaticamente a partir do nome do negócio (Step 1)
- [ ] Verificação de disponibilidade do slug (debounced, 500ms)
- [ ] Preview do link completo exibido em tempo real
- [ ] Botão "Copiar link" funcional (navigator.clipboard)
- [ ] Submit chama `completeOnboarding()` e seta `is_completed = true`
- [ ] Dispatch `COMPLETE_WIZARD` fecha o wizard
- [ ] Redireciona para `/#/dashboard` com toast de sucesso
- [ ] Responsivo: bottom sheet mobile / card desktop
