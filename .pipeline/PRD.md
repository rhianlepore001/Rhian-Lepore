# PRD — AgendiX

**Versão:** 1.0  
**Data:** 2026-06-10  
**Status:** Documento consolidado a partir da codebase e documentação existente  
**Autor:** Pipeline de Produto (reverse-engineering)

---

## 1. Visão do Produto

### 1.1 Resumo Executivo

**AgendiX** é um SaaS B2B de gestão operacional para barbearias e salões de beleza no Brasil e Portugal. Substitui caderno de agenda, planilhas de Excel e anotações no WhatsApp por uma plataforma unificada: agenda inteligente, controle financeiro, gestão de equipe, link de agendamento público e fila digital.

O produto opera em modelo **multi-tenant** com isolamento por `company_id`, suporta dois temas visuais (barber/beauty) e é **mobile-first** — o público principal usa o celular entre um atendimento e outro.

### 1.2 Problema

Donos de barbearias e salões enfrentam:

- Agenda fragmentada (caderno, WhatsApp, planilha)
- Falta de visão financeira em tempo real (faturamento, lucro, comissões)
- Dificuldade em captar clientes online sem perder a experiência premium
- Gestão manual de equipe e comissões
- Walk-ins sem sistema de fila organizado

### 1.3 Solução

Uma plataforma única onde o dono consegue, de um relance:

- Ver quanto faturou hoje
- Saber quem está agendado
- Entender se está no lucro ou prejuízo
- Receber reservas online sem ligar
- Gerenciar fila de espera em tempo real
- Pagar comissões da equipe com clareza

### 1.4 Proposta de Valor

| Persona | Valor entregue |
|---------|----------------|
| **Dono (Owner)** | Sistema operacional do salão — agenda, financeiro, equipe, marketing |
| **Profissional (Staff)** | Agenda do dia, conclusão rápida, comissões e insights pessoais |
| **Cliente final** | Agendamento online rápido, fila digital, portal de reservas |

### 1.5 Diferencial Competitivo

- **Agendamento público premium** — experiência confiável e elegante, não chatbot lento
- **Gestão financeira simples** — "Excel do salão", não concorrente de ERP contábil
- **Mobile-first real** — informação crítica visível em 390px sem scroll
- **Dois temas nativos** — barber (dark/industrial) e beauty (claro/elegante)

---

## 2. Usuários e Personas

### 2.1 Persona Primária — Dono do Estabelecimento

- **Perfil:** Empreendedor pequeno/médio, nem sempre técnico
- **Contexto:** Gerencia agenda, financeiro e equipe no dia a dia
- **Dispositivo:** Majoritariamente celular
- **Mercados:** Brasil (prioridade) e Portugal (expansão)
- **Papel no sistema:** `owner` — acesso total

### 2.2 Persona Secundária — Profissional (Staff)

- **Perfil:** Barbeiro, cabeleireiro, manicure
- **Contexto:** Precisa ver agenda do dia e concluir atendimentos rapidamente
- **Papel no sistema:** `staff` — acesso restrito (própria agenda, comissões, insights)
- **Onboarding:** Via link de convite `/#/register?company={ownerUserId}`

### 2.3 Persona Terciária — Cliente Final

- **Perfil:** Consumidor que agenda corte, barba, manicure etc.
- **Contexto:** Quer rapidez e confiança no link de agendamento
- **Acesso:** Rotas públicas sem autenticação Supabase
- **Custo:** Gratuito (monetização via assinatura do salão)

---

## 3. Escopo do Produto

### 3.1 Módulos Incluídos (MVP + v1.0)

