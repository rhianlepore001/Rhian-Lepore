# 🧠 PROJECT MEMORY - Barber/Beauty OS

> **Última Atualização:** 22/02/2026
> **Versão:** 0.2.0
> **Status:** AIOS Engine - Prova de Valor

---

## 🏗️ Contexto do Projeto

**Objetivo:** SaaS de gestão para Barbearias e Salões de Beleza (Multi-tenant / Multi-tema). Atualmente evoluindo para **AIOS (AI Operating System)** - Atuando como um sócio virtual para crescimento de banca.
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

### [22/02/2026] - Atualização do PRD para AgenX 3.0 (AIOS)
- **O que foi feito**: Atualização massiva do `PRD.md` para a versão 3.0. Consolidação do rebranding para **AgenX**, formalização do conceito de **AIOS (AI Operating System)**, inclusão de requisitos funcionais do motor de lucro (Radar, ROI de Campanhas) e metas de performance (60 FPS Mobile UX).
- **Por que**: Alinhar a documentação técnica e estratégica com o estado atual do produto antes do lançamento oficial, garantindo que investidores e desenvolvedores tenham a visão correta do ecossistema AIOS.
- **Arquivos Chave**: `PRD.md`, `walkthrough.md`, `implementation_plan.md`.

### [22/02/2026] - Análise Estratégica & Guia de Sucesso AIOS
- **O que foi feito**: Análise estratégica de prontidão para lançamento e implementação do "Guia de Sucesso AIOS" (Success Playbook). Criação do componente `AIOSStrategyModal.tsx` e integração na `DashboardHero.tsx`. Validação de build de produção (`npm run build`) bem-sucedida.
- **Por que**: Maximizar o ROI do usuário no dia do lançamento, transformando a percepção do sistema de uma ferramenta de agenda para um consultor de crescimento de negócios (AIOS).
- **Arquivos Chave**: `AIOSStrategyModal.tsx`, `DashboardHero.tsx`, `useDashboardData.ts`, `walkthrough.md`.

- **O que foi feito**: Integração das páginas `AuditLogs.tsx` e `RecycleBin.tsx` no `SettingsLayout.tsx`. Implementação de lógica defensiva para tooltips (`InfoButton`) e refatoração do menu de notificações no `Header.tsx` para usar posicionamento `fixed` no mobile, eliminando cortes laterais.
- **Por que**: Garantir usabilidade total e consistência visual em todas as resoluções, especialmente em dispositivos de tela pequena onde elementos com largura fixa eram cortados.
- **Arquivos Chave**: `AuditLogs.tsx`, `RecycleBin.tsx`, `HelpButtons.tsx`, `Header.tsx`.

### [22/02/2026] - Rebranding Universal & Consistência PWA AgenX
- **O que foi feito**: Transição completa da marca de "Barber/Beauty OS" para **AgenX**. Criação do logo universal SVG e ícone unificado (`icon-agenx.svg`) para PWA, unificação de metadados (títulos, manifestos), refatoração do Header, Login, Register, Onboarding e Tour guiado.
- **Por que**: Consolidar uma identidade de marca forte e profissional focada em **AIOS**, eliminando referências residuais e garantindo que o aplicativo instalado tenha nome e ícone consistentes (AgenX) em qualquer tema.
- **Arquivos Chave**: `AgenXLogo.tsx`, `icon-agenx.svg`, `useDynamicBranding.ts`, `manifest-barber.webmanifest`, `manifest-beauty.webmanifest`.

### [22/02/2026] - Refinamento de Slogan e Limpeza Visual
- **O que foi feito**: Atualização do slogan para "O sistema que faz seu negócio crescer" no componente `AgenXLogo`. Remoção de logos redundantes na tela de gateway de login.
- **Por que**: Melhorar a clareza da proposta de valor e garantir uma interface mais limpa e profissional, sem repetições desnecessárias.

### [22/02/2026] - Otimização de Performance UX Mobile (GPU)
- **O que foi feito**: Implementação de aceleração de hardware (`backface-visibility`), redução de `backdrop-filter`, uso de sombras 'lite' e desativação de animações custosas em dispositivos móveis.
- **Por que**: Atingir fluidez de 60 FPS no mobile, reduzindo o jitter e a carga na GPU causada por efeitos Pro Max intensos.
- **Arquivos Chave**: `index.html`, `DashboardHero.tsx`, `ActionCenter.tsx`, `ProfitMetrics.tsx`.

### [22/02/2026] - Sprint 60 FPS Mobile (@squad)
- **O que foi feito**: Otimização agressiva de CSS (redução de blur de 20px para 4px no mobile, sombras lite) e transições (substituição de `transition-all` por propriedades específicas e `will-change`).
- **Por que**: Recuperar a fluidez total (60 FPS) que estava comprometida pelos efeitos visuais pesados do design Pro Max.
- **Arquivos Chave**: `index.html`, `BrutalCard.tsx`, `Layout.tsx`, `SettingsLayout.tsx`.

