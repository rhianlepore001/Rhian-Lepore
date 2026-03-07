# EPIC-001: Transformação UX + AI Engine

> **Status:** Draft
> **Criado por:** @pm (Morgan)
> **Data:** 2026-03-07
> **Prioridade:** P0 — Crítico para diferenciação de mercado
> **Estimativa:** 5 stories, 4 waves de execução

---

## Visão do Épico

Transformar o Beauty OS de um app genérico de gestão em uma **plataforma inteligente que trabalha para o dono** enquanto ele atende clientes. O diferencial direto contra Trinks e Booksy: marketing que funciona sem esforço, IA que explica em linguagem simples, e onboarding que não deixa ninguém perdido.

**Problema central:** O app foi construído para quem já sabe o que quer — não para quem está começando. Features genéricas não entregam valor real, confundem usuários novos, e não se diferenciam da concorrência.

**Resultado esperado:** Usuário novo configura tudo em 5 minutos, recebe posts prontos para Instagram, tem um assistente IA que responde sobre seu negócio em linguagem simples, e campanhas de reativação rodam no automático.

---

## Contexto do Sistema Existente

**Tech Stack:**
- React 19, TypeScript 5.8, Vite 6
- Supabase (PostgreSQL + RLS)
- Tailwind CSS (temas Brutal/Beauty)
- OpenRouter (IA existente para Instagram Ideas)
- Google Generative AI (Gemini API)

**Componentes impactados:**
| Componente | Arquivo | Problema |
|---|---|---|
| FinancialDoctorPanel | `components/dashboard/FinancialDoctorPanel.tsx` | Sem orientação para novos usuários |
| MeuDiaWidget | `components/dashboard/MeuDiaWidget.tsx` | Oportunidades não funcionam sem dados |
| ChurnRadar | `components/ChurnRadar.tsx` | Aparece sem contexto, confunde |
| Marketing (inteira) | `pages/Marketing.tsx` | Caos visual, genérico, sem valor real |
| InstagramIdeas | `components/marketing/InstagramIdeas.tsx` | Apenas ideias, não entrega conteúdo pronto |
| WhatsAppCampaign | `components/marketing/WhatsAppCampaign.tsx` | Mensagem genérica, sem personalização |
| ContentCalendar | `components/marketing/ContentCalendar.tsx` | Vazio, sem IA |
| Finance (gráficos) | `pages/Finance.tsx` | Fluxo de caixa genérico |

**Integrações existentes:**
- `lib/openrouter.ts` — OpenRouter API (já funcional para Instagram Ideas)
- `utils/aiosCopywriter.ts` — Geração de mensagens de reativação
- `hooks/useMarketingOpportunities.ts` — Hook de oportunidades (dados insuficientes)
- `hooks/useDashboardData.ts` — Dados do dashboard

---

## Orquestração de Squads

### Squad Matrix — Quem faz o quê

| Story | Lead (Executor) | Design/UX | Qualidade (QA Gate) | Revisão Arquitetural |
|---|---|---|---|---|
| US-A: Onboarding Wizard | @dev (Dex) | @ux-design-expert (Uma) | @qa (Quinn) | — |
| US-B: Assistente IA Chat | @dev (Dex) | @ux-design-expert (Uma) | @qa (Quinn) | @architect (Aria) |
| US-C: Calendário Conteúdo IA | @dev (Dex) | @ux-design-expert (Uma) | @qa (Quinn) | — |
| US-D: Marketing Automatizado | @dev (Dex) | @ux-design-expert (Uma) | @qa (Quinn) | — |
| US-E: UX & Visual Refresh | @dev (Dex) | @ux-design-expert (Uma) | @qa (Quinn) | — |

### Fluxo de Orquestração por Story

```
@ux-design-expert → wireframe/especificação visual
       ↓
@architect → decisão técnica (apenas US-B)
       ↓
@sm → quebra em subtasks detalhadas
       ↓
@dev → implementação + testes
       ↓
@qa → quality gate (7 checks)
       ↓
@devops → push/PR
```

### Responsabilidades por Agente

