# Product Requirements Document (PRD) - AgenX (AIOS)

> **Versão:** 3.1  
> **Última Atualização:** 08/03/2026  
> **Status:** AIOS Core - Produção / Feature-Rich

---

## 1. Visão Geral do Produto

**Nome do Produto:** AgenX (AI Operating System)

**Descrição:**
O AgenX não é apenas um software de gestão, mas um **AI Operating System (AIOS)** projetado para atuar como um sócio virtual estratégico para barbearias e salões de beleza de alto nível. Com foco em crescimento de receita e redução de churn, o sistema combina uma interface premium (temas Brutalista/Barber e Elegante/Beauty) com um motor de inteligência que automatiza a recuperação de clientes e otimiza o ROI operacional.

**Proposta de Valor:**
Transformar a gestão administrativa de negócios de beleza em uma experiência visualmente impactante, **segura** e eficiente, permitindo que os proprietários foquem na arte e no atendimento ao cliente, enquanto o software cuida da organização com estilos que se adaptam à identidade da marca (Barbearia "Brutalista" ou Salão "Beauty").

**Diferenciais Competitivos:**
- 🎨 **Design Pro Max:** Temas visuais de elite (Brutalist/Elegant) com glassmorphism avançado.
- 🔐 **Segurança Enterprise:** Rate Limiting Customizado, Audit Logs e Row Level Security (RLS) total.
- 📱 **60 FPS Mobile UX:** Otimização agressiva de GPU para fluidez total em dispositivos móveis.
- 🧠 **Copiloto AIOS v3.0:** Motor proativo de marketing que identifica lucro em risco e automatiza reativação via WhatsApp.
- 🚀 **PWA Unificado:** Experiência cross-platform sob a marca AgenX com logos dinâmicos.

---

## 2. Objetivos do Negócio

- **SaaS B2B Multi-Tenant:** Oferecer o software como serviço por assinatura para múltiplos estabelecimentos com isolamento total de dados via RLS.
- **Diferenciação Visual:** Prover temas visuais de alta qualidade (Premium Themes) que elevam a percepção de valor do estabelecimento.
- **Segurança Enterprise:** Blindagem total contra ataques (força bruta, SQL injection, vazamento de dados entre tenants).
- **Eficiência Operacional:** Reduzir o tempo gasto em tarefas administrativas (agendamentos, fechamento de caixa, auditoria).
- **Escalabilidade:** Arquitetura pronta para atender centenas de estabelecimentos simultaneamente com performance consistente.
- **Compliance:** Rastreabilidade completa de ações (Audit Logs) e recuperação de dados (Recycle Bin).

---

## 3. Personas de Usuário

### 3.1. O Proprietário (Admin)
- **Responsabilidades:** Gerencia o negócio, define metas, visualiza relatórios financeiros e configura o sistema.
- **Necessidades:** Clareza nos dados, controle total, facilidade de uso, **segurança** e **rastreabilidade de ações**.
- **Novas Features:** Insight Narrativo de IA, radar de lucro, gestão de comissões e lixeira de dados.

### 3.2. O Profissional (Staff)
- **Responsabilidades:** Consulta a agenda, realiza atendimentos e registra serviços.
- **Necessidades:** Acesso rápido à agenda no celular, facilidade para marcar "concluído", consulta de comissões pendentes.
- **Novas Features:** Dashboard de profissional com cálculo de comissão em tempo real.

### 3.3. O Cliente Final
- **Responsabilidades:** Realiza agendamentos online através de um link público.
- **Necessidades:** Interface bonita, rápida, confirmação imediata (via WhatsApp), **confiança na plataforma**.
- **Novas Features:** Recebimento de convites personalizados via WhatsApp gerados por IA.

---

## 4. Requisitos Funcionais

### 4.1. Autenticação e Gestão de Contas ✅ **[IMPLEMENTADO]**

#### Autenticação Principal
- **Provedor:** Supabase Auth (Decisão estratégica: Manter Supabase para integração nativa com RLS)
- **Métodos:** E-mail/Senha
- **Segurança:** 
  - ✅ Rate Limiting via RPC (`check_login_rate_limit`)
  - ✅ Política de Senhas Fortes via Postgres Rules
  - ✅ Confirmação de E-mail obrigatória
- **Recuperação:** Reset de senha via e-mail (Supabase)

#### Gestão de Perfil
- **Estabelecimento:** Logo, Nome Fantasia, Endereço, Telefone, Redes Sociais, Subdomínio/Slug dinâmico.
- **Usuário:** Nome, E-mail, Foto, Preferências de Tema, Role (Owner/Staff).

### 4.2. Agendamento (Core) ✅ **[IMPLEMENTADO]**

#### Agenda Interna
- **Visualizações:** Diária, Semanal, Mensal
- **Funcionalidades:** Criar, Editar, Cancelar, Marcar como Concluído
- **Filtros:** Por profissional, por serviço, por status

