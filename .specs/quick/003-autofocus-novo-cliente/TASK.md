# Quick Task 003: Adicionar autoFocus no input de nome do modal Novo Cliente

**Date:** 2026-04-17
**Status:** Pending

## Description

O formulário "Novo Cadastro" em `ClientSelection.tsx` (linha 110) não tem `autoFocus` no input de nome. O usuário precisa clicar manualmente no campo após abrir o formulário, criando fricção desnecessária — especialmente em mobile, onde o teclado não aparece automaticamente.

## Files Changed

- `components/appointment/ClientSelection.tsx` — linha 110: adicionar prop `autoFocus` no input de nome

## Approach

Linha 110 atual:
```tsx
<input
    value={newClientName}
    onChange={e => setNewClientName(e.target.value)}
    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30"
    placeholder="Ex: Maria Silva"
/>
```

Após fix:
```tsx
<input
    autoFocus
    value={newClientName}
    onChange={e => setNewClientName(e.target.value)}
    className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-white/30"
    placeholder="Ex: Maria Silva"
/>
```

**NÃO adicionar** `autoFocus` no `PhoneInput` (segundo campo) — evita conflito com o comportamento interno do componente de máscara internacional.

`autoFocus` dispara quando `isCreatingClient` passa de `false` para `true` (quando o formulário monta via condicional). Isso é o comportamento esperado.

## Verification

- [ ] Clicar em "Cadastrar Novo Cliente" → input de nome recebe foco automático (cursor piscando)
- [ ] Digitar imediatamente funciona sem clicar no campo
- [ ] Funciona em desktop (Chrome, Firefox, Safari)
- [ ] Mobile: teclado virtual abre automaticamente (comportamento aceitável — usuário acabou de clicar no botão)

## Commit

`fix(appointment): add autoFocus to new client name input`
