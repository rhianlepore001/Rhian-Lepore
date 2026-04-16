# ROADMAP — AGENX MVP

**Projeto:** AGENX — SaaS para gestão de barbearias e salões
**Início:** 2026-04-11
**Target:** MVP lançável em 30 dias

---

## Phase 1: Identity & Documentation

**Goal:** Atualizar identidade do projeto, README e CLAUDE.md para refletir AGENX corretamente.

**Status:** ✅ Complete

**Scope:**
- README.md reescrito com descrição real do produto
- CLAUDE.md ≤150 linhas, sem referências a AIOX/Clerk
- package.json com nome e descrição corretos

**Requirements:** REQ-001, REQ-002, REQ-003

---

## Phase 2: Repository Cleanup

**Goal:** Remover ~4.5MB de arquivos obsoletos para limpar o repo antes do beta.

**Status:** 🔴 Pending

**Scope:**
- Deletar arquivos AIOX, RAG, multi-agent, zip de fotos concorrente
- Manter `.planning/`, `.agent/`, código fonte ativo
- Commit: `chore: clean repo`

**Requirements:** REQ-010, REQ-011

---

## Phase 3: Checkout de Atendimento + Forma de Pagamento

**Goal:** Implementar o fluxo de conclusão de atendimento com forma de pagamento, taxa de maquininha e configurações financeiras do dono — substituindo o fluxo atual onde forma de pagamento era capturada na criação.

**Status:** 🔴 Pending

**Plans:** 4 planos

**Scope:**
- Botão "Concluir atendimento" no card de agendamento
- Modal `CheckoutModal.tsx` com: serviço, valor, forma de pagamento (obrigatória), taxa de maquininha (opcional, débito/crédito), "Recebido por"
- Forma de pagamento opcional na criação do agendamento (não obrigatória)
- Configurações em Settings > Financeiro: toggle repasse de taxa, % débito, % crédito
- Migrations: novos campos em `appointments` + tabela/campos em `settings`
- RLS: UPDATE de appointments liberado para todos da mesma barbearia
- Agendamento concluído não pode ser cancelado por colaborador (mensagem: "Este agendamento já foi finalizado. Fale com o dono.")

**Requirements:** REQ-020, REQ-021, REQ-022, REQ-023, REQ-024

Plans:
- [ ] 03-01-PLAN.md — Migration SQL (appointments + business_settings) + types.ts + schema push
- [ ] 03-02-PLAN.md — CheckoutModal.tsx com testes (REQ-020, REQ-021, REQ-022, REQ-023)
- [ ] 03-03-PLAN.md — FinancialSettings.tsx + rota App.tsx + constants.ts (REQ-024)
- [ ] 03-04-PLAN.md — Integração em Agenda.tsx: interceptar botão, badge, cancel guard, payment opcional

---

## Phase 4: Comissões e Pagamento da Equipe

**Goal:** Implementar cálculo, visualização e controle de pagamento de comissões para a equipe — com relatório detalhado, histórico e lembretes.

**Status:** 🔴 Pending

**Scope:**
- Tela Financeiro > Comissões: lista de colaboradores com total bruto, %, valor líquido, status
- Botão "Marcar como pago" com confirmação
- Relatório detalhado por colaborador: serviços, subtotal, taxa, base de cálculo, comissão, valor líquido
- Compartilhar via WhatsApp (texto formatado) ou PDF simples
- Migration: tabela `commission_payments` + campos `commission_percent` e `cpf` em profiles
- Lembrete: banner no Dashboard do dono no dia anterior ao pagamento
- Lembrete: banner para dono e colaboradores com agendamentos não concluídos no final do dia
- Configuração em Settings: "Dia do pagamento de comissões" e "% comissão por colaborador"
- Colaborador sem % configurado: dono digita na hora do pagamento

**Requirements:** REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035

---

## Phase 5: Dashboard do Colaborador (Visão Restrita)

**Goal:** Implementar visão restrita do Dashboard para role `staff` — mostrando apenas dados próprios do colaborador, sem expor faturamento bruto da barbearia.

**Status:** 🔴 Pending

**Scope:**
- Dashboard condicional por role: owner vê tudo, collaborator vê versão restrita
- Colaborador vê: agenda do dia, botão criar agendamento (para qualquer colega), faturamento líquido próprio, estoque (consulta)
- Colaborador pode editar e cancelar agendamentos de colegas
- Bloqueio de rotas: acesso a `/financeiro` redireciona com toast "Acesso restrito ao dono"
- RLS: `financial_records`/`commissions` filtrado por `collaborator_id = auth.uid()` para staff
- Nunca expor faturamento bruto da barbearia para staff

**Requirements:** REQ-040, REQ-041, REQ-042, REQ-043

---

## Phase 6: UI Polish — Modernização Tema Barber

**Goal:** Remover elementos visuais datados do tema Barber (parafusos, fontes monospace, sombras offset, bordas grossas) mantendo a identidade dark-gold e sem tocar no tema Beauty.

**Status:** 🔴 Pending

**Spec:** `specs/active/ui-modernizacao-tema-barber.md`

**Scope:**
- BrutalButton: fonte Inter, case normal, bordas sutis, hover com brightness
- BrutalCard: remover parafusos decorativos, remover uppercase nos títulos
- Modal: remover border-4/dashed/sombra offset/dots, aplicar sombra promax
- CSS global: atualizar `.brutal-*` classes para padrão moderno
- Resultado visual: dark premium industrial (referência: Squire, Boulevard)

**Requirements:** REQ-060, REQ-061, REQ-062, REQ-063

---

## Requirements Index

| ID | Fase | Descrição |
|----|------|-----------|
| REQ-001 | 1 | README atualizado com descrição real do AGENX |
| REQ-002 | 1 | CLAUDE.md ≤150 linhas, sem AIOX/Clerk |
| REQ-003 | 1 | package.json com nome "agenx" |
| REQ-010 | 2 | Deletar arquivos obsoletos (AIOX, RAG, zip) |
| REQ-011 | 2 | Repo com ≤ arquivos necessários para MVP |
| REQ-020 | 3 | Botão "Concluir atendimento" no card de agendamento |
| REQ-021 | 3 | CheckoutModal com forma de pagamento obrigatória |
| REQ-022 | 3 | Taxa de maquininha condicional (débito/crédito) |
| REQ-023 | 3 | Campo "Recebido por" no checkout |
| REQ-024 | 3 | Settings > Financeiro com configuração de taxas |
| REQ-030 | 4 | Tela de comissões com lista de colaboradores |
| REQ-031 | 4 | Botão "Marcar como pago" com confirmação |
| REQ-032 | 4 | Relatório detalhado por colaborador |
| REQ-033 | 4 | Compartilhar relatório (WhatsApp/PDF) |
| REQ-034 | 4 | Migration tabela commission_payments |
| REQ-035 | 4 | Lembretes de pagamento e atendimentos |
| REQ-040 | 5 | Dashboard condicional owner vs collaborator |
| REQ-041 | 5 | Collaborator vê apenas dados próprios |
| REQ-042 | 5 | Bloqueio de rotas para staff |
| REQ-043 | 5 | RLS filtrado por collaborator_id para staff |
| REQ-060 | 6 | BrutalButton sem fonte monospace/uppercase/border-black |
| REQ-061 | 6 | BrutalCard sem parafusos e sem uppercase em títulos |
| REQ-062 | 6 | Modal brutal sem border-4/dashed/sombra offset/dots |
| REQ-063 | 6 | CSS global .brutal-* atualizado para padrão moderno |
