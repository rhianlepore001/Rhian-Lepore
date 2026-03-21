# MEMORY.md (Project Heartbeat)

## 🚀 ESTADO ATUAL (HANDOFF)
- **Contexto**: Finalizada a migração da arquitetura de embeddings para OpenRouter (US-026/US-027). Sprint 2 em andamento com foco em Performance e Higiene Técnica.
- **Última Tarefa**: Padronização da memória do projeto para um único arquivo `MEMORY.md`.
- **Próximo Passo**: Aplicar migrações de índices de banco de dados (`US-030`) e validar performance.

## 🧠 PADRÕES DE OURO (ACTIVE RULES)
1. **Memória de Estado**: Toda sessão deve ser encerrada com o update desta seção `ESTADO ATUAL`.
2. **Segurança Privilegiada**: RLS (Row Level Security) é obrigatório para multi-tenancy.
3. **Código Expressivo**: Typescript deve contar a história; comentários apenas para o "Por Quê" (Lei 14).
4. **Vite/SPA**: Foco em resiliência no lado do cliente e limpeza de variáveis de ambiente.

## 🛠️ DÍVIDA TÉCNICA CRÍTICA
- Vulnerabilidade RLS em `client_semantic_memory` (vazamento cross-tenant).
- Integração Stripe "work-in-progress" em produção.
- Ausência de Error Boundaries em páginas core.
- Lentidão de 20-30% em dashboards por falta de indexes em FKs.

## 📜 HISTÓRICO RECENTE
- **2026-03-20**: Limpeza completa da suite antiga de testes e preparação para nova análise End-to-End (TestSprite) abrangendo todas as features (Agendamento Online, QR Code, CRM, etc).
- **2026-03-20**: Ajuste nos seletores do TestSprite (Gateway) utilizando data-testids e atualização do `standard_prd.json` preservando o branding original.
- **2026-03-18**: Início da Sprint 2; implementação de 5 índices críticos (US-030).
- **2026-03-14**: Migração RAG 2.0 para OpenRouter bem sucedida.
- **2026-03-14**: Correção de fluxo de edição e integridade de fuso horário (Agenda.tsx).
- **2026-03-12**: Refatoração completa da Edição de Agendamentos Online.

---
*Este arquivo é a Fonte Única de Verdade (SoT) para Antigravity e Claude.*
