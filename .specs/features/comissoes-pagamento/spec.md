# SPEC — Comissões e Pagamento da Equipe

**Feature:** comissoes-pagamento
**Prioridade:** 2 (depende de checkout-comanda)
**Scope:** Large
**Decisões relacionadas:** D-001, D-006, D-007, D-008

---

## Contexto

O sistema já possui `CommissionsManagement.tsx` com cálculo básico de comissões e `mark_commissions_as_paid` RPC. Porém falta: relatório detalhado por colaborador, compartilhamento via WhatsApp/PDF, lembrete de pagamento, e lembrete noturno de atendimentos não concluídos.

### O que já existe
- `CommissionsManagement.tsx` — lista de profissionais com total pendente + botão pagar
- `CommissionsSettings.tsx` — taxa % por profissional + dia de acerto
- `get_commissions_due()` RPC — calcula pendências
- `mark_commissions_as_paid()` RPC — registra pagamento
- `ProfessionalCommissionDetails` — componente de detalhes (básico)
- `CommissionPaymentHistory` — histórico de pagamentos

### O que falta
- Relatório detalhado: breakdown por serviço com taxa de maquininha
- Resumo simplificado para envio (WhatsApp/PDF)
- Lembrete de véspera de pagamento (banner no dashboard)
- Lembrete noturno de atendimentos não concluídos
- Ciclo de comissão com mês cheio (D-001)
- Prompt para colaborador sem % configurado (D-008)

---

## Requisitos

### REQ-F3-01: Relatório detalhado por colaborador
**Como** dono,
**quero** ver o breakdown completo dos serviços de cada colaborador no período,
**para que** eu possa verificar o cálculo antes de pagar.

**Critérios de aceitação:**
- [ ] Modal/tela de relatório detalhado com: lista de serviços (data, cliente, serviço, valor, forma de pagamento, taxa aplicada)
- [ ] Subtotal bruto
- [ ] (-) Taxa de maquininha total (se configurado para repassar — depende de D-005/F2)
- [ ] (=) Base de cálculo
- [ ] (×) % comissão
- [ ] (=) Valor líquido a receber
- [ ] Rodapé: nome do colaborador, CPF (se cadastrado — D-006), período

### REQ-F3-02: Resumo para compartilhamento
**Como** dono,
**quero** gerar um resumo simplificado para enviar ao colaborador,
**para que** ele saiba quanto vai receber sem ver dados de outros.

**Critérios de aceitação:**
- [ ] Resumo contém apenas: nome, CPF (se cadastrado), período, valor líquido
- [ ] Botão "Compartilhar via WhatsApp" → gera texto formatado + abre WhatsApp Web/app
- [ ] Botão "Gerar PDF" → download de PDF simples com os mesmos dados
- [ ] Nenhum dado de outros colaboradores ou faturamento bruto da barbearia

### REQ-F3-03: Ciclo de comissões — mês cheio
**Como** dono,
**quero** que o período de comissão seja um mês cheio,
**para que** o cálculo seja justo e compreensível.

**Critérios de aceitação:**
- [ ] Se dia de acerto = 5, período = dia 6 do mês anterior → dia 5 do mês atual (D-001)
- [ ] Filtro de período no `CommissionsManagement` usa este ciclo como default
- [ ] Dono pode ajustar datas manualmente se necessário
- [ ] Label clara: "Período: 06/mar → 05/abr"

### REQ-F3-04: Lembrete de véspera de pagamento
**Como** dono,
**quero** ser lembrado na véspera do dia de acerto,
**para que** eu não esqueça de pagar as comissões.

**Critérios de aceitação:**
- [ ] No dia anterior ao `commission_settlement_day_of_month`, banner no Dashboard do dono
- [ ] Texto: "Amanhã é dia de pagar as comissões. [Ver equipe]"
- [ ] Link "Ver equipe" navega para Finance > aba Comissões
- [ ] Banner persiste até dono visitar a tela de comissões ou fechar manualmente

### REQ-F3-05: Lembrete noturno de atendimentos não concluídos
**Como** dono/colaborador,
**quero** ser avisado sobre atendimentos do dia que não foram concluídos,
**para que** nenhum pagamento fique sem registro.

**Critérios de aceitação:**
- [ ] Após 20h (ou horário de fechamento configurado), banner no Dashboard
- [ ] Texto: "[X] atendimentos não foram confirmados hoje. [Ver agendamentos]"
- [ ] Visível para dono E colaboradores
- [ ] Link navega para Agenda filtrada pelos pendentes do dia
- [ ] Query: `appointments WHERE date = hoje AND status != 'Completed'`

