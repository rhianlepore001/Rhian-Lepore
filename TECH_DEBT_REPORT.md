# Relatório de Análise de Débito Técnico — AGENX

> Data: 2026-05-02 | Escopo: Análise completa do codebase (~150+ arquivos fonte)

---

## Resumo Executivo

| Categoria | Crítico | Alto | Médio | Baixo |
|---|---|---|---|---|
| Segurança | 3 | 2 | 1 | 0 |
| Tipo/Tipo Safety | 1 | 1 | 0 | 0 |
| Arquitetura | 4 | 3 | 2 | 0 |
| Código Morto/Duplicado | 3 | 0 | 1 | 1 |
| Testes | 0 | 1 | 1 | 0 |
| Config/Infra | 0 | 2 | 2 | 1 |
| **Total** | **11** | **9** | **7** | **2** |

---

## 1. Problemas CRÍTICOS (requerem ação imediata)

### 1.1 🔴 Segurança — Credenciais expostas no bundle de produção

**`vite.config.ts:38-41`** — A chave `GEMINI_API_KEY` é injetada no bundle JavaScript via `define`, acessível por qualquer usuário que inspecione o source. A mesma lógica pode expor outras env vars.

**`lib/supabase.ts`** — URL e anon key do Supabase hardcoded como fallback. Se as env vars estiverem ausentes, a app conecta silenciosamente à instância de produção.

**`lib/gemini.ts:249`** — A função `generateContentCalendar` faz `fetch` direto para a API do Gemini com `?key=${apiKey}` na URL, expondo a chave em logs de rede. As outras funções usam o SDK que envia a key no header.

### 1.2 🔴 Segurança — RLS com `USING (true)` vaza dados entre tenants

| Migração | Tabela | Problema |
|---|---|---|
| `20260321` | `public_bookings` | Anon pode ler TODOS os bookings (nomes, telefones) de todas as empresas — violação LGPD |
| `20260318` | `audit_logs` | Qualquer usuário autenticado pode ler logs de auditoria de TODAS as empresas |
| `20260315` | Tabelas RAG | Qualquer usuário autenticado pode ler contexto semântico de todas as empresas |
| `20260222` | `client_semantic_memory` | Qualquer usuário autenticado pode ler memórias semânticas de clientes de outras empresas |

### 1.3 🔴 Segurança — RPC `complete_appointment_v2` sem verificação de ownership

A função `SECURITY DEFINER` `complete_appointment_v2` filtra apenas por `p_appointment_id` sem verificar se o chamador pertence à mesma empresa. Um usuário autenticado pode completar agendamentos de outra empresa.

### 1.4 🔴 Arquitetura — Páginas monolíticas ("God Components")

| Arquivo | Linhas | Deveria ter |
|---|---|---|
| `pages/Agenda.tsx` | **2.073** | 5-8 sub-componentes |
| `pages/PublicBooking.tsx` | **1.500** | 6-8 sub-componentes |
| `pages/Finance.tsx` | **1.216** | 4-6 sub-componentes |
| `pages/QueueManagement.tsx` | **705** | 3-4 sub-componentes |
| `pages/ClientCRM.tsx` | **647** | 3-4 sub-componentes |

Esses arquivos concentram estado, lógica de negócio, chamadas Supabase e UI em um único componente. Qualquer modificação tem alto risco de regressão.

### 1.5 🔴 Type Safety — 157 usos de `any` + ESLint desabilitado

`@typescript-eslint/no-explicit-any: "off"` no `.eslintrc.json` permite que o projeto acumule `any` sem restrição. Os piores arquivos:

| Arquivo | Ocorrências | Padrão |
|---|---|---|
| `pages/Agenda.tsx` | ~15 | `publicBookings: any[]`, `apt: any` |
| `pages/Finance.tsx` | ~10 | `transactions: any[]`, `item: any` |
| `pages/ClientCRM.tsx` | ~10 | `data as any`, `apt: any` |
| `hooks/useDashboardData.ts` | 7 | `appointments: any[]`, `goalHistory: any[]` |
| `components/CommissionsManagement.tsx` | ~8 | `item: any`, `err: any` |

### 1.6 🔴 Interfaces duplicadas — Tipos re-declarados em 3-5 arquivos

