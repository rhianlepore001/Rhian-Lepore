# Product Requirements Document (PRD) - Beauty OS / Barber OS

## 1. Visão Geral do Produto
**Nome do Produto:** Beauty OS (com variante Barber OS)

**Descrição:**
O Beauty OS é uma plataforma SaaS (Software as a Service) "all-in-one" projetada para modernizar a gestão de salões de beleza e barbearias. O sistema oferece uma experiência premium e altamente visual, diferenciando-se pela estética cuidada e funcionalidades robustas que cobrem agendamento, gestão financeira, CRM de clientes e insights operacionais.

**Proposta de Valor:**
Transformar a gestão administrativa de negócios de beleza em uma experiência visualmente impactante e eficiente, permitindo que os proprietários foquem na arte e no atendimento ao cliente, enquanto o software cuida da organização com estilos que se adaptam à identidade da marca (Barbearia "Brutalista" ou Salão "Beauty").

## 2. Objetivos do Negócio
- **SaaS B2B:** Oferecer o software como serviço por assinatura para múltiplos estabelecimentos.
- **Diferenciação Visual:** Prover temas visuais de alta qualidade (Premium Themes) que elevam a percepção de valor do estabelecimento.
- **Eficiência Operacional:** Reduzir o tempo gasto em tarefas administrativas (agendamentos, fechamento de caixa).
- **Escalabilidade:** Arquitetura pronta para atender centenas de estabelecimentos simultaneamente.

## 3. Personas de Usuário
1.  **O Proprietário (Admin):**
    -   Gerencia o negócio, define metas, visualiza relatórios financeiros e configura o sistema.
    -   *Necessidade:* Clareza nos dados, controle total e facilidade de uso.
2.  **O Profissional (Staff):**
    -   Consulta a agenda, realiza atendimentos e registra serviços.
    -   *Necessidade:* Acesso rápido à agenda no celular, facilidade para marcar "concluído".
3.  **O Cliente Final:**
    -   Realiza agendamentos online através de um link público.
    -   *Necessidade:* Interface bonita, rápida e confirmação imediata (via WhatsApp/Email).

## 4. Requisitos Funcionais

### 4.1. Autenticação e Gestão de Contas
- Login/Cadastro seguro via E-mail/Senha (Supabase Auth).
- Recuperação de senha.
- Gestão de Perfil do Estabelecimento (Logo, Nome, Endereço).

### 4.2. Agendamento (Core)
- **Agenda Interna:** Visualização diária/semanal para o staff gerenciar horários.
- **Agendamento Online Público:** Link exclusivo para clientes finais marcarem horário sem login.
- **Gestão de Filas:** Visualização de clientes "Em Atendimento", "Aguardando" e "Concluídos".
-Bloqueio de horários indisponíveis automaticamente.

### 4.3. Gestão Financeira
- Registro de Vendas e Serviços.
- Fluxo de Caixa Diário/Mensal.
- Relatórios de Faturamento por Profissional.
- Integração com Stripe para pagamentos de assinatura do sistema.

### 4.4. Inteligência e Relatórios (Insights)
- Dashboard com KPIs (Faturamento, Ticket Médio, Taxa de Ocupação).
- Integração de IA (Gemini) para análise de sentimentos ou geração de descrições/marketing (roadmap).

### 4.5. Customização e Temas (Visual Engine)
- **Tema Barber (Brutalist):** Estética escura, dourada, art deco, fontes fortes, texturas de ruído.
- **Tema Beauty (Elegant):** Estética roxa, neon, art nouveau, brilhos, gradients suaves.
- **Switch Automático/Manual:** Capacidade de alternar o tema baseando-se na preferência do estabelecimento.

## 5. Requisitos Não-Funcionais

### 5.1. UX/UI e Design
- **Mobile-First:** Interface totalmente responsiva e otimizada para uso em celulares (PWA).
- **Aesthetic-Driven:** O design não é apenas funcional, é uma "feature" central. Uso de micro-interações e animações.

### 5.2. Desempenho
- Carregamento rápido (Vite + React).
- Otimização de imagens e assets.
- Funcionamento offline básico (PWA caching).

### 5.3. Segurança
- Row Level Security (RLS) no Supabase para isolar dados de diferentes estabelecimentos (Multi-tenant seguro).
- Proteção de rotas administrativas.

## 6. Stack Tecnológico
- **Frontend:** React 19, Vite, TypeScript.
- **Estilização:** CSS Modules / Custom Classes (Brutal/Beauty Themes), Lucide Icons.
- **Backend/Baas:** Supabase (Auth, Database, Edge Functions, Realtime, Storage).
- **Pagamentos:** Stripe integration.
- **AI:** Google Gemini API.
- **Deploy:** Vercel / Netlify (sugerido).

## 7. Estrutura de Arquivos Principais (Referência)
- `pages/`: Telas principais (Dashboard, Agenda, Financeiro).
- `components/`: Componentes reutilizáveis (Cards, Buttons, Inputs) adaptáveis aos temas.
- `styles/` ou `index.html`: Definições globais de variáveis CSS para os temas.
- `supabase/`: Migrations e Edge Functions.

## 8. Glossário de Temas
- **Brutal Card:** Componente de cartão com bordas fortes e sombras duras.
- **Beauty Card:** Componente de cartão com glassmorphism e bordas suaves.
- **Premium Background:** Sistema de camadas de fundo (imagem + sobreposição + efeitos).

---
*Este documento serve como guia central para o desenvolvimento e evolução do projeto Beauty OS.*
