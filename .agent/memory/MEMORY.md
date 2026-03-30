# MEMORY.md (Project Heartbeat)

## 🚀 ESTADO ATUAL (HANDOFF)
- **Contexto**: Refatoração da página de Insights concluída (US-004) e Deploy em Produção realizado com sucesso.
- **Última Tarefa**: Implantação na Vercel com migrações de índices de banco de dados (US-030) aplicadas.
- **Próximo Passo**: Monitorar logs de performance em produção e coletar feedback do usuário final.

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
- **2026-03-26**: Deploy em Produção concluído (Vercel). Migrações US-030 (índices de performance) validadas e aplicadas. URL: https://www.promptdeelite.com
- **2026-03-29**: 
  - **Concluído**: Refatoração completa da US-0406 (SetupCopilot - Guided Mode) e integração com o Context/WizardPointer.
  - **Por que**: Criar uma experiência engajadora de tutorial de onboarding ao invés de atalhos estáticos simples, com ponteiro visual e marcação de highlights com z-index elevado (portals).
  - **Arquivos-chave**:
    - `components/dashboard/SetupCopilot.tsx`
    - `components/onboarding/WizardPointer.tsx`
    - `components/onboarding/StandaloneWizardPointer.tsx`
    - `contexts/GuidedModeContext.tsx`
    - `constants/WIZARD_TARGETS.ts`
  - **Concluído**: Implementação da US-0407 (Retomada de Sessão do SetupCopilot).
  - **Por que**: Quando o usuário fecha o browser no meio do tour e retorna, oferecemos a retomada do wizard exatamente no step onde parou.
  - **Arquivos-chave**:
    - `components/dashboard/SetupCopilot.tsx`
  - **Concluído**: Implementação da US-0408 (Completion Detection).
  - **Por que**: Quando o usuário conclui o setup de um step com sucesso, o sistema agora escuta o evento `setup-step-completed`, reproduz a animação de sucesso (ícone de check animado), encerra o guia e exibe um Toast oferecendo o próximo passo ou o botão para voltar ao dashboard sem forçar o redirecionamento.
  - **Arquivos-chave**:
    - `components/onboarding/StandaloneWizardPointer.tsx`
    - `components/dashboard/SetupCopilot.tsx`
    - `components/ServiceModal.tsx`
    - `components/TeamMemberForm.tsx`
    - `pages/settings/GeneralSettings.tsx`
    - `pages/settings/PublicBookingSettings.tsx`
    - `components/AppointmentWizard.tsx`
- **2026-03-29 (Parte 2)**: Conclusão das US-0409 (Activation Event Milestone) e US-0410 (Animações e Polish). Adicionada tabela profile `activation_completed`, Captura de primeiro agendamento via `CustomEvent('system-activated')` em `AppointmentWizard.tsx`, `ActivationBanner` animado, e melhoria significativa na UX/Performance (reduced motion).
- **2026-03-23**: Refatoração da página de Insights (US-004) concluída. Adicionado Empty State inteligente em `Reports.tsx` e lógica de visualização atualizada.
- **2026-03-20**: Limpeza completa da suite antiga de testes e preparação para nova análise End-to-End (TestSprite) abrangendo todas as features (Agendamento Online, QR Code, CRM, etc).
- **2026-03-20**: Ajuste nos seletores do TestSprite (Gateway) utilizando data-testids e atualização do `standard_prd.json` preservando o branding original.
- **2026-03-18**: Início da Sprint 2; implementação de 5 índices críticos (US-030).
- **2026-03-14**: Migração RAG 2.0 para OpenRouter bem sucedida.
- **2026-03-14**: Correção de fluxo de edição e integridade de fuso horário (Agenda.tsx).
- **2026-03-12**: Refatoração completa da Edição de Agendamentos Online.

---
*Este arquivo é a Fonte Única de Verdade (SoT) para Antigravity e Claude.*
