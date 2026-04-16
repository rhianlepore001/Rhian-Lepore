# SPEC — Checkout de Comanda + Forma de Pagamento + Taxa de Maquininha

**Feature:** checkout-comanda
**Prioridade:** 1 (blocking — comissões dependem disto)
**Scope:** Large
**Decisões relacionadas:** D-003, D-004, D-005, D-009

---

## Contexto

Hoje a forma de pagamento é inserida **antes** de confirmar o agendamento (`AppointmentReview.tsx`). Isso está errado para o modelo real — ninguém sabe como o cliente vai pagar antes de sentar na cadeira.

O fluxo atual de conclusão (`complete_appointment` RPC) já existe mas é incompleto: não tem "Recebido por", não separa Débito/Crédito, e não calcula taxa de maquininha.

### O que já existe
- `complete_appointment()` RPC — conclui + calcula comissão
- `AppointmentReview.tsx` — forma de pagamento na criação (será tornado opcional)
- `finance_records` — tabela de registros financeiros com `payment_method`
- `business_settings` — configurações da empresa

### O que falta
- Modal de checkout na conclusão do atendimento
- Campo "Recebido por" (obrigatório — D-004)
- Separação Débito/Crédito (D-009)
- Taxa de maquininha configurável (D-005)
- Settings: toggle repasse + taxas por tipo de cartão

---

## Requisitos

### REQ-F2-01: Forma de pagamento opcional na criação
**Como** colaborador,
**quero** que a forma de pagamento seja opcional ao criar agendamento,
**para que** eu possa preencher depois, quando o cliente efetivamente pagar.

**Critérios de aceitação:**
- [ ] Campo de pagamento em `AppointmentReview.tsx` tem opção "Definir depois" (default)
- [ ] Agendamento é criado com `payment_method = NULL` quando não selecionado
- [ ] Nenhuma validação bloqueia criação sem forma de pagamento

### REQ-F2-02: Modal de checkout na conclusão do atendimento
**Como** colaborador,
**quero** um modal de conclusão ao clicar "Concluir atendimento",
**para que** eu registre o pagamento com todos os dados necessários.

**Critérios de aceitação:**
- [ ] Botão "Concluir" em `Agenda.tsx` abre `CheckoutModal` em vez de chamar RPC direto
- [ ] Modal exibe: serviço (pré-preenchido), valor (pré-preenchido, editável), forma de pagamento (obrigatória), campo "Recebido por" (obrigatório — D-004)
- [ ] Formas de pagamento BR: PIX, Dinheiro, Débito, Crédito (separados — D-009)
- [ ] Formas de pagamento PT: Dinheiro, MBWay, Débito, Crédito
- [ ] Botão "Confirmar pagamento" chama RPC atualizada
- [ ] Modal não fecha sem preenchimento completo

### REQ-F2-03: Taxa de maquininha no checkout
**Como** colaborador,
**quero** ver a taxa de maquininha aplicada quando seleciono Débito ou Crédito,
**para que** o cálculo de comissão seja transparente.

**Critérios de aceitação:**
- [ ] Quando forma de pagamento = Débito ou Crédito, aparece campo "Taxa da maquininha (%)"
- [ ] Campo pré-preenchido com taxa configurada pelo dono (Settings)
- [ ] Valor líquido (valor - taxa) exibido em tempo real
- [ ] Para PIX/Dinheiro/MBWay, campo de taxa NÃO aparece

### REQ-F2-04: Campo "Recebido por"
**Como** dono,
**quero** saber quem recebeu o pagamento,
**para que** eu tenha controle financeiro preciso.

**Critérios de aceitação:**
- [ ] Dropdown com todos os colaboradores ativos + dono
- [ ] Campo obrigatório — não permite concluir sem seleção (D-004)
- [ ] Valor gravado em `appointments.received_by` (UUID do team_member)

### REQ-F2-05: Configuração de taxa pelo dono
**Como** dono,
**quero** configurar as taxas de maquininha e se repasso ao colaborador,
**para que** o cálculo de comissão reflita meu modelo de negócio.