### REQ-F3-06: Marcar como pago (com confirmação)
**Como** dono,
**quero** confirmar antes de registrar o pagamento,
**para que** eu não pague por engano.

**Critérios de aceitação:**
- [ ] Botão "Marcar como pago" → dialog de confirmação: "Confirmar pagamento de R$ X para [Nome]?"
- [ ] Botões: Cancelar + Confirmar
- [ ] Após confirmar: status muda para `Pago`, registra `paid_at` e `paid_by`
- [ ] Card mostra badge "Pago" com data do pagamento (D-007)

### REQ-F3-07: Colaborador sem comissão configurada
**Como** dono,
**quero** ser avisado quando tento pagar um colaborador sem % definido,
**para que** eu configure na hora sem perder o fluxo.

**Critérios de aceitação:**
- [ ] Ao clicar "Marcar como pago" para colaborador com `commission_rate = 0 ou NULL`:
- [ ] Aparece prompt: "[Nome] não tem comissão configurada. Defina o percentual agora para calcular automaticamente."
- [ ] Campo de input % inline
- [ ] Sistema calcula na hora e exibe valor antes de confirmar (D-008)
- [ ] % é salvo em `team_members.commission_rate` para uso futuro

### REQ-F3-08: Filtro Pendente / Pago
**Como** dono,
**quero** filtrar comissões por status na mesma tela,
**para que** eu veja pendentes e histórico sem trocar de tela.

**Critérios de aceitação:**
- [ ] Toggle/tabs: "Pendente" | "Pago" na tela de comissões (D-007)
- [ ] "Pendente" = default
- [ ] "Pago" mostra histórico com badge de data de pagamento
- [ ] Sem tela separada de histórico

---

## Edge Cases

### EC-F3-01: Dono clica "Pagar" duas vezes
- **Comportamento:** Após primeiro clique, botão fica disabled com loading. Se tentar novamente, toast: "Pagamento já registrado."

### EC-F3-02: Colaborador sem CPF no relatório
- **Comportamento:** Relatório mostra "CPF não cadastrado" no campo CPF. Não trava o fluxo.

### EC-F3-03: Período sem serviços
- **Comportamento:** Relatório mostra "Nenhum serviço registrado neste período." Botão "Pagar" desabilitado.

### EC-F3-04: Comissão recalculada após pagamento
- Se o dono altera a taxa DEPOIS de ter pago → não afeta pagamentos passados, apenas futuros.

### EC-F3-05: Dois donos (futuro)
- Campo `paid_by` registra qual dono marcou como pago. Preparar no schema mas não exibir na UI agora.

---

## Schema Changes

### Novos campos em `team_members`
```sql
cpf   VARCHAR(14)   -- CPF do colaborador (opcional — D-006). Formato: 000.000.000-00
```

### Novos campos em `finance_records` (se não existirem)
```sql
machine_fee_amount   DECIMAL(10,2) DEFAULT 0   -- Valor da taxa descontada
commission_base      DECIMAL(10,2)             -- Base de cálculo (bruto - taxa)
```

### Nenhuma tabela nova necessária
- `commission_payments` já pode ser representada pelos registros em `finance_records` com `type = 'expense'`
- Se necessário separar, avaliar na fase de Design

---

## RLS

- `finance_records` SELECT: owner vê todos; staff vê apenas `WHERE professional_id = team_member_id do staff`
- `finance_records` INSERT/UPDATE (`commission_paid`, `commission_paid_at`): apenas owner
- `team_members` UPDATE (`cpf`, `commission_rate`): apenas owner

---

## Arquivos Impactados

| Arquivo | Ação | Motivo |
|---|---|---|
| `components/CommissionsManagement.tsx` | MODIFICAR | Adicionar relatório detalhado, filtro, ciclo mês cheio |
| `components/CommissionDetailReport.tsx` | **CRIAR** | Relatório detalhado por colaborador |
| `components/CommissionShareModal.tsx` | **CRIAR** | Resumo WhatsApp + PDF |
| `pages/Dashboard.tsx` | MODIFICAR | Adicionar banners de lembrete (véspera + noturno) |
| `pages/Finance.tsx` | MODIFICAR | Integrar filtro Pendente/Pago |
| `pages/settings/CommissionsSettings.tsx` | MODIFICAR | Campo CPF (se não estiver em TeamSettings) |
| `pages/settings/TeamSettings.tsx` | MODIFICAR | Campo CPF opcional |
| `supabase/migrations/` | **CRIAR** | Campo cpf em team_members + campos em finance_records |
