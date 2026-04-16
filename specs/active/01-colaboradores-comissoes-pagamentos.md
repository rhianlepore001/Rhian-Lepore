# SPEC — Colaboradores, Comissões e Pagamentos
**Agenx MVP | Origem: Áudio tio + respostas Rhian | 12/04/2026**

---

## FEATURE 1 — Dashboard do Colaborador (Visão Restrita)

### O que o colaborador vê ao entrar

**Tela inicial do colaborador mostra:**
- Agenda do dia dele (próximos agendamentos em ordem cronológica)
- Botão para criar agendamento para qualquer colega (colaborador pode agendar no lugar do outro)
- Faturamento líquido próprio do período (o que ele vai receber, já com comissão calculada) — NUNCA o faturamento bruto da barbearia
- Estoque de produtos (consulta, não gestão)
- Agendamentos podem ser editados ou cancelados por qualquer colaborador (não só o dono)

**O que o colaborador NÃO vê:**
- Faturamento total da barbearia
- Comissões ou dados financeiros de outros colaboradores
- Configurações da conta (plano, equipe, integrações)

### Regra de permissão por role

| Ação | Dono | Colaborador |
|---|---|---|
| Ver faturamento bruto total | ✅ | ❌ |
| Ver faturamento líquido próprio | ✅ | ✅ (só o dele) |
| Criar agendamento para colega | ✅ | ✅ |
| Editar agendamento de colega | ✅ | ✅ |
| Cancelar agendamento de colega | ✅ | ✅ |
| Ver/editar configurações | ✅ | ❌ |
| Ver estoque | ✅ | ✅ (consulta) |

### Spec técnica interna

**Arquivos impactados:**
- `pages/Dashboard.tsx` — condicional por role (owner vs collaborator)
- `contexts/AuthContext` ou equivalente Clerk — leitura de role
- `components/DashboardCollaborator.tsx` — novo componente (ou condicional no existente)
- `supabase/` — RLS nas tabelas `appointments`, `financial_records`, `products`

**RLS crítico:**
- `appointments`: SELECT liberado para todos da mesma barbearia; UPDATE/DELETE liberado para todos (não só owner)
- `financial_records` / `commissions`: SELECT filtrado por `collaborator_id = auth.uid()` para role collaborator
- Faturamento bruto: query exclusiva para role owner — jamais exposta a collaborator

**Edge cases:**
- Colaborador tenta acessar rota `/financeiro` → redireciona para dashboard com toast "Acesso restrito ao dono"
- Colaborador cancela agendamento de colega que já foi pago → bloqueia cancelamento, mostra: "Este agendamento já foi finalizado. Fale com o dono."

---

## FEATURE 2 — Fechamento de Comanda + Forma de Pagamento + Taxa de Maquininha

### Fluxo atual (problema identificado)
Hoje a forma de pagamento é inserida **antes** de confirmar o agendamento. Isso está errado para o modelo real de barbearia — ninguém sabe como o cliente vai pagar antes de ele sentar na cadeira.

### Fluxo proposto

**Na confirmação do agendamento (criação):**
- Forma de pagamento: campo opcional — pode deixar em branco, preencher depois
- Se preenchido: PIX, Dinheiro, Débito, Crédito

**Na finalização do serviço (novo card de conclusão):**
1. Colaborador ou recepcionista clica em "Concluir atendimento" no agendamento
2. Aparece um card/modal de conclusão com:
   - Serviço realizado (pré-preenchido)
   - Valor (pré-preenchido, editável)
   - Forma de pagamento (obrigatória neste momento): PIX | Dinheiro | Débito | Crédito
   - **Se Débito ou Crédito selecionado:** aparece campo opcional "Taxa da maquininha (%)" — pré-preenchido com a taxa configurada pelo dono (ex: 2,5%). Dono pode ter configurado se repassa ou não ao colaborador.
   - Campo "Recebido por": dropdown com todos os colaboradores + dono (quem pegou o dinheiro na mão)
3. Botão "Confirmar pagamento" → agendamento muda para status `concluído` e entra no cálculo de comissão

### Configuração de taxa pelo dono (Settings)

Em Configurações > Financeiro:
- Toggle: "Repassar taxa de maquininha ao colaborador?" (Sim/Não)
- Campo: "Taxa débito (%)" e "Taxa crédito (%)"
- Se toggle = Não → taxa é absorvida pela barbearia, comissão calculada sobre valor bruto
- Se toggle = Sim → comissão calculada sobre (valor - taxa)

### Spec técnica interna

**Arquivos impactados:**
- `pages/Appointments.tsx` ou `components/AppointmentCard.tsx` — adicionar botão "Concluir" e modal
- `components/CheckoutModal.tsx` — novo componente (modal de conclusão)
- `pages/Settings.tsx` — nova seção "Financeiro > Taxa de maquininha"
- `supabase/migrations/` — novos campos em `appointments`: `payment_method`, `received_by`, `machine_fee_applied`, `machine_fee_percent`
- `supabase/migrations/` — nova tabela ou campo em `settings`: `machine_fee_enabled`, `debit_fee_percent`, `credit_fee_percent`

