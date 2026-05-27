# Domínio de Negócio — agendix

> Gerado pelo Detective em 2026-05-06
> Nível de confiança: 🟢 Confirmado | 🟡 Inferido | 🔴 Lacuna

---

## Glossário

| Termo | Definição | Confiança |
|-------|-----------|-----------|
| **Atendimento** | Sinônimo de agendamento no glossário simplificado. Representa um compromisso entre cliente e profissional. | 🟢 |
| **Owner** | Dono do estabelecimento. Tem acesso total ao sistema, incluindo financeiro, configurações e gestão de equipe. | 🟢 |
| **Staff** | Profissional/colaborador vinculado a um owner. Herda o plano de assinatura do owner e tem visão restrita (ap agenda e serviços). | 🟢 |
| **Fila Digital** | Sistema de fila de espera em tempo real para clientes sem agendamento prévio. Funciona via QR code. | 🟢 |
| **Reserva Online** | Agendamento público feito pelo cliente final via link/QR code, sem interação do owner. | 🟢 |
| **Checkout de Atendimento** | Fluxo de finalização de um agendamento com registro de pagamento, taxa de maquininha e comissão. | 🟢 |
| **AIOS** | Sistema de Inteligência Artificial para diagnóstico de churn e campanhas de reativação. Condicional à flag `aios_enabled`. | 🟢 |
| **Data Maturity** | Score progressivo (0-100) que mede a "maturidade de dados" da conta com base em agendamentos, bookings públicos e idade da conta. | 🟢 |
| **Trial** | Período de teste de 7 dias após registro. Após expiração, requer assinatura ativa. | 🟢 |
| **Taxa de Maquininha** | Percentual cobrado sobre transações com débito/crédito, configurável por estabelecimento. | 🟢 |
| **Loyalty Tier** | Tier de fidelidade do cliente: Bronze, Silver, Gold, Platinum. Calculado automaticamente. | 🟡 |
| **Semantic Memory (RAG)** | Sistema de memória semântica com embeddings 768d para diagnósticos e respostas contextualizadas da IA. | 🟢 |
| **Guided Mode** | Modo de onboarding pós-wizard que destaca elementos da UI via spotlight para guiar o usuário. | 🟢 |

---

## Regras de Negócio Implícitas

### 1. Autenticação e Autorização

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R1 | Todo query no banco DEVE filtrar por `company_id` (RLS). Query sem `company_id` retorna vazio silenciosamente. | AGENTS.md | 🟢 |
| R2 | `company_id` vem SEMPRE do session Supabase via `useAuth()`, nunca de URL params ou form inputs. | AGENTS.md | 🟢 |
| R3 | Login possui rate limiting token bucket via RPC `check_login_rate_limit`. Após excesso de tentativas, bloqueio de 1 minuto. | AuthContext.tsx:188-197 | 🟢 |
| R4 | Staff herda `user_type`, `business_name` e plano de assinatura do owner. A herança ocorre em chamada única para evitar flicker de tema. | AuthContext.tsx:92-110 | 🟢 |
| R5 | Dev é identificado por email hardcoded (`rleporesilva@gmail.com`). Dev pode alternar `user_type` via localStorage. | AuthContext.tsx:160, 312-315 | 🟢 |
| R6 | Registro de staff cria automaticamente registro em `team_members` com slug gerado a partir do nome + número aleatório. | AuthContext.tsx:283-303 | 🟢 |
| R7 | Trial tem duração fixa de 7 dias (`Date.now() + 7 * 24 * 60 * 60 * 1000`). | AuthContext.tsx:273 | 🟢 |
| R8 | Assinatura é considerada ativa se status for `active`, `subscriber`, ou `trial` dentro do prazo. | AuthContext.tsx:330-337 | 🟢 |

### 2. Agendamentos

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R9 | Agendamentos têm status: `Confirmed`, `Pending`, `Completed`, `Cancelled`. | types.ts:34 | 🟢 |
| R10 | Staff não pode cancelar agendamentos já finalizados (`Completed`). Guard D-07. | Agenda.tsx:867-874 | 🟢 |
| R11 | Conclusão de agendamento cria registro financeiro automático via RPC `complete_appointment` (v2). Fallback client-side se RPC falhar. | Agenda.tsx:776-865 | 🟢 |
| R12 | Reservas públicas (`public_bookings`) têm status `pending` até aprovação do owner, quando viram `confirmed`. | Agenda.tsx:712-718 | 🟢 |
| R13 | Cliente pode editar reserva pública via link (flag `is_edit`). O sistema busca o agendamento original por `original_appointment_time`. | Agenda.tsx:643-693 | 🟢 |
| R14 | Ao aceitar booking, o sistema tenta encontrar cliente existente por telefone (3 formatos: raw, BR, PT). Se não encontrar, cria novo. | Agenda.tsx:539-619 | 🟢 |
| R15 | Horários de agendamento são gerados em intervalos de 30 minutos, das 8h às 20h. | Agenda.tsx:1037-1044 | 🟢 |
| R16 | Preço final pode ter desconto percentual aplicado. Se preço for maior que o base, é marcado como "Custom". | Agenda.tsx:1072-1101 | 🟢 |

### 3. Fila Digital

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R17 | Fila tem estados: `waiting`, `calling`, `serving`, `completed`, `cancelled`, `no_show`. | types.ts:88 | 🟢 |
| R18 | Transição `waiting → calling` dispara som de notificação. | QueueManagement.tsx:140-142 | 🟢 |
| R19 | Finalizar atendimento da fila: cria cliente (se não existir), cria agendamento (`Completed`), cria registro financeiro, atualiza fila. Tudo em transação manual. | QueueManagement.tsx:171-301 | 🟢 |
| R20 | Entradas da fila são filtradas por dia atual (`joined_at >= hoje`). | QueueManagement.tsx:55 | 🟢 |