**@ux-design-expert (Uma) — Design Lead do Épico**
- [ ] Wireframe do Onboarding Wizard (4 etapas)
- [ ] Design do chat IA (floating button, conversa inline)
- [ ] Layout do Calendário de Conteúdo (grid mensal + editor de template)
- [ ] Redesign das notificações inteligentes (substituir ChurnRadar)
- [ ] Audit de linguagem: listar todos os jargões técnicos → substituir por linguagem simples
- [ ] Novo visual do gráfico de fluxo de caixa
- [ ] Empty states orientados para cada seção

**@architect (Aria) — Decisões Técnicas**
- [ ] Definir arquitetura do Assistente IA (provider, context window, dados incluídos)
- [ ] Decisão: usar OpenRouter existente vs Gemini vs ambos
- [ ] Definir pattern de notificações inteligentes (substituir ChurnRadar modal)
- [ ] Avaliar geração de templates visuais (Canvas API vs biblioteca externa)

**@dev (Dex) — Implementação**
- [ ] Implementar todas as 5 stories conforme specs do @ux e decisões do @architect
- [ ] Testes unitários por story
- [ ] Integração com APIs de IA existentes

**@qa (Quinn) — Qualidade**
- [ ] QA Gate por story (7 checks padrão)
- [ ] Teste de regressão: funcionalidades existentes não quebram
- [ ] Validação de empty states em todas as telas
- [ ] Teste de linguagem: zero jargões técnicos

**@data-engineer (Dara) — Dados (se necessário)**
- [ ] Schema para estado de onboarding do usuário
- [ ] Schema para histórico de conversas do assistente IA
- [ ] Policies RLS para novas tabelas

**@devops (Gage) — Entrega**
- [ ] Push e PR por wave completada
- [ ] Deploy staging para validação

---

## Waves de Execução

### Wave 1 — Fundação (Paralelo)
> Pré-requisito para todas as outras stories

| Story | Agentes Ativos | Dependência |
|---|---|---|
| **US-A: Onboarding Wizard** | @ux → @dev → @qa | Nenhuma |
| **US-E: UX & Linguagem (audit)** | @ux (audit solo) | Nenhuma |

**Objetivo:** Novos usuários não ficam perdidos + linguagem limpa em todas as telas.

### Wave 2 — AI Core (Sequencial)
> Depende de decisão arquitetural

| Story | Agentes Ativos | Dependência |
|---|---|---|
| **US-B: Assistente IA Chat** | @architect → @ux → @data-engineer → @dev → @qa | Decisão técnica do @architect |

**Objetivo:** Ícone flutuante no app, dono pergunta e recebe resposta com dados reais.

### Wave 3 — Marketing Revolution (Paralelo)
> Pode iniciar assim que Wave 1 terminar

| Story | Agentes Ativos | Dependência |
|---|---|---|
| **US-C: Calendário Conteúdo IA** | @ux → @dev → @qa | Wave 1 (linguagem) |
| **US-D: Marketing Automatizado** | @ux → @dev → @qa | Wave 1 (linguagem) |

**Objetivo:** Calendário com 30 posts/mês + notificações inteligentes substituem ChurnRadar.

### Wave 4 — Polish & Refresh Visual (Final)
> Depende de Wave 1 (audit de linguagem aplicado)

| Story | Agentes Ativos | Dependência |
|---|---|---|
| **US-E: Visual Refresh** | @ux → @dev → @qa | Waves 1-3 (consolidação) |

**Objetivo:** Finance Doctor com empty state, fluxo de caixa moderno, visual consolidado.

---

## Stories Detalhadas

---