**Critérios de aceitação:**
- [ ] Settings > Financeiro: toggle "Repassar taxa de maquininha ao colaborador?" (Sim/Não)
- [ ] Campos: "Taxa débito (%)" e "Taxa crédito (%)"
- [ ] Se toggle = Não → comissão calculada sobre valor bruto
- [ ] Se toggle = Sim → comissão calculada sobre (valor - taxa)
- [ ] Valores persistidos em `business_settings`

### REQ-F2-06: Status visual pós-conclusão
**Como** colaborador,
**quero** ver claramente quais atendimentos já foram concluídos,
**para que** eu não tente concluir duas vezes.

**Critérios de aceitação:**
- [ ] Agendamento com status `Completed` → botão "Concluir" desaparece
- [ ] Badge "Pago via [método]" aparece no card do agendamento
- [ ] Tentativa de concluir agendamento já finalizado → toast de erro

---

## Edge Cases

### EC-F2-01: Conclusão sem forma de pagamento
- Colaborador tenta concluir sem escolher forma de pagamento
- **Comportamento:** Bloqueia, campo fica vermelho com mensagem "Selecione a forma de pagamento"

### EC-F2-02: Agendamento já concluído
- Colaborador tenta concluir atendimento com status `Completed`
- **Comportamento:** Botão "Concluir" não aparece. Se acessar por outro meio, toast: "Este atendimento já foi finalizado."

### EC-F2-03: Cancelar atendimento já pago
- Colaborador tenta cancelar agendamento com status `Completed`
- **Comportamento:** Bloqueia cancelamento, mostra: "Este agendamento já foi finalizado. Fale com o dono."

### EC-F2-04: Valor editado para zero
- Colaborador edita valor do serviço para R$ 0,00 no checkout
- **Comportamento:** Permitir (cortesia), comissão = 0, registrar normalmente

### EC-F2-05: Taxa de maquininha > valor do serviço
- Taxa configurada resulta em valor líquido negativo
- **Comportamento:** Bloquear, exibir: "A taxa excede o valor do serviço. Verifique a configuração."

---

## Schema Changes

### Novos campos em `appointments`
```sql
received_by         UUID REFERENCES team_members(id)  -- Quem recebeu o pagamento
machine_fee_percent DECIMAL(5,2) DEFAULT 0            -- Taxa aplicada (%)
machine_fee_amount  DECIMAL(10,2) DEFAULT 0           -- Valor da taxa (R$)
completed_by        UUID REFERENCES team_members(id)  -- Quem clicou "Concluir"
completed_at        TIMESTAMP WITH TIME ZONE          -- Quando foi concluído
```

### Novos campos em `business_settings`
```sql
machine_fee_enabled   BOOLEAN DEFAULT false    -- Toggle: repassar taxa ao colaborador?
debit_fee_percent     DECIMAL(5,2) DEFAULT 0   -- Taxa débito (%)
credit_fee_percent    DECIMAL(5,2) DEFAULT 0   -- Taxa crédito (%)
```

### Update em `payment_method` (separar Cartão)
```sql
-- Valores válidos passam a ser:
-- BR: 'Pix', 'Dinheiro', 'Débito', 'Crédito'
-- PT: 'Dinheiro', 'MBWay', 'Débito', 'Crédito'
-- (antes era 'Cartão' unificado)
```

---

## RLS

- `appointments` UPDATE (status, payment_method, received_by, completed_by): liberado para todos da mesma barbearia (`user_id = auth.uid() OR company_id via profiles`)
- `business_settings` SELECT/UPDATE: apenas owner

---

## Arquivos Impactados

| Arquivo | Ação | Motivo |
|---|---|---|
| `components/CheckoutModal.tsx` | **CRIAR** | Modal de conclusão de atendimento |
| `pages/Agenda.tsx` | MODIFICAR | Botão "Concluir" abre modal em vez de chamar RPC direto |
| `components/appointment/AppointmentReview.tsx` | MODIFICAR | Tornar pagamento opcional + separar Débito/Crédito |
| `components/AppointmentWizard.tsx` | MODIFICAR | Propagar pagamento opcional |
| `pages/settings/CommissionsSettings.tsx` | MODIFICAR | Adicionar seção taxa de maquininha |
| `supabase/migrations/` | **CRIAR** | Novos campos + update de payment_method |
| RPC `complete_appointment` | MODIFICAR | Aceitar received_by, completed_by, machine_fee |