### 4. Financeiro

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R21 | Staff vê apenas seu próprio financeiro (filtro por `professionalName === fullName`). | Finance.tsx:197-224 | 🟢 |
| R22 | Transações de despesa (`expense`) têm status `paid`/`pending`. Liquidação via RPC `mark_expense_as_paid`. | Finance.tsx:749-773 | 🟢 |
| R23 | Exclusão de receita automática também exclui o agendamento vinculado (`appointment_id`). | Finance.tsx:279-330 | 🟢 |
| R24 | Taxa de maquininha é aplicada opcionalmente, com percentuais distintos para débito e crédito. | types.ts:57-61 | 🟢 |
| R25 | Checkout registra `received_by` (quem recebeu o pagamento) e `completed_by` (quem concluiu). | types.ts:41-45 | 🟢 |

### 5. Assinatura e Planos

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R26 | Planos: Solo (R$34,90/€9,90) e Equipe (R$59,90/€19,90). Preço varia por região (BRL/EUR). | SubscriptionSettings.tsx:28-37 | 🟢 |
| R27 | Checkout Stripe via Edge Function `create-checkout-session`. Retorno para `/#/?session_id=...`. | SubscriptionSettings.tsx:75-101 | 🟢 |
| R28 | Plano recomendado é determinado por `isBeauty` (Equipe para beleza, Solo para barbearia). | SubscriptionSettings.tsx:53,70 | 🟡 |

### 6. Onboarding e Wizard

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R29 | Onboarding wizard tem 5 steps (1-4 + success). Estado persistido em `business_settings.onboarding_step`. | OnboardingWizard.tsx:12, useOnboardingState.ts | 🟢 |
| R30 | Completação do onboarding define `tutorial_completed = true` no perfil. | useOnboardingState.ts:51-54, 99 | 🟢 |
| R31 | SetupCopilot tem 6 milestones (services, team, hours, profile, booking, appointment). | WIZARD_TARGETS.ts | 🟢 |
| R32 | Guided mode usa `sessionStorage` para rastrear progresso do tour e `WizardPointer` para spotlight. | GuidedModeContext.tsx (referenciado) | 🟡 |

### 7. Segurança e Auditoria

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R33 | 2FA via TOTP (Supabase MFA). Enroll → Challenge → Verify. | use2FA.ts | 🟢 |
| R34 | Audit logs são gerados automaticamente por trigger em 6 tabelas. | Scout summary (supabase-backend) | 🟢 |
| R35 | Lixeira (RecycleBin) mantém registros por 30 dias com countdown. Restore via RPC dinâmica por `resource_type`. | Scout summary (security/audit) | 🟢 |
| R36 | System Errors têm níveis de severity e são logados em modo fire-and-forget. | Scout summary (security/audit) | 🟢 |

### 8. IA e Marketing

| # | Regra | Fonte | Confiança |
|---|-------|-------|-----------|
| R37 | AIOS Diagnostic só executa quando `aiosEnabled === true`. | useAIOSDiagnostic.ts:32 | 🟢 |
| R38 | Campanhas de reativação usam frameworks ABT e StoryBrand, segmentadas por LTV. | Scout summary (marketing) | 🟢 |
| R39 | Semantic Memory RAG usa embeddings 768d (`text-embedding-004`) com threshold de similaridade 0.92. | Scout summary (ai-assistant) | 🟢 |
| R40 | Content Calendar integra feriados BR via OpenRouter. | Scout summary (ai-assistant) | 🟢 |

---

## Lacunas Identificadas 🔴

| # | Lacuna | Impacto |
|---|--------|---------|
| L1 | Lógica exata de cálculo do Loyalty Tier (Bronze→Platinum) não encontrada no frontend — pode estar em RPC ou trigger. | Médio |
| L2 | Regra de negócio para determinar quando um agendamento se torna "overdue" (apenas comparação com `new Date()` ou há tolerância?). | Baixo |
| L3 | Critérios exatos do Data Maturity Score (peso de cada fator). | Médio |
| L4 | Regras de negócio para upgrade/downgrade de plano (migração de dados). | Médio |
| L5 | Lógica de cálculo de comissão quando há múltiplos profissionais em um agendamento. | Baixo |
| L6 | Frequência e critérios de atualização dos embeddings semânticos. | Baixo |

---

## Decisões de Negócio do Git Log

| Commit | Decisão |
|--------|---------|
| `c043c0e` — feat(ui): merge branch 'ui' | Design system audit realizado para unificar tokens visuais |
| `d6bc212` — feat(checkout): T1 | Introdução de schema de checkout com taxa de maquininha (evolução do modelo financeiro) |
| `92ecd7d` — fix(staff): remove item Serviços | Staff não deve ver configuração de serviços no sidebar (decisão de UX/permissionamento) |
| `36347c3` — fix(staff): AuthContext não seta userType | Anti-flicker pattern implementado para herança de dados do owner |
| `5b01b59` — feat(ux): US-E Wave 2 | Simplificação linguística completa do produto (jargões técnicos removidos) |
| `b9cc314` — feat(accessibility): focus trap | WCAG 2.1 AA compliance obrigatório para todos os modais |
| `70a6d2b` — chore: migrate AIOS v4.2 → AIOX | Migração de framework interno de produto (legado descartado) |
| `302c4d6` — chore: descartar Clerk migration | Decisão explícita de manter Supabase Auth em vez de Clerk |

---

*Fim do documento de domínio.*
