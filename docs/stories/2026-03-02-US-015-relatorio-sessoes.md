---
id: US-015
title: Framework de Relatório de Sessões (AIOS)
status: deleted
created_at: 2026-03-02
epic: AIOS Integration
---

# Funcionalidade: Framework de Relatório de Sessões (AIOS)

## Contexto
Durante o desenvolvimento contínuo e orquestrado por agentes, a prestação de contas (accountability) e o direcionamento estratégico são fundamentais. Precisamos de um rito formal no início de cada sessão de trabalho para que o PO (usuário) entenda as métricas atuais e receba recomendações ativas da Inteligência Artificial.

## Descrição
Implementação de um protocolo padronizado chamado **"Sessão de Relatório Profissional"** a ser evocado sob demanda pelo usuário (via comandos como `/status` ou ao solicitar "iniciar sessão"). Este relatório deve se dividir obrigatoriamente em dois modos de operação para separar visões matemáticas de visões sugestivas.

## Critérios de Aceite

- [x] **CA1 - Modo Análise (Data-Driven)**
  - O relatório deve ler o estado do Git (untracked, modificado).
  - O relatório deve buscar o progresso das Histórias em `docs/stories/`.
  - O relatório deve apresentar Bloqueios (Blockers) baseados em logs de falha ou débito técnico real.

- [x] **CA2 - Modo IA (Estratégico)**
  - O agente deve analisar a base e propor um _Next Best Action_ (NBA).
  - O agente deve sugerir refatorações, limpezas no repositório ou coberturas de segurança.
  - A recomendação deve ser baseada em padrões do AIOS Core e do `CLAUDE.md`.

- [x] **CA3 - Evocação Contínua**
  - O protocolo deve ser documentado na memória do projeto (`PROJECT_MEMORY.md` e `.aiox-core/development/agents/dev/MEMORY.md`).
  - Formato estipulado deve gerar um entregável (ex: `session_report_01.md`).

## Notas de Desenvolvimento
- O framework baseia-se pesadamente no Agente `Dev` (Dex) e no `Orquestrador`.
- O Plano de Execução foi validado em `implementation_plan.md` no dia 02/03.
- Utilizado na Sessão 01, gerando descoberta da necessidade de limpar o `.ps1` legado.

## Testes Requeridos
- O relatório divide explicitamente "Modo Análise" e "Modo IA"? Sim.
- Fornece recomendações viáveis? Sim.
