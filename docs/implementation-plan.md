# Plano de Implementação — AgenX (AIOS)

> **Prazo Final**: 2 Semanas ("Launch Ready")
> **Estrutura**: Batches Ágeis (5 a 15 min por tarefa) organizados por prioridade.

---

## 📅 Semana 1: Estrutura, Banco e Auth (Foundation)

O objetivo desta semana é ter o "cofre" seguro e os fluxos de login e agendamento base rodando.

### Batch 1: Infraestrutura e Supabase Auth (Dia 1-2)
- [ ] **Configuração do Supabase**: Criar projeto e configurar Auth.
- [ ] **Auth Customizado**: Implementar telas de Login/Registro para os temas Brutalist/Beauty.
- [ ] **Auth Hook**: Criar `useAuth` e `AuthProvider` no React.
- [ ] **Auth Redirects**: Configurar rotas protegidas por tenant.

### Batch 2: Database Schema e RLS (Dia 2-3)
- [ ] **Tables DDL**: Rodar SQL de criação das tabelas (PRD Backend).
- [ ] **RLS Blindado**: Criar policies de `establishment_id` em todas as tabelas.
- [ ] **Soft Delete Logic**: Criar trigger de `deleted_at` (opcional) ou padronizar updates.
- [ ] **Seed Data**: Popular banco com estabelecimentos e serviços de teste.

### Batch 3: UI Core e Design System (Dia 3-4)
- [ ] **Setup shadcn/ui**: Instalar e configurar com Tailwind v4.
- [ ] **Tematização**: Criar `ThemeProvider` para switch Brutalist/Beauty.
- [ ] **Bottom Nav**: Implementar componente de navegação inferior.
- [ ] **Layout Base**: Criar wrapper de página móvel-first.

### Batch 4: Agendamento e Timeline (Dia 4-5)
- [ ] **Service Catalog**: CRUD de serviços com portfólio de imagens.
- [ ] **Timeline Vertical**: Scroll infinito de agendamentos.
- [ ] **Swipe Actions**: Gestos para "Finalizar" e "Cancelar" horários.
- [ ] **Availability Logic**: Cálculo de horas vagas no frontend.

---

## 📅 Semana 2: IA, Financeiro e Launch (Polish)

O objetivo desta semana é integrar o "cérebro" do sistema e polir a experiência mobile.

### Batch 5: IAOS Engine e Edge Functions (Dia 6-7)
- [ ] **Edge Function `ai-proxy`**: Proxy seguro para OpenRouter/Gemini.
- [ ] **Créditos IA**: Sistema de desconto de créditos por uso.
- [ ] **Radar de Lucro**: Configurar `pg_cron` para scan de churn (02:00).
- [ ] **Copywriter Logic**: UI para geração e edição de texto de recuperação.

### Batch 6: Financeiro e Dashboards (Dia 7-8)
- [ ] **Cash Flow**: Registro automático de receita ao fechar agendamento.
- [ ] **Comissões**: Cálculo automatizado por profissional.
- [ ] **Charts (Tremor)**: Implementar gráficos de lucro e ROI de recuperação.
- [ ] **Lixeira**: Painel administrativo para restaurar itens em Soft Delete.

### Batch 7: Polimento e PWA (Dia 9-10)
- [ ] **WebP Compression**: Frontend helper para converter imagens antes do upload.
- [ ] **Deep Link WhatsApp**: Helper para abrir WhatsApp Web/App com texto.
- [ ] **Configurações**: Cadastro de logo, banners e ajuste de horário de funcionamento.
- [ ] **PWA Setup**: Service worker, Manifesto e ícone na homescreen.

### Batch 8: Testes e Launch (Dia 10)
- [ ] **Vulnerability Scan**: Rodar auditoria de segurança básica.
- [ ] **UX Audit**: Verificar se tudo roda a 60 FPS no mobile.
- [ ] **Stripe Integration**: Linkar webhooks de assinatura (Standard -> Growth -> Elite).
- [ ] **Launch**: Deploy final no Vercel/Supabase.

---

## ✅ Definição de Concluído (DoD)
1. Código limpo e modular (Clean Code).
2. Sem vazamento de dados entre empresas (RLS Verificado).
3. Passa nos testes de performance mobile.
4. IA gerando texto contextual e descontando créditos.
