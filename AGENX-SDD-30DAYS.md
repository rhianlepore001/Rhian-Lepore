# AGENX — SDD 30 DAYS (Specification-Driven Development)

**Data:** Abril 11, 2026
**Objetivo:** Lançar MVP funcional com trial de 30 dias
**Status:** 🔴 IN PROGRESS

---

## OVERVIEW

| Item | Status | Owner |
|------|--------|-------|
| **MVP Funcionalidade** | 70% pronto | Você |
| **Segurança** | 🚨 Crítico (chave exposta) | ✅ FEITO |
| **Documentação** | Desatualizada | Em andamento |
| **Limpeza Repo** | 4.5MB lixo | Pendente |
| **Testes E2E** | Não feito | Semana 2 |

---

## FASES EXECUTIVAS

### FASE 0: Segurança (HOJE - FEITO ✅)
- [x] Revogar chave OpenRouter antiga
- [x] Gerar chave nova
- [x] Mover pra `.env.local` (variáveis de ambiente)
- [x] Atualizar 3 arquivos (openrouter.ts, useAIAssistant.ts, useContentCalendar.ts)
- [x] Verificar `.gitignore` (`.env.local` já protegido)

**Commit:** `chore: move openrouter key to env variables`

---

## FASE 1: IDENTIDADE + DOCUMENTAÇÃO (Days 1-3)

### 1.1 README.md — REESCREVER
**Status:** Pendente
**O que mudar:**
- Remove todo conteúdo de "Gemini API", "AI Studio", "ClickUp"
- Adiciona: O que é AGENX, pra quem, como começar

**Spec:**
```markdown
# AGENX — Gestão de Barbearias e Salões

Uma plataforma SaaS simples para barbeiros e salões gerenciarem:
- 📅 Agenda
- 💰 Financeiro
- 👥 Colaboradores
- 📊 Relatórios

## Como começar

1. Clone o repo
2. `npm install`
3. Crie `.env.local` (copie de `.env.example`)
4. `npm run dev`
5. Open http://localhost:3000

## Tech Stack
- React 19 + TypeScript
- Supabase (auth + banco)
- Tailwind CSS
- Vite

## Desenvolvimento
- `npm run lint` — verifica código
- `npm test` — roda testes
- `npm run build` — build produção
```

### 1.2 CLAUDE.md — REESCREVER
**Status:** Pendente
**O que mudar:**
- Remove > 500 linhas de contexto AIOX
- Deixa APENAS o essencial pro projeto
- Máximo 150 linhas

**Spec:**
```markdown
# CLAUDE.md — Instruções pra Claude Code

## Projeto
SaaS pra gestão de barbearias (React 19 + Supabase)

## Build
- `npm install`
- `npm run dev` → localhost:3000
- `npm run build` → produção

## Arquitetura
- React Context (AuthContext, AlertsContext, UIContext)
- Supabase RLS (Row-Level Security pra multi-tenant)
- Lazy-loaded pages via React.lazy()
- HashRouter (#/dashboard pattern)

## Estrutura
- `src/pages/` → páginas
- `src/components/` → componentes
- `src/contexts/` → state global
- `src/lib/` → integrations
- `src/utils/` → helpers
- `supabase/migrations/` → schema

## Padrões
- Supabase client: `import { supabase } from '@/lib/supabase'`
- Context hooks: `const { user } = useAuth()`
- RLS: Sempre filtrar por `company_id` do session
- TypeScript: Strict mode, interfaces tudo

## Cuidado
- Não mexer em RLS policies sem entender
- Não hardcode company_id — vem do session
- Supabase Auth via Clerk (em transição)
- Features de IA (ContentCalendar, AIAssistant) são pós-MVP

## Veja também
- `specs/active/` → features em desenvolvimento
- `specs/done/` → features completas
```

### 1.3 package.json — ATUALIZAR
**Status:** Pendente
**O que mudar:**
- `"name": "barber-os"` → `"name": "agenx"`
- Adiciona descição real

**Spec:**
```json
{
  "name": "agenx",
  "version": "0.1.0",
  "description": "SaaS para gestão de barbearias e salões de beleza",
  "type": "module",
  ...
}
```

