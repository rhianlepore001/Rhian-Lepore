# Discovery Notes — AgenX (AIOS)
> Arquivo gerado automaticamente durante o workflow /build-saas.
> Fonte de verdade para geração dos PRDs. Não edite manualmente.

## Visão
- **Nome**: AgenX (ou AIOS - AI Operating System)
- **Problema**: Caos administrativo em barbearias e salões (agenda fura, descontrole financeiro, perda de clientes).
- **Pitch**: "A velocidade de agendamento do Booksy, com o design de luxo do Squire e a inteligência proativa de um gerente de marketing digital."
- **Funcionalidades Core (Diferenciais)**: 
    - Design adaptável (Barber/Brutalist ou Beauty/Elegant).
    - IA Caçadora de Clientes (Gemini/OpenRouter detecta inatividade e sugere mensagens via WhatsApp).
    - Performance PWA de alto nível (60 FPS) e segurança.

## Público-alvo e Personas
- **Público-alvo**: Dono de pequeno negócio (2 a 5 colaboradores).
    - **Perfil**: Usuário leigo em tecnologia, mas ambicioso. Sente o negócio "parado" e teme ficar para trás da concorrência. Busca uma solução que "pense por ele".
- **Personas**:
    - **Proprietário (Admin)**: Foco em estratégia, finanças e controle total.
    - **Profissional (Staff)**: Foco operacional, agenda e atendimentos.
- **Referências (Benchmarking)**:
    - **Booksy**: Facilidade e rapidez no agendamento público (sem fricção).
    - **Squire**: Estética premium e "cool", focada em marcas de elite.

## Funcionalidades (Escopo MVP)
- [x] Agendamento rápido e público (estilo Booksy).
- [x] Temas visuais de luxo adaptáveis (estilo Squire).
- [x] IA "Sócio Estratégico": Recuperação de clientes inativos (estratégia + copy pronto).
- [x] Fluxo financeiro simplificado para leigos.
- [x] Portfólio visual integrado via Supabase Storage.
- [x] Envio rápido via WhatsApp (Deep Link).

## Monetização
- **Modelo**: Assinatura + Créditos (IA e automações escalam conforme o uso).
- **Planos**:
    - **Standard (Essencial)**: Agendamento público, link personalizado e controle financeiro básico. Profissionalização visual.
    - **Growth (O "Sócio AI")**: Diagnóstico de lucro, recuperação de churn via IA e pacotes de créditos ativos.
    - **Elite (Escala Total)**: Automação máxima (mãos livres), gestão completa de portfólio no Storage, suporte prioritário.

## Técnico e Contexto
- **Stack**: React + Vite + Supabase + OpenRouter.
- **Foco**: 100% Mobile-first/PWA (Dono opera "em pé", ações rápidas).
- **Referências Visuais**:
    - **Brutalismo Moderno** (Barbearias - `BRUTAL_THEME_GUIDE.md`).
    - **Glassmorphism Elegante** (Salões - `BEAUTY_THEME_APLICADO.md`).
- **WhatsApp**: Estratégia Híbrida (Fase 1: Deep Link | Fase 2: Evolution API/n8n).
- **IA**: Orquestração via OpenRouter para alternar modelos (Gemini/Outros).
- **Prazo MVP**: 2 semanas ("Launch Ready").
- **Foco do Lançamento**: Polimento da IA (IAOS Engine), Gestão de Mídias (Storage) e UX Mobile impecável.

## PRD — User Stories

### Persona: Proprietário (Admin)
1. **Recuperação de Clientes**: "Como Proprietário, quero que o sistema me avise quando um cliente estiver há mais de 30 dias sem vir, para que eu possa enviar uma mensagem de incentivo e não perder faturamento."
    - *Critério de Aceite*: Lista de churn pendente com botão de "Envio Rápido via WhatsApp" com texto pronto gerado por IA.