### [22/02/2026] - Hotfix de Usabilidade Mobile (@squad)
- **O que foi feito**: Correção do bloqueio de scroll substituindo `touch-none` por `touch-pan-y` no `BrutalCard.tsx` e remoção de `select-none` obstrutivos.
- **Por que**: A proteção contra toques acidentais estava impedindo o scroll nativo do navegador quando o usuário iniciava o gesto sobre um card.
- **Arquivos Chave**: `BrutalCard.tsx`, `ProfitMetrics.tsx`.


### [22/02/2026] - Otimização Estratégica de Performance Mobile (@squad)
- **O que foi feito**: Correção de loop infinito crítico no `useDashboardData.ts`, memoização de componentes do Dashboard (`AIOSCampaignStats`, `ProfitMetrics`, `ActionCenter`, `DashboardHero`) e otimização do `UIContext` com `isMobile`.
- **Por que**: O sistema apresentava travamentos totais (0 fps) no mobile devido a re-renders infinitos e sobrecarga de CPU/GPU. A interface agora está fluida e responsiva.
- **Arquivos Chave**: `useDashboardData.ts`, `Dashboard.tsx`, `UIContext.tsx`, `BrutalCard.tsx`, `DashboardHero.tsx`.


### 💎 [21/02/2026] Elite Hero AIOS & Performance Quest
- **Dashboard**: Redesign completo do Hero para o formato "Elite Command Strip". Design minimalista, focado no nome do profissional, altura reduzida em 50%, e integração cirúrgica de insights proativos (Receita Recuperável).
- **Performance**: Redução de 12 requisições sequenciais para 1 RPC unificada no módulo Financeiro (`get_monthly_finance_history`).
- **Estabilidade**: Fix no bug de navegação mobile que fechava o menu "Mais" e refatoração da restauração da Lixeira.
- **Design Tokens**: Intensificação dos efeitos Pro Max (Glow, Glassmorphism, Sombras) em toda a aplicação.
 de funções.
- **Tipagem Estrita**: Introdução de interfaces TypeScript para dados financeiros, eliminando o uso de `any` e aumentando a confiabilidade do código.
- **Gráficos Pro Max**: Ajustes de layout no `Recharts` para evitar avisos de dimensão e garantir fluidez visual em resoluções variadas.
- **Por que**: Eliminar gargalos de rede, estabilizar recursos críticos e profissionalizar a base de código (Type Safety).
- **Arquivos Chave**: `Finance.tsx`, `RecycleBin.tsx`, `migrations/20260221_performance_optimization_v2.sql`.

### [21/02/2026] - AIOS 2.0 Fase 4: Campaign ROI & Attribution
- **Rastreamento de Campanhas**: Implementação da RPC `log_aios_campaign` e integração no clique do WhatsApp no CRM.
- **ROI Real**: Refatoração da RPC `get_dashboard_stats` com atribuição de 30 dias para provar o valor financeiro da IA.
- **Hotfix de Sincronia**: Resolução de conflito de tipos (UUID vs TEXT) e remoção de funções duplicadas que causavam zeramento no Dashboard.
- **UI de Performance**: Novo componente `AIOSCampaignStats` com explicações didáticas via `InfoButton`.
- **Arquivos Chave**: `Dashboard.tsx`, `AIOSCampaignStats.tsx`, `migrations/20260221_aios_roi_tracking.sql`, `migrations/20260221_dashboard_stats_hotfix.sql`.

### [21/02/2026] - Faxina Técnica: Performance & Consistência RPC
- **Otimização de Performance**: Redução de 12 chamadas de API para 1 no `Finance.tsx` através da nova RPC `get_monthly_finance_history`.
- **Estabilização da Lixeira**: Correção definitiva de erros 404 e refatoração da lógica de restauração em `RecycleBin.tsx` usando mapeamento explícito de funções.
- **Tipagem Estrita**: Introdução de interfaces TypeScript para dados financeiros, eliminando o uso de `any` e aumentando a confiabilidade do código.
- **Gráficos Pro Max**: Ajustes de layout no `Recharts` para evitar avisos de dimensão e garantir fluidez visual em resoluções variadas.
- **Por que**: Eliminar gargalos de rede, estabilizar recursos críticos e profissionalizar a base de código (Type Safety).
- **Arquivos Chave**: `Finance.tsx`, `RecycleBin.tsx`, `migrations/20260221_performance_optimization_v2.sql`.

