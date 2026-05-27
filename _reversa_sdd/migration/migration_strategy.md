---
schemaVersion: 1
generatedAt: 2026-05-17T17:56:00Z
updatedAt: 2026-05-17T18:07:00Z
reversa:
  version: "1.0.0"
kind: migration_strategy
producedBy: strategist
updatedBy: orchestrator
---

# Migration Strategy

> Estrategia aprovada: Strangler Fig por dominio.
> Atualizado com ajustes do owner e decisao CTO de pipeline de skills auxiliares.

## Contexto sintetizado

- **Tamanho do legado**: 15 modulos, 12 paginas, 50+ RPCs, ~100 migrations, 4 integracoes externas
- **Apetite derivado**: balanced
- **Gap de paradigma**: medio-baixo (procedural hibrido -> funcional leve)
- **Restricoes**: time enxuto, stack mantida, sem reset destrutivo, rollback rapido
- **Regras criticas**: 56 para migrar, 4 correcoes obrigatorias
- **Producao**: preparacao para v1 comercial

---

## Estrategia aprovada: Strangler Fig por dominio

### Justificativa

1. Apetite balanced favorece Strangler Fig
2. Brief pede fases curtas com entregas verificaveis por fluxo
3. Gap medio-baixo nao justifica reescrita total
4. Time enxuto precisa de progresso visivel e incremental
5. Mesma stack elimina necessidade de proxy/gateway
6. Rollback granular por modulo

---

## Faseamento por dominio (ordem aprovada)

| Fase | Dominio | Justificativa | Dependencias |
|---|---|---|---|
| 0 | **Design System + tipos base** | Fundacao enxuta para todas as fases | Nenhuma |
| 1 | **Auth + Onboarding** | Gate de entrada; corrige G1 (dual onboarding) | Fase 0 |
| 2 | **Agenda + Checkout** | Core do produto; corrige G3 (atomicidade checkout) | Fase 0, 1 |
| 3 | **Booking Publico** | Fluxo do cliente final | Fase 2 |
| 4 | **Fila Digital** | Diferencial; corrige G2, G14, G15 | Fase 2 |
| 5 | **Financeiro + Comissoes** | Receita; corrige G4 (filtro por ID) | Fase 2, 4 |
| 6 | **CRM/Clientes** | Retencao | Fase 2, 5 |
| 7 | **Dashboard** | Consolidacao de KPIs | Fase 2, 5, 6 |
| 8 | **Configuracoes + Assinatura** | Ajustes finais | Fase 1 |
| 9 | **Produtos** | Diferencial comercial; escopo simples | Fase 5 |
| 10 | **Polish + QA + Lancamento** | Testes E2E, responsividade, revisao visual | Todas |

### Ajustes aprovados pelo owner

1. **Fase 0 enxuta e pratica** -- nao criar design system perfeito, apenas o necessario para padronizar v1:
   - Primitive tokens, semantic tokens, component tokens, CSS variables
   - Componentes: Button, Input, Select, Card, Modal, Table, Tabs, Badge, EmptyState, Skeleton/Loading, ErrorState
   - Estados: hover/focus/active/disabled
   - Padroes mobile-first
   - Tipos canonicos / Supabase types gerados
   - Padroes de service/hook documentados

2. **Produtos pode entrar em paralelo a partir da Fase 5** com escopo simples:
   - Cadastro, preco venda/custo, estoque/estoque minimo, status
   - Venda avulsa ou vinculada a atendimento
   - Impacto financeiro
   - Sem complexidade de ERP

3. **Parallel run parcial** confirmado para fila, checkout e financeiro

4. **Criterio de avanco entre fases**: cada fase so avanca quando:
   - Fluxo principal funciona
   - `typecheck`, `lint`, `build`, `test` passam
   - Sem regressao multi-tenant
   - UI segue design system
   - Comportamento critico documentado
   - Rollback/fallback possivel quando aplicavel

---

## Decisao CTO: Pipeline de skills/agentes auxiliares

A migracao deve usar skills/agentes auxiliares alem dos agentes do Reversa para aumentar qualidade de arquitetura, UI/UX, design system, seguranca e testes.

### Pipeline recomendado (em ordem)

