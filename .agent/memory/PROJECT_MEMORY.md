# 🧠 PROJECT MEMORY - Barber/Beauty OS

> **Última Atualização:** 14/02/2026
> **Versão:** 0.1.0
> **Status:** Em Desenvolvimento

---

## 🏗️ Contexto do Projeto

**Objetivo:** SaaS de gestão para Barbearias e Salões de Beleza (Multi-tenant / Multi-tema).
**Tech Stack:** React (Vite), TypeScript, Supabase, Clerk (Auth), TailwindCSS (v4), Stripe.

### 🎨 Temas e Design
- **Sistema Dual:** Tema "Barber" (Brutalista/Dark) e Tema "Beauty" (Elegante/Roxo).
- **Detecção:** Automática via URL ou preferência do usuário.
- **Assets:** Backgrounds e logos dinâmicos em `public/`.
- **Componentes Chave:** `BrutalCard`, `BrutalButton`, `BrutalBackground`.

### 🔐 Autenticação & Segurança
- **Provedor:** Migração para Clerk em andamento (Híbrido com Supabase).
- **RLS:** Row Level Security ativo no Supabase.
- **Regras:** Acesso restrito por tenant/user_id.

---

## 📜 Regras de Ouro (Memória)

1. **Atualizar Sempre:** Ao finalizar uma tarefa significativa, adicione uma entrada no Log.
2. **Seja Conciso:** Use bullet points. Evite prosa longa.
3. **Foque no "O Que" e "Por Que":** O código mostra o "Como". A memória deve explicar a decisão.

---

## 📝 Memória de Alterações (Reverse Chronological)

### [20/02/2026] - Estabilização de Tipos e Preparação para Deploy de Produção
- **Type Safety:** Correção massiva de erros de TypeScript em componentes críticos: `Appointment` (interface central), `BrutalCard` (props de estilo), `use2FA` (retorno de hook) e `CommissionsManagement.tsx`.
- **Build:** Sucesso no build de produção (`npm run build`) após resolução de conflitos entre Vite e Vitest no `tsconfig.json`.
- **Segurança:** Refatoração da inicialização do Supabase para usar variáveis de ambiente (`import.meta.env`).
- **Hotfix:** Restauração de valores de fallback no `lib/supabase.ts` para garantir o funcionamento em ambientes (como a Vercel) onde as variáveis `VITE_` ainda não foram configuradas manualmente no painel de controle.
- **Qualidade:** Unificação do sistema de logs e correção de referências de propriedades em formulários (`TeamMemberForm.tsx`).
- **Arquivos Chave:** `types.ts`, `hooks/use2FA.ts`, `components/BrutalCard.tsx`, `lib/supabase.ts`, `walkthrough.md`.

### [17/02/2026] - Serviço Personalizado no Agendamento
- **Frontend:** Atualização de "ServiceList.tsx" para exibir a opção "Outros / Personalizado" independentemente da categoria selecionada. Correção de cálculo de preço no "AppointmentWizard.tsx".
- **Backend:** Validação da função RPC "create_secure_booking" que já suportava "p_custom_service_name".
- **Verificação:** Criação de script "test/verify_custom_service.ts" para testar o fluxo completo de criação de agendamento personalizado.
- **Por que:** Permitir que o estabelecimento agende serviços avulsos ou promocionais sem necessidade de cadastro prévio no catálogo.

### [17/02/2026] - Sprint 1: Setup de Testes & Code Quality (Concluída)
- **Quality:** Limpeza total de `console.log` e aplicação de regras ESLint (`no-console`).
- **Testing:** Configuração robusta do Vitest, correção de mocks (Supabase) e fix de testes instáveis (`BrutalCard`, `date.ts`).
- **Type Safety:** Validação de tipos estritos (`tsc`), correções de erros de compilação em `clerk-migration` e `utils`.
- **Por que:** Garantir base sólida para desenvolvimento de features e evitar regressões silenciosas.
- **Arquivos:** `.eslintrc.json`, `utils/Logger.ts`, `vitest.config.ts`, `test/setup.ts`.

### [16/02/2026] - Sprint 2: Segurança e Auditoria (Enterprise Features)
- **Features:** 2FA (TOTP), Rate Limiting (Postgres), Logs de Auditoria Completos, Soft Delete (Lixeira), Política de Senhas.
- **Arquitetura:** Migrations SQL para procedures de segurança, Hooks customizados (`use2FA`), Contexto de Auth reforçado.
- **Por que:** Blindar o sistema contra ataques de força bruta, garantir rastreabilidade de ações e permitir recuperação de dados.
- **Arquivos Chave:** `hooks/use2FA.ts`, `migrations/20260214_rate_limiting.sql`, `pages/settings/AuditLogs.tsx`.

### [16/02/2026] - Blindagem Total (Supabase RLS & Infraestrutura)
- **Segurança:** Implementação de RLS estrito ("Condomínio Fechado") em TODAS as tabelas.
- **Infra:** Correção de vulnerabilidades RPC (Search Path Hijacking) em funções críticas.
- **Isolamento:** Separação total de dados financeiros e operacionais entre tenants.
- **Por que:** Evitar vazamento de dados entre concorrentes e proteger informações sensíveis.
- **Arquivos:** `migrations/20260216_rls_phase*_*.sql`, `walkthrough.md`.

### [16/02/2026] - Reset Operacional & Hardening
- **Ação:** `TRUNCATE` em cascata de todas as tabelas operacionais (Reset de Fábrica).
- **Segurança:** Ativação de Trigger `ensure_email_confirmed` para bloquear perfis sem email validado.
- **Motivo:** Corrupção irreversível de dados legados (mistura de tenants) e reforço de onboarding seguro.
- **Estado Atual:** Banco limpo, pronto para reinício seguro.

### [16/02/2026] - Documentação de Competências
- **Docs:** Criação do `docs/GUIA_COMPETENCIAS.md`.
- **Objetivo:** Explicar para o usuário (leigo) as principais Skills e Workflows do agente.
- **Destaques:** `/brainstorm`, `/plan`, `frontend-design`, `security-auditor`.

### [14/02/2026] - Implementação da Memória Persistente & Deploy
- **Deploy:** Deploy para Vercel realizado via Git (`git push`).
- **Feature:** Criação do sistema de memória centralizada (`PROJECT_MEMORY.md`).
- **Regras:** Adição de `PROJECT MEMORY PROTOCOL` e Regra GLOBAL PT-BR em `GEMINI.md`.
- **Por que:** Evitar fragmentação de contexto e economizar tokens entre sessões.
- **Arquivos:** `.agent/memory/PROJECT_MEMORY.md`, `.agent/rules/GEMINI.md`.

### [Anterior] - Refatoração e Temas
- **Temas:** Implementação completa dos temas Barber e Beauty com troca dinâmica.
- **Componentes:** Criação de `Brutal*` components para design system consistente.
- **Docs:** Geração de documentação extensa em `INDICE_ARQUIVOS.md` e guias de tema.
- **Auth:** Início da integração com Clerk.
