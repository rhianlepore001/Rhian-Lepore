# Discovery Notes — Produtos v2

## Visão
**Problema:** A feature Produtos existe (catálogo + venda), mas sem lógica de negócio completa: produtos não entram no agendamento (interno/público), comissão de venda não existe, e venda avulsa não vincula cliente/vendedor.
**Usuário principal:** Dono/gestor do salão (mobile-first no balcão); staff vende no dia a dia.
**Referência:** Fluxo de serviço + checkout já existentes no AgendiX.
**Pitch:** Produtos viram parte do atendimento e do booking online (quando o gestor permitir), com comissão de venda somada ao colaborador e venda avulsa com cliente opcional.

## Funcionalidades
**Core features:**
1. Anexar produtos a agendamentos (criar/editar/confirmar) — intenção até o checkout.
2. Toggle gestor + seção Produtos no agendamento público.
3. Comissão % por produto, atribuída ao vendedor, somada em Comissões.
4. Venda avulsa com vendedor obrigatório e cliente opcional.

**Integrações:** Agenda (wizard, edit, checkout), Booking público, Financeiro/Comissões, settings de booking.

## Monetização
**Modelo:** Incluso na assinatura AgendiX (sem add-on).
**Planos:** N/A (feature do SaaS existente).

## Técnico
**Stack:** React + Supabase (RPC `sell_product`, tabelas `products` / `product_sales` / `appointment_product_lines`).
**Plataforma:** Web PWA mobile-first (HashRouter).

## Contexto
**Referências visuais:** Spec v1 UI em `specs/done/SPEC-products-v1-ui.md`.
**Notas adicionais:** Estoque só baixa na venda efetiva (não reserva no booking). Fora do ciclo: devolução, categorias de catálogo, reserva real de estoque.

## Regras de negócio (fonte de verdade)

| ID | Regra |
|----|--------|
| R1 | Owner cadastra produto com `sale_price`, `cost_price`, estoque, `min_stock`, `commission_percent` (0–100), `show_in_public`, `is_active`. |
| R2 | Staff vê/vende; não edita catálogo nem vê custo/margem. |
| R3 | Anexo em agendamento: quantidade ≤ estoque atual (aviso se 0); não reserva estoque. |
| R4 | Venda efetiva só via RPC: baixa estoque, cria `product_sales` + `finance_records` (revenue + commission se %). |
| R5 | Comissão de produto soma no total do colaborador vendedor (`professional_id`), junto com comissão de serviço. |
| R6 | Venda avulsa: cliente opcional; vendedor (team_member) obrigatório; sem `appointment_id`. |
| R7 | Booking público: seção Produtos só se `public_products_enabled`; linhas no booking; ao aceitar, copiam para o appointment; venda no checkout. |
| R8 | Editar/confirmar agendamento: UI para adicionar/remover linhas pendentes (ainda sem baixa). |