| Etapa | Skill/Agente | Objetivo | Quando usar |
|---|---|---|---|
| 1 | `reversa-migrate` | Estrategia, escopo e fases | Inicio (feito) |
| 2 | `architecture` + `database-design` | ADRs, modelo de dados, decisoes tecnicas | Antes de cada fase com impacto arquitetural |
| 3 | `impeccable shape/critique` | Direcao visual anti-AI-slop | Antes de implementar UI de cada dominio |
| 4 | `design-system` / `design-md` | Tokens e componentes base | Fase 0 |
| 5 | `ui-ux-pro-max` | Checklist UX, acessibilidade, responsividade | Durante implementacao de UI |
| 6 | `react-components` | Componentes React reutilizaveis | Fase 0 e durante fases |
| 7 | `reversa-inspector` + `testing-patterns` + `playwright-skill` | Testes de paridade e fluxos criticos | Ao concluir cada fase |
| 8 | `vulnerability-scanner` / `security-auditor` | Auditoria RLS, permissions, secrets, RPCs | Apos fases com dados criticos (2, 4, 5) |
| 9 | `impeccable polish/audit` | Passe final de percepcao premium | Fase 10 (antes do release) |

### Detalhamento por area

#### 1. UI/UX e remocao de "cara de IA"

**Skill principal**: `.claude/skills/impeccable`

Objetivo:
- Auditar Dashboard, Agenda, Booking Publico, Financeiro, Configuracoes, Fila e Produtos
- Evitar: glassmorphism gratuito, grids genericos de cards, glow/neon excessivo, textos genericos, gradientes decorativos, UI sem hierarquia
- Aplicar: `shape`, `critique`, `audit`, `polish`, `layout`, `clarify`, `harden`, `onboard`
- UI deve parecer SaaS operacional premium, nao prototipo gerado por IA

**Skill complementar**: `.claude/skills/ui-ux-pro-max`
- Acessibilidade, responsividade, touch targets
- Estados loading/error/empty/success
- Navegacao, formularios, tabelas, charts, microinteracoes

#### 2. Design System

**Skills**: `.claude/skills/design-system`, `.agents/skills/design-md`

Fase 0 deve produzir:
- Primitive/semantic/component tokens + CSS variables
- Componentes base obrigatorios (Button, Input, Select, Card, Modal, Table, Tabs, Badge, EmptyState, Skeleton, ErrorState)
- Padroes mobile-first
- Design system como contrato visual: nao permitir estilos avulsos sem justificativa

#### 3. Arquitetura e ADRs

**Skill**: `.agent/skills/architecture`

Decisoes a documentar:
- TanStack Query, Zod, services/repositories por dominio
- RPC vs logica no frontend
- Estrategia de produtos na v1
- Server state vs UI state
- Limites design system vs componentes de feature

#### 4. Banco, RLS e modelo de dados

**Skills**: `.agent/skills/database-design`, `security-auditor`

Aplicar em:
- RLS e policies multi-tenant
- RPCs SECURITY DEFINER
- Migrations e indices
- Modulo produtos/estoque
- Atomicidade fila/checkout/financeiro
- Futura `appointment_services` se multiplos profissionais virar requisito

#### 5. Seguranca

**Skills**: `.agent/skills/vulnerability-scanner`, `security-auditor`

Validar:
- Vazamento cross-tenant
- Queries sem ownership
- Staff acessando dados indevidos
- Secrets/fallbacks no frontend
- RPCs criticas sem validacao server-side
- Permissoes booking publico, fila, financeiro, CRM, comissoes

#### 6. Testes e QA

**Skills**: `.agent/skills/testing-patterns`, `.agent/skills/webapp-testing`, `playwright-skill`, `reversa-inspector`

Cobertura obrigatoria:
- Onboarding, booking publico, agenda, fila digital
- Checkout/finalizacao, financeiro, comissoes, CRM
- Permissoes staff, produtos

#### 7. Execucao com LLMs

| Tier | Uso | Exemplos |
|---|---|---|
| **Frontier/CTO** | Estrategia, arquitetura, revisao, seguranca, design direction | Claude Opus, Gemini Pro |
| **Subtier/Executor** | Tasks pequenas e bem especificadas com criterios claros | Kimi, DeepSeek |
| **Reversa/Inspector** | Specs, paridade, migracao e documentacao | Agentes do Reversa |

Regra: subtier nao decide arquitetura global sem revisao de frontier.

---

## Padrao de migracao por fase

Cada fase segue o ciclo:

1. **Criar services/hooks/types** no paradigma alvo
2. **Migrar componentes** para consumir novos hooks
3. **Verificar** (`typecheck`, `lint`, `build`, `test`)
4. **Validar** fluxo E2E (manual ou Playwright)
5. **Auditar UI** com impeccable (shape/critique) se tela foi migrada
6. **Auditar seguranca** com vulnerability-scanner se dominio tem dados criticos
7. **Remover** codigo legado do dominio
8. **Atualizar** design system e documentacao

### Parallel run parcial

Para fila (G2), checkout (G3), financeiro (G4): manter RPC legada como fallback por 1-2 sprints apos nova RPC atomica, monitorando inconsistencias.
