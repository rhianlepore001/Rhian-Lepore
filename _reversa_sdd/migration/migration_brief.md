---
schemaVersion: 1
generatedAt: 2026-05-17T17:40:00Z
reversa:
  version: "1.0.0"
kind: migration_brief
producedBy: orchestrator
---

# Migration Brief

> Documento de criterio de migracao coletado em entrevista no inicio do `/reversa-migrate`.
> Consumido pelos cinco agentes do Time de Migracao.

## Objetivo da migracao

Transformar o AGENX de um produto funcional, porem acumulado por evolucao rapida, em uma plataforma SaaS profissional, escalavel, confiavel e visualmente premium para lancamento comercial.

O sistema atual ja possui diferenciais importantes: agenda, booking publico, fila digital, financeiro, comissoes, CRM, onboarding, IA e futuramente produtos. Porem a base cresceu de forma pouco estruturada, com logica espalhada entre frontend, Supabase, RPCs e componentes grandes. A experiencia visual nao transmite a confianca esperada de um SaaS moderno.

A percepcao visual e uma dor central. O objetivo nao e apenas "deixar bonito", mas construir uma experiencia que transmita confianca, clareza e valor desde o primeiro uso.

Ganhos esperados:
- Base tecnica mais segura e escalavel
- Fluxos criticos mais confiaveis
- UI/UX consistente, sem "cara de IA"
- Maior percepcao de valor no lancamento
- Melhor retencao e confianca comercial
- Capacidade de evoluir diferenciais sem aumentar desordem

Objetivo final: v1 profissional do AGENX -- segura, consistente, premium, multi-tenant confiavel, visualmente coesa, centrada em operacao, receita, retencao e controle para barbearias e studios.

## Metricas de sucesso

### Tecnicos
- `npm run typecheck`, `lint`, `build`, `test` sem erros
- Fluxos criticos com testes automatizados
- Nenhuma query/RPC acessando dados fora do tenant
- Finalizacao atomica (fila/checkout/financeiro/comissoes)
- Reducao de `any` nas areas criticas
- Componentes grandes divididos em componentes/hooks/services
- Sem secrets expostos no frontend
- Carregamento < 2s desktop, < 3s mobile
- Sem erros criticos no console

### Produto
- Onboarding sem ajuda externa
- Booking sem friccao
- Agenda com operacoes claras
- Atendimento concluido atualiza agenda/financeiro/comissoes/CRM
- Fila digital funcional end-to-end
- Produtos com impacto financeiro
- Staff com visao restrita
- Features beta ocultas

### UI/UX
- Sem aparencia de MVP generico ou "cara de IA"
- Design system unico em todas as telas
- Navegacao clara e enxuta
- Consistencia visual entre modulos
- Premium em desktop e mobile
- Estados vazios/erro/loading profissionais
- Responsividade mobile validada

### Comerciais
- Apresentavel para demo sem ressalvas
- Valor percebido em 5 minutos
- Pilares comunicados: operacao, receita, retencao, controle
- Comparavel visualmente a Fresha, GlossGenius, Square Appointments
- Pronto para usuarios reais

## Restricoes

- **Prazo**: sem data publica, mas tratado como preparacao para v1. Fases curtas com entregas verificaveis.
- **Orcamento**: time enxuto, dependencia de IA. Baixo custo, baixa complexidade, manutencao simples.
- **Tecnicas**: manter React/TS/Vite/Supabase/Stripe/Vercel. HashRouter. Multi-tenant `company_id` obrigatorio. APIs publicas preservadas. Dados e migrations respeitados. Secrets nunca no frontend.
- **Operacionais**: sem perda de dados. Mudancas criticas com validacao. Estrategia incremental com fallback. Rollback rapido.

## Fatores de risco conhecidos

- Complexidade RLS/multi-tenant; vazamento entre empresas
- Historico extenso de migrations/RLS aumenta regressao
- Logica espalhada entre frontend/Supabase/RPCs/hooks/componentes
- Transacoes nao atomicas em fluxos financeiros
- Type safety fraco, muitos `any`
- Componentes grandes, baixa cobertura de testes
- Possivel exposicao de secrets
- Escopo crescer impedindo v1
- Aparencia generica/"cara de IA" persistindo
- Dependencia forte de IA sem specs claras
- Overengineering antes de validar v1

## Stakeholders

| Papel | Responsabilidade |
|---|---|
| Founder/owner | Visao, escopo, prioridades, trade-offs |
| Dev principal | Executar, revisar, integrar |
| Usuarios beta | Testar fluxos reais |
| Clientes finais | Validar booking/fila/mobile |
| Potenciais pagantes | Validar confianca e valor |
| Investidores/parceiros | Avaliar maturidade e diferenciacao |
| Agentes/LLMs | Executores guiados por specs |

## Stack alvo

- **Linguagem**: TypeScript
- **Framework**: React + Vite
- **Banco**: PostgreSQL via Supabase (RLS, RPCs, Edge Functions)
- **Auth**: Supabase Auth
- **Pagamentos**: Stripe
- **Infra**: Vercel
- **Adicoes**: TanStack Query, Zod, tipos gerados Supabase, services/repositories por dominio, design system interno, Zustand (se necessario), Playwright (E2E)
- **Evitar**: trocar Supabase, monorepo, framework pesado, reescrita total, muitas libs UI sem design system

## Escopo declarado

### Incluido (v1)
1. Autenticacao e onboarding
2. Dashboard (KPIs, pilares)
3. Agenda (CRUD, visualizacao, integracao financeiro/comissoes/CRM)
4. Booking publico (pagina publica, mobile, links preservados)
5. Fila digital (QR/link, gestao, finalizacao atomica)
6. Clientes/CRM (lista, historico, classificacao)
7. Financeiro (receitas, despesas, KPIs, integracao)
8. Comissoes (config, calculo, pagamento, visao staff)
9. Produtos (cadastro, venda, impacto financeiro, estoque)
10. Configuracoes (geral, servicos, equipe, horarios, assinatura)
11. Assinatura/Stripe (status, trial, paywall)
12. Design system (componentes, responsividade, estados)

### Excluido (pos-lancamento)
- IA avancada nao essencial
- Memoria semantica/RAG
- Automacoes de marketing
- Relatorios avancados
- Multi-profissional por servico
- Estoque avancado (fornecedor, lote, fiscal)
- Integracoes externas adicionais
- Customizacao visual por cliente
- Recursos enterprise
- Monorepo/Storybook se atrasar v1

## Notas livres

A v1 deve ser ampla o bastante para mostrar valor e diferenciacao, mas controlada para ser confiavel. Foco: plataforma profissional com operacao, receita, retencao e controle bem conectados. Percepcao visual premium e tao importante quanto estabilidade tecnica para o sucesso comercial.
