# Quick Task 002: Investigar e corrigir redirecionamento após criar agendamento

**Date:** 2026-04-17
**Status:** Pending

## Description

Após criar agendamento pelo `AppointmentWizard`, a Agenda não mostra o novo item ou não navega para a data correta. O agendamento existe no Supabase mas não aparece na lista.

## O que já existe (não é o bug óbvio)

`Agenda.tsx` linhas 2005–2009 JÁ tem o código correto:
```tsx
onSuccess={(date) => {
    const newDateStr = date.toISOString().split('T')[0];
    navigate(`/agenda?date=${newDateStr}`, { replace: true });
    fetchData();
    setShowNewAppointmentModal(false);
}}
```

O navigate e o fetchData já existem. O bug está em outro lugar.

## Investigação necessária (em ordem)

**1. HashRouter + searchParams:**
`getInitialDate()` usa `useSearchParams()` para ler `?date=`. No HashRouter, a URL fica `/#/agenda?date=2026-04-17`. Verificar se `useSearchParams()` do react-router-dom lê params corretamente após `navigate()` com `replace: true`.

**2. Race condition no timing:**
`fetchData` depende de `[user, selectedDate]` via `useEffect`. Se `navigate` e `fetchData()` são chamados simultaneamente no `onSuccess`, pode haver race condition — `fetchData` executa antes do `selectedDate` atualizar via efeito, buscando a data antiga.

**Fix provável para race condition:**
```tsx
onSuccess={(date) => {
    const newDateStr = date.toISOString().split('T')[0];
    setShowNewAppointmentModal(false);
    navigate(`/agenda?date=${newDateStr}`, { replace: true });
    // Remover fetchData() daqui — o useEffect cuidará do reload quando selectedDate mudar
}}
```

**3. Outros pontos de entrada:**
Verificar se `AppointmentWizard` é usado em outros lugares (ex: Dashboard, DashboardHero) sem o `navigate` correto no `onSuccess`.

## Files Changed (a definir após investigação)

- `pages/Agenda.tsx` — se o bug for no timing do navigate/fetchData (max 1–2 linhas)
- Possivelmente `components/dashboard/*.tsx` — se houver outro ponto de entrada sem navigate

## Verification

- [ ] Criar agendamento para amanhã via AppointmentWizard
- [ ] Após fechar o wizard, Agenda exibe a data do novo agendamento
- [ ] Agendamentos da data são carregados (fetchData executou após navigate)
- [ ] URL mostra `#/agenda?date=YYYY-MM-DD` correta na barra do navegador
- [ ] Criar agendamento para hoje via Dashboard (se existir esse fluxo) também funciona

## Commit

`fix(agenda): ensure correct date navigation after appointment creation`
