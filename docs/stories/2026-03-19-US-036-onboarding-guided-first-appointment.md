---
id: US-036
título: Onboarding Guiado — Tour do Primeiro Agendamento
status: Draft
estimativa: 4h
prioridade: critical
agente: dev
assignee: "@dev"
blockedBy: []
epic: EPIC-001
fase: "MVP — Onboarding & First Value"
---

# US-036: Onboarding Guiado — Tour do Primeiro Agendamento

## Context (Por Quê)

**Problema:** O `useAppTour.ts` atual faz um tour de *overview* da UI (Dashboard → Agenda → Configurações), mas **não guia o usuário a executar nenhuma ação real**. O usuário termina o tour sem ter criado um agendamento, sem entender o fluxo de trabalho, e sem perceber valor imediato.

Agravante crítico: **o usuário recém cadastrado não tem nenhum cliente**. Se ele tentar agendar sem criar um cliente primeiro, o AppointmentWizard não tem com quem associar o agendamento — fluxo quebrado.

**Fluxo atual (errado para MVP):**
```
Dashboard overview → Agenda overview → Configurações overview → FIM
```

**Fluxo correto (valor imediato):**
```
Dashboard → Clientes → [criar cliente] → Agenda → [criar agendamento] → VALOR PERCEBIDO ✅
```

**Impacto no negócio:**
- Usuários que não percebem valor nos primeiros 5 minutos fazem churn imediato
- O primeiro agendamento criado é o "momento aha" do produto
- Sem cliente cadastrado, o AppointmentWizard não funciona — frustração garantida

---

## What (O Quê)

Reestruturar o `useAppTour.ts` adicionando um **novo contexto de tour: `'first-appointment'`**, que:

1. Verifica se o usuário tem clientes cadastrados (`clients.length === 0`)
2. Se sim → guia a criar o primeiro cliente (página Clientes)
3. Navega para a Agenda e guia a criar o primeiro agendamento
4. Conclui com feedback de "primeiro agendamento criado" — momento aha

O tour existente (dashboard/agenda/settings overview) é mantido como está — apenas se **adiciona** o novo contexto `first-appointment`.

---

## Acceptance Criteria

- [ ] Novo contexto `'first-appointment'` adicionado ao `useAppTour.ts`
- [ ] Tour verifica `clients.length === 0` antes de iniciar (via prop/parâmetro passado pelo componente pai)
- [ ] Passo 1: Spotlight no menu/link "Clientes" com tooltip explicando o porquê
- [ ] Passo 2: Navega para `/clientes`, spotlight no botão "Novo Cliente"
- [ ] Passo 3 (onNextClick): aguarda navegação para `/clientes`, spotlight no formulário de criação
- [ ] Passo 4: Spotlight no botão "Salvar" do formulário de cliente
- [ ] Passo 5 (onNextClick): navega para `/agenda`, spotlight no botão "+" ou "Novo Agendamento"
- [ ] Passo 6: Tooltip explicando que o cliente recém criado já aparece na seleção do AppointmentWizard
- [ ] Tour é acionado automaticamente no Dashboard quando `clients.length === 0` E `onboarding_completed === true` E `tour_first_appointment_${userId}` não está no localStorage
- [ ] Tour é skipável a qualquer momento (botão "Pular Tour" no popover)
- [ ] Ao completar ou pular, persiste `tour_first_appointment_${userId} = 'done'` no localStorage
- [ ] Se o usuário já tem clientes (`clients.length > 0`), o tour `first-appointment` **não** é exibido
- [ ] `npm run lint` passa sem erros
- [ ] `npm run typecheck` passa sem erros

---

## Dev Notes

### Arquivos a modificar

**`hooks/useAppTour.ts`**
- Adicionar `'first-appointment'` ao tipo `TourContext`
- Adicionar bloco `else if (context === 'first-appointment')` com os steps
- O hook **não** busca clientes do Supabase — recebe `hasClients: boolean` como parâmetro do `startTour()`
- Assinatura nova: `startTour(context: TourContext, options?: { hasClients?: boolean })`

