# Product Requirements Document (PRD) - Beauty OS / Barber OS

> **Versão:** 2.0  
> **Última Atualização:** 16/02/2026  
> **Status:** Em Produção (MVP + Enterprise Features)

---

## 1. Visão Geral do Produto

**Nome do Produto:** Beauty OS (com variante Barber OS)

**Descrição:**
O Beauty OS é uma plataforma SaaS (Software as a Service) **enterprise-grade** projetada para modernizar a gestão de salões de beleza e barbearias. O sistema oferece uma experiência premium e altamente visual, diferenciando-se pela estética cuidada, segurança robusta e funcionalidades que cobrem agendamento, gestão financeira, CRM de clientes, auditoria completa e insights operacionais.

**Proposta de Valor:**
Transformar a gestão administrativa de negócios de beleza em uma experiência visualmente impactante, **segura** e eficiente, permitindo que os proprietários foquem na arte e no atendimento ao cliente, enquanto o software cuida da organização com estilos que se adaptam à identidade da marca (Barbearia "Brutalista" ou Salão "Beauty").

**Diferenciais Competitivos:**
- 🎨 **Design como Feature:** Temas visuais premium (Brutalist/Elegant) com troca dinâmica
- 🔐 **Segurança Enterprise:** 2FA, Rate Limiting, Audit Logs, RLS total
- 📱 **PWA Dinâmico:** Logos, favicons e manifests adaptados por tema
- 🚀 **Performance:** Otimizado para mobile-first com Core Web Vitals em mente
- 🧠 **IA Integrada:** Google Gemini para insights e automações (roadmap)

---

## 2. Objetivos do Negócio

- **SaaS B2B Multi-Tenant:** Oferecer o software como serviço por assinatura para múltiplos estabelecimentos com isolamento total de dados.
- **Diferenciação Visual:** Prover temas visuais de alta qualidade (Premium Themes) que elevam a percepção de valor do estabelecimento.
- **Segurança Enterprise:** Blindagem total contra ataques (força bruta, SQL injection, vazamento de dados entre tenants).
- **Eficiência Operacional:** Reduzir o tempo gasto em tarefas administrativas (agendamentos, fechamento de caixa, auditoria).
- **Escalabilidade:** Arquitetura pronta para atender centenas de estabelecimentos simultaneamente com performance consistente.
- **Compliance:** Rastreabilidade completa de ações (Audit Logs) e recuperação de dados (Soft Delete).

---

## 3. Personas de Usuário

### 3.1. O Proprietário (Admin)
- **Responsabilidades:** Gerencia o negócio, define metas, visualiza relatórios financeiros e configura o sistema.
- **Necessidades:** Clareza nos dados, controle total, facilidade de uso, **segurança** e **rastreabilidade de ações**.
- **Novas Features:** Acesso a Audit Logs, configuração de 2FA, gestão de lixeira (soft delete).

### 3.2. O Profissional (Staff)
- **Responsabilidades:** Consulta a agenda, realiza atendimentos e registra serviços.
- **Necessidades:** Acesso rápido à agenda no celular, facilidade para marcar "concluído", **proteção de conta** (2FA opcional).
- **Novas Features:** Autenticação via Clerk, interface mobile otimizada.

### 3.3. O Cliente Final
- **Responsabilidades:** Realiza agendamentos online através de um link público.
- **Necessidades:** Interface bonita, rápida, confirmação imediata (via WhatsApp/Email), **confiança na plataforma**.
- **Novas Features:** PWA instalável com logo do estabelecimento, tema visual consistente.

---

## 4. Requisitos Funcionais

### 4.1. Autenticação e Gestão de Contas ✅ **[IMPLEMENTADO]**

#### Autenticação Principal
- **Provedor:** Clerk (migração de Supabase Auth concluída)
- **Métodos:** E-mail/Senha, OAuth (Google, Facebook - roadmap)
- **Segurança:** 
  - ✅ 2FA via TOTP (Google Authenticator, Authy)
  - ✅ Rate Limiting (5 tentativas/15min por IP)
  - ✅ Política de Senhas Fortes (mínimo 8 caracteres, maiúsculas, números, símbolos)
  - ✅ Confirmação de E-mail obrigatória (trigger `ensure_email_confirmed`)
