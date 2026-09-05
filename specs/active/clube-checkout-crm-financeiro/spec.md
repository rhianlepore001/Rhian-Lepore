# Clube — checkout, CRM e financeiro

**Status:** in_progress  
**Criado:** 2026-09-05  
**Branch:** `cursor/clube-checkout-crm-financeiro-cbdd`

## Goals

- [x] Checkout respeita `usage_limit_per_month` (mesmo contador da área do cliente: 1 atendimento = 1 uso)
- [x] Confirmar mensalidade gera receita no Financeiro
- [x] Lista de clientes e ficha CRM mostram badge do Clube quando há membership ativa/pendente/atrasada
- [x] Booking público aponta para `/#/clube/:slug` se houver planos

## Out of Scope

Cron de overdue, WhatsApp automático, débito automático.
