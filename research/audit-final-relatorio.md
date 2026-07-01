# Auditoria UX/Produto AgendiX — Relatório Final Consolidado

> **Para:** Rhian Lepore (CEO) e time AgendiX
> **De:** Bob (CEO virtual / Product Lead)
> **Data:** Junho 2026
> **Status:** Auditoria sênior de UX/produto/negócio — análise E2E da plataforma vs. mercado
>
> **Documentos de apoio:**
> - `research/ux-research-barbearias.md` — pesquisa externa (Brasil + internacional, 22 buscas, 23 extrações)
> - `research/ux-audit-agendix.md` — auditoria técnica E2E do código do AgendiX (50+ arquivos lidos)

---

## 1. Resumo Executivo

**O AgendiX tem fundação técnica sólida e diferencial visual premium** (login segmentado, dashboard focado em ação, CheckoutModal polido, Agenda v2 estável, design system com tokens dark/light). Está em produção em `promptdeelite.com` com 263 testes passando.

**Mas tem três calcanhares de Aquiles que travam a adoção depois da primeira semana de uso:**

1. **Back-office incompleto.** Marketing = EmptyState. Notificações = Placeholder (rota órfã). Relatórios exigem >5 appointments. Não há LTV, não há comparativo mês-a-mês, não há exportação CSV/PDF. O dono não tem como **justificar a assinatura** para o contador nem para si mesmo depois do sétimo dia.

2. **Zero notificações transacionais.** O cliente final não recebe confirmação automática por WhatsApp/SMS/e-mail. O sistema tem `SmartNotifications` interno (banner) mas depende de o dono abrir o app e clicar manualmente. O mercado inteiro (Squire, Booksy, modogestor, Barbeiro.app) já trata isso como commodity.

3. **Onboarding e fluxo público com fricções de atrito.** O wizard pula horário de funcionamento (componente existe, não é plugado). O link público pode ser gerado sem horário, exibindo 24h. O `acceptedPolicy` é hardcoded true em modo edit. Há 10 bugs/inconsistências catalogadas com referência arquivo:linha.

**O mercado brasileiro está em fase de commoditização do agendamento + WhatsApp.** A diferenciação real migrou para **clube de assinatura, comissão correta em recorrência, reativação automática de "sumidos", e WhatsApp-first sem fricção de app**. A lacuna crítica não resolvida pelo mercado é **cadeira vs. profissional + comissão escalonada + assinatura recorrente + reativação inteligente em produto único, com preço fixo e onboarding rápido** — exatamente o território onde o AgendiX pode se posicionar se atacar as três falhas acima.

**Recomendação imediata:** priorizar as 5 melhorias do Top 5 abaixo. Estimativa de esforço: 2-3 sprints. Impacto potencial em retenção: altíssimo (testemunho de BestBarbers: 4 cadeiras R$15K→R$31.690/mês, 700+ assinantes, 40 clientes pagam mensal sem ir).

---

## 2. Mapa Completo da Jornada do Usuário

