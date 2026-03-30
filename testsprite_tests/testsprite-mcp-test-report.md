# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata

- **Project Name:** Rhian-Lepore-main (Beauty OS / AgenX AIOS)
- **Date:** 2026-03-23
- **Prepared by:** TestSprite AI Team + Claude Code Analysis
- **Branch:** ux-teste
- **Server Mode:** Development (localhost:3000)
- **Tests Executed:** 15 (TC001–TC007, TC015–TC022)
- **Passed:** 2 (TC002, TC022)
- **Failed:** 13
- **Pass Rate:** 13.3%

---

## 2️⃣ Requirement Validation Summary

### Grupo A — Registro de Usuário

#### TC001 — Registrar nova conta com sucesso e ver prompt de confirmação de email
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/e7071c58-706b-4d68-b2d1-0076312b72e0
- **Erros encontrados:**
  - A SPA não renderizou em `/#/register` — tela preta/escura com 0 elementos interativos
  - Campos de formulário (nome do negócio, email, senha, confirmar senha) não encontrados
  - Botão "Registrar" não encontrado — fluxo não pode ser iniciado
- **Análise:** A página de registro carrega de forma lazy (`React.lazy`). O `Suspense` exibe um spinner `LoadingFull` enquanto o bundle carrega. TestSprite capturou o estado de carregamento antes da hidratação do React. Bug adicional: após registro bem-sucedido, o código navega direto para `/onboarding` sem exibir mensagem de "confirmação de email".

#### TC002 — Registro falha quando confirmar senha não coincide
- **Status:** ✅ Passou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/2f002ed8-c021-4ae0-901c-6ea99ca07add
- **Análise:** A validação de senhas divergentes funciona corretamente — o erro "As senhas não coincidem" é exibido antes de enviar a requisição ao backend.

#### TC003 — Registro bloqueado quando campos obrigatórios estão vazios
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/bb34ac5c-a99d-49f7-8bb3-7ba03e819f6f
- **Erros:** SPA não renderizou — mesma causa do TC001 (timing de carregamento lazy)

#### TC004 — Registro rejeita formato de email inválido
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/097847f1-4a37-4b1b-8ffe-ff1bb01eff2d
- **Erros:** SPA não renderizou — mesma causa do TC001

#### TC005 — Registro rejeita senha fraca
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/33f13752-9bb6-408f-978b-7281f6bcdd4a
- **Erros:** SPA não renderizou — mesma causa do TC001

#### TC006 — Usuário pode navegar de Registro para Login
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/4abb3ed0-86db-498a-9d23-2bff43c6e15a
- **Erros:** SPA não renderizou — mesma causa do TC001

#### TC007 — Usuário pode navegar de Registro para Esqueci Senha
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/c1afe210-69ed-4619-81a8-5564c8dd4d46
- **Erros:** SPA não renderizou — mesma causa do TC001

---

### Grupo B — Recuperação de Senha

#### TC015 — Página "Esqueci senha" permite voltar para Login
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/c06a87c9-8608-4a1b-8437-ff2d5f287f33
- **Erros:** Página de recuperação de senha não renderizou — mesma causa (loading state)

---

### Grupo C — Dashboard e KPIs

#### TC016 — Dashboard exibe KPI cards principais (receita, ticket médio, ocupação)
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/d80501e7-1971-4674-9573-b791af5ae2e4
- **Erros:**
  - Botão ENTRAR (Login) não interativo — múltiplos cliques falharam
  - Aplicação voltou para a tela de seleção de segmento (Gateway) após tentativas de login
  - Dashboard não carregou

#### TC017 — Abrir insights detalhados do KPI de Receita
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/70619397-696f-455b-86e1-4b54b67d9edf
- **Erros:** Página `/#/login` não renderizou campos de email/senha — exibiu 0 elementos interativos

#### TC018 — Abrir insights detalhados do KPI de Ticket Médio
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/d3e0ce07-ea01-4a80-b709-b58a818d7286
- **Erros:**
  - Clique no KPI 'Média por atendimento' não abriu painel de detalhes/modal
  - Instabilidade de DOM: elemento stale na index 1232
  - Página permaneceu em `/#/insights` sem mudança visível

#### TC019 — Abrir insights detalhados do KPI de Ocupação
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/528f7cf3-d360-45d5-bae6-59952e30741a
- **Erros:** Botão ENTRAR não interativo, SPA voltou ao Gateway repetidamente