### US-A: Onboarding Wizard Interativo

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [component_test, accessibility_check, flow_validation]
design_lead: "@ux-design-expert"
wave: 1
priority: P0
```

**Descrição:**
Wizard de 4 etapas que bloqueia o dashboard completo até o usuário configurar o básico. Inspirado no Fresha.

**Etapas bloqueantes:**
1. **Nome do negócio + tipo** (salão ou barbearia) → define tema visual e linguagem
2. **Cadastrar ≥1 serviço com preço** → ativa Finance Doctor com dados reais
3. **Cadastrar ≥1 profissional** → ativa agenda e comissões
4. **Definir meta mensal de receita** → ativa progresso e alertas

**Critérios de Aceite:**
- [ ] Wizard aparece na primeira entrada do usuário (sem dados)
- [ ] Cada etapa valida antes de avançar
- [ ] Progresso persistido no Supabase (se sair e voltar, continua de onde parou)
- [ ] Ao completar todas as etapas, dashboard carrega com dados reais
- [ ] Animação de transição entre etapas
- [ ] Botão "Pular" disponível apenas na etapa 4 (meta é opcional para começar)
- [ ] Zero jargões técnicos nas instruções

**Tarefas:**
- [ ] **@ux**: Wireframe completo das 4 etapas (mobile-first)
- [ ] **@data-engineer**: Criar tabela `onboarding_state` com RLS
- [ ] **@dev**: Componente `OnboardingWizard.tsx`
- [ ] **@dev**: Hook `useOnboardingState.ts`
- [ ] **@dev**: Integrar com `ProtectedLayout` — verificar onboarding antes de renderizar
- [ ] **@dev**: Formulários com validação (nome, serviço+preço, profissional, meta)
- [ ] **@dev**: Testes unitários do wizard e do hook
- [ ] **@qa**: QA Gate completo

**Arquivos a criar/modificar:**
- `components/OnboardingWizard.tsx` (novo)
- `hooks/useOnboardingState.ts` (novo)
- `supabase/migrations/YYYYMMDD_onboarding_state.sql` (novo)
- `App.tsx` (modificar — check onboarding)
- `components/ProtectedLayout.tsx` (modificar — gate)

---

### US-B: Assistente IA no App (Chat)

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [security_scan, api_validation, component_test]
design_lead: "@ux-design-expert"
architecture_review: "@architect"
wave: 2
priority: P0
```

**Descrição:**
Ícone flutuante fixo no app. O dono pergunta em linguagem natural e recebe respostas simples com dados reais do negócio. Estilo WhatsApp.

**Comportamento:**
- Usuário: "Como foi meu mês?"
- IA: "Este mês você faturou R$4.200, 8% mais que o mês passado. Seus 2 próximos passos: reativar 3 clientes que sumiram (potencial de R$450) e preencher a terça que está vazia."
- Respostas curtas, sem jargões, com números reais
- Dados vindos do Supabase, processados como contexto para a IA

**Critérios de Aceite:**
- [ ] Botão flutuante visível em todas as telas (canto inferior direito)
- [ ] Abre chat inline com histórico da sessão
- [ ] Respostas baseadas em dados reais (receita, clientes, agendamentos)
- [ ] Linguagem simples e direta — máximo 3 frases por resposta
- [ ] Cada resposta inclui 1-2 ações sugeridas com botão clicável
- [ ] Loading state enquanto IA processa
- [ ] Funciona mesmo com poucos dados (empty state inteligente: "Cadastre mais clientes para eu poder te ajudar melhor")
- [ ] Histórico de conversa persistido por sessão (não entre sessões)

**Decisões para @architect:**
- [ ] Provider: OpenRouter (existente) vs Gemini (existente) vs novo
- [ ] Contexto: quais dados incluir no prompt (receita, clientes, agendamentos, meta)
- [ ] Limites: max tokens por resposta, rate limiting
- [ ] Segurança: dados sensíveis nunca expostos no prompt

**Tarefas:**
- [ ] **@architect**: ADR — arquitetura do assistente IA
- [ ] **@ux**: Design do chat (botão flutuante, bolha de conversa, mobile)
- [ ] **@data-engineer**: Schema para histórico de sessão (opcional)
- [ ] **@dev**: Componente `AIAssistantChat.tsx`
- [ ] **@dev**: Hook `useAIAssistant.ts` (coleta dados do Supabase → monta prompt → chama IA)
- [ ] **@dev**: Prompt engineering — template de sistema que garante resposta simples
- [ ] **@dev**: Integração com provider escolhido pelo @architect
- [ ] **@dev**: Empty state inteligente quando dados são insuficientes
- [ ] **@dev**: Testes unitários
- [ ] **@qa**: QA Gate + security review (dados no prompt)