| Módulo | Descrição | Rotas principais |
|--------|-----------|------------------|
| **Autenticação** | Login, registro, recuperação de senha, 2FA TOTP | `/login`, `/register`, `/forgot-password` |
| **Onboarding** | Wizard 5 steps + guided mode + staff onboarding | `/onboarding-wizard`, `/staff-onboarding` |
| **Dashboard** | Receita do dia, meta mensal, saúde do negócio | `/` |
| **Agenda** | CRUD agendamentos, checkout, reservas públicas | `/agenda` |
| **Booking público** | Cliente agenda via link/QR | `/book/:slug` |
| **Fila digital** | Walk-ins via QR, gestão em tempo real | `/queue/:slug`, `/fila` |
| **CRM / Clientes** | Cadastro, histórico, tiers de fidelidade | `/clientes`, `/clientes/:id` |
| **Portal do cliente** | Histórico e gestão de reservas | `/minha-area/:slug` |
| **Financeiro** | Receitas, despesas, insights, exportação CSV | `/financeiro` |
| **Produtos** | Catálogo, venda avulsa, estoque | `/produtos` |
| **Equipe** | Profissionais, convites, comissões | `/configuracoes/equipe` |
| **Marketing** | Campanhas, oportunidades, calendário de conteúdo | `/marketing` |
| **Relatórios** | Insights e projeções | `/insights` |
| **Configurações** | Geral, serviços, booking, assinatura, segurança | `/configuracoes/*` |
| **Assinatura** | Trial 7 dias, planos Solo/Equipe, Stripe | `/configuracoes/assinatura` |
| **Auditoria** | Logs, lixeira (30 dias), erros do sistema | Dev-only |

### 3.2 Fora de Escopo (v1.0)

- Features de IA avançadas (AIOS, RAG semântico) — pós-MVP, não priorizar
- Notificações push nativas (placeholder em `/configuracoes/notificacoes`)
- Integração com ERPs contábeis (ContaAzul, etc.)
- App nativo iOS/Android (PWA via Vite)
- Multi-unidade / franquias

### 3.3 Roadmap Conhecido

- **v1.0 (concluída):** Migração hooks/services, produtos, paridade 10 `.feature`, polish mobile
- **Pós-launch:** Defense-in-depth RLS intra-tenant, polish lotes Q2, migração CommissionsSettings/ClientArea

---

## 4. User Stories

### 4.1 Dono (Owner)

#### US-001: Registro e Onboarding
**Como** dono de barbearia/salão, **quero** me registrar e configurar meu negócio, **para** começar a usar o sistema.

**Critérios de aceite:**
- [ ] Preencho email, senha, nome e nome do negócio
- [ ] Recebo trial de 7 dias automaticamente
- [ ] Sou guiado por wizard de onboarding (5 steps)
- [ ] Posso cadastrar serviços durante o onboarding
- [ ] Onboarding persiste progresso se eu sair e voltar
- [ ] Após completar, sou redirecionado para o dashboard

#### US-002: Dashboard e Métricas
**Como** dono, **quero** ver receita do dia, meta mensal e saúde do negócio, **para** acompanhar meu desempenho.

**Critérios de aceite:**
- [ ] Vejo receita do dia calculada de appointments completed
- [ ] Vejo meta mensal (configurável, default R$ 15.000)
- [ ] Vejo progresso percentual da meta
- [ ] Vejo score de saúde do negócio (Financial Doctor)
- [ ] Vejo ações sugeridas (recovery, gap, upsell)
- [ ] Vejo banner de comissões 1 dia antes do acerto
- [ ] Vejo banner de atendimentos não concluídos após 20h

#### US-003: Agenda e Agendamentos
**Como** dono, **quero** criar, editar e concluir agendamentos, **para** organizar meus atendimentos.

**Critérios de aceite:**
- [ ] Crio agendamento via wizard (cliente → serviços → data/hora → revisão)
- [ ] Sistema verifica colisão de horário server-side
- [ ] Aceito reservas públicas pendentes
- [ ] Ao aceitar, sistema sincroniza cliente com CRM
- [ ] Concluo agendamento com checkout (pagamento + taxa de maquininha)
- [ ] Checkout cria registro financeiro automaticamente
- [ ] Posso cancelar agendamentos (exceto já finalizados)

#### US-004: Reserva Pública (gestão)
**Como** dono, **quero** receber reservas de clientes via link, **para** aumentar minha base de clientes.