### 1.4 .env.example — ATUALIZAR
**Status:** ✅ FEITO
Removido AIOX, DeepSeek, ClickUp, N8N, Sentry, Railway — deixado apenas o essencial.

**Commit:** `docs: rewrite README, CLAUDE.md, package.json`

---

## FASE 2: LIMPEZA DO REPOSITÓRIO (Days 1-5)

**Impacto:** Remove 4.5MB, reduz de 2074 pra ~500 arquivos

### 2.1 DELETAR RAIZ (11 arquivos)
```
ANALISE_AGENX_COMPLETA.md
CLAUDE_HANDOFF.md
EPIC-003-EXECUTION-STATUS.md
EPIC-004-READY-FOR-PR.md
Fotos Freaha-Concorrente-20260308T160641Z-1-001.zip (⚠️ 3MB)
GUIA_SEGURANCA.md
PLAN-rag-2-0.md
PRD.md
Handoff Plan Claude
agenx-backlog.docx
aios-settings.json
backlog_content.txt
fix_plan.js
mcp_config.json
metadata.json
write_file.cjs
write_phone_input.ps1
```

### 2.2 DELETAR PASTAS INTEIRAS (8 pastas)
```
.agent/              (2.3MB CSVs)
aiox-guide/          (guias curso)
squads/              (462KB specs multi-agente)
testsprite_tests/    (505KB testes gerados)
playwright-report/   (527KB relatórios velhos)
n8n-skills/          (pasta vazia)
e2e/                 (testes que não rodam)
test-results/        (resultados velhos)
```

### 2.3 DELETAR EM docs/ (6 arquivos)
```
EPIC-003-*           (3 arquivos)
SQUADS_ESTRATEGICOS.md
aios-workflow.md
onboarding-wizard-flow.md
rag/                 (pasta inteira)
```

### 2.4 LIMPAR .claude/ (6 pastas)
```
.claude/commands/AIOS/     (12 agentes AIOS)
.claude/hooks/synapse-engine.cjs
.claude/hooks/precompact-session-digest.cjs
.claude/rules/             (10 regras conflitantes)
```

### 2.5 ATUALIZAR .gitignore
Adicionar:
```
# Lixo gerado
*.backup
*.tmp
```

**Commit:** `chore: clean repo - remove 4.5MB unused files`

---

## FASE 3: SPECS POR FEATURE (Days 2-5)

### 3.1 SPEC: Módulo de Colaboradores

**Feature:** Registro + acesso restrito + comissões

**O que o cliente (barbeiro) vê:**
1. Tela: "Minha equipe"
2. Botão: "Adicionar colaborador"
3. Modal: Cole um link de convite
4. Colaborador recebe link, clica, registra-se
5. Vê dashboard próprio (seu dia, seu financeiro)

**O que muda no sistema:**
- Convite gera: `/#/register?company={ownerUserId}`
- Novo usuário se registra, detecta `company_id` na URL
- Profile criado com `role: 'staff'` + `company_id` = owner
- Staff vê: MeuDia, comissões, relatório próprio
- Owner vê: todos os staff + comissões por pessoa

**Banco:**
- Tabela `team_members` (já existe)
- RLS: Staff só vê dados da própria company
- Comissões: `commission_rate` + `commission_payment_frequency`

**Arquivos:**
- `pages/settings/Team.tsx` → existente, refinar UI
- `components/TeamManagement.tsx` → criar se não existir
- RLS: verificar policy em `team_members`

**Edge cases:**
- E se staff fizer login antes de aceitar convite? → Redireciona pro onboarding
- E se owner mudar taxa de comissão? → Se tem pagamento pendente, qual vale?
- E se colaborador sair? → Marcar como `active: false`, guardar histórico

**Teste E2E (Semana 2):**
```
1. Owner cria conta
2. Owner acessa "Minha equipe"
3. Owner clica "Adicionar colaborador"
4. Copia link
5. Em outra aba (privada), clica link
6. Registra novo usuário (João)
7. Faz login
8. Vê "Meu Dia" vazio (normal)
9. Back pra aba owner
10. Vê "João" na lista
11. Configura taxa 30%
12. Owner cria agendamento com João
13. Marca como pago
14. João vê comissão pendente
```