**Arquivos a criar/modificar:**
- `components/AIAssistantChat.tsx` (novo)
- `hooks/useAIAssistant.ts` (novo)
- `lib/ai-assistant-prompts.ts` (novo — templates de prompt)
- `App.tsx` (modificar — adicionar botão flutuante global)

---

### US-C: Calendário de Conteúdo Gerado por IA

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [component_test, visual_regression, api_validation]
design_lead: "@ux-design-expert"
wave: 3
priority: P1
```

**Descrição:**
30 posts prontos para o mês, gerados com base no tipo de negócio, datas comemorativas, e serviços mais vendidos. Cada post vem com legenda + template visual editável (estilo Canva simplificado).

**Comportamento:**
- Ao abrir Marketing > Calendário, o sistema gera 30 posts para o mês
- Cada post: legenda + hashtags + template visual com cor/logo do negócio
- Usuário pode editar texto e personalizar visual
- Botão "Copiar legenda" + "Baixar imagem" por post
- Datas comemorativas automáticas (Dia das Mães, Black Friday, etc.)

**Critérios de Aceite:**
- [ ] Grid mensal com 30 cards de posts (1 por dia)
- [ ] Cada card mostra preview do template visual + primeiras palavras da legenda
- [ ] Ao clicar: modal com legenda completa + editor de template
- [ ] Editor de template: fundo (cor sólida ou gradiente), texto principal, logo opcional
- [ ] Botão "Gerar novos posts" para regenerar com IA
- [ ] Posts adaptados ao tipo de negócio (salão vs barbearia)
- [ ] Datas comemorativas brasileiras incluídas automaticamente
- [ ] "Copiar legenda" copia texto formatado para Instagram
- [ ] "Baixar imagem" exporta template como PNG

**Tarefas:**
- [ ] **@ux**: Design do grid mensal + modal de edição + editor de template
- [ ] **@dev**: Refatorar `ContentCalendar.tsx` (hoje vazio)
- [ ] **@dev**: Componente `PostTemplateEditor.tsx` (editor visual)
- [ ] **@dev**: Hook `useContentCalendar.ts` (geração via IA)
- [ ] **@dev**: Lógica de datas comemorativas brasileiras
- [ ] **@dev**: Exportação de template como PNG (Canvas API ou html2canvas)
- [ ] **@dev**: Integração com OpenRouter para geração de legendas
- [ ] **@dev**: Testes unitários
- [ ] **@qa**: QA Gate + visual regression

**Arquivos a criar/modificar:**
- `components/marketing/ContentCalendar.tsx` (refatorar completo)
- `components/marketing/PostTemplateEditor.tsx` (novo)
- `hooks/useContentCalendar.ts` (novo)
- `utils/brazilianHolidays.ts` (novo)
- `pages/Marketing.tsx` (modificar — integrar novo calendário)

---

### US-D: Marketing Automatizado + Notificações Inteligentes

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [component_test, notification_test, api_validation]
design_lead: "@ux-design-expert"
wave: 3
priority: P1
```

**Descrição:**
Substituir o ChurnRadar (confuso e invasivo) por notificações inteligentes que não ocupam espaço visual. Campanhas de reativação disparadas com mensagens personalizadas baseadas no histórico real do cliente.

**Comportamento ANTES (ChurnRadar):**
- Widget fixo na tela mostrando lista de clientes em risco
- Confuso para novos usuários que não entendem o conceito de "churn"
- Mensagem de reativação genérica

**Comportamento DEPOIS (Notificações Inteligentes):**
- Banner discreto no topo: "Carlos não volta há 40 dias. Mandar mensagem?"
- Um toque → mensagem personalizada gerada: "Oi Carlos, faz tempo que não te vemos! Seu último corte degradê ficou incrível. Que tal agendar o próximo? Temos horário quinta às 15h."
- Sem ocupar espaço permanente na UI
- Só aparece quando há ação a tomar
- Fila de notificações gerenciada (máx 2 visíveis por vez)