**Critérios de aceite:**
- [ ] Tenho slug único para link de reserva (`/book/:slug`)
- [ ] Cliente escolhe serviços, data, profissional
- [ ] Recebo notificação em tempo real de nova reserva
- [ ] Posso aceitar ou recusar reservas
- [ ] Cliente pode editar reserva existente
- [ ] Sistema previne duplicata por telefone

#### US-005: Fila Digital
**Como** dono, **quero** gerenciar uma fila de espera para walk-ins, **para** atender clientes sem agendamento.

**Critérios de aceite:**
- [ ] Cliente entra na fila via QR code/link
- [ ] Vejo lista de espera em tempo real
- [ ] Chamo cliente (notificação sonora)
- [ ] Inicio atendimento
- [ ] Finalizo atendimento (cria appointment + finance atomicamente)
- [ ] Posso marcar não comparecimento

#### US-006: Clientes e CRM
**Como** dono, **quero** gerenciar meus clientes e ver histórico, **para** fidelizar e reter clientes.

**Critérios de aceite:**
- [ ] Vejo lista de clientes com tiers (Bronze/Silver/Gold/Platinum)
- [ ] Sincronizo clientes públicos automaticamente
- [ ] Crio cliente manualmente com foto
- [ ] Edito dados do cliente
- [ ] Soft delete (preserva histórico)
- [ ] Vejo previsão de próxima visita
- [ ] Salvo observações com memória semântica (RAG) — pós-MVP

#### US-007: Equipe e Comissões
**Como** dono, **quero** cadastrar profissionais e gerenciar comissões, **para** remunerar minha equipe.

**Critérios de aceite:**
- [ ] Cadastro profissionais com foto, bio, especialidades
- [ ] Gero link de convite para staff
- [ ] Configuro taxa de comissão por profissional
- [ ] Configuro dia de acerto mensal
- [ ] Configuro taxa de maquininha (débito/crédito)
- [ ] Vejo comissões pendentes por profissional
- [ ] Pago comissões em lote
- [ ] Compartilho resumo via WhatsApp

#### US-008: Financeiro
**Como** dono, **quero** controlar receitas, despesas e lucro, **para** ter saúde financeira do negócio.

**Critérios de aceite:**
- [ ] Vejo visão geral com receita, despesa, lucro
- [ ] Registro transações manuais (receita/despesa)
- [ ] Despesas podem ser pagas ou pendentes
- [ ] Vejo insights (projeção, taxa de retorno, horário de pico)
- [ ] Vejo histórico mensal (12 meses) com growth%
- [ ] Exporto transações em CSV
- [ ] Deleto transação (cascade com appointment se aplicável)

#### US-009: Produtos
**Como** dono, **quero** cadastrar e vender produtos, **para** controlar estoque e receita de varejo.

**Critérios de aceite:**
- [ ] Cadastro produtos com preço, custo, estoque
- [ ] Vendo produto avulso (gera registro financeiro)
- [ ] Vejo alerta de estoque baixo
- [ ] Staff pode vender mas não editar catálogo
- [ ] Staff não vê custo/margem

#### US-010: Configurações Gerais
**Como** dono, **quero** configurar meu negócio, **para** personalizar o sistema.

**Critérios de aceite:**
- [ ] Edito nome, telefone, endereço
- [ ] Upload de logo e foto de capa
- [ ] Configuro horário de funcionamento
- [ ] Habilito/desabilito booking público
- [ ] Habilito upsells e seleção de profissional
- [ ] Configuro política de cancelamento

#### US-011: Assinatura
**Como** dono, **quero** assinar um plano pago, **para** continuar usando após o trial.

**Critérios de aceite:**
- [ ] Vejo planos Solo e Equipe
- [ ] Preços adaptados por região (BR/PT)
- [ ] Checkout via Stripe
- [ ] Assinatura ativa após pagamento
- [ ] Posso alterar plano

#### US-012: Segurança
**Como** dono, **quero** proteger minha conta, **para** evitar acessos não autorizados.