2. **Visão Financeira**: "Como Proprietário, quero ver um dashboard simplificado com lucro real e comissões do time, para saber exatamente quanto dinheiro sobrou no fim do dia."
    - *Critério de Aceite*: Gráfico de faturamento vs despesas e tabela de comissão por colaborador atualizada em tempo real.
3. **Gestão Visual**: "Como Proprietário, quero trocar o tema visual do sistema conforme a identidade da minha marca, para que o cliente sinta que está em um ambiente premium desde o agendamento."
    - *Critério de Aceite*: Switch de tema entre Brutalist e Beauty refletido instantaneamente na UI e no link público.

### Persona: Profissional (Staff)
1. **Agenda Fluida**: "Como Profissional, quero visualizar minha agenda do dia de forma clara no celular, para organizar meus atendimentos sem precisar perguntar ao dono."
    - *Critério de Aceite*: Calendário vertical mobile-first com status de atendimento (Pendente, Em curso, Concluído).
2. **Portfólio Rápido**: "Como Profissional, quero subir fotos do corte logo após concluir o serviço, para alimentar meu portfólio no sistema e atrair novos clientes."
    - *Critério de Aceite*: Upload direto via câmera/galeria integrado ao fluxo de conclusão de agendamento.

## PRD — Requisitos Funcionais

### RF01 - Autenticação e Multi-tenancy
- Login via E-mail/Senha (Supabase Auth).
- Isolamento total de dados por estabelecimento (RLS).
- Gestão de convites para colaboradores (Staff).

### RF02 - Agenda AIOS
- Agendamento público otimizado com link único.
- Busca inteligente de horários disponíveis.
- Sincronização entre múltiplos profissionais.
- Status de atendimento: Pendente, Atendendo, Finalizado, Cancelado.

### RF03 - IA & Marketing (Core AIOS)
- Diagnóstico de Churn: Identificação automática de clientes inativos (>30 dias).
- Assistente de Copy: Geração de texto para WhatsApp (OpenRouter/Gemini).
- Dashboard de ROI: Impacto financeiro das estratégias de recuperação.

### RF04 - Gestão de Mídia & Temas
- Upload de avatar do staff e fotos de portfólio (Storage).
- Switch dinâmico de temas (Brutal vs Beauty).
- Banner customizável para o link público de agendamento.

### RF05 - Financeiro Simplificado
- Lançamento automático de receita ao finalizar atendimento.
- Controle de despesas fixas e variáveis.
- Cálculo de comissões por profissional.

## PRD — Requisitos Não-Funcionais

### RNF01 - Performance (PWA Excellence)
- Interface deve rodar a 60 FPS estáveis no mobile.
- Tempo de carregamento inicial (LCP) < 2s.
- Suporte a cache offline (PWA) para consulta de agenda.

### RNF02 - Segurança (Data Fortress)
- Políticas de RLS (Row Level Security) rigorosas no Supabase para isolamento total.
- Proteção de chaves de API sensíveis via Edge Functions (Auth Proxy).
- Backup diário automático via Supabase Managed Services.

### RNF03 - UX Premium (Squire Inspired)
- Design system unificado via Shadcn/ui + Tailwind.
- Feedback tátil/visual imediato para todas as ações.
- Fluxo de agendamento público em no máximo 3 cliques.

### RNF04 - Escalabilidade
- Suporte a múltiplos estabelecimentos (Multi-tenant) sem impacto em performance.
- Custos de IA controlados via limites de créditos por plano.

## Database — Entidades e Relações
- **`establishments`**: (Tenant) Dados da barbearia/salão (nome, tema, logo, banners).
- **`profiles`**: Usuários (Admin/Staff) vinculados ao Supabase Auth / Clerk.
- **`clients`**: Base CRM e alvo do radar de IA (telefone, histórico de comparecimento).
- **`services`**: Catálogo de serviços vendidos (preço, duração, fotos).
- **`working_hours` & `time_blocks`**: Grade de disponibilidade e bloqueios de horários.
- **`appointments`**: O agendamento em si (cliente + staff + serviço + data/hora + status).
- **`finance`**: Fluxo de caixa do estabelecimento (receitas e despesas).
- **`commissions`**: Divisão de lucros/repasses com a equipe.
- **`subscriptions`**: Saldos de IA e status dos Planos.
- **`ai_usage_logs`**: Razão de consumo da IA (ação, custo, timestamp).
- **`audit_logs` & `rate_limit_attempts`**: Segurança, rastreabilidade e anti-spam.

