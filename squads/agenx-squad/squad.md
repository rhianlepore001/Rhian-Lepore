# Squad: AgenX Development Team

> **Versão:** 1.0.0 | **Criado:** 2026-03-01 | **Projeto:** AgenX — Plataforma SaaS para Barbearias e Salões

---

## Visão Geral

O **AgenX Squad** é um time profissional de agentes de IA especializados, construído sobre o Synkra AIOS Framework. Cada membro tem uma função exclusiva, fronteiras bem definidas e compartilha contexto via `context/project-context.md`.

**Problema resolvido:** Elimina falhas de contexto e breaking changes causados por desenvolvimento solo ou agentes sem coordenação.

---

## Membros do Squad

| Agente | Persona | Função | Ativação |
|--------|---------|--------|----------|
| `@orchestrator` | Orion | Coordenador mestre — orquestra todos os outros | `/AIOS:orchestrator` |
| `@po` | Nova | Product Owner — define features, valida stories | `/AIOS:po` |
| `@sm` | Rio | Scrum Master — cria stories hiperdetalhadas | `/AIOS:sm` |
| `@architect` | Aria | Arquiteto — decisões técnicas e de sistema | `/AIOS:architect` |
| `@dev` | Max | Frontend Developer — React 19, TypeScript, Tailwind v4 | `/AIOS:dev` |
| `@backend` | Kai | Backend Developer — Supabase Edge Functions, Deno | `/AIOS:backend` |
| `@db` | Sage | Database Architect — PostgreSQL, RLS, migrations | `/AIOS:db` |
| `@security` | Shield | Security Auditor — Clerk, 2FA, RLS audit | `/AIOS:security` |
| `@qa` | Quinn | QA Engineer — Vitest, Playwright, coverage | `/AIOS:qa` |
| `@devops` | Gage | DevOps — GitHub Actions, Vercel, git push | `/AIOS:devops` |

---

## Princípios do Squad (derivados da Constitution)

### 1. Fronteiras de Arquivo (OBRIGATÓRIO)

Cada agente tem ownership exclusivo de seus arquivos. **Nenhum agente edita fora do seu domínio.**

```
@dev        → components/**, pages/**, hooks/**, contexts/**
@backend    → supabase/functions/**, lib/**, utils/**
@db         → supabase/migrations/**, supabase/types.ts
@security   → READ-ONLY (nunca edita feature code)
@qa         → test/**, *.test.ts(x), *.spec.ts(x)
@devops     → .github/**, vercel.json, scripts/** (infra)
@po/@sm     → docs/stories/*.md, docs/prd/**
@architect  → docs/architecture/**
```

### 2. Contexto Compartilhado (OBRIGATÓRIO)

**Antes de qualquer edição**, cada agente DEVE ler:
```
squads/agenx-squad/context/project-context.md
```

Isso garante que nenhum agente edita "às cegas" — todos sabem o estado atual do projeto, padrões de código, e o que outros agentes já fizeram.

### 3. Story-Driven (OBRIGATÓRIO)

Nenhum código é escrito sem uma story associada. Fluxo:
```
@po cria story → @sm fragmenta em tasks → agentes implementam → @qa valida → @devops push
```

### 4. Context Injection ao Invocar Subagentes (OBRIGATÓRIO)

Ao chamar outro agente, o @orchestrator SEMPRE inclui:
- Request original do usuário
- Decisões tomadas pelos agentes anteriores
- Arquivos já criados/modificados
- Estado atual da story

---

## Fluxo de Trabalho (Workflow Diário)

### Feature Nova

```
1. Você: descreve a feature para @po
   → /AIOS:po + "quero adicionar [feature]"

2. @po: cria story com acceptance criteria
   → Salva em docs/stories/story-X.Y.md

3. @sm: fragmenta story em tasks detalhadas
   → Adiciona contexto técnico, arquivos afetados, ordem de execução

4. @orchestrator: lê story e coordena implementação:
   Fase 1 — Fundação (paralelo):
     @db → migration (se tabela nova)
     @security → valida RLS da migration

   Fase 2 — Core (paralelo após Fase 1):
     @backend → edge function ou lib helper (se precisar)
     @dev → componentes React + hooks

   Fase 3 — Qualidade:
     @qa → testes unitários + E2E

   Fase 4 — Deploy:
     @devops → npm run lint + typecheck + test + build → push + PR

5. Gates automáticos (bloqueiam se falharem):
   npm run lint && npm run typecheck && npm test && npm run build
```

### Bug Fix

```
/AIOS:orchestrator + "debug: [descrição do bug]"

→ @orchestrator invoca:
  1. explorer-agent — mapeia área afetada
  2. @dev ou @backend — corrige o bug
  3. @qa — adiciona teste de regressão
  4. @devops — push após gates passarem
```

### Security Audit

```
/AIOS:security + "auditar [módulo ou funcionalidade]"

→ @security (read-only):
  - Revisa RLS policies
  - Verifica auth flows (Clerk + Supabase)
  - Verifica rate limiting
  - Reporta findings
  → @db corrige RLS se necessário
  → @backend corrige auth flows se necessário
```

---

## Prevenção de Breaking Changes

### Mecanismo Central: context/project-context.md

O arquivo de contexto compartilhado contém:
- **Mapa de módulos**: qual agente é dono de qual área
- **Interfaces públicas**: APIs, hooks, types compartilhados
- **Padrões obrigatórios**: imports absolutos, naming conventions
- **Stack com versões**: para que nenhum agente introduza breaking changes de dependência

### Regra de Delegação

```
Quando agente está prestes a editar arquivo fora do seu domínio:
  PARA → delega para o agente correto → não edita por conta própria
```

### Exemplo Correto

```
❌ ERRADO:
  @dev edita supabase/migrations/nova-tabela.sql
  → Violação: migrations pertencem ao @db

✅ CORRETO:
  @dev identifica que precisa de nova coluna
  → Chama @db com contexto completo
  → @db cria a migration
  → @dev usa a nova coluna no componente
```

---

## Comandos de Ativação

```bash
# No Claude Code, use / para ativar um agente:

/AIOS:orchestrator   # Para features complexas que precisam de múltiplos agentes
/AIOS:po             # Para definir uma nova feature ou story
/AIOS:dev            # Para trabalho de frontend direto (componentes, hooks)
/AIOS:backend        # Para edge functions ou lógica de negócio
/AIOS:db             # Para schema, migrations, RLS
/AIOS:security       # Para auditorias de segurança
/AIOS:qa             # Para escrever ou rodar testes
/AIOS:devops         # Para fazer push, criar PR, configurar CI/CD
```

---

## Referências

- **Constitution:** `.aios-core/constitution.md`
- **Orchestrator base:** `.agent/agents/orchestrator.md`
- **Contexto compartilhado:** `squads/agenx-squad/context/project-context.md`
- **Framework config:** `.aios-core/core-config.yaml`
- **Workflow de orquestração:** `.agent/workflows/orchestrate.md`