**Spec Tech:**
- `src/pages/settings/Team.tsx` — lista + formulário
- `src/contexts/AuthContext.tsx` — já detecta `company_id`
- RLS: `team_members` precisa de policy → staff filtra por company
- Edge Function: (opcional) enviar email quando staff aceita

---

### 3.2 SPEC: Módulo Financeiro

**Feature:** Entrada/saída + comissões + relatórios

**O que o cliente vê:**
- Tela "Financeiro"
- Gráfico: receita mês (verde), despesas (vermelho)
- Cards: total recebido, ticket médio, próxima comissão
- Lista: últimas transações

**O que muda:**
- RPC `get_finance_stats` puxa dados do mês/período
- Transações filtradas por company
- Staff vê APENAS suas transações
- Owner vê todas

**Banco:**
- Tabela `transactions` (já existe?)
- Campos: `type` (income/expense), `amount`, `professional_id`, `payment_method`, `date`, `company_id`
- RLS: Filtrar por company_id + (staff: own professional_id)

**Problemas identificados:**
- ⚠️ Filtro por `professionalName` é frágil → deve ser `professional_id`
- ⚠️ Método de pagamento não é preenchido automaticamente

**Teste E2E (Semana 2):**
```
1. Owner abre Financeiro
2. Vê: "Receita mês: R$0" (vazio)
3. Owner cria appointment com serviço "Corte" (R$50)
4. Marca como pago
5. Financeiro atualiza → "Receita: R$50"
```

**Spec Tech:**
- `src/pages/Finance.tsx` — dashboard
- RPC: `get_finance_stats(company_id, startDate, endDate)`
- Fix: usar `professional_id` não nome

---

### 3.3 SPEC: Comissões

**Feature:** Calcular, pagar, histório

**O que o cliente vê:**
- Tela "Comissões"
- Lista: João (30%) — Pendente: R$150
- Botão: "Pagar"
- Modal: confirma pagamento
- Histórico: últimos 12 meses

**O que muda:**
- Cálculo: sum(transações do prof no período) × taxa
- Pagamento: marca transação como `paid`
- Histórico: relatório de pagamentos

**Banco:**
- Tabela `commission_payments` (já existe?)
- Campos: `professional_id`, `amount`, `period`, `paid_date`, `company_id`

**Teste E2E:**
```
1. Owner configura João em 30%
2. Owner cria 5 agendamentos com João (R$50 cada = R$250)
3. Marca todos como pagos
4. Comissão de João = R$250 × 30% = R$75
5. Owner clica "Pagar João"
6. Transação salva em histórico
```

---

## FASE 4: TESTES E2E (Days 8-14)

### 4.1 Fluxo Completo Principal

```
Objetivo: Um barbeiro novo consegue usar do início ao fim sem você explicar.

Passos:
1. ✅ Acessa http://agenx.com.br
2. ✅ Clica "Comece agora"
3. ✅ Preenche: email, senha
4. ✅ Registra
5. ✅ Completa onboarding wizard (6 steps)
6. ✅ Dashboard carrega
7. ✅ Cria um serviço (Corte R$50)
8. ✅ Cria um agendamento amanhã (cliente: João Silva)
9. ✅ Marca como pago (PIX)
10. ✅ Vê receita no Financeiro
11. ✅ Copia link de convite, adiciona colaborador (tio)
12. ✅ Tio acessa link, registra-se
13. ✅ Tio faz login, vê MeuDia (seu agendamento)
14. ✅ Owner vê comissão pendente do tio
15. ✅ Owner clica "Pagar tio"
16. ✅ Recebe confirmação
```

**Resultado esperado:** MVP funciona. Nada quebra.

### 4.2 Checklist Mobile
- [ ] Smartphone (Chrome Android)
- [ ] iPhone (Safari)
- [ ] Botões clicáveis (tamanho mínimo 44px)
- [ ] Formulários preenchem sem zoom
- [ ] Gráficos ficam legíveis

---

## FASE 5: POLISH (Days 15-21)