**Critérios de Aceite:**
- [ ] ChurnRadar removido como widget fixo de todas as páginas
- [ ] Sistema de notificações inteligentes no topo da tela
- [ ] Máximo 2 notificações visíveis por vez, fila gerenciada
- [ ] Cada notificação inclui: nome do cliente + contexto + botão de ação
- [ ] Botão "Mandar mensagem" abre WhatsApp com texto personalizado
- [ ] Texto personalizado usa: nome, último serviço, dias ausente
- [ ] Botão "Dispensar" remove notificação (com tracking)
- [ ] Notificações baseadas em dados reais do Supabase
- [ ] Funciona sem dados (não mostra notificação se não tem clientes)
- [ ] Linguagem simples: "não volta há X dias" em vez de "risco de churn"

**Tarefas:**
- [ ] **@ux**: Design do sistema de notificações (banner, animação, fila)
- [ ] **@dev**: Componente `SmartNotifications.tsx` (substituir ChurnRadar)
- [ ] **@dev**: Hook `useSmartNotifications.ts`
- [ ] **@dev**: Refatorar `aiosCopywriter.ts` — mensagens com histórico real
- [ ] **@dev**: Remover ChurnRadar de Dashboard, Marketing, e Finance
- [ ] **@dev**: Integrar `SmartNotifications` no layout global
- [ ] **@dev**: Testes unitários
- [ ] **@qa**: QA Gate + teste de regressão (remoção do ChurnRadar)

**Arquivos a criar/modificar:**
- `components/SmartNotifications.tsx` (novo)
- `hooks/useSmartNotifications.ts` (novo)
- `utils/aiosCopywriter.ts` (modificar — mensagens personalizadas)
- `components/ChurnRadar.tsx` (remover ou deprecar)
- `pages/Dashboard.tsx` (modificar — remover ChurnRadar, adicionar notificações)
- `pages/Marketing.tsx` (modificar — remover ChurnRadar)
- `pages/Finance.tsx` (modificar — remover referência)
- `App.tsx` ou layout global (modificar — notificações globais)

---

### US-E: UX Refresh — Linguagem, Empty States & Visual

```yaml
executor: "@dev"
quality_gate: "@qa"
quality_gate_tools: [accessibility_check, visual_regression, language_audit]
design_lead: "@ux-design-expert"
wave: "1 (audit) + 4 (implementação)"
priority: P1
```

**Descrição:**
Duas fases: (1) Audit de linguagem e empty states em Wave 1, (2) Implementação visual em Wave 4.

#### Fase 1 — Audit (Wave 1, paralelo com Onboarding)

**Tarefas @ux:**
- [ ] Listar TODOS os jargões técnicos em todas as telas do app
- [ ] Propor substituição em linguagem simples para cada um
- [ ] Mapear TODAS as telas com empty state ruim ou inexistente
- [ ] Propor mensagens de empty state orientadas (com CTA)

**Exemplos de substituição:**
| Jargão atual | Linguagem simples |
|---|---|
| "Churn Rate" | "Clientes que não voltaram" |
| "Ticket Médio" | "Valor médio por atendimento" |
| "Receita Recorrente" | "Quanto você ganha por mês" |
| "Taxa de Ocupação" | "Quanto da sua agenda está preenchida" |
| "LTV" | "Valor total que o cliente já gastou" |
| "Reativação" | "Trazer o cliente de volta" |
| "Fluxo de Caixa" | "Entradas e saídas de dinheiro" |
| "ROI" | "Retorno do investimento" |

#### Fase 2 — Implementação Visual (Wave 4)

**Tarefas:**
- [ ] **@dev**: Aplicar substituições de linguagem em todas as telas auditadas
- [ ] **@dev**: Implementar empty states orientados em: Finance Doctor, Oportunidades, Marketing
- [ ] **@dev**: Redesenhar gráfico de fluxo de caixa (visual moderno, não genérico)
- [ ] **@dev**: Finance Doctor Panel: empty state para novos usuários ("Configure seus serviços para ver insights")
- [ ] **@dev**: Botão de ajuda/info com tooltip contextual em cada seção
- [ ] **@qa**: Teste de linguagem — varredura automatizada por jargões
- [ ] **@qa**: Visual regression em todas as telas modificadas