- **`Service`**: definido 5 vezes (components, pages, types.ts)
- **`TeamMember`**: definido 4 vezes
- **`Appointment`**: definido 3 vezes + canonical em `types.ts`
- **`Client`**: definido em 3 locais diferentes

Cada re-declaração tem campos diferentes, gerando inconsistência silenciosa.

### 1.7 🔴 Acoplamento direto com Supabase — 58 arquivos importam supabase diretamente

Quase todas as páginas e componentes fazem queries diretas ao Supabase em vez de usar hooks dedicados. Apenas 5-6 hooks existem (`useDashboardData`, `useMeuDiaData`, `useFinancialDoctor`, etc.), e nem todos os componentes os usam. Isso torna testes unitários virtualmente impossíveis sem mock do Supabase inteiro.

### 1.8 🔴 AuthContext monolítico — 16+ estados em um context

`contexts/AuthContext.tsx` (381 linhas) mistura autenticação, perfil de negócio e assinatura em um único provider. Deveria ser decomposto em `AuthProvider`, `BusinessProfileProvider` e `SubscriptionProvider`.

### 1.9 🔴 hooks com possíveis memory leaks — async sem cleanup

5 hooks fazem `useEffect` com fetch async sem `AbortController` ou flag de cleanup:

- `hooks/useDashboardData.ts` — 8 chamadas Supabase em 1 useEffect sem cleanup
- `hooks/useMeuDiaData.ts` — fetch sem cleanup
- `hooks/useSmartRebooking.ts` — race condition se `user` mudar rapidamente
- `hooks/useCampaignHistory.ts` — fetch complexo sem AbortController
- `hooks/useMarketingOpportunities.ts` — fetch sem cleanup

### 1.10 🔴 Mapeamento de appointments duplicado 4 vezes

A lógica de mapear `appointments` do Supabase para objetos tipados aparece idêntica em:

- `useMeuDiaData.ts:65-75` e `:153-163`
- `useDashboardData.ts:109-119` e `:290-300`

Deveria ser uma função utilitária compartilhada.

### 1.11 🔴 Feriados brasileiros móveis hardcoded incorretamente

`utils/brazilianHolidays.ts` fixa datas que variam anualmente:
- Dia das Mães (`05-11`) — deveria ser 2º domingo de maio
- Dia dos Pais (`08-10`) — deveria ser 2º domingo de agosto
- Black Friday (`11-29`) — deveria ser 4ª sexta de novembro

---

## 2. Problemas de ALTA prioridade

### 2.1 Configuração OpenRouter triplicada

`OPENROUTER_API_URL` e `OPENROUTER_API_KEY` estão repetidos em 3 arquivos:
- `hooks/useContentCalendar.ts:6-8`
- `hooks/useAIAssistant.ts:8-10`
- `lib/openrouter.ts:3-5`

E o `lib/openrouter.ts` **não é importado por nenhum arquivo** — é código morto.

### 2.2 `eslint-plugin-react-hooks` instalado mas NÃO configurado

O plugin está no `package.json` mas não está no `.eslintrc.json`. As regras `rules-of-hooks` e `exhaustive-deps` não são verificadas, permitindo bugs silenciosos de dependências de hooks.

### 2.3 TypeScript `strict: true` desabilitado

`tsconfig.json` não habilita `strict`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, ou `noUncheckedIndexedAccess`. Combinado com `no-explicit-any: off` no ESLint, o projeto tem proteção de tipo quase zero.

### 2.4 Console statements espalhados

- 143 ocorrências de `console.warn/error` em arquivos fonte
- 11 hooks usam `console.error` ao invés do `logger` centralizado (`utils/Logger.ts`)
- `no-console` do ESLint permite `warn` e `error`, que são justamente os mais usados

### 2.5 Parsing de JSON de LLM sem try/catch

4 funções em `lib/gemini.ts` fazem `JSON.parse()` de resposta de LLM sem tratamento de erro:
- `analyzePhoto` (linha 138)
- `generateSocialContent` (linha 185)
- `generateContentCalendar` (linha 274)
- `analyzeCampaignOpportunities` (linha 366)

Se a LLM retornar JSON malformado, a aplicação crasha sem feedback ao usuário.

### 2.6 Possível violação multi-tenant em hooks

- `useSmartRebooking.ts:44` — filtra por `user_id` sem `companyId`
- `useCampaignHistory.ts:54` — filtra por `user_id` sem `companyId`
- `lib/onboarding.ts:73-88` — queries sem `company_id`