**Critérios de aceite:**
- [ ] Configuro 2FA TOTP
- [ ] Posso adicionar múltiplos dispositivos
- [ ] Posso remover dispositivos

---

### 4.2 Profissional (Staff)

#### US-S01: Registro via Convite
**Como** profissional, **quero** me registrar via link de convite do dono, **para** acessar o sistema.

**Critérios de aceite:**
- [ ] Recebo link de convite (`/#/register?company={ownerId}`)
- [ ] Preencho nome, email, senha
- [ ] Sistema cria conta vinculada ao owner
- [ ] Herdo assinatura e tema do owner
- [ ] Sou redirecionado para onboarding de staff

#### US-S02: Meu Dia
**Como** profissional, **quero** ver meus agendamentos do dia, **para** organizar meu trabalho.

**Critérios de aceite:**
- [ ] Vejo lista de agendamentos do dia
- [ ] Vejo quantos estão pendentes e concluídos
- [ ] Vejo meu faturamento do dia (comissões, não bruto)
- [ ] Marco agendamento como concluído com 1 toque
- [ ] Optimistic update (reverte se falhar)

#### US-S03: Agenda
**Como** profissional, **quero** ver minha agenda, **para** saber meus compromissos.

**Critérios de aceite:**
- [ ] Vejo apenas agendamentos atribuídos a mim
- [ ] Vejo agenda filtrada por data
- [ ] Vejo detalhes do agendamento
- [ ] Não posso cancelar agendamentos já finalizados

#### US-S04: Meus Insights
**Como** profissional, **quero** ver meus resultados, **para** acompanhar meu desempenho.

**Critérios de aceite:**
- [ ] Vejo total de atendimentos no período
- [ ] Vejo clientes únicos atendidos
- [ ] Vejo comissões pendentes (filtrado por `professional_id`)
- [ ] Vejo top serviços
- [ ] Filtro por dia, semana, mês
- [ ] Nunca vejo faturamento bruto da barbearia

---

### 4.3 Cliente Final

#### US-C01: Reserva Pública
**Como** cliente, **quero** agendar um horário online, **para** não precisar ligar.

**Critérios de aceite:**
- [ ] Acesso link do estabelecimento (`/book/:slug`)
- [ ] Vejo nome, rating, galeria do estabelecimento
- [ ] Seleciono serviços (com upsells se habilitado)
- [ ] Seleciono data (dias lotados marcados)
- [ ] Seleciono horário (slots de 30 min, 8h–20h)
- [ ] Seleciono profissional (ou "qualquer")
- [ ] Preencho nome, telefone, email
- [ ] Aceito política de cancelamento
- [ ] Recebo confirmação de reserva pending
- [ ] Acompanho status em tempo real

#### US-C02: Fila Digital
**Como** cliente, **quero** entrar na fila de espera, **para** ser atendido sem agendamento.

**Critérios de aceite:**
- [ ] Acesso QR code/link da fila (`/queue/:slug`)
- [ ] Preencho nome e telefone
- [ ] Seleciono serviço e profissional (opcional)
- [ ] Recebo posição na fila
- [ ] Vejo tempo estimado de espera
- [ ] Recebo notificação sonora quando chamado
- [ ] Acompanho status em tempo real

#### US-C03: Portal do Cliente
**Como** cliente, **quero** ver meu histórico e gerenciar reservas, **para** ter controle dos meus agendamentos.

**Critérios de aceite:**
- [ ] Acesso `/minha-area/:slug`
- [ ] Autentico com telefone
- [ ] Vejo histórico de reservas
- [ ] Vejo reservas futuras
- [ ] Posso cancelar reservas pending
- [ ] Posso editar perfil

---

## 5. Requisitos Funcionais

### 5.1 Autenticação e Autorização