- **Recuperação:** Reset de senha via e-mail (Clerk)

#### Gestão de Perfil
- **Estabelecimento:** Logo, Nome Fantasia, Endereço, Telefone, Redes Sociais (Google My Business, WhatsApp)
- **Usuário:** Nome, E-mail, Foto, Preferências de Tema
- **Configurações de Segurança:** Ativação/Desativação de 2FA, Histórico de Logins

### 4.2. Agendamento (Core) ✅ **[IMPLEMENTADO]**

#### Agenda Interna
- **Visualizações:** Diária, Semanal, Mensal
- **Funcionalidades:** Criar, Editar, Cancelar, Marcar como Concluído
- **Filtros:** Por profissional, por serviço, por status
- **Notificações:** Lembretes automáticos (WhatsApp/E-mail - roadmap)

#### Agendamento Online Público
- **Link Exclusivo:** `/book/:tenant_slug` (público, sem login)
- **Wizard Interativo:** Seleção de serviço → profissional → data → horário
- **Validação:** Bloqueio automático de horários indisponíveis
- **Confirmação:** Imediata via tela + E-mail (roadmap: WhatsApp)

#### Gestão de Filas
- **Status:** Aguardando → Em Atendimento → Concluído
- **Visualização:** Cards visuais com cores por status
- **Ações Rápidas:** Botões de transição de status

### 4.3. Gestão Financeira ✅ **[IMPLEMENTADO]**

#### Registro de Transações
- **Tipos:** Vendas, Serviços, Despesas
- **Métodos de Pagamento:** Dinheiro, Cartão, PIX, Outros
- **Categorização:** Por profissional, por serviço, por cliente

#### Relatórios Financeiros
- **Dashboard:** Faturamento Diário/Mensal, Ticket Médio, Taxa de Ocupação
- **Métricas de Lucro:** Receita, Despesas, Lucro Líquido, Margem de Lucro
- **Exportação:** CSV, PDF (roadmap)

#### Integração de Pagamentos
- **Stripe:** Pagamentos de assinatura do sistema (planos Pro/Enterprise)
- **Webhooks:** Sincronização automática de status de pagamento

### 4.4. Segurança e Auditoria 🆕 **[ENTERPRISE FEATURES]**

#### Audit Logs (Rastreabilidade Total)
- **Eventos Rastreados:** 
  - Autenticação (login, logout, falhas)
  - CRUD de dados críticos (agendamentos, clientes, serviços, transações)
  - Alterações de configuração (perfil, segurança, temas)
- **Informações Capturadas:** User ID, Ação, Timestamp, IP, User Agent, Dados Antigos/Novos (JSON)
- **Retenção:** 90 dias (configurável)
- **Interface:** Tabela filtrada por usuário, ação, data

#### Rate Limiting (Proteção contra Força Bruta)
- **Implementação:** PostgreSQL (tabela `rate_limit_attempts`)
- **Limites:** 
  - Login: 5 tentativas/15min por IP
  - API Pública: 100 req/min por IP (roadmap)
- **Bloqueio:** Temporário (15min) com mensagem clara ao usuário

#### Soft Delete (Lixeira)
- **Tabelas Protegidas:** `bookings`, `clients`, `services`, `transactions`
- **Mecânica:** Campo `deleted_at` (NULL = ativo)
- **Recuperação:** Interface de lixeira para admins (30 dias de retenção)
- **Purga Automática:** Após 30 dias (cron job - roadmap)

#### Row Level Security (RLS) - Blindagem Total
- **Escopo:** TODAS as tabelas (100% de cobertura)
- **Isolamento:** Dados de um tenant NUNCA vazam para outro
- **Políticas:** 
  - SELECT/INSERT/UPDATE/DELETE baseados em `tenant_id` ou `user_id`
  - Funções RPC com `search_path = ''` (proteção contra hijacking)