**Critérios de Aceite:**
- [ ] Zero jargões técnicos em todas as telas do app
- [ ] Toda tela sem dados mostra mensagem orientada + CTA para resolver
- [ ] Gráfico de fluxo de caixa com visual moderno (gradiente, animação suave)
- [ ] Finance Doctor mostra orientação contextual para novos usuários
- [ ] Botão de info/ajuda presente em cada seção principal

**Arquivos a modificar:**
- `pages/Finance.tsx` (linguagem + gráfico)
- `pages/Dashboard.tsx` (linguagem + empty states)
- `pages/Marketing.tsx` (linguagem)
- `components/dashboard/FinancialDoctorPanel.tsx` (empty state)
- `components/dashboard/MeuDiaWidget.tsx` (empty state)
- `components/dashboard/ProfitMetrics.tsx` (linguagem)
- Todos os componentes listados no audit

---

## Riscos e Mitigação

| Risco | Impacto | Mitigação |
|---|---|---|
| IA gerar conteúdo inapropriado | Alto | Prompt engineering com guardrails + revisão pré-publicação |
| Custo de API de IA escalar | Médio | Rate limiting por usuário/dia + cache de respostas |
| Onboarding wizard travar novos usuários | Alto | Botão "Pular" na etapa 4 + suporte a voltar/editar |
| ChurnRadar remoção quebrar dependências | Médio | Mapear todos os imports antes de remover |
| Template visual não renderizar bem no mobile | Médio | @ux faz mobile-first + @qa testa em viewports reais |
| Geração de PNG (Canvas API) ser pesada | Baixo | html2canvas como fallback, lazy loading |

**Rollback Plan:**
- Cada story é implementada em branch separada
- Feature flags para IA Chat e Notificações Inteligentes
- ChurnRadar mantido mas escondido (não deletar código) até validação completa

---

## Métricas de Sucesso

| Métrica | Baseline | Meta |
|---|---|---|
| Taxa de conclusão do onboarding | N/A (não existe) | > 80% |
| Uso do assistente IA por semana | 0 | > 3 interações/usuário |
| Posts gerados pelo calendário/mês | 0 | > 10 posts salvos/mês |
| Campanhas de reativação enviadas | Manual | > 5 automáticas/mês |
| Feedback "confuso" em UI | Alto (relatado) | Zero jargões técnicos |

---

## Compatibilidade

- [ ] APIs existentes do Supabase permanecem inalteradas
- [ ] Temas Brutal e Beauty funcionam em todas as novas telas
- [ ] PWA continua instalável e funcional
- [ ] Performance: bundle size não aumenta >15% (lazy loading)
- [ ] Mobile-first em todos os novos componentes

---

## Definition of Done (Épico)

- [ ] Todas as 5 stories completadas com critérios de aceite atendidos
- [ ] QA Gate aprovado por story
- [ ] Zero jargões técnicos em todas as telas
- [ ] Onboarding wizard funcional e testado
- [ ] Assistente IA respondendo com dados reais
- [ ] Calendário gerando posts com template editável
- [ ] ChurnRadar substituído por notificações inteligentes
- [ ] Testes unitários cobrindo novos componentes
- [ ] Regressão: funcionalidades existentes intactas
- [ ] Deploy em staging validado

---

## Handoff para @sm (Story Manager)

"Por favor, desenvolva stories detalhadas para este épico. Considerações chave:

- Este é um enhancement de um sistema React 19 + Supabase em produção
- Integrações existentes: OpenRouter (IA), Supabase (banco), WhatsApp API (links)
- Padrões a seguir: BrutalCard, BrutalButton, hooks customizados, Context API
- Compatibilidade crítica: temas Brutal/Beauty, PWA, mobile-first
- Cada story deve verificar que funcionalidades existentes continuam intactas
- Orquestração de squads já definida — respeitar a matrix de agentes

O épico deve manter a integridade do sistema enquanto entrega uma transformação completa de UX e inteligência artificial."

---

*Épico criado por @pm (Morgan) — 2026-03-07*
*Orquestração: Squad Fullstack + UX-Design-Expert*
