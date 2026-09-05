# Clube — Core (área do cliente)

**Status:** in_progress  
**Criado:** 2026-09-05  
**Branch:** `cursor/clube-core-area-cliente-cbdd`  
**Escopo:** fatia pivotável. Se a ideia não colar, descarta-se esta branch.

## Problem Statement

O cliente final não tem onde ver nem gerir a assinatura. Depois de pedir o clube, some o rastro: validade, o que está incluso, se está atrasado. A área (`/#/minha-area/:slug`) já existe para agendamentos — é o lugar certo. Precisa ficar profissional o bastante para o cliente confiar no plano.

## Goals

- [ ] Cliente autenticado por telefone vê o plano, status e validade (início / fim / dias restantes)
- [ ] Cliente entende o que está incluso e, se houver teto, quantos usos restam no período
- [ ] Cliente consegue cancelar (com confirmação) ou seguir para assinar / falar com o estabelecimento
- [ ] Link público `/#/clube/:slug` funciona (CTA da área não pode morrer)
- [ ] Área do cliente permanece mobile-first; clube é o bloco de destaque, não um CRUD escondido

## Out of Scope

| Feature | Reason |
|---------|--------|
| Menu do dono / Ajustes | Outra branch; pivot não depende disso |
| QR Pix / txid / financeiro | Plumbing do dono; não bloqueia o cliente ver o plano |
| Bypass checkout / teto no atendimento | Operação da casa |
| Novo assinante no balcão | Dono |
| Templates beauty vs barber | Copy vem do plano já cadastrado |
| Troca de plano pelo cliente | Fora do core |
| Débito automático | Outro produto |

## User Stories

### P1: Ver minha assinatura e a validade ⭐ MVP

**User Story**: Como cliente, quero abrir Minha Área e ver se sou assinante, até quando vale e o que está incluso, para não depender do WhatsApp do estabelecimento.

**Acceptance Criteria**:

1. WHEN o cliente entra em `/#/minha-area/:slug` com o mesmo telefone da assinatura THEN o sistema SHALL mostrar plano, status efetivo e datas de validade
2. WHEN a membership está `active` e `next_billing_at` já passou THEN o sistema SHALL mostrar status Atrasado (cálculo na leitura, sem cron)
3. WHEN o plano tem `usage_limit_per_month` THEN o sistema SHALL mostrar usos no período corrente vs teto
4. WHEN não há membership THEN o sistema SHALL mostrar empty state com CTA para `/#/clube/:slug`

**Independent Test**: Seed membership ativa → login na área com o telefone → card mostra “Válido até …” e dias restantes.

### P1: Gerir (cancelar ou assinar)

**User Story**: Como cliente, quero cancelar o plano ou ir assinar, sem pedir ao dono para “olhar no sistema”.

**Acceptance Criteria**:

1. WHEN status é active/pending/overdue THEN o sistema SHALL oferecer “Cancelar plano” com confirmação
2. WHEN confirma THEN a membership SHALL virar `cancelled` (RPC pública escopada por telefone + business)
3. WHEN status é none/cancelled THEN o sistema SHALL oferecer “Assinar o clube”
4. WHEN status é pending ou overdue THEN o sistema SHALL oferecer WhatsApp para o estabelecimento

### P1: Contratar pelo link certo

**User Story**: Como cliente, quero abrir `/#/clube/{slug}` e ver os planos (mesmo padrão de `/book/:slug`).

**Acceptance Criteria**:

1. WHEN acessa `/#/clube/:slug` THEN JoinClub SHALL resolver o estabelecimento pelo path
2. WHEN a contratação é enviada THEN SHALL haver CTA “Ir para Minha Área”

### P2: Superfície profissional

**User Story**: Como cliente, quero uma área que pareça produto, não lista de agendamentos com um recado.

**Acceptance Criteria**:

1. WHEN há assinatura THEN o hero SHALL destacar o clube (status + validade), não só “Olá”
2. WHEN navega as abas THEN existe aba Clube com o detalhe completo
3. WHEN mobile THEN alvos ≥ 44px; tokens do tema do estabelecimento

## Edge Cases

- WHEN telefone não casa com `clients` THEN SHALL tratar como sem assinatura (não erro)
- WHEN há membership cancelada recente THEN SHALL mostrar cancelada + CTA reassinar (não esconder)
- WHEN período ainda não começou (pending) THEN SHALL não inventar “válido até”
- WHEN `/clube/assinantes` (rota do dono) THEN SHALL continuar protegida; slug reservado não vira JoinClub

## Requirement Traceability

| ID | Story | Phase | Status |
|----|-------|-------|--------|
| CLUB-CORE-01 | Ver assinatura + validade | Execute | Implementing |
| CLUB-CORE-02 | Usos do período | Execute | Implementing |
| CLUB-CORE-03 | Cancelar | Execute | Implementing |
| CLUB-CORE-04 | Empty / CTA assinar | Execute | Implementing |
| CLUB-CORE-05 | Rota `/clube/:slug` | Execute | Implementing |
| CLUB-CORE-06 | Hero + aba Clube | Execute | Implementing |

## Success Criteria

- [ ] Cliente descreve em 5 segundos se está ativo e até quando
- [ ] Cancelar na área reflete na lista do dono (`/clube/assinantes`)
- [ ] `/#/clube/meu-slug` não redireciona para o home