- **Validação:** Testes automatizados de isolamento (roadmap)

### 4.5. Inteligência e Relatórios (Insights) 🔄 **[EM DESENVOLVIMENTO]**

#### Dashboard Executivo
- **KPIs:** Faturamento, Ticket Médio, Taxa de Ocupação, Clientes Ativos, Serviços Mais Vendidos
- **Gráficos:** Linha (tendências), Barra (comparações), Pizza (distribuição)
- **Período:** Hoje, Semana, Mês, Ano, Customizado

#### IA (Google Gemini) - Roadmap
- **Análise de Sentimentos:** Feedback de clientes (reviews)
- **Geração de Conteúdo:** Descrições de serviços, posts para redes sociais
- **Previsão de Demanda:** Sugestão de horários de pico
- **Chatbot:** Atendimento automatizado para agendamentos

### 4.6. Customização e Temas (Visual Engine) ✅ **[IMPLEMENTADO]**

#### Sistema Dual de Temas
- **Tema Barber (Brutalist):** 
  - Paleta: Preto (#0a0a0a), Dourado (#d4af37), Cinza (#1a1a1a)
  - Tipografia: Fontes fortes (Bebas Neue, Oswald)
  - Estética: Art Deco, texturas de ruído, sombras duras
  - Componentes: `BrutalCard`, `BrutalButton`, `BrutalBackground`
  
- **Tema Beauty (Elegant):**
  - Paleta: Roxo (#8b5cf6), Rosa Neon (#ec4899), Branco (#ffffff)
  - Tipografia: Fontes elegantes (Playfair Display, Cormorant)
  - Estética: Art Nouveau, glassmorphism, gradients suaves
  - Componentes: `BeautyCard`, `BeautyButton`, `BeautyBackground`

#### Detecção e Troca de Tema
- **Automática:** Via URL (`/barber/*` ou `/beauty/*`) ou preferência do usuário
- **Manual:** Toggle no painel de configurações
- **Persistência:** LocalStorage + Banco de Dados (preferência do tenant)

#### PWA Dinâmico 🆕
- **Logos:** `barber-logo.png` e `beauty-logo.png` em `public/`
- **Favicons:** Troca dinâmica via JavaScript
- **Manifests:** `manifest-barber.json` e `manifest-beauty.json`
- **Meta Tags:** Título, descrição e OG tags adaptados por tema
- **Instalação:** PWA instalável com branding correto do tema ativo

---

## 5. Requisitos Não-Funcionais

### 5.1. UX/UI e Design ✅ **[IMPLEMENTADO]**

#### Mobile-First
- **Responsividade:** Interface 100% adaptada para celulares (breakpoints: 320px, 768px, 1024px)
- **PWA:** Instalável, offline-ready (service worker), notificações push (roadmap)
- **Touch-Friendly:** Botões grandes (min 44x44px), gestos intuitivos

#### Aesthetic-Driven
- **Design como Feature:** O design não é apenas funcional, é uma **vantagem competitiva**
- **Micro-Interações:** Hover effects, loading states, animações de transição
- **Consistência:** Design System completo (Brutal/Beauty components)

#### Acessibilidade
- **WCAG 2.1 AA:** Contraste adequado, navegação por teclado, ARIA labels
- **Auditoria:** Lighthouse Accessibility Score > 90

### 5.2. Desempenho ✅ **[OTIMIZADO]**

#### Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

#### Otimizações
- **Bundling:** Vite (code splitting, tree shaking)
- **Imagens:** WebP, lazy loading, responsive images
- **Caching:** Service Worker (PWA), CDN (Vercel Edge)
- **Database:** Indexes otimizados, queries eficientes (EXPLAIN ANALYZE)

### 5.3. Segurança ✅ **[ENTERPRISE-GRADE]**

#### Camadas de Proteção
1. **Autenticação:** Clerk (2FA, Rate Limiting, Política de Senhas)
2. **Autorização:** RLS (Row Level Security) em 100% das tabelas
3. **Auditoria:** Logs completos de ações críticas
4. **Infraestrutura:** HTTPS obrigatório, CORS configurado, CSP headers
5. **Dados:** Criptografia em trânsito (TLS 1.3) e em repouso (Supabase)

#### Compliance
- **LGPD:** Consentimento de dados, direito ao esquecimento (soft delete)
- **PCI-DSS:** Stripe (não armazenamos dados de cartão)
- **Backups:** Diários (Supabase), retenção de 7 dias

### 5.4. Escalabilidade

#### Arquitetura
- **Multi-Tenant:** Isolamento por `tenant_id` (RLS)
- **Database:** PostgreSQL (Supabase) com connection pooling
- **Frontend:** CDN (Vercel Edge), static assets
- **Backend:** Supabase Edge Functions (Deno, auto-scaling)

#### Limites Atuais (Plano Free)
- **Usuários:** Ilimitados
- **Tenants:** Ilimitados (com RLS)
- **Storage:** 1GB (Supabase)
- **Bandwidth:** 2GB/mês (Supabase)

---

## 6. Stack Tecnológico

### Frontend
- **Framework:** React 19 (Vite)
- **Linguagem:** TypeScript
- **Estilização:** TailwindCSS v4 + CSS Modules (temas)
- **Ícones:** Lucide React
- **Roteamento:** React Router v6
- **Estado:** Context API + React Query (roadmap)

### Backend/BaaS
- **Plataforma:** Supabase
  - **Auth:** Clerk (híbrido com Supabase)
  - **Database:** PostgreSQL 15
  - **Storage:** Supabase Storage (imagens, logos)
  - **Realtime:** WebSockets (agendamentos em tempo real - roadmap)
  - **Edge Functions:** Deno (webhooks, automações)

### Pagamentos
- **Stripe:** Assinaturas (planos Pro/Enterprise)
- **Webhooks:** Sincronização de status

### IA
- **Google Gemini API:** Análise de sentimentos, geração de conteúdo (roadmap)

### Deploy
- **Hosting:** Vercel (Edge Network)
- **CI/CD:** GitHub Actions (testes, build, deploy)
- **Monitoramento:** Sentry (error tracking - roadmap)

### Ferramentas de Desenvolvimento
- **Testes:** Playwright (E2E), Vitest (Unit)
- **Linting:** ESLint, Prettier
- **Versionamento:** Git + GitHub
- **Documentação:** Markdown (PRD, ARCHITECTURE, CODEBASE)

---

## 7. Estrutura de Arquivos Principais

```
src/
├── pages/              # Telas principais
│   ├── Dashboard.tsx   # Dashboard executivo
│   ├── Agenda.tsx      # Gestão de agendamentos
│   ├── Financeiro.tsx  # Relatórios financeiros
│   ├── Clientes.tsx    # CRM de clientes
│   └── settings/       # Configurações
│       ├── Security.tsx      # 2FA, senhas
│       ├── AuditLogs.tsx     # Logs de auditoria
│       └── Trash.tsx         # Lixeira (soft delete)
├── components/         # Componentes reutilizáveis
│   ├── brutal/         # Tema Barber
│   │   ├── BrutalCard.tsx
│   │   ├── BrutalButton.tsx
│   │   └── BrutalBackground.tsx
│   ├── beauty/         # Tema Beauty
│   │   ├── BeautyCard.tsx
│   │   └── BeautyButton.tsx
│   └── shared/         # Componentes neutros
│       ├── DynamicLogo.tsx
│       └── ThemeToggle.tsx
├── hooks/              # Custom Hooks
│   ├── useTheme.ts     # Detecção/troca de tema
│   ├── use2FA.ts       # Autenticação 2FA
│   └── useAuditLog.ts  # Registro de ações
├── contexts/           # Context API
│   ├── AuthContext.tsx # Clerk + Supabase
│   └── ThemeContext.tsx
├── styles/             # Estilos globais
│   ├── brutal.css      # Variáveis tema Barber
│   └── beauty.css      # Variáveis tema Beauty
└── utils/              # Utilitários
    ├── supabase.ts     # Cliente Supabase
    └── clerk.ts        # Cliente Clerk

supabase/
├── migrations/         # Migrations SQL
│   ├── 20260216_rls_phase1_core.sql
│   ├── 20260216_rls_phase2_financial.sql
│   ├── 20260214_rate_limiting.sql
│   ├── 20260214_audit_logs.sql
│   └── 20260214_soft_delete.sql
└── functions/          # Edge Functions
    └── webhooks/
        └── stripe.ts

public/
├── barber-logo.png     # Logo Barber OS
├── beauty-logo.png     # Logo Beauty OS
├── manifest-barber.json
└── manifest-beauty.json
```

---

## 8. Glossário de Termos Técnicos

### Componentes de UI
- **Brutal Card:** Componente de cartão com bordas fortes, sombras duras e estética brutalista
- **Beauty Card:** Componente de cartão com glassmorphism, bordas suaves e gradients
- **Premium Background:** Sistema de camadas de fundo (imagem + sobreposição + efeitos)
- **Dynamic Logo:** Componente que alterna entre logos Barber/Beauty automaticamente

### Segurança
- **RLS (Row Level Security):** Políticas de acesso a nível de linha no PostgreSQL
- **2FA (Two-Factor Authentication):** Autenticação em dois fatores via TOTP
- **Rate Limiting:** Limitação de requisições para prevenir força bruta
- **Soft Delete:** Exclusão lógica (flag `deleted_at`) ao invés de física
- **Audit Log:** Registro de ações críticas para rastreabilidade

### Arquitetura
- **Multi-Tenant:** Múltiplos clientes (tenants) isolados na mesma instância
- **PWA (Progressive Web App):** Aplicação web instalável e offline-ready
- **Edge Functions:** Funções serverless executadas na borda (Deno)
- **BaaS (Backend as a Service):** Backend gerenciado (Supabase)

---

## 9. Roadmap de Funcionalidades

### ✅ Fase 1: MVP (Concluída)
- [x] Autenticação básica (Supabase Auth)
- [x] Agendamento interno e público
- [x] Gestão financeira básica
- [x] Temas Barber/Beauty
- [x] Dashboard com KPIs

### ✅ Fase 2: Enterprise Features (Concluída)
- [x] Migração para Clerk
- [x] 2FA (TOTP)
- [x] Rate Limiting
- [x] Audit Logs
- [x] Soft Delete (Lixeira)
- [x] RLS Total (100% cobertura)
- [x] PWA Dinâmico (logos, manifests)

### 🔄 Fase 3: Automação e IA (Em Desenvolvimento)
- [ ] Notificações WhatsApp (lembretes de agendamento)
- [ ] Integração Google Gemini (análise de sentimentos)
- [ ] Chatbot para agendamentos
- [ ] Previsão de demanda (IA)
- [ ] Geração automática de posts para redes sociais

### 📋 Fase 4: Expansão (Planejada)
- [ ] App Mobile Nativo (React Native)
- [ ] Integração com POS (Ponto de Venda)
- [ ] Programa de Fidelidade
- [ ] Marketplace de Produtos
- [ ] Multi-idioma (i18n)
- [ ] Relatórios Avançados (BI)

---

## 10. Métricas de Sucesso

### Técnicas
- **Uptime:** > 99.9%
- **Performance:** Core Web Vitals no verde (Lighthouse > 90)
- **Segurança:** Zero vulnerabilidades críticas (Snyk, OWASP)
- **Cobertura de Testes:** > 80% (Unit + E2E)

### Negócio
- **Churn Rate:** < 5% ao mês
- **NPS (Net Promoter Score):** > 50
- **Tempo de Onboarding:** < 15 minutos
- **Adoção de Features:** > 70% dos usuários usam 2FA

---

*Este documento serve como guia central para o desenvolvimento e evolução do projeto Beauty OS/Barber OS.*