#### TC020 — Refresh de métricas atualiza display de KPIs
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/8a72d3cb-42b6-4919-9a06-6299a6a245fc
- **Erros:** Página `/#/login` não renderizou formulário — 0 elementos interativos

#### TC021 — KPI cards permanecem visíveis após refresh
- **Status:** ❌ Falhou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/31175315-6f8e-402a-8853-f497de0fc1ca
- **Erros:** Navegação para `/#/login` exibiu tela de seleção de segmento (Gateway) em vez do formulário de login

---

### Grupo D — Agendamentos

#### TC022 — Criar novo agendamento a partir de um slot de calendário (happy path)
- **Status:** ✅ Passou
- **Visualização:** https://www.testsprite.com/dashboard/mcp/tests/f65a1948-ed55-4423-a64e-b7bc5b78666f/b412a72a-2a2b-466d-bd5c-349b0984f774
- **Análise:** Fluxo completo de criação de agendamento funcionou corretamente quando o usuário já está autenticado.

---

## 3️⃣ Coverage & Matching Metrics

| Grupo de Requisito          | Total | ✅ Passou | ❌ Falhou |
|-----------------------------|-------|-----------|-----------|
| Registro de Usuário         | 7     | 1         | 6         |
| Recuperação de Senha        | 1     | 0         | 1         |
| Dashboard e KPIs            | 6     | 0         | 6         |
| Agendamentos                | 1     | 1         | 0         |
| **Total**                   | **15**| **2**     | **13**    |

**Taxa de Aprovação Geral: 13.3%**

---

## 4️⃣ Bugs Identificados (Análise de Código + Testes)

---

### 🔴 BUG-001 — CRÍTICO: Login em duas etapas quebra automação e causa confusão de UX