| ID | Requisito |
|----|-----------|
| RF-AUTH-01 | Sistema deve autenticar via Supabase Auth (email/senha) |
| RF-AUTH-02 | Sistema deve suportar recuperação de senha por email |
| RF-AUTH-03 | Sistema deve implementar rate limiting de login (token bucket, bloqueio 1 min) |
| RF-AUTH-04 | Sistema deve distinguir roles `owner` e `staff` com guards de rota |
| RF-AUTH-05 | Staff deve herdar `user_type`, `business_name` e plano do owner |
| RF-AUTH-06 | Sistema deve suportar 2FA TOTP (enroll → challenge → verify) |
| RF-AUTH-07 | Todo query no banco deve filtrar por `company_id` (RLS) |
| RF-AUTH-08 | `company_id` deve vir exclusivamente da sessão Supabase, nunca de URL ou form |

### 5.2 Onboarding

| ID | Requisito |
|----|-----------|
| RF-ONB-01 | Wizard de onboarding deve ter 5 steps persistidos em `onboarding_progress` |
| RF-ONB-02 | Fonte canônica de conclusão: `onboarding_progress.is_completed` |
| RF-ONB-03 | Trial de 7 dias deve ser atribuído automaticamente no registro |
| RF-ONB-04 | Guided mode deve destacar elementos da UI via spotlight |
| RF-ONB-05 | Staff onboarding deve ser simplificado (saudação + acesso à agenda) |

### 5.3 Agenda e Agendamentos

| ID | Requisito |
|----|-----------|
| RF-AGD-01 | Agendamentos devem ter status: Pending, Confirmed, Completed, Cancelled |
| RF-AGD-02 | Criação de agendamento deve verificar colisão de horário server-side |
| RF-AGD-03 | Slots devem ser gerados em intervalos de 30 min, das 8h às 20h |
| RF-AGD-04 | Conclusão deve usar RPC `complete_appointment` (atômica) |
| RF-AGD-05 | Checkout deve registrar pagamento, taxa de maquininha e comissão |
| RF-AGD-06 | Staff não pode cancelar agendamentos com status Completed |
| RF-AGD-07 | Exclusão de histórico deve usar RPC `delete_appointment_with_finance` |
| RF-AGD-08 | Preço final pode ter desconto percentual; preço acima do base = "Custom" |

### 5.4 Booking Público

| ID | Requisito |
|----|-----------|
| RF-BKG-01 | Cliente deve acessar booking via `/#/book/:slug` sem autenticação |
| RF-BKG-02 | Reservas públicas iniciam com status `pending` até aprovação do owner |
| RF-BKG-03 | Ao aceitar, sistema deve espelhar em `appointments` e sincronizar CRM |
| RF-BKG-04 | Sistema deve buscar cliente existente por telefone (formatos BR e PT) |
| RF-BKG-05 | Cliente deve poder editar reserva via link com flag `is_edit` |
| RF-BKG-06 | Sistema deve prevenir duplicata por telefone (`UNIQUE(business_id, phone)`) |

### 5.5 Fila Digital

| ID | Requisito |
|----|-----------|
| RF-FILA-01 | Fila deve ter estados: waiting, calling, serving, completed, cancelled, no_show |
| RF-FILA-02 | Entrada na fila via `/#/queue/:slug` sem autenticação |
| RF-FILA-03 | Transição waiting → calling deve disparar som de notificação |
| RF-FILA-04 | Finalização deve usar RPC atômica `finish_queue_entry` |
| RF-FILA-05 | Entradas devem ser filtradas por dia atual |

### 5.6 CRM e Clientes

| ID | Requisito |
|----|-----------|
| RF-CRM-01 | Clientes devem ter tiers de fidelidade: Bronze, Silver, Gold, Platinum |
| RF-CRM-02 | Clientes públicos devem ser espelhados no CRM via RPC |
| RF-CRM-03 | Soft delete deve preservar histórico (lixeira 30 dias) |
| RF-CRM-04 | Portal do cliente deve autenticar por telefone em `/minha-area/:slug` |

### 5.7 Financeiro