### 2.7 Componentes primitivos chamam `useAuth()` em cada instância

`BrutalButton` e `BrutalCard` chamam `useAuth()` para determinar tema. São componentes de UI usados dezenas de vezes por página, criando subscriptions desnecessários ao AuthContext. O tema deveria vir de CSS variables ou ThemeContext.

### 2.8 Cobertura de testes < 10%

- ~14 arquivos de teste para ~150+ arquivos fonte
- Nenhuma página de negócio tem teste (Agenda, Finance, ClientCRM, etc.)
- Apenas 2 de 16 hooks têm testes
- `vitest.config.ts` não define thresholds de cobertura mínima

### 2.9 Migration destrutiva

`20260218_reset_and_setup.sql` faz `DROP TABLE IF EXISTS` em 5 tabelas de produção. Se rodada novamente, destrói dados. Deveria ser marcada como já-aplicada ou removida do diretório.

---

## 3. Problemas de MÉDIA prioridade

### 3.1 Inconsistência de formatação de datas/moeda

Hooks formatam datas hardcoded para `pt-BR` ignorando as funções de `utils/formatters.ts` que suportam `Region`. O `useFinancialDoctor.ts:84` hardcodes `R$` em vez de usar `formatCurrency`.

### 3.2 `AlertsContext` com lógica de negócio pesada

Faz 6-7 chamadas Supabase, tem real-time subscription, e toca áudio. Deveria ser um hook dedicado, não um context.

### 3.3 `utils/tokens.ts` — Arquivo inteiro sem uso (código morto)

Nenhum arquivo importa de `utils/tokens.ts`.

### 3.4 Padrão `isBeauty` repetido ~997 vezes

O ternário `isBeauty ? 'beauty-neon' : 'accent-gold'` é copiado em praticamente todo componente. Deveria ser abstraído em um hook `useTheme()` ou objeto `ThemeConfig`.

### 3.5 Inconsistência de RLS entre migrations

Migrations mais recentes usam `get_auth_company_id()`, mais antigas usam `auth.uid()::text = user_id`, e a migration `20260420` introduz subqueries no `profiles`. Três padrões diferentes criam risco de vazamento entre tenants.

### 3.6 `lib/gemini.ts:6` — Instancia com string vazia como fallback

Se `VITE_GEMINI_API_KEY` não estiver definida, `GoogleGenerativeAI('')` falha com erro obscuro em vez de falhar cedo com mensagem clara.

### 3.7 API key exposta em URL

`lib/gemini.ts:249` faz `fetch` direto para Gemini REST API com `?key=${apiKey}` na URL, enquanto as outras funções usam o SDK que envia a key no header Authorization.

### 3.8 Duplo Suspense/ErrorBoundary

`index.tsx` envolve `<App />` em `<ErrorBoundary>`, e `AppRoutes` em `App.tsx` faz o mesmo. erro são capturados duas vezes. O outer ErrorBoundary é redundante.

### 3.9 Inferface `DashboardStats` usa `snake_case`

`types.ts:181-188` define `DashboardStats` em snake_case enquanto todos os outros tipos usam camelCase.

---

## 4. Problemas de BAIXA prioridade

### 4.1 Números mágicos espalhados

- Trial: 7 dias (AuthContext:273)
- Comissão default: 0 (AuthContext:295)
- Dia de liquidação: 5 (CommissionsManagement:89)
- Meta default: 15000 (useDashboardData:93)
- Preços de serviços hardcoded em `constants.ts:33-50`

### 4.2 Modelo de IA inconsistente

`analyzePhoto` usa `gemini-1.5-flash` enquanto outras funções usam `gemini-2.0-flash-lite`. Deveria haver uma constante centralizada.

### 4.3 Logo com espaço no nome do arquivo

`"/logo icon.png"` (com espaço) referenciado em `Sidebar.tsx:89,107` e `Header.tsx:84,88` — pode causar problemas em builds e deploys.

### 4.4 `useAppTour.ts` injeta CSS com 31 regras `!important`

As regras do driver.js são injetadas via JS em vez de um arquivo CSS ou da API de customização do driver.js.

---

## 5. Plano de Ação Sugerido (por prioridade)

### Fase 1 — Correções de segurança (1-2 semanas)

