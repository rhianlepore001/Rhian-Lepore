# Summary — Quick Task 003

**Status:** Pending execution

## O que foi descoberto no planejamento

- `ClientSelection.tsx` linha 110: input de nome sem `autoFocus`
- AppointmentWizard já tem backdrop correto (`bg-black/90`, `fixed inset-0 z-[999]`) — o modal está visível
- `PhoneInput` (segundo campo) é um componente customizado de máscara — NÃO receber `autoFocus` para evitar conflito

## Impacto

- Antes: usuário abre "Novo Cadastro" e precisa clicar manualmente no campo de nome
- Depois: cursor aparece no campo de nome automaticamente, teclado abre em mobile

## Arquivos alterados

- `components/appointment/ClientSelection.tsx` (1 prop adicionada)

## Commit

`fix(appointment): add autoFocus to new client name input`