| ID | Requisito |
|----|-----------|
| RF-FIN-01 | Receitas geradas automaticamente ao concluir agendamento |
| RF-FIN-02 | Despesas com status paid/pending; liquidação via RPC `mark_expense_as_paid` |
| RF-FIN-03 | Taxa de maquininha configurável (débito/crédito separados) |
| RF-FIN-04 | Staff vê apenas próprio financeiro (filtro por `professional_id`) |
| RF-FIN-05 | Owner vê visão consolidada com receita, despesa, lucro |
| RF-FIN-06 | Exportação de transações em CSV |
| RF-FIN-07 | Insights: projeção, taxa de retorno, horário de pico, histórico 12 meses |

### 5.8 Equipe e Comissões

| ID | Requisito |
|----|-----------|
| RF-EQP-01 | Profissionais cadastrados em `team_members` com slug público |
| RF-EQP-02 | Convite de staff via link com `company={ownerUserId}` |
| RF-EQP-03 | Comissão calculada por `commission_rate` via RPC `get_commissions_due` |
| RF-EQP-04 | Acerto mensal configurável com banner 1 dia antes |
| RF-EQP-05 | Pagamento de comissões em lote com resumo compartilhável (WhatsApp) |
| RF-EQP-06 | Portfolio público do profissional em `/pro/:slug` |

### 5.9 Produtos

| ID | Requisito |
|----|-----------|
| RF-PRD-01 | Owner cadastra/edita produtos com preço, custo e estoque |
| RF-PRD-02 | Venda avulsa via RPC `sell_product` gera `finance_records` |
| RF-PRD-03 | Staff pode vender mas não gerencia catálogo |
| RF-PRD-04 | Alerta visual de estoque baixo |
| RF-PRD-05 | RLS: staff lê ativos, owner CRUD; sem cross-tenant |

### 5.10 Configurações

| ID | Requisito |
|----|-----------|
| RF-CFG-01 | Horário de funcionamento em JSONB (`business_hours`) |
| RF-CFG-02 | Upload de logo e foto de capa (Supabase Storage) |
| RF-CFG-03 | Toggle booking público, upsells, seleção de profissional |
| RF-CFG-04 | Política de cancelamento configurável |
| RF-CFG-05 | Meta mensal configurável (default R$ 15.000) |

### 5.11 Assinatura e Billing

| ID | Requisito |
|----|-----------|
| RF-BIL-01 | Planos: Solo (R$ 34,90 / € 9,90) e Equipe (R$ 59,90 / € 19,90) |
| RF-BIL-02 | Trial de 7 dias; após expiração, paywall |
| RF-BIL-03 | Checkout Stripe via Edge Function `create-checkout-session` |
| RF-BIL-04 | Assinatura ativa se status: active, subscriber, ou trial válido |
| RF-BIL-05 | Staff herda plano do owner |

### 5.12 Marketing (Owner)

| ID | Requisito |
|----|-----------|
| RF-MKT-01 | Detecção de churn via `get_marketing_opportunities` |
| RF-MKT-02 | Campanhas de reativação segmentadas por LTV |
| RF-MKT-03 | Calendário de conteúdo com feriados BR (OpenRouter) — pós-MVP |

### 5.13 Auditoria e Segurança

| ID | Requisito |
|----|-----------|
| RF-AUD-01 | Audit logs automáticos por trigger em 6 tabelas |
| RF-AUD-02 | Lixeira com retenção de 30 dias e restore via RPC |
| RF-AUD-03 | System errors com níveis de severity (fire-and-forget) |
| RF-AUD-04 | Rotas de auditoria restritas a dev (`DevRouteGuard`) |

---

## 6. Requisitos Não-Funcionais

### 6.1 Segurança

| ID | Requisito |
|----|-----------|
| RNF-SEC-01 | Row Level Security ativo em todas as tabelas |
| RNF-SEC-02 | Isolamento multi-tenant por `company_id` — query sem filtro retorna vazio silenciosamente |
| RNF-SEC-03 | Secrets em variáveis de ambiente (`VITE_*`), nunca hardcoded |
| RNF-SEC-04 | Rate limiting de login via RPC |
| RNF-SEC-05 | 2FA TOTP disponível para owners |
| RNF-SEC-06 | Operações críticas via RPCs `SECURITY DEFINER` com validação de tenant |
| RNF-SEC-07 | Staff nunca vê faturamento bruto — apenas comissões próprias |

