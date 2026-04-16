# Comissões e Pagamento — Tasks

**Feature:** comissoes-pagamento
**Criado:** 2026-04-16
**Spec:** `.specs/features/comissoes-pagamento/spec.md`
**Status:** In Progress

---

## Nota de Schema

A migration `20260416_commission_payments.sql` já criou:
- `team_members.cpf` (TEXT) ✅
- `team_members.commission_percent` ✅
- `business_settings.payment_day` ✅
- Tabela `commission_payments` com RLS ✅

Não é necessário criar nova migration.

---

## Execution Plan

```
T1 [P]  ─────────────────────────────┐
T2 [P]  ─────────────────────────────┤
T3 [P]  ───────────────┐             ├──→ T6
T4 ─── depende de T3 ──┘             │
T5 [P]  ─────────────────────────────┘
```

---

## T1: CPF em TeamMemberForm

**Arquivo:** `components/TeamMemberForm.tsx`
**Req:** REQ-F3-01 (rodapé do relatório)

- [ ] Estado `cpf` inicializado de `initialData?.cpf || ''`
- [ ] Campo input CPF opcional no form (entre commission_rate e bio)
- [ ] Formato: máscara visual (não obrigatória) — placeholder "000.000.000-00"
- [ ] Incluído em `teamMemberData` ao salvar (update e insert)
- [ ] `npm run typecheck` passa

---

## T2: CommissionsManagement — 4 melhorias

**Arquivo:** `components/CommissionsManagement.tsx`
**Req:** REQ-F3-03, REQ-F3-06, REQ-F3-07, REQ-F3-08

- [ ] Toggle tabs "Pendente" / "Pago" no topo (REQ-F3-08)
  - "Pendente" = default = lista atual (`get_commissions_due`)
  - "Pago" = busca `commission_payments` com status='paid', mostra lista com data e valor
- [ ] Ciclo mês cheio (REQ-F3-03):
  - Fetch `business_settings.commission_settlement_day_of_month` ao montar
  - `handleOpenPayModal` usa ciclo: se dia acerto = 5, período = dia 6 mês anterior → dia 5 mês atual
  - Label de período: "Período: 06/mar → 05/abr"
  - Atalhos "Este Mês"/"Mês Passado" substituídos por "Período Atual"/"Período Anterior"
- [ ] Colaborador sem % (REQ-F3-07):
  - Ao clicar "Realizar Pagamento" se `commission_rate === 0 || commission_rate === null`:
  - Mostrar campo inline de % antes de abrir o modal de pagamento
  - Salvar % em `team_members.commission_rate` antes de prosseguir
- [ ] Substituir `alert()` por `useAlerts()` (showAlert)
- [ ] EC-F3-01: loading state já existe — garantir que botão fica disabled após clique

---

## T3: CommissionDetailReport.tsx — criar

**Arquivo:** `components/CommissionDetailReport.tsx`
**Req:** REQ-F3-01

- [ ] Recebe: professionalId, professionalName, cpf?, period (start/end), currencySymbol, accentColor, onClose, onShare
- [ ] Query: `finance_records WHERE professional_id = X AND commission_paid = false AND created_at BETWEEN start AND end`
  - Join com appointment para pegar machine_fee_percent se disponível
- [ ] Tabela de serviços: data, cliente, serviço, valor bruto, forma pagamento, taxa (%), base de cálculo, comissão
- [ ] Totais: subtotal bruto, taxa total, base total, comissão total = valor líquido
- [ ] Rodapé: nome, CPF (ou "CPF não cadastrado"), período
- [ ] Botão "Compartilhar" abre CommissionShareModal
- [ ] EC-F3-03: se sem serviços, mostra "Nenhum serviço neste período"
- [ ] EC-F3-02: CPF null → "CPF não cadastrado"

---

## T4: CommissionShareModal.tsx — criar

**Arquivo:** `components/CommissionShareModal.tsx`
**Req:** REQ-F3-02

- [ ] Recebe: professionalName, cpf?, period, netAmount, currencySymbol, onClose
- [ ] Resumo visível: nome, CPF (se cadastrado), período, valor líquido
- [ ] Botão "WhatsApp": monta texto formatado + abre `https://wa.me/?text=...`
- [ ] Botão "PDF": html2canvas no elemento de resumo → download PNG/PDF
- [ ] Zero dados de outros colaboradores

---

## T5: Dashboard — 2 banners

**Arquivo:** `pages/Dashboard.tsx`
**Req:** REQ-F3-04, REQ-F3-05

- [ ] Banner véspera (REQ-F3-04):
  - Fetch `business_settings.commission_settlement_day_of_month`
  - Se hoje = settlement_day - 1 → mostrar banner amarelo para owner
  - Texto: "Amanhã é dia de pagar as comissões. [Ver equipe]"
  - Link navega para `/#/finance` (aba comissões)
  - Fechável manualmente (X)
- [ ] Banner noturno (REQ-F3-05):
  - Após 20h, busca appointments WHERE date = hoje AND status != 'Completed'
  - Se count > 0 → mostrar banner laranja para owner E staff
  - Texto: "[X] atendimentos não foram confirmados hoje. [Ver agendamentos]"
  - Link: `/#/agenda`

---

## T6: Validação final

- [ ] `npm run typecheck` sem erros
- [ ] `npm run lint` sem erros
- [ ] `npm run build` completa
- [ ] Testes existentes passam

---

## Status

| Task | Status |
|------|--------|
| T1 | pending |
| T2 | pending |
| T3 | pending |
| T4 | pending |
| T5 | pending |
| T6 | pending |