**Arquivo:** [pages/Login.tsx](../pages/Login.tsx#L20)
**Severity:** Alta
**Tipo:** UX / Comportamento inesperado

**Descrição:**
A página `/#/login` exibe uma "Gateway Screen" como primeira tela — dois cards para selecionar "Barbearia" ou "Salão de Beleza". O formulário de email/senha só aparece DEPOIS que o usuário seleciona um segmento.

```tsx
// Login.tsx:20
const [showGateway, setShowGateway] = useState(true); // PROBLEMA: padrão true

// Login.tsx:57
if (showGateway) {
  return ( /* Gateway screen - sem campos de email/senha */ );
}
```

**Impacto:**
- Automações e testes (incluindo TestSprite) não conseguem fazer login porque navegam para `/#/login` e não encontram os campos de email/senha
- Usuários que compartilham o link direto de login chegam em uma tela inesperada
- A seleção de segmento no login é redundante (usuário já escolheu ao se registrar)

**Correção Sugerida:**
Remover a Gateway Screen do login, ou detectar automaticamente o tipo de negócio do usuário:
```tsx
// Opção 1: Remover gateway (tipo detectado após login pelo profile)
const [showGateway, setShowGateway] = useState(false);

// Opção 2: Detectar tipo automaticamente se já logado anteriormente
```

---

### 🔴 BUG-002 — CRÍTICO: SPA exibe tela preta durante carregamento lazy (timing race)

**Arquivo:** [App.tsx](../App.tsx#L43)
**Severity:** Alta
**Tipo:** Performance / Carregamento

**Descrição:**
Todas as páginas são carregadas com `React.lazy()`. O fallback do `Suspense` é um spinner `LoadingFull` com fundo escuro (`bg-neutral-900`). Testes automatizados que capturam o estado da página rapidamente veem APENAS o fundo escuro com spinner (0 elementos interativos), causando falha em 6 testes de registro.

```tsx
// App.tsx:43
const LoadingFull = () => (
  <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
  </div>
);
```

**Impacto:**
- 6 testes de registro falharam por ver a tela de loading em vez do formulário
- Usuários com conexão lenta veem tela escura sem feedback informativo
- Spinner sem texto não indica o que está carregando

**Correção Sugerida:**
Melhorar o fallback com texto informativo e garantir que páginas públicas críticas (register, login) sejam pré-carregadas:
```tsx
const LoadingFull = () => (
  <div className="min-h-screen bg-neutral-900 flex items-center justify-center flex-col gap-4">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
    <p className="text-neutral-400 text-sm font-mono">Carregando AgenX...</p>
  </div>
);
```

---

### 🔴 BUG-003 — CRÍTICO: `StepBusinessInfo` usa RPC obsoleto incompatível com novo sistema

**Arquivo:** [components/onboarding/StepBusinessInfo.tsx](../components/onboarding/StepBusinessInfo.tsx#L67)
**Severity:** Alta
**Tipo:** Integração de banco de dados

**Descrição:**
O `StepBusinessInfo` (usado pelo novo `WizardEngine`) ainda chama um RPC antigo `update_onboarding_step`, enquanto o novo sistema usa `upsert_onboarding_progress` via `lib/onboarding.ts`:

```tsx
// StepBusinessInfo.tsx:67 — RPC ANTIGO (pode não existir mais)
await supabase.rpc('update_onboarding_step', {
  p_user_id: user.id,
  p_step: 2,
});
```

```ts
// lib/onboarding.ts:41 — RPC CORRETO (novo sistema)
await supabase.rpc('upsert_onboarding_progress', {
  p_company_id: companyId,
  p_current_step: currentStep,
  p_completed_steps: completedSteps,
  p_step_data: stepData,
});
```

**Impacto:**
- O Step 1 do onboarding (Informações do Negócio) pode falhar silenciosamente ao tentar salvar o progresso
- O progresso pode não ser persistido corretamente, forçando o usuário a reiniciar o onboarding

**Correção Sugerida:**
Remover a chamada RPC obsoleta do `StepBusinessInfo` — a persistência já é gerenciada pelo `WizardEngine` via `completeStep`:
```tsx
// Remover estas linhas do StepBusinessInfo.tsx:
await supabase.rpc('update_onboarding_step', {
  p_user_id: user.id,
  p_step: 2,
});

// A persistência é responsabilidade do WizardEngine via completeStep()
onNext(); // apenas chamar onNext após salvar dados locais
```

---

### 🔴 BUG-004 — CRÍTICO: `completeOnboarding` usa UPDATE sem upsert — falha para novos usuários

**Arquivo:** [lib/onboarding.ts](../lib/onboarding.ts#L55)
**Severity:** Alta
**Tipo:** Banco de dados / Lógica de negócio

**Descrição:**
A função `completeOnboarding` usa `.update()` direto na tabela `onboarding_progress`, mas se o registro não existir (ex: usuário que pulou passos ou o `saveOnboardingStep` falhou anteriormente), o UPDATE não cria a linha e retorna sem erro — o onboarding nunca é marcado como completo.

```ts
// lib/onboarding.ts:55
export async function completeOnboarding(companyId: string): Promise<void> {
  const { error } = await supabase
    .from('onboarding_progress')
    .update({                          // ← UPDATE sem garantia de existência
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('company_id', companyId);
  if (error) throw error;
}
```

**Impacto:**
- Usuário que completa o onboarding mas cujo registro não existe na tabela ficará preso no onboarding loop (nunca sai)
- `is_completed` nunca será `true`, então `getOnboardingProgress` sempre retorna `false` e o sistema redireciona de volta ao onboarding

**Correção Sugerida:**
Usar upsert ou verificar existência antes:
```ts
export async function completeOnboarding(companyId: string): Promise<void> {
  const { error } = await supabase
    .from('onboarding_progress')
    .upsert({
      company_id: companyId,
      is_completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'company_id' });
  if (error) throw error;
}
```

---

### 🟠 BUG-005 — ALTO: Race condition em `StepSuccess.handleFinish` — `onComplete` não é aguardado

**Arquivo:** [components/onboarding/StepSuccess.tsx](../components/onboarding/StepSuccess.tsx#L20)
**Severity:** Média-Alta
**Tipo:** Assincronicidade / Race condition

**Descrição:**
O `handleFinish` chama `onComplete?.()` (que executa `completeStep(5)` — operação async) mas NÃO aguarda a Promise antes de navegar. O `navigate(path)` é executado imediatamente, podendo desmontar o componente antes que `completeOnboarding` finalize:

```tsx
// StepSuccess.tsx:20
const handleFinish = async (path: string) => {
  await markTutorialCompleted();  // ✅ aguarda
  onComplete?.();                  // ❌ não aguarda (retorna Promise ignorada)
  navigate(path);                  // ❌ navega antes de completeOnboarding terminar
};
```

**Impacto:**
- `completeOnboarding(companyId)` pode não completar antes da navegação
- O usuário pode ser redirecionado de volta para o onboarding (porque `is_completed` ainda é `false` no banco)

**Correção Sugerida:**
```tsx
const handleFinish = async (path: string) => {
  await markTutorialCompleted();
  await onComplete?.();            // ✅ aguardar a Promise
  navigate(path);
};
```

---

### 🟠 BUG-006 — ALTO: `WizardOverlay` com `pointer-events-none` no container principal

**Arquivo:** [components/onboarding/WizardOverlay.tsx](../components/onboarding/WizardOverlay.tsx#L22)
**Severity:** Média-Alta
**Tipo:** CSS / Interatividade

**Descrição:**
O container principal do `WizardOverlay` tem `pointer-events-none`, o que teoricamente bloqueia eventos de mouse. Embora o `WizardEngine` defina `pointer-events-auto` no filho direto, elementos aninhados profundamente (como inputs dentro de formulários de múltiplos níveis) podem não receber eventos se algum elemento intermediário não tiver `pointer-events-auto`:

```tsx
// WizardOverlay.tsx:22 — CONTAINER COM pointer-events-none
<div
  className="fixed inset-0 z-[9996] bg-black/75 backdrop-blur-sm
             transition-opacity duration-300 pointer-events-none"  // ← RISCO
  role="dialog"
>
  {children}  {/* children tem pointer-events-auto */}
</div>
```

**Impacto:**
- Risco de elementos de formulário não receberem cliques em alguns cenários de composição

**Correção Sugerida:**
Usar `pointer-events-none` apenas no backdrop, não no container principal:
```tsx
// Separar backdrop e conteúdo
<div className="fixed inset-0 z-[9996]" role="dialog">
  <div className="absolute inset-0 bg-black/75 backdrop-blur-sm pointer-events-none" />
  <div className="relative z-10">
    {children}
  </div>
</div>
```

---

### 🟠 BUG-007 — ALTO: `FocusTrap` com `fallbackFocus` apontando para elemento não-focável

**Arquivo:** [components/onboarding/WizardOverlay.tsx](../components/onboarding/WizardOverlay.tsx#L14)
**Severity:** Média
**Tipo:** Acessibilidade / Crash potencial

**Descrição:**
O `FocusTrap` usa `[data-wizard-panel]` como `fallbackFocus`, mas esse seletor aponta para o `<div>` container que não tem `tabindex`, tornando-o não-focável. Se nenhum elemento focável for encontrado na inicialização, o `focus-trap-react` pode lançar um erro:

```tsx
// WizardOverlay.tsx:14
<FocusTrap
  focusTrapOptions={{
    fallbackFocus: '[data-wizard-panel]',  // ← div sem tabindex
  }}
>
```

**Correção Sugerida:**
```tsx
<FocusTrap
  focusTrapOptions={{
    fallbackFocus: () => document.querySelector('[data-wizard-panel] input, [data-wizard-panel] button') as HTMLElement,
  }}
>
```

---

### 🟡 BUG-008 — MÉDIO: Dashboard KPI cards não abrem view de detalhes ao clicar (TC018)

**Arquivo:** Verificar em [pages/Reports.tsx](../pages/Reports.tsx) e componentes de KPI
**Severity:** Média
**Tipo:** Funcionalidade ausente / UI

**Descrição:**
O TC018 confirmou que clicar no KPI 'Média por atendimento' não abre nenhum painel de detalhes ou modal. A instabilidade de DOM (stale element na index 1232) sugere re-renders desnecessários nos cards KPI.

**Impacto:**
- Feature de drill-down em KPIs não funciona conforme esperado pelos usuários

---

### 🟡 BUG-009 — MÉDIO: Tela de registro não exibe confirmação de email após cadastro

**Arquivo:** [pages/Register.tsx](../pages/Register.tsx#L73)
**Severity:** Média
**Tipo:** UX / Fluxo incompleto

**Descrição:**
Após registro bem-sucedido, o código navega diretamente para `/onboarding` sem informar o usuário sobre a necessidade de confirmar o email (se o Supabase tiver confirmação de email ativada):

```tsx
// Register.tsx:73
} else {
  if (isInvitedStaff) {
    navigate('/');
  } else {
    navigate('/onboarding'); // ← sem mensagem de "verifique seu email"
  }
}
```

**Correção Sugerida:**
Mostrar um estado de confirmação antes de redirecionar, ou redirecionar para uma página de "verifique seu email".

---

### 🟡 BUG-010 — MÉDIO: `AuthContext.tutorialCompleted` inicializa como `true` (padrão incorreto)

**Arquivo:** [contexts/AuthContext.tsx](../contexts/AuthContext.tsx#L52)
**Severity:** Média
**Tipo:** Estado inicial incorreto

**Descrição:**
O estado `tutorialCompleted` é inicializado como `true`:

```tsx
// AuthContext.tsx:52
const [tutorialCompleted, setTutorialCompleted] = useState(true); // ← padrão TRUE
```

Se o perfil do usuário falhar ao carregar (erro de rede, etc.), `tutorialCompleted` permanece `true` e o usuário vai direto para o dashboard sem completar o onboarding.

**Correção Sugerida:**
```tsx
const [tutorialCompleted, setTutorialCompleted] = useState(false); // ← padrão FALSE mais seguro
```

---

### 🟡 BUG-011 — MÉDIO: Dois sistemas de onboarding coexistem sem migração clara

**Arquivos:**
- [pages/Onboarding.tsx](../pages/Onboarding.tsx) (novo — usa WizardEngine)
- [pages/OnboardingWizard.tsx](../pages/OnboardingWizard.tsx) (legado — usa hooks próprios)

**Severity:** Média
**Tipo:** Arquitetura / Débito técnico

**Descrição:**
Existem duas rotas e duas implementações do onboarding:
- `/#/onboarding` → `Onboarding.tsx` (novo, usa `WizardEngine` + `WizardContext`)
- `/#/onboarding-wizard` → `OnboardingWizard.tsx` (legado, usa `useOnboardingState`)

O `ProtectedLayout` redireciona para `/onboarding` (novo), mas `StepBusinessInfo` ainda tem código do sistema legado (BUG-003).

**Impacto:**
- Confusão sobre qual sistema está ativo
- Código duplicado aumenta risco de inconsistências

**Correção Sugerida:**
Remover `OnboardingWizard.tsx` e a rota `/onboarding-wizard` após validar que o novo sistema funciona completamente.

---

### 🟡 BUG-012 — MÉDIO: `StepBusinessInfo` botão "Continuar" desabilitado sem feedback claro

**Arquivo:** [components/onboarding/StepBusinessInfo.tsx](../components/onboarding/StepBusinessInfo.tsx#L127)
**Severity:** Baixa-Média
**Tipo:** UX

**Descrição:**
O botão de submit é desabilitado se `phone` estiver vazio, mas não há mensagem explicativa:

```tsx
// StepBusinessInfo.tsx:127
disabled={submitting || !name || !phone}
```

Se o usuário não preencher o telefone, o botão fica desabilitado sem explicar o motivo.

---

## 5️⃣ Resumo Executivo de Prioridades

| ID | Título | Severidade | Esforço Estimado |
|----|--------|-----------|-----------------|
| BUG-001 | Login Gateway de 2 etapas | 🔴 Crítico | 1h |
| BUG-002 | SPA loading state sem feedback | 🔴 Crítico | 30min |
| BUG-003 | StepBusinessInfo usa RPC obsoleto | 🔴 Crítico | 30min |
| BUG-004 | completeOnboarding sem upsert | 🔴 Crítico | 15min |
| BUG-005 | Race condition handleFinish | 🟠 Alto | 15min |
| BUG-006 | WizardOverlay pointer-events-none | 🟠 Alto | 20min |
| BUG-007 | FocusTrap fallbackFocus inválido | 🟠 Alto | 15min |
| BUG-008 | KPI cards sem drill-down | 🟡 Médio | 4-8h |
| BUG-009 | Sem confirmação de email no registro | 🟡 Médio | 1h |
| BUG-010 | tutorialCompleted padrão true | 🟡 Médio | 5min |
| BUG-011 | Dois sistemas de onboarding | 🟡 Médio | 2h (cleanup) |
| BUG-012 | Botão sem feedback de validação | 🟡 Médio | 30min |

**Total estimado para bugs críticos (BUG-001 a BUG-005): ~2h30min**

---

*Relatório gerado em 2026-03-23 por TestSprite MCP + Análise estática de código Claude Code*