| # | Ação | Impacto |
|---|---|---|
| 1 | Remover `GEMINI_API_KEY` do `define` em `vite.config.ts`; usar chamadas proxy pelo backend | Evita exposição da chave no bundle |
| 2 | Remover fallbacks hardcoded de `lib/supabase.ts`; falhar explicitamente se env vars faltam | Evita conexão silenciosa a produção |
| 3 | Corrigir RLS policies com `USING (true)` — adicionar filtro por `company_id` | Evita vazamento LGPD entre tenants |
| 4 | Adicionar verificação de ownership em `complete_appointment_v2` | Evita manipulação de dados de outra empresa |
| 5 | Corrigir queries em `useSmartRebooking` e `useCampaignHistory` para filtrar por `company_id` | Respeita isolamento multi-tenant |

### Fase 2 — Fundações de tipo (2-3 semanas)

| # | Ação | Impacto |
|---|---|---|
| 6 | Habilitar `strict: true` no `tsconfig.json` | Elimina classes inteiras de bugs |
| 7 | Habilitar `@typescript-eslint/no-explicit-any: "error"` no ESLint | Força tipagem adequada |
| 8 | Configurar `eslint-plugin-react-hooks` no `.eslintrc.json` | Detecta bugs de dependências de hooks |
| 9 | Centralizar interfaces duplicadas em `types.ts` e importar de lá | Elimina inconsistência |
| 10 | Substituir `catch (error: any)` por `catch (error: unknown)` com type narrowing | Type safety na tratamento de erros |

### Fase 3 — Decomposição arquitetural (3-4 semanas)

| # | Ação | Impacto |
|---|---|---|
| 11 | Decompor `Agenda.tsx` em 5-8 sub-componentes | Manutenibilidade, testabilidade |
| 12 | Decompor `PublicBooking.tsx` em 6-8 sub-componentes | Manutenibilidade, testabilidade |
| 13 | Decompor `Finance.tsx` em 4-6 sub-componentes | Manutenibilidade, testabilidade |
| 14 | Decompor `AuthContext` em 3 providers | Separação de responsabilidades |
| 15 | Extrair lógica Supabase de componentes em hooks dedicados | Desacoplamento, testabilidade |
| 16 | Criar função utilitária de mapeamento de appointments | Elimina duplicação |
| 17 | Mover chamadas OpenRouter para usar `lib/openrouter.ts` | Elimina código morto e duplicação |

### Fase 4 — Qualidade e consistência (2-3 semanas)

| # | Ação | Impacto |
|---|---|---|
| 18 | Substituir `console.error/warn` por `logger` consistente | Observabilidade |
| 19 | Adicionar `try/catch` em todos os `JSON.parse` de respostas de LLM | Resiliência |
| 20 | Refatorar `BrutalButton/BrutalCard` para receber tema via props ou CSS variables | Performance |
| 21 | Usar `formatters.ts` consistentemente (datas, moeda) em vez de inline | Suporte a Region |
| 22 | Corrigir feriados brasileiros móveis | Correção de lógica |
| 23 | Remover `utils/tokens.ts` (código morto) | Limpeza |
| 24 | Remover duplicated Suspense/ErrorBoundary | Simplificação |

### Fase 5 — Testes (contínuo)

| # | Ação | Impacto |
|---|---|---|
| 25 | Definir thresholds de cobertura no `vitest.config.ts` (mínimo 60%) | Qualidade |
| 26 | Priorizar testes para `Agenda.tsx`, `Finance.tsx`, `ClientCRM.tsx` | Cobertura de lógica de negócio |
| 27 | Testar hooks com dados Supabase mockados | Isolamento |
| 28 | Adicionar testes de integração para RLS policies | Segurança |

---

## Métricas Quantitativas

| Métrica | Valor |
|---|---|
| Arquivos fonte (estimado) | ~150 |
| Arquivos de teste | 14 |
| Cobertura de teste estimada | < 10% |
| Usos de `any` | 157 |
| Interfaces duplicadas | 4 tipos × 3-5 arquivos cada |
| Arquivos importando supabase direto | 58 |
| `console.error/warn` em fonte | 143 |
| Inline styles | 48 |
| Páginas > 300 linhas | 6 |
| Hooks com memory leak potencial | 5 |
| Migrations com RLS problemático | 9 |
| Migrações totais | 94 |