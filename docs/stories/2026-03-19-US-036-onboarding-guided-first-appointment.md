---
id: US-036
título: Onboarding Guiado — Tour do Primeiro Agendamento
status: approved
estimativa: 6h
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
Dashboard → Clientes → [criar cliente] → Agenda → [criar agendamento] → CELEBRAÇÃO ✅
```

**Impacto no negócio:**
- Usuários que não percebem valor nos primeiros 5 minutos fazem churn imediato
- O primeiro agendamento **confirmado e visível na agenda** é o "momento aha" do produto
- Sem cliente cadastrado, o AppointmentWizard não funciona — frustração garantida

---

## Análise do Público-Alvo (Critérios Humanos)

> Validação @po — perspectiva do dono de salão/barbearia brasileiro

**Perfil real do usuário:**
- Dono de salão ou barbearia, 25-45 anos
- Dispositivo primário: smartphone Android (mobile-first é obrigatório)
- Nível técnico: baixo-médio — usa WhatsApp intensamente, mas software de gestão é novo
- Contexto de uso: ambiente barulhento, múltiplas interrupções, sempre com pressa
- Estado emocional ao entrar no Dashboard pela primeira vez: **animado mas impaciente** — acabou de preencher 4 telas de wizard, quer ver o produto funcionando

**Problemas humanos identificados e como esta story os trata:**

### 1. Fadiga de onboarding (risco alto)
O usuário acabou de fazer 4 passos no wizard. **Não podemos mostrar o tour imediatamente.** O tour deve ser acionado com um botão explícito na tela de sucesso do wizard ("Quero fazer meu primeiro agendamento agora →"), não automaticamente. A ativação automática existe como fallback no próximo login.

**Impacto no AC:** tour automático no Dashboard só dispara se `tour_first_appointment_${userId}` não existir E o usuário **não** acabou de completar o wizard na mesma sessão.

### 2. Interrupção é inevitável (risco médio)
Dono de salão vai ser interrompido no meio do tour — cliente chega, telefone toca. O estado de retomada via localStorage deve ser robusto. Ao retomar em `/clientes`, verificar `clients.length === 0` novamente — se o usuário criou o cliente manualmente durante a interrupção, o tour pula para a etapa de agendamento.

### 3. O "momento aha" está errado na versão anterior (risco alto)
O tour não pode terminar em "clique aqui para abrir o wizard de agendamento". Isso é abandono. O **verdadeiro aha moment** é ver o agendamento **aparecendo na agenda** — cor, horário, nome do cliente. O tour deve guiar até a confirmação e mostrar o resultado na agenda.

### 4. Máximo de 5 passos visíveis por segmento (mobile)
Em telas de 390px com popover do driver.js, 8 passos contínuos são inaceitáveis. A divisão em 3 segmentos (Dashboard → Clientes → Agenda) com no máximo 5 passos cada é o limite. Progresso deve ser visível ("Passo 2 de 5").

### 5. Tom de voz: amigo, não manual
Textos do tour devem ser informais, encorajadores, em português brasileiro coloquial. Exemplo:
- ❌ *"Navegue até a seção de clientes para cadastrar um novo registro"*
- ✅ *"Primeiro, vamos cadastrar um cliente. Clica ali em Clientes 👇"*

### 6. Seletores DOM: app é mobile-first com BottomMobileNav
O link "Clientes" **não está em uma sidebar** — está no `BottomMobileNav.tsx` (nav inferior). Em desktop pode haver sidebar. Os seletores devem ser condicionais por `isMobile`, exatamente como o tour existente já faz.

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

### Disparo do Tour
- [ ] Tour **não** dispara automaticamente imediatamente após o wizard de onboarding (mesma sessão)
- [ ] Tela de sucesso do wizard (`StepSuccess`) exibe botão CTA: *"Fazer meu primeiro agendamento →"* que inicia o tour ativamente
- [ ] Como fallback: tour dispara automaticamente no Dashboard no **próximo login** se `clients.length === 0` E `tour_first_appointment_${userId}` ausente no localStorage
- [ ] Se `clients.length > 0`, tour `first-appointment` **nunca** é exibido

### Segmento 1 — Dashboard (máx. 2 passos)
- [ ] Passo 1: Popover centralizado (`#root`) — boas-vindas informal + explica que vai criar o primeiro cliente
- [ ] Passo 2: Spotlight no ícone "Clientes" do `BottomMobileNav` (mobile) ou link sidebar (desktop), com seletor condicional `isMobile`