### 5.1 UX/UI Fixes
- [ ] Estados vazios: o que aparece quando não há dados?
- [ ] Mensagens de erro amigáveis (sem stack traces)
- [ ] Loading states (spinners em lugares certos)
- [ ] Confirmações antes de ações perigosas

### 5.2 Textos em Português
- [ ] Verificar todo copy
- [ ] Sem Englês (exceto nomes técnicos)
- [ ] Termos consistentes (não misturar "cliente" com "customer")

### 5.3 Domínio Real
- [ ] Comprar domínio (agenx.com.br ou agendei.com.br)
- [ ] Configurar DNS no Vercel
- [ ] SSL automático

### 5.4 Favicon + Meta Tags
- [ ] Favicon customizado
- [ ] og:title, og:description, og:image
- [ ] Twitter card

---

## FASE 6: BETA + LANÇAMENTO (Days 22-30)

### 6.1 Beta (3-5 usuários reais)
**Quem:** Barbeiros do tio (amigos)
**Como:** Link privado, trial 30 dias grátis
**O que coletar:**
- Quanto tempo levou pra usar?
- Alguma coisa confundiu?
- Algo quebrou?
- Top 3 features que amaram?
- Top 3 que faltaram?

**Template feedback:**
```
Pesquisa rápida (5 min):
1. Em uma palavra, como foi usar AGENX? (ex: fácil, confuso, rápido)
2. O que funcionou bem? (exemplo)
3. O que deu dificuldade? (exemplo)
4. O que você compraria por mais?
```

### 6.2 Preparação Stripe/PIX
- [ ] Conta Stripe criada
- [ ] Webhook configurado
- [ ] Teste de cobrança (R$0.01)
- [ ] Checkout funcionando

### 6.3 Comunicação (Tio cuida)
- [ ] Instagram @agenx (ou nome final)
- [ ] Post de lançamento
- [ ] Story sequence (3-5 stories no dia do lançamento)
- [ ] Caption com CTA (link do trial)

### 6.4 Rastreamento
Planilha de acompanhamento:

| Data | Usuário | Status | Trial Termina | Conversão? | Feedback |
|------|---------|--------|---------------|-----------|----------|
| 15/4 | João | Ativo | 15/5 | - | "Amei" |
| 16/4 | Maria | Ativo | 16/5 | - | Sem feedback |

---

## CHECKLIST FINAL (Pré-Lançamento)

- [ ] README atualizado
- [ ] CLAUDE.md reescrito
- [ ] Repo limpo (4.5MB removido)
- [ ] Chaves seguras (env vars)
- [ ] Fluxo E2E testado (ao menos 1× completo)
- [ ] Mobile testado (ao menos iPhone)
- [ ] Domínio configurado
- [ ] Stripe/PIX funcionando
- [ ] Instagram criado
- [ ] Beta com 3 usuários
- [ ] Feedback coletado
- [ ] Top 3 problemas corrigidos

---

## TIMELINE RESUMIDA

| Fase | Dias | Owner | Status |
|------|------|-------|--------|
| Segurança | 1 | Você | ✅ FEITO |
| Identidade | 1-3 | Você | 🟡 IN PROGRESS |
| Limpeza | 1-5 | Você | 🔴 PENDING |
| Specs | 2-5 | Você | 🟡 IN PROGRESS |
| Testes E2E | 8-14 | Você | 🔴 PENDING |
| Polish | 15-21 | Você | 🔴 PENDING |
| Beta | 22-25 | Você + Tio | 🔴 PENDING |
| Lançamento | 26-30 | Você + Tio | 🔴 PENDING |

---

## O QUE NÃO FAZER NESSES 30 DIAS

❌ Implementar WhatsApp integrado
❌ Criar PIX no agendamento
❌ Vitrine de cursos
❌ App mobile
❌ Refatorar arquitetura
❌ Multi-agentes IA
❌ Otimizar performance
❌ Sistema de notificações push

---

## PRÓXIMOS PASSOS

1. **Você:** Reescrever README + CLAUDE.md
2. **Você:** Deletar lixo do repo (use a lista acima)
3. **Você:** Fazer commit: `chore: clean repo`
4. **Você:** Testar fluxo E2E completo
5. **Você:** Reportar problemas encontrados

Quer começar com qual?
