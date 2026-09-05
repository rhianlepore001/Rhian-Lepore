# Clube Core — Context

**Gathered:** 2026-09-05  
**Spec:** `specs/active/clube-core-area-cliente/spec.md`  
**Status:** Ready for implement

## Feature Boundary

Core = o cliente vê e gere a assinatura na Minha Área (validade, incluso, usos, cancelar/assinar). Rota pública `/clube/:slug` só o suficiente para o CTA viver. Sem menu do dono, Pix, checkout ou financeiro nesta branch.

## Implementation Decisions

### O que é “gerir” neste core

- Ver plano, status, validade, incluso, usos
- Cancelar com confirmação (self-service)
- Assinar / reassinar via `/clube/:slug`
- WhatsApp para pending/overdue (renovação continua manual no dono)

### Validade

- Fonte: `current_period_end` / `next_billing_at`
- Atrasado = `active` + `next_billing_at < now` na leitura (RPC não grava overdue)
- Pending não mostra “válido até”

### Identidade

- Mesmo telefone da sessão pública (`PublicClientContext`)
- Match em `clients` via `phones_match`, igual ao JoinClub

### Área

- Hero com o clube quando há membership
- Aba “Clube” para o detalhe
- Não redesenhar Próximos / Histórico / Perfil além do necessário

### Agent's Discretion

- Layout do card, copy de status, barra de progresso do período
- Mensagem de WhatsApp de atraso/pendência

## Deferred Ideas

Menu do dono, Pix txid, receita no Financeiro, teto no checkout, templates beauty, troca de plano, débito automático.