**`pages/Dashboard.tsx`**
- Buscar `clients` (ou apenas `count`) do Supabase ao carregar
- Chamar `startTour('first-appointment', { hasClients: clients.length > 0 })` com delay de 2000ms após onboarding completado
- Condição de disparo:
  ```ts
  const tourDone = localStorage.getItem(`tour_first_appointment_${user.id}`);
  if (onboarding_completed && !tourDone && clients.length === 0) {
    setTimeout(() => startTour('first-appointment'), 2000);
  }
  ```

### IDs dos elementos (verificar no DOM antes de implementar)

Os steps precisam de `element` seletores estáveis. Prioridade: `id` atributo > seletor CSS específico > `#root` como fallback.

Verificar no código existente:
- Link/botão de Clientes no sidebar: `a[href="/clientes"]` ou `#sidebar-clients-link`
- Botão "Novo Cliente" na página Clientes: verificar `Clients.tsx`
- Botão "+" ou "Novo Agendamento" na Agenda: verificar `Agenda.tsx` (provavelmente `#agenda-new-btn` ou similar)

### Estratégia de navegação entre steps

O driver.js **não navega sozinho** — a navegação entre páginas usa `onNextClick` com `navigate()` + `driverObj.destroy()` + `localStorage` para retomar, exatamente como já funciona no tour atual (`tour_step_${user.id}`).

Para o tour `first-appointment`, usar chave separada: `tour_first_appointment_step_${user.id}`.

### Não regredir o tour existente

O bloco `useEffect` no final do hook já gerencia `tour_step_${user.id}` para o tour original. Usar chave de localStorage **diferente** para não colidir.

---

## Tasks

### Bloco A: Preparação e leitura do DOM

- [ ] **A.1** Abrir `hooks/useAppTour.ts` e entender a estrutura atual completa
- [ ] **A.2** Abrir `pages/Clients.tsx` — identificar seletor do botão "Novo Cliente" (id ou className único)
- [ ] **A.3** Abrir `pages/Agenda.tsx` — identificar seletor do botão "Novo Agendamento" / "+"
- [ ] **A.4** Abrir `components/Layout.tsx` ou `components/Header.tsx` — identificar seletor do link "Clientes" no sidebar/nav
- [ ] **A.5** Documentar os seletores encontrados (anotar no Debug Log abaixo)

### Bloco B: Modificar useAppTour.ts

- [ ] **B.1** Adicionar `'first-appointment'` ao tipo `TourContext`
- [ ] **B.2** Alterar assinatura do `startTour` para aceitar `options?: { hasClients?: boolean }`
- [ ] **B.3** Implementar steps do contexto `'first-appointment'`:
  - Step 1: Boas-vindas + explicação de que precisa criar cliente primeiro (`#root`, sem elemento destacado)
  - Step 2: Spotlight no link "Clientes" no menu lateral/nav
  - Step 3: `onNextClick` → `navigate('/clientes')` + salvar `tour_first_appointment_step_${user.id} = 'clients_pending'` + destroy
  - Step 4 (resumido em `/clientes`): Spotlight no botão "Novo Cliente"
  - Step 5: Spotlight no formulário de criação (primeiro input de nome)
  - Step 6: `onNextClick` → `navigate('/agenda')` + salvar `tour_first_appointment_step_${user.id} = 'agenda_pending'` + destroy
  - Step 7 (resumido em `/agenda`): Spotlight no botão "+" / "Novo Agendamento"
  - Step 8: Tooltip final — "Selecione o cliente que você acabou de criar e agende!"
- [ ] **B.4** Adicionar no `useEffect` a detecção dos pending steps de `tour_first_appointment`:
  ```ts
  const faStep = localStorage.getItem(`tour_first_appointment_step_${user.id}`);
  if (location.pathname === '/clientes' && faStep === 'clients_pending') { ... }
  if (location.pathname === '/agenda' && faStep === 'agenda_pending') { ... }
  ```