### Segmento 2 — Página Clientes (máx. 2 passos, retomado via localStorage)
- [ ] `onNextClick` do Passo 2: navega para `/clientes` + salva `tour_first_appointment_step_${userId} = 'clients_pending'` + destroy
- [ ] Passo 3 (retomado em `/clientes`): spotlight no botão "Novo Cliente" — elemento `BrutalButton` com `id="btn-novo-cliente"` (novo id a ser adicionado no componente)
- [ ] Passo 4: spotlight no primeiro input do formulário de cliente (nome), texto encoraja preencher nome + telefone

### Segmento 3 — Agenda (máx. 3 passos, retomado via localStorage)
- [ ] `onNextClick` do Passo 4: navega para `/agenda` + salva `tour_first_appointment_step_${userId} = 'agenda_pending'` + destroy
- [ ] Ao retomar em `/agenda`: verificar `clients.length === 0` novamente — se já tem clientes (criou manualmente durante interrupção), pular Segmento 2 e retomar aqui direto
- [ ] Passo 5 (retomado em `/agenda`): spotlight no botão "Novo Agendamento" com `id="btn-novo-agendamento"` (novo id a ser adicionado)
- [ ] Passo 6: popover explica que o cliente cadastrado já aparece na lista — tom: *"Seleciona ele ali e escolhe o horário!"*
- [ ] Passo 7: após agendamento confirmado (`onSuccess` do AppointmentWizard), exibir popover de celebração no calendário mostrando o agendamento criado — *"🎉 Tá na agenda! Esse é o seu primeiro cliente confirmado."*

### Comportamento Geral
- [ ] Tour skipável a qualquer momento via botão X nativo do driver.js (`allowClose: true`) — sem botão "Pular Tour" adicional
- [ ] Ao completar **ou** fechar: persistir `tour_first_appointment_${userId} = 'done'` no localStorage
- [ ] Textos do tour em português brasileiro informal (ver tom de voz na seção de Análise)
- [ ] `showProgress: true` visível em todos os passos de cada segmento
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

### Bloco A: Adicionar IDs estáveis nos elementos-alvo

> Seletores já mapeados pelo @po durante validação:
> - "Clientes" mobile: `BottomMobileNav.tsx` — botão com `onClick={() => navigate('/clientes')}`
> - "Novo Cliente": `Clients.tsx` linha 181 — `BrutalButton` sem id (adicionar)
> - "Novo Agendamento": `Agenda.tsx` linha 1098 — sem id (adicionar)

- [ ] **A.1** Em `components/BottomMobileNav.tsx`: adicionar `id="nav-clientes"` no botão de navegação para /clientes
- [ ] **A.2** Em `pages/Clients.tsx` linha ~181: adicionar `id="btn-novo-cliente"` no `BrutalButton` de novo cliente
- [ ] **A.3** Em `pages/Agenda.tsx` linha ~1098: adicionar `id="btn-novo-agendamento"` no botão/elemento de novo agendamento
- [ ] **A.4** Em `pages/onboarding/StepSuccess.tsx`: adicionar botão CTA *"Fazer meu primeiro agendamento →"* que chama `startTour('first-appointment')`

### Bloco B: Modificar useAppTour.ts

- [ ] **B.1** Adicionar `'first-appointment'` ao tipo `TourContext`
- [ ] **B.2** Implementar steps do contexto `'first-appointment'` — Segmento 1 (Dashboard):
  ```
  Step 1: element='#root', título="Bora fazer seu primeiro agendamento! 🚀",
          desc="É rapidinho. Primeiro, a gente cadastra um cliente — pode ser qualquer um que você já atende."
  Step 2: element=isMobile ? '#nav-clientes' : 'a[href="/clientes"]',
          título="Toca em Clientes 👇",
          desc="É aqui que ficam todos os seus clientes. Vamos adicionar o primeiro agora.",
          onNextClick: navigate('/clientes') + localStorage('clients_pending') + destroy
  ```