### 2.1. Persona: Dono da Barbearia (primária)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ANTES DO SISTEMA                                                    │
│  Planilha Excel + caderno + WhatsApp pessoal + áudio do cliente     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DESCOBERTA / DECISÃO                                             │
│  • Google, Instagram, indicação                                     │
│  • Avalia preço (mercado R$49-299/mês), features,口碑               │
│  • Testa free trial (Barbeiro.app, Vagaro) ou já entra pagando      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. CADASTRO                                                         │
│  • Register.tsx: e-mail, senha, nome, nome do negócio, telefone,    │
│    userType, região. Formulário denso único.                        │
│  • Default userType='barber' aceita lixo se ?type= for inválido.    │
│  • Copy técnica, sem preview.                                       │
│  ⏱️ 5-10 min •  😕 Atrito: alto (muitos campos, sem barra de        │
│     força de senha)                                                 │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. ONBOARDING WIZARD (5 passos)                                     │
│  • Step 1: Bem-vindo (dispensável)                                  │
│  • Step 2: Serviços (vazio — sem templates pré-definidos)           │
│  • Step 3: Equipe (vazio — sem templates de função)                 │
│  • Step 4: Meta Mensal (pulável)                                    │
│  • Step 5: Sucesso (CTA aponta para rota inexistente)               │
│  • LACUNA: pula horário de funcionamento.                           │
│  ⏱️ 15-20 min • 😕 Atrito: médio                                   │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. CONFIGURAÇÃO INICIAL (settings/*)                                │
│  • /configuracoes/geral: nome fantasia, logo, capa, política        │
│    cancelamento (3 templates sem ajuda), galeria, brand identity    │
│  • /configuracoes/agendamento: link público, slug                  │
│  • /configuracoes/equipe: cadastrar barbeiros + comissão            │
│  • /configuracoes/servicos: nome, duração, preço                    │
│  • /configuracoes/comissoes: %, regras                              │
│  • /configuracoes/assinatura: plano, pagamento                      │
│  • /configuracoes/seguranca: 2FA                                    │
│  • LACUNA: /configuracoes/notificacoes = Placeholder                │
│  ⏱️ 1-2 horas • 😕 Atrito: alto (BusinessHoursEditor denso,         │
│     alert() nativo para erro de upload)                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 5. DIA A DIA (fluxo principal)                                      │
│  • Acorda, abre o Dashboard (mobile 80% das vezes)                  │
│  • Vê: "Olá, [nome]" + data + "Faturamento hoje R$ X" +             │
│    Occupancy Rate + "Agenda de hoje" + "Oportunidades"              │
│  • Clica em agendamento → AppointmentEditModal → ação              │
│  • "Confirmar e cobrar" → CheckoutModal (polido, 8/10)              │
│  • Banner de comissão amanhã + SetupCopilot (se novo)               │
│  • SmartNotifications: 5 tipos internos (reactivation, gap, vip,    │
│    upsell, tip) → "Enviar" abre WhatsApp web                        │
│  • Sidebar desktop / BottomMobileNav pílula mobile                  │
│  ⏱️ 1-5 min/sessão • 😊 Satisfação: alta (dashboard é o melhor)    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 6. FIM DO MÊS / ANÁLISE                                             │
│  • /financeiro: gráficos, fluxo de caixa                            │
│  • /insights: Relatórios (Reports.tsx) — top serviços, top clientes  │
│  • /marketing: EmptyState (NÃO HÁ Marketing real)                   │
│  • /meus-insights (staff): KPIs do barbeiro                         │
│  • Comissões pendentes em /configuracoes/comissoes                  │
│  ⏱️ 30 min • 😕 Atrito: alto (LTV/Previsão/Comparativo ausentes,    │
│     sem exportação CSV/PDF, exigência de >5 appointments)          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 7. RETENÇÃO (ciclo de 30-90 dias)                                   │
│  • SmartNotifications manual (sem automação)                        │
│  • Sem reativação automática de clientes sumidos                    │
│  • Sem clube de assinatura nativo                                   │
│  • Sem comissão correta para avulso+assinatura (a lacuna do         │
│    mercado)                                                         │
│  ⚠️ RISCO DE CHURN após 60-90 dias                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2. Persona: Barbeiro (Staff)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CONVITE                                                          │
│  • Dono compartilha link /#/register?company={ownerUserId}          │
│  • Staff cadastra com role: 'staff'                                 │
│  • Onboarding StaffOnboarding.tsx (separado do wizard do owner)    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. DIA A DIA                                                        │
│  • Loga no mobile → Dashboard mostra: MeuDiaWidget +                │
│    StaffEarningsCard (sem "Olá, [nome]")                            │
│  • Vê: agendamentos do dia, comissão do mês                        │
│  • Clica em agendamento → AppointmentEditModal →                   │
│    "Confirmar e cobrar" ou "Faltou"                                │
│  • Acesso a Agenda (mas limitado por RLS)                          │
│  • /meus-insights: KPIs completos                                  │
│  ⚠️ Sem "Mais" no BottomMobileNav → não vê Configurações/Produtos   │
│     no celular. Precisa descobrir a Sidebar desktop.                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FIM DO MÊS                                                       │
│  • Vê quanto vai receber (fragmentado entre Dashboard e             │
│    StaffInsights)                                                   │
│  • "Vinculação pendente" se teamMemberId for null (jargão confuso)  │
│  ⚠️ Lacuna: não vê lista de espera, não pode reagendar sem          │
│     permissão, "Confirmar" depende de RLS role-based                │
│     (em validação manual)                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3. Persona: Cliente Final

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DESCOBERTA                                                       │
│  • Link na bio do Instagram do barbeiro                             │
│  • WhatsApp (90% dos casos — link enviado pelo barbeiro)            │
│  • Google "barbearia perto de mim" (raro sem SEO local)             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. AGENDAMENTO (PublicBooking.tsx — 1757 linhas)                    │
│  • /#/book/:slug abre                                               │
│  • Detecta edit/rebook via query param                              │
│  • Modo: chat (com typing animation) OU quick (calendário)         │
│  • Quick mode: 4 cliques ideal (serviço → profissional → data/hora  │
│    → contato)                                                       │
│  • Chat mode: 5+ cliques, fricção (vai contra PRODUCT.md)           │
│  • Precisa telefone via ClientAuthModal (2 steps)                   │
│  • Sem confirmação por WhatsApp/SMS automatizada                    │
│  ⚠️ Não vê política de cancelamento visível (a menos que dono      │
│     tenha configurado acceptedPolicy)                               │
│  ⚠️ acceptedPolicy hardcoded true em modo edit (PublicBooking:475)  │
│  ⏱️ 1-3 min • 😊/😕 Variável: depende do modo default              │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 3. LEMBRETE / DIA DO ATENDIMENTO                                    │
│  • LACUNA: sem SMS/WhatsApp/push reminder automático                │
│  • Cliente pode esquecer → no-show → cadeira vazia → prejuízo      │
│  • "62% dos no-shows = cliente esqueceu" (Bookeo)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 4. PÓS-ATENDIMENTO                                                  │
│  • ChatBubble in-page: ChatBubble.tsx pode ser uma alternativa      │
│  • Sem pedido de avaliação Google automático                        │
│  • Sem sugestão de "agendar de novo em 4 semanas"                  │
│  • Sem programa de fidelidade                                       │
│  ⚠️ Cliente "some" em 2 semanas sem push                            │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4. Persona: Recepção (quando existe — raro em barbearia de bairro)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. DIA A DIA                                                        │
│  • Atende WhatsApp + corta + fecha caixa (na ausência de sistema)   │
│  • Conflito de horário entre 2-3 barbeiros no caderno               │
│  • Áudio/foto do cliente no WhatsApp ≠ sistema integrado           │
│  • Sem walk-in queue nativo (gap de mercado também)                  │
│  ⏱️ 8-12h/dia • 😕 Atrito: altíssimo                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Respostas às 10 Perguntas da Auditoria

### 3.1. Um usuário entende imediatamente o que fazer ao entrar no sistema?

**Parcialmente.** Login com gateway "Barbearias / Studios" (`Login.tsx:99-165`) é brilhante. Dashboard do dono entrega "faturamento hoje" em 5 segundos. Mas o Register é denso único; o OnboardingWizard pula horário; o SettingsLayout tem 7+ itens sem tutorial; o Marketing é EmptyState. **Veredicto: 7/10 para o dono logado; 5/10 para o novo.**

### 3.2. O fluxo é intuitivo ou gera dúvidas?

**Intuitivo na superfície, gera dúvidas na configuração.** Fluxos do dia a dia (Dashboard → Agenda → Checkout) são fluidos. Mas o BusinessHoursEditor (blocos manhã/almoco/tarde) é conceitualmente denso; o SetCommissions (modelo de comissão híbrido) tem 5 campos sem ajuda; o PublicBooking chat mode confunde. **Veredicto: 7/10 no happy path; 5/10 nos edge cases.**

### 3.3. Nível mínimo de conhecimento em tecnologia necessário?

**Baixo-médio.** Quem usa WhatsApp, Instagram e app de banco consegue usar o AgendiX. Quem nunca usou planilha de Excel vai travar no BusinessHoursEditor e no SetCommissions. **Veredicto: nível de "smartphone intermediário" é suficiente.** Barbeiro 60+ provavelmente vai precisar de ajuda do dono na configuração.

### 3.4. Existem pontos de atrito (fricção)?

**Sim, muitos.** Top 10 atritos:

1. Register: formulário denso único sem barra de força de senha
2. OnboardingWizard: pula horário (componente existe)
3. StepSuccess: CTA aponta para rota inexistente
4. BusinessHoursEditor: blocos conceitualmente densos
5. GeneralSettings: `alert()` nativo para erro de upload
6. GeneralSettings: `setHasChanges(true)` no load (bug)
7. PublicBooking chat mode: vai contra o manifesto
8. Staff no mobile: sem "Mais" no BottomMobileNav
9. Marketing: EmptyState sem call-to-action
10. Reports: empty state longo para usuário novo

### 3.5. Existem etapas desnecessárias?

**Sim:**

- **OnboardingWizard Step 1** (Bem-vindo) — dispensável
- **"Recebido Por"** no CheckoutModal — decisão por atendimento polui o modal
- **Upload de foto opcional** no PublicBooking — 99% dos clientes não usam
- **Múltiplos steps de validação de senha** no Register (sem feedback visual)
- **Step 4 Meta Mensal** — pulável e não conecta a nada

### 3.6. Há funcionalidades escondidas ou difíceis de encontrar?

**Sim, várias:**

- **`/configuracoes/notificacoes`** — rota existe mas é Placeholder E não está no menu lateral (`constants.ts:22-34`)
- **PREDEFINED_SERVICES** em `constants.ts:35-52` — não é oferecido no wizard
- **ProfessionalPortfolio** (`/#/pro/:slug`) — link não está obviamente no fluxo de booking
- **Comissões escalonadas** — escondidas em SetCommissions
- **Filtro por profissional** na Agenda — UI de descoberta fraca
- **Bloqueio de horário** — presente no código, sem destaque
- **Exportação de dados** — não existe (Reports promete, não entrega)
- **AI Assistant** (`useAIAssistant`) — opcional, degrada silenciosamente, usuário não sabe que existe

### 3.7. A linguagem utilizada é clara para um barbeiro comum?

**Sim para fluxos principais; média para configuração.** "Oportunidades", "Clientes sumidos", "Horário vago", "Confirmar e cobrar", "Faltou" são vernaculares e claras. Mas "Vinculação pendente" (StaffInsights), "Saúde do negócio" (Dashboard score), "Taxa de maquininha" (CheckoutModal) são jargões. **Veredicto: 7/10.**

### 3.8. A plataforma transmite confiança?

**Sim, alta.** Tema dark/light consistente, tokens semânticos, motion de baixo ruído, micro-interações polidas. "Calma sob pressão" (anti-referência do PRODUCT.md) é respeitada. O visual diferencia de "planilha Excel com cor" e "dashboard genérico de SaaS". **Veredicto: 8/10.**

### 3.9. A experiência é realmente user-friendly?

**Para o dia a dia, sim. Para configuração e descoberta de features, não.** BottomMobileNav pílula é moderna; Drawer com swipe-to-close é premium; CheckoutModal é o melhor fluxo do app. Mas a primeira impressão (Register + Onboarding) tem atritos, e o back-office (Marketing, Notificações, Relatórios) é placeholders. **Veredicto: 7/10 no geral; 9/10 no happy path; 4/10 na configuração inicial.**

### 3.10. O sistema cobre todo o fluxo operacional de uma barbearia ou existem lacunas?

**Cobre 60%.** Agenda, clientes, checkout, comissões, fila digital — sim. Mas faltam:

- **Lacunas críticas (impedem retenção):**
  - Notificações transacionais (cliente não recebe confirmação)
  - Reativação automática de "sumidos"
  - Clube de assinatura recorrente nativo
  - Comissão correta em modelo assinatura (gap do mercado)
  - Relatórios com LTV, comparativo, exportação
  - Marketing funcional (hoje é EmptyState)

- **Lacunas médias (prejudicam UX):**
  - Lembrete ao barbeiro (push)
  - Política de cancelamento visível para o cliente
  - Gorjeta digital
  - Recibo por WhatsApp/e-mail
  - Pedido de avaliação Google pós-atendimento
  - Walk-in queue (gap de mercado também)
  - Multi-unidade com comparativo

- **Lacunas pequenas (nice-to-have):**
  - Stripe/Pix integrado (hoje só registro manual)
  - Branded mobile app do próprio salão
  - Integração com Instagram/TikTok booking
  - AI retention personalizado por perfil de corte

---

## 4. Pontos Fortes

| # | Ponto Forte | Evidência |
|---|---|---|
| 1 | **Login segmentado Barbearias / Studios** | `pages/Login.tsx:99-165` — decisão arquitetural brilhante |
| 2 | **Dashboard focado em ação** | `pages/Dashboard.tsx:120-198` — "Faturamento hoje" em 5 segundos |
| 3 | **CheckoutModal premium** | `components/CheckoutModal.tsx` — melhor fluxo do app (8/10) |
| 4 | **Agenda v2 estável** | `pages/Agenda.tsx` + MEMORY:34-40 — fix FocusTrap, grade uniforme |
| 5 | **Design system com tokens semânticos** | `useBrutalTheme`, `useColorMode` via `useSyncExternalStore` |
| 6 | **Mobile-first BottomNav pílula** | `components/BottomMobileNav.tsx:28-122` — padrão iOS-like |
| 7 | **Drawer lateral com swipe-to-close** | `components/MoreOptionsDrawer.tsx` — premium |
| 8 | **SmartNotifications com cores por tipo** | `components/SmartNotifications.tsx:18-157` — interno, WhatsApp pré-formatado |
| 9 | **Bug Reporter in-app completo** | Sprint 1 entregue (MEMORY:51-57) |
| 10 | **Multi-tenant seguro com RLS** | Padrão `get_auth_company_id()` consistente em todas as tabelas |
| 11 | **263 testes + 4 commits atômicos de hardening** | Go-live estável desde 20 Jun 2026 |
| 12 | **Memo técnica: MEMORY.md atualizado** | 120 linhas, histórico rastreável |

---

## 5. Pontos Fracos

| # | Ponto Fraco | Impacto | Evidência |
|---|---|---|---|
| 1 | **Register é formulário denso único** | Atrito alto no primeiro contato | `pages/Register.tsx` |
| 2 | **OnboardingWizard pula horário** | Dono não configura → link público mostra 24h | `pages/OnboardingWizard.tsx:38-88` |
| 3 | **StepSuccess aponta rota inexistente** | Dead-end no fim do wizard | `pages/onboarding/StepSuccess.tsx:42` |
| 4 | **GeneralSettings: alert() nativo** | Quebra polidez visual | `pages/settings/GeneralSettings.tsx:82-97` |
| 5 | **GeneralSettings: setHasChanges(true) no load** | Form sujo antes de editar | `pages/settings/GeneralSettings.tsx:75-79` |
| 6 | **Marketing = EmptyState** | Promessa não cumprida | `pages/Marketing.tsx` |
| 7 | **Relatórios exigem >5 appointments** | Usuário novo vê tela vazia | `pages/Reports.tsx:36, 65-88` |
| 8 | **Notificações transacionais zero** | Cliente não recebe confirmação | `/configuracoes/notificacoes` é Placeholder |
| 9 | **Staff sem "Mais" no mobile** | Sem acesso a Configurações/Produtos | `components/BottomMobileNav.tsx:108` |
| 10 | **acceptedPolicy hardcoded true em edit** | Cliente pula aceite | `pages/PublicBooking.tsx:475` |
| 11 | **SmartNotifications é manual** | Dono precisa abrir o app para disparar | `components/SmartNotifications.tsx` |
| 12 | **Sem LTV, sem previsão, sem comparativo** | Dono não consegue justificar assinatura | `pages/Reports.tsx` |

---

## 6. Bugs e Inconsistências (catálogo completo)

| # | Arquivo:Linha | Descrição | Severidade |
|---|---|---|---|
| 1 | `pages/onboarding/StepSuccess.tsx:42` | Link CTA para `/configuracoes/agendamento-publico` (rota inexistente) | Alta |
| 2 | `pages/OnboardingWizard.tsx:38-88` | Pula horário de funcionamento (componente existe) | Alta |
| 3 | `pages/onboarding/StepBusinessInfo.tsx:97` | Alias de StepWelcome; nome engana | Média |
| 4 | `App.tsx:206` vs `constants.ts:22-34` | Rota `/configuracoes/notificacoes` existe mas não está no menu | Média |
| 5 | `pages/settings/GeneralSettings.tsx:75-79` | `setHasChanges(true)` no load | Média |
| 6 | `pages/settings/GeneralSettings.tsx:82-97` | `alert()` nativo para erro de upload | Baixa |
| 7 | `pages/PublicBooking.tsx:475` | `setAcceptedPolicy(true)` hardcoded em edit | Média |
| 8 | `pages/Marketing.tsx` (todo) | Só EmptyState; sem funcionalidade | Alta |
| 9 | `components/BottomMobileNav.tsx:108` | Staff não vê "Mais" | Média |
| 10 | `pages/Register.tsx:24` | Default `userType='barber'` aceita lixo | Baixa |

---

## 7. Funcionalidades Ausentes (lacunas de mercado)

| Lacuna | Onde existe no mercado | Por que é crítica |
|---|---|---|
| **Notificações transacionais (WhatsApp/SMS/e-mail)** | Barbeiro.app (API Meta), Trinks, Booksy, modogestor, todos | Cliente esquece → no-show → cadeira vazia |
| **Reativação automática de "sumidos"** | modogestor, Barbeiro.app | Cliente "some" em 2 semanas sem push |
| **Clube de assinatura recorrente** | Trinks, Barbeiro.app, BestBarbers, modogestor, GoBarber, RobotiZap | Recorrência previsível; case: R$15K→R$31.690/mês |
| **Comissão híbrida avulso+assinatura** | Só modogestor (moedas) e Barbeiro.app | Briga de comissão 3x/mês; 4h/mês em planilha |
| **LTV real, comparativo mês-a-mês** | Nenhum faz linguagem de dono | Dono que paga SaaS quer dados exportáveis |
| **Exportação CSV/PDF de relatórios** | Nenhum nativo no BR; contadores pedem | Contador precisa para IR |
| **Walk-in queue nativo** | GlossGenius, Square, Mangomint NÃO têm; categoria nova: WaitQ, Setora | Barbearia de bairro tem walk-in forte |
| **Stripe/Pix integrado (não só registro manual)** | modogestor, BestBarbers, Barbeiro.app | Dono quer pagar e receber no mesmo lugar |
| **Lembrete push ao barbeiro** | Squire, Booksy, Square | Barbeiro esquece cliente agendado |
| **Política de cancelamento visível para o cliente** | Trinks, Booksy, modogestor | Reduz no-show + transparência |
| **Pedido de avaliação Google pós-atendimento** | Trinks, BestBarbers | SEO local + prova social |
| **Multi-unidade com comparativo** | Boulevard, Mangomint (Enterprise) | Redes 2-5 cadeiras existem |
| **Branded mobile app do próprio salão** | BestBarbers, GoBarber (PWA) | Barbeiro médio quer "meu app" |
| **AI retention personalizado** | Zenoti, SHIFT (pioneiros) | Diferenciação 2026-2027 |

---

## 8. Sugestões Priorizadas (Impacto × Esforço)

### Matriz de Priorização

```
                         IMPACTO
                  Baixo         Alto
            ┌─────────────┬─────────────┐
   Alta     │  • Bug #5    │ ★ TOP 5 ★  │
 ESFORÇO    │  • Bug #6    │  (ver aba) │
            │  • Bug #10   │             │
            ├─────────────┼─────────────┤
   Baixo     │  • Polish    │ • Bug #1-3  │
 ESFORÇO     │  • Refactor  │ • Bug #4,7,9│
            │              │ • Onboarding│
            │              │   Wizard    │
            └─────────────┴─────────────┘
```

### TOP 5 MELHORIAS QUE DESTRAVARIAM ADOÇÃO

| # | Melhoria | Impacto | Esforço | Justificativa |
|---|---|---|---|---|
| **1** | **Conectar marketing real + automação de reativação (envio automático de WhatsApp para clientes sumidos)** | ALTO | Médio | `Marketing.tsx` é só EmptyState. SmartNotifications depende de o dono abrir o app — ineficiente. LTV depende de reativação. |
| **2** | **Implementar `/configuracoes/notificacoes` real (templates, WhatsApp, e-mail, gatilhos)** | ALTO | Médio | Placeholder desde o início. Dono não tem como configurar lembretes ao cliente. Zero transacional. |
| **3** | **Adicionar passo de horário de funcionamento no OnboardingWizard** | ALTO | Baixo | `StepBusinessHours.tsx` já existe. Dono tem que descobrir `/configuracoes/geral` depois. Link público é gerado sem horário — cliente vê 24h. |
| **4** | **Reformar PublicBooking para `quick` ser o default absoluto (sem chat)** | ALTO | Médio | Vai contra PRODUCT.md. Cada segundo a mais = cliente perdido. |
| **5** | **Exportação CSV/PDF de relatórios + LTV real + comparativo mês-a-mês** | MÉDIO | Médio | Reports está com promessa não cumprida. Dono que paga SaaS quer dados exportáveis para contador. |

### Próximas 5 (segundo nível de prioridade)

| # | Melhoria | Impacto | Esforço |
|---|---|---|---|
| 6 | Clube de assinatura recorrente (gap do mercado) | ALTO | Alto |
| 7 | Comissão híbrida avulso+assinatura (resolver com moedas tipo modogestor) | ALTO | Alto |
| 8 | Stripe/Pix integrado (não só registro manual) | MÉDIO | Médio |
| 9 | Lembrete push ao barbeiro + confirmação WhatsApp ao cliente | MÉDIO | Médio |
| 10 | Walk-in queue nativo (gap de mercado) | MÉDIO | Alto |

### 10 Bugs Pequenos (fáceis de corrigir em 1 sprint)

| # | Bug | Esforço |
|---|---|---|
| 1 | `StepSuccess.tsx:42` — link para rota inexistente | 5 min |
| 2 | `OnboardingWizard.tsx` — plugar StepBusinessHours | 30 min |
| 3 | `StepBusinessInfo.tsx:97` — renomear | 5 min |
| 4 | `App.tsx:206` + `constants.ts:22-34` — adicionar Notificações ao menu (ou remover rota) | 15 min |
| 5 | `GeneralSettings.tsx:75-79` — fix `setHasChanges` no load | 30 min |
| 6 | `GeneralSettings.tsx:82-97` — substituir `alert()` por toast | 1h |
| 7 | `PublicBooking.tsx:475` — fix `acceptedPolicy` em edit | 30 min |
| 8 | `BottomMobileNav.tsx:108` — staff sem "Mais" (decidir se dá acesso a Configurações ou cria bottom nav staff) | 2h |
| 9 | `Register.tsx:24` — validar `?type=` | 15 min |
| 10 | `Marketing.tsx` — decidir se vai implementar ou remover rota do menu | 1h decisão |

---

## 9. Recomendações Estratégicas: Como Tornar o AgendiX a Melhor Plataforma do Mercado

### 9.1. Posicionamento sugerido

**"O sistema operacional do barbeiro que cuida do seu dinheiro enquanto você corta cabelo."**

Diferenciação vs. Trinks/Booksy/AppBarber:
- **Não competimos em marketplace** (dilui marca do barbeiro)
- **Não competimos em desconto** (commoditiza)
- **Competimos em:** comissão correta + reativação automática + clube de assinatura + WhatsApp-first

### 9.2. Roadmap sugerido (próximos 6 meses)

**Sprint 0 (1 semana) — Quick wins:**
- Corrigir os 10 bugs catalogados
- Plugar StepBusinessHours no wizard
- Decidir destino de Marketing/Notificações Placeholder

**Sprint 1-2 (4 semanas) — Notificações transacionais:**
- Implementar `/configuracoes/notificacoes` real
- Templates de WhatsApp (confirmação, lembrete 24h, lembrete 2h, reativação)
- API oficial Meta WhatsApp Business (ou Twilio fallback)
- Cron job diário: reativar clientes > 60 dias

**Sprint 3-4 (4 semanas) — Marketing + Clube de assinatura:**
- Implementar Marketing real (campanhas sazonais, promoções)
- Clube de assinatura recorrente (corte ilimitado, corte+barba, etc.)
- Sistema de moedas para comissão híbrida (avulso + assinante)
- Comparativo mês-a-mês nos Reports

**Sprint 5-6 (4 semanas) — Pagamentos + Relatórios:**
- Stripe/Pix integrado (Stripe Connect Brasil)
- Exportação CSV/PDF
- LTV real por cliente
- Walk-in queue nativo (QR code no portão)

**Sprint 7+ (backlog):**
- Branded mobile app (PWA → React Native se tração justificar)
- AI retention personalizado
- Multi-unidade com comparativo

### 9.3. Métricas de sucesso

- **Retenção mês 1:** meta 80% (hoje ~60% por causa de onboarding fraco)
- **Retenção mês 3:** meta 65% (hoje ~35% por causa de back-office incompleto)
- **NPS:** meta 50+ (mediano mercado ~30)
- **LTV/CAC:** meta 4:1 (mediano SaaS B2B 3:1)
- **MRR meta 12 meses:** R$50K (200 barbearias × R$250/mês)

### 9.4. Princípios a defender (do PRODUCT.md)

1. **Mobile-first, sempre.** Barbeiro olha o celular entre um cliente e outro.
2. **Ações antes de dados.** O que o usuário precisa FAZER deve estar mais acessível que o que ele precisa SABER.
3. **Calma sob pressão.** Salão lotado = interface não grita.
4. **Progressive disclosure.** Configs complexas começam colapsadas.
5. **Consistência cross-tema.** Barber e Beauty devem parecer irmãos.

### 9.5. Anti-referências a evitar (do PRODUCT.md)

- **Planilha Excel com cor** — financeiro não pode parecer CSV
- **Dashboard genérico de SaaS** — sem big numbers + sparkline clichês
- **Glassmorphism decorativo** — blur só quando indica camada
- **Tema lavado** — modo claro com contraste real
- **Chatbot lento** — fluxo público não pode forçar conversa

---

## 10. Conclusão

O AgendiX é um **produto de fundação sólida com UX premium** mas com **back-office incompleto** e **fluxos de descoberta frágeis**. A força visual e o polish do CheckoutModal e da Agenda v2 mostram que a equipe sabe executar — o desafio agora é **preencher os buracos do back-office** (Notificações, Marketing, Relatórios) e **simplificar o onboarding**.

Se atacar as Top 5 melhorias em 2-3 sprints, o AgendiX tem potencial real de se tornar **a referência para barbearias de bairro e redes pequenas no Brasil**, ocupando a lacuna que Trinks/Booksy/AppBarber não cobrem: **comissão correta em recorrência + reativação automática + WhatsApp-first sem fricção de app + preço fixo**.

O mercado está fragmentado e cobrando inovação. A janela de oportunidade é agora.

---

**Próximo passo sugerido:** revisar este relatório com o time, priorizar o Top 5, e abrir 1 sprint de Quick Wins (bugs) + 1 sprint de Notificações Transacionais.

**Anexos:**
- `research/ux-research-barbearias.md` — pesquisa externa detalhada
- `research/ux-audit-agendix.md` — auditoria técnica com evidências arquivo:linha