**Regras Arquiteturais do Banco (Enterprise):**
- **Exclusões**: 100% **Soft Delete** (`deleted_at`). Obrigatório para preservar a "memória" da IA (contexto histórico), cálculo de churn, métricas financeiras passadas e lixeira (30 dias).
- **Isolamento (Multi-tenant)**: 100% **RLS Blindado** via Supabase. Toda tabela (exceto `establishments`) tem `establishment_id` (NOT NULL). RLS intercepta o ID no JWT do Auth e bloqueia vazamentos, criando um modelo Zero-Trust.

## Backend — Edge Functions e Integrações
- **Edge Function `ai-proxy`**: Gateway centralizado para IA (Gemini/OpenRouter).
    - Validação de JWT + Verificação/Desconto de créditos.
    - Chamada segura à API (Key em Env Vars).
    - Registro automático em `ai_usage_logs`.
- **Processos Agendados (`pg_cron`)**:
    - **AIOS Daily Scan (02:00)**: Identificação de churn e geração de alertas/copy de marketing.
    - **Digest de Lembretes (22:00)**: Geração de lembretes para agendamentos do dia seguinte.
    - **Purga da Lixeira (Semanal)**: Hard Delete de registros em Soft Delete há >30 dias (higiene do banco).
- **Integrações Externas (MVP)**:
    - 100% Foco: **IA -> UX -> Deep Link -> WhatsApp (Manual)**.
    - Sem CRMs externos ou disparos de SMS/E-mail automatizados nesta fase.
    - Objetivo: Validar o "Motor de IAOS" (Radar de Lucro + Copywriter) com custo operacional mínimo e valor máximo.
- **Webhooks**: Stripe (Pagamentos/Assinaturas).

## Frontend — Páginas e Componentes
- **Navegação Principal**: **Bottom Navigation** (Mobile-first, foco em uso com uma mão).
    - **Dashboard**: Métricas rápidas e visão geral.
    - **Agenda**: Operação diária e calendário.
    - **IAOS Engine**: Destaque central (Radar de Lucro e IA).
    - **Financeiro**: Fluxo de caixa e comissões.
    - **Ajustes**: Configurações, Perfil e Lixeira.
- **Tecnologia**: React Router DOM + Framer Motion (60 FPS).

## Frontend — Design System
- **Biblioteca Base**: **shadcn/ui** (customização profunda via Tailwind CSS v4).
- **Visualização de Dados**: **Tremor** (KPIs de Lucro Recuperado e Ticket Médio).
- **Componentes Core**:
    - **Timeline Vertical**: Otimizada para Touch (substitui calendário desktop).
    - **Navegação via Gestos (Swipes)**: Para concluir atendimentos ou reagendar.
    - **Tematização Dinâmica**: Variáveis CSS customizadas para Brutalist e Beauty themes.

## Security — Decisões
- **Autenticação**: **Supabase Auth Nativo** (Soberania de Design e Integridade).
    - Telas customizadas seguindo o tema do estabelecimento (Brutalist/Beauty).
    - Métodos: E-mail/Senha + Google Login (via Supabase).
- **Isolamento de Dados**: **RLS (Row Level Security)** blindado via `establishment_id`.
- **Integridade**: JWT do Supabase validado em todas as Edge Functions.
- **Mídia & Performance**: Trava de 5MB por arquivo no Supabase Storage + Compressão via Frontend (Conversão para **WebP** de alta qualidade). Carregamento otimizado para 4G/5G.

## Fim das Notas