- [ ] **B.3** Implementar Segmento 2 (Clientes — retomado via localStorage):
  ```
  Step 3: element='#btn-novo-cliente',
          título="Clica em Novo Cliente ➕",
          desc="Coloca o nome e o telefone. Só isso já basta pra começar."
  Step 4: element='input[name="name"]' (ou primeiro input do form),
          título="Preenche os dados 📝",
          desc="Nome e telefone são o essencial. Pode adicionar mais depois.",
          onNextClick: navigate('/agenda') + localStorage('agenda_pending') + destroy
  ```
- [ ] **B.4** Implementar Segmento 3 (Agenda — retomado via localStorage):
  - Antes de iniciar: verificar `clients.length` — se `> 0` (cliente criado manualmente), pular direto para Step 5
  ```
  Step 5: element='#btn-novo-agendamento',
          título="Agora clica em Novo Agendamento ⚡",
          desc="Aqui você marca o horário. O cliente que você acabou de cadastrar já vai aparecer na lista."
  Step 6: element='#root',
          título="Seleciona o cliente e o horário 🗓️",
          desc="Escolhe o cliente, o serviço e confirma. Vai aparecer direto na sua agenda!"
  Step 7 (acionado pelo onSuccess do AppointmentWizard, não pelo driver):
          Popover customizado de celebração com confete ou destaque visual
          Texto: "🎉 Primeiro agendamento feito! Olha ele aí na agenda."
  ```
- [ ] **B.5** Adicionar no `useEffect` detecção de pending steps com chave separada:
  ```ts
  const faStep = localStorage.getItem(`tour_first_appointment_step_${user.id}`);
  if (location.pathname === '/clientes' && faStep === 'clients_pending') {
    startTour('first-appointment-clients');
    localStorage.setItem(`tour_first_appointment_step_${user.id}`, 'in_progress');
  }
  if (location.pathname === '/agenda' && faStep === 'agenda_pending') {
    startTour('first-appointment-agenda');
    localStorage.setItem(`tour_first_appointment_step_${user.id}`, 'in_progress');
  }
  ```
- [ ] **B.6** No `onDestroyed` de qualquer segmento do tour `first-appointment`: persistir `tour_first_appointment_${user.id} = 'done'` e limpar `tour_first_appointment_step_${user.id}`

### Bloco C: Modificar StepSuccess.tsx e Dashboard.tsx

- [ ] **C.1** Em `pages/onboarding/StepSuccess.tsx`: adicionar botão CTA principal:
  ```tsx
  <BrutalButton variant="primary" onClick={() => { startTour('first-appointment'); navigate('/'); }}>
    Fazer meu primeiro agendamento →
  </BrutalButton>
  ```
  E link secundário: *"Explorar por conta própria"* (pula o tour, vai pro Dashboard)
- [ ] **C.2** Em `pages/Dashboard.tsx`: adicionar query de count de clientes (fallback para próximo login):
  ```ts
  const { count } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  ```
- [ ] **C.3** Lógica de disparo automático (fallback — próximo login):
  ```ts
  const tourDone = localStorage.getItem(`tour_first_appointment_${user.id}`);
  const justFinishedWizard = sessionStorage.getItem('wizard_just_completed');
  if (onboarding_completed && !tourDone && count === 0 && !justFinishedWizard) {
    setTimeout(() => startTour('first-appointment'), 2000);
  }
  ```
- [ ] **C.4** Em `StepSuccess.tsx`, ao redirecionar: `sessionStorage.setItem('wizard_just_completed', 'true')` para evitar tour automático imediato
- [ ] **C.5** Verificar que não colide com o disparo do tour `dashboard` existente (usar `else if`)

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
- `hooks/useAppTour.ts` — Novos contextos `first-appointment`, `first-appointment-clients`, `first-appointment-agenda`
- `pages/Dashboard.tsx` — Query de count de clientes + lógica de disparo fallback
- `pages/onboarding/StepSuccess.tsx` — Botão CTA de tour + sessionStorage flag
- `components/BottomMobileNav.tsx` — id `nav-clientes` adicionado
- `pages/Clients.tsx` — id `btn-novo-cliente` adicionado
- `pages/Agenda.tsx` — id `btn-novo-agendamento` adicionado

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
- 2026-03-19: Validada e corrigida por @po (Pax) — AC reescrito, análise de público-alvo adicionada, estimativa ajustada para 6h, status → approved

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