- [ ] **B.5** No `onDestroyed` do driver `first-appointment`: persistir `tour_first_appointment_${user.id} = 'done'` no localStorage

### Bloco C: Modificar Dashboard.tsx

- [ ] **C.1** Adicionar query para buscar count de clientes:
  ```ts
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  ```
- [ ] **C.2** Adicionar lógica de disparo do tour com condições:
  - `onboarding_completed === true`
  - `localStorage.getItem(`tour_first_appointment_${user.id}`)` é null
  - `count === 0`
- [ ] **C.3** Disparo com delay de 2000ms (dar tempo para a UI renderizar)
- [ ] **C.4** Verificar que não colide com o disparo do tour `dashboard` existente

### Bloco D: Qualidade

- [ ] **D.1** `npm run lint` — corrigir qualquer warning
- [ ] **D.2** `npm run typecheck` — verificar tipos da nova assinatura de `startTour`
- [ ] **D.3** Testar manualmente no browser:
  - Limpar localStorage do usuário de teste
  - Garantir `onboarding_completed = true` e 0 clientes
  - Verificar que tour inicia automaticamente após 2s
  - Verificar que navega para /clientes e retoma o tour
  - Verificar que navega para /agenda e retoma o tour
  - Verificar que ao finalizar não reaparece

### Bloco E: Sign-Off

- [ ] **E.1** Seletores DOM corretos e estáveis (não quebram com re-render)
- [ ] **E.2** Tour não aparece quando `clients.length > 0`
- [ ] **E.3** Tour não colide com o tour de overview existente
- [ ] **E.4** localStorage limpo ao completar/pular
- [ ] **E.5** File List atualizada
- [ ] **E.6** Status: "Ready for Review"

---

## File List

### Criados
- (Nenhum)

### Modificados
- `hooks/useAppTour.ts` — Novo contexto `first-appointment` + nova assinatura de `startTour`
- `pages/Dashboard.tsx` — Query de count de clientes + lógica de disparo do tour

### Deletados
- (Nenhum)

---

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log
```
Seletores DOM a verificar:
- Link Clientes no sidebar: TBD (Task A.4)
- Botão Novo Cliente: TBD (Task A.2)
- Botão Novo Agendamento na Agenda: TBD (Task A.3)
```

### Completion Notes
- (Preencher ao finalizar)

### Change Log
- 2026-03-19: Story criada por @dev (Dex)

---

## Contexto Técnico Importante

### Por que localStorage e não Supabase para estado do tour?

O tour é UX local — não precisa sincronizar entre devices. Se o usuário troca de dispositivo e vê o tour de novo, não é bug crítico. Manter no localStorage é mais simples e zero latência.

### Por que não criar o cliente inline no AppointmentWizard?

O `AppointmentWizard` recebe `clients` como prop e tem `onRefreshClients`, mas a criação de cliente nova inline adicionaria complexidade ao wizard. Melhor guiar o usuário para a página correta — ele aprende o fluxo real do sistema, não um atalho que só existe durante o onboarding.

### Ordem dos contextos de tour no Dashboard

```
1. onboarding_completed === false → OnboardingWizard (já existe)
2. onboarding_completed === true + clients === 0 + tour não visto → tour 'first-appointment' (NOVO)
3. onboarding_completed === true + tour visto → tour 'dashboard' overview (já existe, se ainda não visto)
```

---

## Related Stories

- **US-031:** Focus Trap WCAG (modais acessíveis)
- **OnboardingWizard:** Setup inicial (BusinessInfo, Services, Team, Goal)

**EPIC:** EPIC-001 — Transformação UX/AI
**Sprint:** MVP — Onboarding & First Value

---

**Criado em:** 2026-03-19
**Status:** Draft
**Autor:** @dev (Dex)