#### Agendamento Online Público
- **Link Exclusivo:** `/book/:tenant_slug` (público, sem login)
- **Wizard Interativo:** Seleção de serviço → profissional → data → horário
- **Validação:** Bloqueio automático de horários indisponíveis

### 4.3. Gestão Financeira ✅ **[IMPLEMENTADO]**

#### Registro de Transações
- **Tipos:** Vendas, Serviços, Despesas
- **Métodos de Pagamento:** Dinheiro, Cartão, PIX

#### Comissões Automáticas 🆕
- **Regras:** Configuração de comissão fixa ou percentual por profissional/serviço.
- **Extrato:** Relatório de comissões pendentes vs pagas.
- **Ações:** Marcar pagamentos e emitir recibos de comissão.

#### Relatórios Financeiros
- **Dashboard:** Faturamento, Ticket Médio, Taxa de Ocupação.
- **Finance Doctor:** Diagnóstico de saúde financeira com sugestões de melhoria.

### 4.4. Segurança e Auditoria ✅ **[IMPLEMENTADO]**

#### Audit Logs
- **Eventos:** Rastreio de logins, alterações em agendamentos, finanças e configurações.
- **Informações:** User ID, Ação, Timestamp, Metadados JSON.

#### Recycle Bin (Lixeira) 🆕
- **Mecânica:** Soft Delete (`deleted_at` timestamp) para Clientes, Agendamentos e Transações.
- **Interface:** Tela de lixeira para Admin recuperar dados excluídos acidentalmente por 30 dias.

#### Row Level Security (RLS)
- **Isolamento:** Blindagem total onde um tenant nunca acessa dados de outro.
- **Políticas:** 100% de cobertura em todas as tabelas críticas.

### 4.5. Inteligência e Marketing (Copiloto AIOS) 🔄 **[EM EVOLUÇÃO]**

#### Marketing Copilot v3.0 🆕
- **Radar de Lucro:** Identificação automática de clientes em risco de Churn (>30 dias sem visita).
- **Receita Potencial:** Cálculo em tempo real de quanto dinheiro está "na mesa" baseado em gaps na agenda e clientes sumidos.
- **WhatsApp Deep Links:** Disparo de mensagens pré-preenchidas com links de agendamento.
- **AIOS Copywriter:** Geração de mensagens de reativação personalizadas via Google Gemini.
- **Insight Narrativo:** Texto contextual que explica o "porquê" de uma recomendação estratégica.

### 4.6. Customização e Temas ✅ **[IMPLEMENTADO]**

#### Sistema Dual de Temas
- **Tema Barber (Brutalist):** Foco em bordas fortes, dourado/preto, estética de barbearias clássicas.
- **Tema Beauty (Elegant):** Foco em glassmorphism, rosa/roxo/branco, estética de salões de beleza premium.
- **PWA Dinâmico:** Logos e manifests que alternam conforme o tema escolhido pelo estabelecimento.

---

## 5. Requisitos Não-Funcionais

### 5.1. UX/UI e Design ✅
- **60 FPS UX:** Otimização de GPU para transições fluidas no mobile.
- **Aesthetic-Driven:** Design brutalista/beauty como vantagem competitiva de produto.

### 5.2. Desempenho ✅
- **Core Web Vitals:** LCP < 2.0s em dispositivos móveis.
- **Vite:** Build otimizado com code splitting.

### 5.3. Segurança ✅
- **Supabase Enterprise Security:** RLS + Audit Logs + Custom Rate Limiting.
- **CORS & CSP:** Cabeçalhos configurados para evitar ataques XSS e CSRF.

---

## 6. Stack Tecnológico

- **Frontend:** React 19, TypeScript, TailwindCSS v4.
- **BaaS:** Supabase (Auth, Database, Storage, Edge Functions).
- **IA:** Google Gemini API (Copywriting & Insights).
- **Pagamentos:** Stripe (Assinaturas).
- **Testes:** TestSprite (E2E), Vitest (Unit).

---

## 9. Roadmap de Funcionalidades

### ✅ Fase 1: MVP (Concluída)
- [x] Agendamento e Gestão financeira básica.
- [x] Temas Barber/Beauty e Dashboard KPIs.

### ✅ Fase 2: Enterprise & Governança (Concluída)
- [x] RLS Total e Audit Logs.
- [x] Recycle Bin (Soft Delete).
- [x] Rate Limiting customizado.

### ✅ Fase 3: Copiloto AIOS v3.0 (Concluída)
- [x] Radar de Lucro (Churn Detection).
- [x] AI Copywriter (Gerador de Mensagens).
- [x] Sistema de Comissões Automáticas.
- [x] Integração profunda WhatsApp (Direct Link).

### 📋 Fase 4: Expansão (Planejada)
- [ ] Multi-idioma (i18n).
- [ ] Notificações Push PWA nativas.
- [ ] Relatórios avançados de BI com IA.
- [ ] App Mobile Nativo (React Native).

---

*Este documento reflete o estado consolidado da plataforma AgenX v3.1.*
