# Clube — Menu do dono (planos e Pix)

**Status:** in_progress  
**Criado:** 2026-09-05  
**Branch:** `cursor/clube-dono-menu-cbdd`

## Problem Statement

O dono não encontra o Clube: as telas de planos, Pix e assinantes existem, mas não aparecem em Ajustes nem na navegação. “Assinatura” em Ajustes é o plano AgendiX, o que confunde.

## Goals

- [x] Dono vê **Clube** em Ajustes (e consegue abrir Planos e Pix)
- [x] Dono vê **Clube** no menu principal (desktop e “Mais” no mobile) para gerir assinantes
- [x] “Assinatura” deixa claro que é o **plano AgendiX**, não o clube dos clientes
- [x] Nas três telas, abas Planos / Pix / Assinantes com alvos ≥ 44px

## Out of Scope

Teto de usos no checkout, financeiro da mensalidade, badge no CRM, cron de overdue.

## User Stories

### P1: Achar e configurar o clube

**Acceptance Criteria:**

1. WHEN o dono abre Ajustes THEN SHALL ver item **Clube** (grupo Negócio), distinto de **Plano AgendiX**
2. WHEN abre Clube THEN SHALL ver Planos; WHEN Pix THEN formulário da chave; WHEN Assinantes THEN lista
3. WHEN está em `/configuracoes/clube/pix` THEN o item Clube em Ajustes permanece ativo

### P1: Operar assinantes no dia a dia

**Acceptance Criteria:**

1. WHEN o dono (não staff) abre o menu lateral THEN SHALL ver **Clube** em Crescimento → `/clube/assinantes`
2. WHEN abre “Mais” no mobile THEN SHALL ver **Clube** (owner only)

## Requirement Traceability

| ID | Story | Status |
|----|-------|--------|
| CLUB-NAV-01 | Item Clube em Ajustes | Done |
| CLUB-NAV-02 | Desambiguar Assinatura → Plano AgendiX | Done |
| CLUB-NAV-03 | Abas Planos / Pix / Assinantes | Done |
| CLUB-NAV-04 | Clube no sidebar e Mais | Done |