### [21/02/2026] - Revitalização Pro Max: Seção de Configurações
- **SettingsLayout 2.0**: Implementação de uma navegação flutuante (`Floating Pill Nav`) com Glassmorphism avançado e transições suaves.
- **Refatoração Global**: Atualização das páginas `Geral`, `Serviços`, `Equipe`, `Segurança` e `Agendamento Público` para o design system Brutal/Pro Max.
- **Componentização**: Uso extensivo de `BrutalCard` (com suporte a ícones e ações no header) e `BrutalButton` em toda a interface de settings.
- **UX/UI Pro Max**: Remoção de cabeçalhos redundantes, introdução de feedback tátil (`haptic-click`) e polimento de elementos interativos (Toggles e botões pomocionais).
- **Hotfix de Navegação Mobile**: Corrigido bug no `Layout.tsx` que desmontava o `BottomMobileNav` ao abrir modais, causando o fechamento precoce do menu "Mais".
- **Design Pro Max Intensificado**: Aumento do contraste, profundidade de sombras e introdução de "Vidro Colorido" (Tinted Glass) com tons de Ouro/Neon para tornar a estética Pro Max evidente no tema Barber.
- **Correção de RPC**: Restaurada a função `get_commissions_due` no Supabase para eliminar erros 404 no Dashboard.
- **Por que**: Garantir funcionalidade plena no mobile e atender ao feedback do usuário sobre a sutileza do design anterior.
- **Arquivos Chave**: `Layout.tsx`, `BrutalCard.tsx`, `BrutalBackground.tsx`, `MoreOptionsDrawer.tsx`, `index.html`.

### [21/02/2026] - Resolução de Status Premium & Sincronização de Esquema
- **Análise de Status**: Verificação manual e confirmação do status `subscriber` (premium) para as contas `rleporesilva@gmail.com` e `vanessa.lepore2009@gmail.com` no Supabase.
- **Sincronização de Banco (Bugfix)**: Identificação e correção de inconsistência entre frontend e backend. O código já exigia recursos do Motor AIOS e Rate Limiting que não estavam presentes no banco de produção.
- **Ações**: Aplicação manual das migrações `20260214_rate_limiting.sql` e `20260221_aios_foundation.sql` (colunas `aios_enabled`, `aios_features` e RPC `check_login_rate_limit`).
- **Por que**: A falha no carregamento do perfil do usuário devido a colunas ausentes causava a exibição incorreta da tela "Teste Expirado", mesmo para contas premium.
- **Arquivos Chave**: `contexts/AuthContext.tsx`, `migrations/20260221_aios_foundation.sql`, `migrations/20260214_rate_limiting.sql`.

### [21/02/2026] - Operação Mobile Pro Max & Dashboard Real (Fase 3 & 4)
- **Dashboard Data Integration**: Eliminação de dados mockados. Implementação das RPCs `get_dashboard_stats` e `get_dashboard_actions` para exibir métricas reais de lucro, receita recuperada, no-shows evitados e vagas preenchidas via agendamento online.
- **Revitalização Visual 'Pro Max'**: Refatoração completa da estética mobile. Introdução de Glassmorphism 2.0 (`backdrop-blur-2xl`), Navegação flutuante com feedback tátil, Redesign do Header com logo dinâmico e suporte a Skeleton Loaders premium.
- **Design System**: Novos tokens de design no `index.html` (sombras de profundidade e gradientes Pro Max) e atualização do `BrutalCard` e `BrutalButton` para consistência sistêmica.
- **Por que**: Elevar a percepção de valor do produto para um patamar Enterprise/Premium e fornecer dados acionáveis reais para o dono do negócio.
- **Arquivos Chave**: `hooks/useDashboardData.ts`, `components/BottomMobileNav.tsx`, `components/Header.tsx`, `components/BrutalCard.tsx`, `components/SkeletonLoader.tsx`, `pages/Dashboard.tsx`.

### [21/02/2026] - Lançamento do Motor AIOS 2.0 (Fase 1 & 2)
- **AIOS Foundation:** Implementação de Feature Flags (`aios_enabled`, `aios_features`) e Sistema de Memória Agêntica (`aios_logs`).
- **Invisible Onboarding:** Redução drástica do atrito inicial (onboarding de 5 para 2 passos), focando na coleta progressiva de dados pela IA.
- **Motor de Diagnóstico (QuickScan):** Criação do RPC `get_aios_diagnostic` no Supabase para detecção automática de Churn (clientes sumidos há >30 dias) e cálculo de Receita Recuperável.
- **Interface Inteligente:** Lançamento do `AIOSDiagnosticCard` (Radar de Lucro) no Dashboard e integração do `AIOSCopywriter` no `ClientCRM` para reativação personalizada via WhatsApp (`wa.me`).
- **Por que:** Transformar o sistema em um gerador ativo de lucro, reduzindo o churn e aumentando o faturamento sem esforço manual do dono.
- **Arquivos Chave:** `hooks/useAIOSDiagnostic.ts`, `utils/aiosCopywriter.ts`, `components/dashboard/AIOSDiagnosticCard.tsx`, `migrations/20260221_aios_diagnostic_rpc.sql`.

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


### [22/02/2026] - Lançamento Oficial AgenX MVP
- **Build:** `npm run build` concluído com sucesso e validado.
- **Técnico:** Resolvidos 100% dos erros de `tsc` e `eslint`.
- **Feature:** Implementação do **Guia Estratégico AIOS** na Dashboard.
- **Refactor:** Otimização transversal de interfaces de tipos e componentes visuais (BrutalButton).
- **Status:** Sistema pronto para produção (Green State).

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
