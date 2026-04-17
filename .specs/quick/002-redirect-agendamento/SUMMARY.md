# Summary — Quick Task 002

**Status:** Pending execution (investigação necessária)

## O que foi descoberto no planejamento

- `Agenda.tsx` linhas 2005–2009: o `navigate('/agenda?date=...')` + `fetchData()` JÁ EXISTE
- `getInitialDate()` usa `useSearchParams()` — lê `?date=` da URL via react-router no HashRouter
- O `useEffect` de `fetchData` depende de `[user, selectedDate]`, onde `selectedDate` vem de `getInitialDate(searchParams)`
- **Suspeita principal:** race condition — `fetchData()` chamado no `onSuccess` antes do `selectedDate` atualizar via efeito, resultando em busca com a data antiga
- `DashboardHero.tsx` navega para `/agenda` sem `?date=` — possível segundo ponto de entrada sem o fix

## Impacto esperado

- Antes: após criar agendamento, agenda não mostra a data correta ou não recarrega os dados
- Depois: agenda navega para a data do agendamento criado e carrega os dados corretamente

## Arquivos alterados

A definir após investigação

## Commit

`fix(agenda): ensure correct date navigation after appointment creation`