### 6.2 Performance

| ID | Requisito |
|----|-----------|
| RNF-PERF-01 | Lazy loading de todas as páginas com `React.lazy()` + `<Suspense>` |
| RNF-PERF-02 | PWA com auto-update (vite-plugin-pwa) |
| RNF-PERF-03 | Optimistic updates em ações frequentes (conclusão de agendamento) |
| RNF-PERF-04 | Realtime Supabase para fila e reservas públicas |

### 6.3 UX e Acessibilidade

| ID | Requisito |
|----|-----------|
| RNF-UX-01 | Mobile-first: informação crítica visível em 390px sem scroll |
| RNF-UX-02 | Touch targets mínimo 48×48dp |
| RNF-UX-03 | WCAG 2.1 AA — contrastes verificados, focus trap em modais |
| RNF-UX-04 | `prefers-reduced-motion` respeitado |
| RNF-UX-05 | Copy em português brasileiro; sem jargão técnico na interface |
| RNF-UX-06 | Estados de erro próximos ao campo, não no topo da página |
| RNF-UX-07 | Dois temas: barber (dark industrial) e beauty (light elegante) |
| RNF-UX-08 | Modo claro e escuro em ambos os temas |
| RNF-UX-09 | Progressive disclosure em configurações complexas |

### 6.4 Confiabilidade

| ID | Requisito |
|----|-----------|
| RNF-REL-01 | Operações financeiras atômicas via RPC (checkout, fila, delete) |
| RNF-REL-02 | Fallback client-side documentado apenas quando RPC falha |
| RNF-REL-03 | 227+ testes Vitest passando; CI com lint, typecheck, build, coverage |

### 6.5 Compatibilidade

| ID | Requisito |
|----|-----------|
| RNF-COMP-01 | HashRouter (`/#/rota`) para compatibilidade com deploy estático |
| RNF-COMP-02 | Node.js 18+; React 19; TypeScript 5.8 strict |
| RNF-COMP-03 | Deploy Vercel; backend Supabase (PostgreSQL) |

---

## 7. Modelo de Negócio

### 7.1 Monetização

- **Modelo:** SaaS B2B — assinatura mensal por salão
- **Clientes finais:** Gratuito
- **Trial:** 7 dias sem cartão

### 7.2 Planos

| Plano | Brasil | Portugal | Público |
|-------|--------|----------|---------|
| **Solo** | R$ 34,90/mês | € 9,90/mês | Barbearia individual |
| **Equipe** | R$ 59,90/mês | € 19,90/mês | Salão com equipe |

Plano recomendado: Equipe para beauty, Solo para barber.

### 7.3 Go-to-Market

1. Barbershops primeiro (tema barber)
2. Salões de beleza em sequência (tema beauty)
3. Expansão Portugal

---

## 8. Métricas de Sucesso

### 8.1 Métrica Norte

**Número de agendamentos feitos pelo link público / mês**

### 8.2 Métricas Secundárias

| Métrica | Descrição |
|---------|-----------|
| Ativação | % owners que completam onboarding em 7 dias |
| Retenção | % assinaturas ativas após trial |
| Engajamento staff | Agendamentos concluídos/dia por profissional |
| Conversão booking | Reservas públicas aceitas / total recebidas |
| Saúde financeira | % owners com meta mensal > 50% no dia 15 |
| NPS implícito | Taxa de retorno de clientes (churn inverso) |

### 8.3 Critério de Sucesso do Produto

> Dono do salão consegue ver de um relance: quanto faturou hoje, quem está agendado, se está no lucro ou prejuízo.

---

## 9. Design e Identidade

### 9.1 Personalidade da Marca

**Premium mas acessível.** Três palavras: **elegante, confiável, eficiente**.

### 9.2 Anti-referências

- Planilha Excel com cor
- Dashboard genérico de SaaS (big numbers + sparkline clichês)
- Glassmorphism decorativo
- Tema "lavado" sem contraste
- Chatbot lento no booking público