**RLS:**
- `appointments` UPDATE (status, payment_method, received_by): liberado para todos da mesma barbearia
- `settings` SELECT/UPDATE: apenas owner

**Edge cases:**
- Colaborador tenta concluir sem escolher forma de pagamento → bloqueia, campo fica vermelho: "Selecione a forma de pagamento"
- Agendamento já concluído → botão "Concluir" some, mostra badge "Pago via [método]"
- Lembrete noturno (ver Feature 3): se agendamento do dia não foi concluído → aparece no lembrete

---

## FEATURE 3 — Comissões e Pagamento da Equipe

### Visão do dono (tela Financeiro > Comissões)

**Lista de colaboradores com:**
- Nome + foto
- Total bruto produzido no período
- Percentual de comissão configurado (ex: 50%)
- Valor líquido a pagar
- Status: `Pendente` | `Pago`
- Botão "Ver detalhado" → abre relatório completo
- Botão "Marcar como pago" → muda status para Pago e registra data/hora

**Relatório detalhado (por colaborador):**
- Lista de todos os serviços do período: data, cliente, serviço, valor, forma de pagamento, taxa aplicada
- Subtotal bruto
- (-) Taxa de maquininha (se configurado para repassar)
- (=) Base de cálculo
- (×) % comissão
- (=) **Valor líquido a receber**
- Rodapé com: nome do colaborador, CPF (se cadastrado), período

**Versão resumida (para enviar):**
- Nome, CPF, período, valor líquido. Nada mais.
- Botão "Compartilhar" → gera texto formatado para WhatsApp ou PDF simples

### Lembrete de pagamento de comissão

- Dono configura em Settings: "Dia do pagamento de comissões" (ex: todo dia 5)
- No dia anterior (dia 4), aparece notificação/banner no Dashboard do dono: "Amanhã é dia de pagar as comissões. [Ver equipe]"
- Lembrete de confirmação de atendimentos: no final do dia, se existirem agendamentos do dia sem status `concluído`, aparece banner: "[X] atendimentos não foram confirmados hoje. [Ver agendamentos]" — visível para dono e colaboradores

### Spec técnica interna

**Arquivos impactados:**
- `pages/Financeiro.tsx` — nova seção Comissões
- `components/CommissionCard.tsx` — card por colaborador
- `components/CommissionDetailModal.tsx` — relatório detalhado
- `pages/Settings.tsx` — campo "Dia de pagamento" + "% comissão por colaborador"
- `supabase/migrations/` — tabela `commission_payments`: `id`, `collaborator_id`, `period_start`, `period_end`, `gross_amount`, `fee_deducted`, `commission_percent`, `net_amount`, `status`, `paid_at`, `paid_by`
- `supabase/migrations/` — campo em `team_members` ou `profiles`: `commission_percent`, `cpf`

**RLS:**
- `commission_payments` SELECT: owner vê todos; collaborator vê só os seus
- `commission_payments` INSERT/UPDATE: apenas owner

**Lembrete (implementação):**
- Verificação client-side no carregamento do Dashboard: compara data atual com `payment_day` das settings
- Se `hoje = payment_day - 1` → mostra banner persistente até dono visitar a tela de comissões
- Agendamentos não concluídos: query `appointments` WHERE `date = hoje AND status != 'concluido'` no final do dia (após 20h ou horário de fechamento configurado)

**Edge cases:**
- Dono clica "Marcar como pago" → confirmação: "Confirmar pagamento de R$ X para [Nome]?" com botão Cancelar e Confirmar
- Dois donos (edge case futuro): quem marcou como pago fica registrado em `paid_by`
- Colaborador sem CPF cadastrado: relatório mostra "CPF não cadastrado" em vez de travar

---

## DECISÕES FECHADAS

1. **Taxa de maquininha:** Removida da criação do agendamento. Aparece apenas no card de conclusão, quando forma de pagamento = Débito ou Crédito.

2. **CPF do colaborador:** Campo opcional. Dono preenche na hora de emitir o recibo — não é obrigatório no cadastro da equipe.

3. **Período das comissões:** Ciclo fixo — sempre do dia 1 até o dia configurado pelo dono (ex: dia 1 a dia 5 de cada mês).

4. **Histórico de comissões:** Tudo na mesma tela com filtro "Pendente / Pago". Badge "Pago" com data do pagamento. Sem tela separada.

5. **Colaborador sem % configurado:** Ao clicar "Marcar como pago", aparece: *"[Nome] não tem comissão configurada. Defina o percentual agora para calcular automaticamente."* — dono digita o %, sistema calcula na hora e registra.

---

## ORDEM DE IMPLEMENTAÇÃO SUGERIDA

| Prioridade | Feature | Motivo |
|---|---|---|
| 1 | Feature 2 — Card de conclusão + forma de pagamento | Sem isso, comissão não tem dado pra calcular |
| 2 | Feature 3 — Comissões (cálculo + relatório + lembrete) | Depende do Feature 2 estar funcionando |
| 3 | Feature 1 — Dashboard colaborador (visão restrita) | Depende de roles + dados de comissão prontos |