### 9.3 Princípios de Design

1. Mobile-first, sempre
2. Ações antes de dados
3. Calma sob pressão
4. Progressive disclosure
5. Consistência cross-tema (barber/beauty são irmãos)

*Tokens visuais detalhados em `DESIGN.md` e `design-system/MASTER.md`.*

---

## 10. Arquitetura e Stack (Referência)

| Camada | Tecnologia |
|--------|------------|
| Frontend | React 19, TypeScript 5.8, Vite 6, Tailwind CSS |
| Routing | react-router-dom 7 (HashRouter) |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| Pagamentos | Stripe (checkout session) |
| IA | OpenRouter / Gemini Flash (pós-MVP) |
| Deploy | Vercel |
| Testes | Vitest, Testing Library, Playwright (E2E) |

### 10.1 Edge Functions

- `create-checkout-session` — Stripe checkout
- `send-appointment-reminder` — Lembretes de agendamento

### 10.2 Padrões de Código

- Data layer: `services/` + `hooks/` (migração v1 concluída)
- Contextos globais: `AuthContext`, `AlertsContext`, `UIContext`
- Alias `@/` aponta para raiz do projeto

---

## 11. Lacunas e Riscos Conhecidos

| ID | Lacuna | Severidade | Status |
|----|--------|------------|--------|
| L1 | Lógica exata de Loyalty Tier | Médio | Não documentada |
| L2 | Critérios do Data Maturity Score | Médio | Na RPC, não no frontend |
| L3 | Comissão com múltiplos profissionais | Baixo | Não documentada |
| L4 | Upgrade/downgrade de plano | Médio | Não documentada |
| L5 | Retenção de memória semântica (RAG) | Moderado | Sem limite |
| L6 | Staff filtra financeiro por nome (não ID) | Moderado | Mitigar com `professional_id` |
| L7 | Notificações push | — | Placeholder, fora de escopo v1 |

*Gaps críticos G1–G3 e G16 resolvidos em v1.0 (histórico em `docs/v1/TASKBOARD.md`, arquivado).*

---

## 12. Dependências e Integrações

| Integração | Uso | Variável de ambiente |
|------------|-----|---------------------|
| Supabase | Auth, DB, Storage, Realtime, Edge Functions | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Stripe | Assinaturas e checkout | Via Edge Function (server-side) |
| OpenRouter | IA, calendário de conteúdo | `VITE_OPENROUTER_API_KEY` |
| Vercel | Hosting e deploy | — |

---

## 13. Glossário

| Termo | Definição |
|-------|-----------|
| **Atendimento** | Compromisso entre cliente e profissional (agendamento) |
| **Checkout** | Finalização de atendimento com pagamento e comissão |
| **Fila Digital** | Fila de espera em tempo real para walk-ins |
| **Reserva Online** | Agendamento público via link/QR sem interação do owner |
| **Espelhamento** | Sincronização public_bookings → appointments/clients |
| **Slot** | Horário disponível calculado a partir de business_hours |
| **Trial** | Período de teste de 7 dias |

*Glossário completo em `GLOSSARY.md`.*

---

## 14. Referências

| Documento | Conteúdo |
|-----------|----------|
| `PRODUCT.md` | Visão de produto e personalidade |
| `DESIGN.md` | Design system e tokens |
| `GLOSSARY.md` | Termos de domínio |
| `_reversa_sdd/domain.md` | Regras de negócio |
| `_reversa_sdd/user-stories/` | User stories detalhadas |
| `docs/v1/TASKBOARD.md` | Histórico v1.0 (arquivado) |
| `docs/fase-*.md` | Specs por fase de implementação |

---

## 15. Aprovação

| Papel | Nome | Data | Status |
|-------|------|------|--------|
| Produto | — | 2026-06-10 | Rascunho gerado |
| Engenharia | — | — | Pendente |
| Design | — | — | Pendente |

---

*Próximo passo sugerido: `/pipeline tech` para decisões técnicas ou `/pipeline spec` para SPEC implementável.*
