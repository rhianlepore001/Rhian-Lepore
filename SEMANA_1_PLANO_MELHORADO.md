# Plano Melhorado — Semana 1 (1-7 Março 2026)

> **Baseado em:** discovery-notes.md + prd-backend.md + prd-frontend.md + implementation-plan.md
> **Status do Projeto:** Brownfield avançado (não é MVP greenfield)
> **Objetivo Semana 1:** Consolidar segurança + estruturar stories AIOS + validar PRD

---

## 📊 Status Atual vs. Plano Original

### O Que Já Está Feito (Fase Greenfield Completa)
✅ Auth (Supabase Auth customizado)
✅ Database (Multi-tenant com RLS)
✅ UI Core (React 19 + Vite + Tailwind + shadcn/ui)
✅ Bottom Navigation (Dashboard, Agenda, Finance, Ajustes)
✅ Timeline Vertical (agendamentos)
✅ Tema dinâmico (Brutal vs Beauty)
✅ Design System (BrutalCard, componentes core)
✅ PWA (configurado)

### O Que Falta (Fase Brownfield Consolidação)
❌ Backup Manual (crítico!)
❌ 2FA Opcional (segurança)
❌ IAOS Engine integrado (IA para churn)
❌ Processamento agendado (pg_cron para Radar de Lucro)
❌ Financeiro refinado (comissões, dashboard)
❌ Deep Link WhatsApp (integração)

---

## 🎯 Semana 1 — Prioridades Reais

### **PRIORIDADE 1: Segurança (Hoje — 1h)**
**Por quê:** Vocês têm 10 usuários + discovery-notes documenta que backup é P0.

- **US-007:** Setup Backup Manual (30 min)
  - Script `npm run backup` → dumpa Supabase
  - Documentação `docs/BACKUP_PROCEDURE.md`
  - Teste: rodar backup uma vez

- **US-008:** Ativar 2FA Opcional via Email (30 min)
  - Supabase Auth → habilitar TOTP
  - Página `pages/settings/Security.tsx`
  - Botão Enable/Disable 2FA
  - Teste: login com 2FA

**Resultado:** Sistema seguro + data protected ✅

---

### **PRIORIDADE 2: Consolidar AIOS Stories (2h)**
**Por quê:** Você começou AIOS Fase 1, precisa continuar Semana 1.

- **US-004:** Finance Doctor (converter checkboxes)
  - Verificar status real (quanto está completo?)
  - Quebrar em sub-tasks: Hook → Component → Testes → RLS
  - Discovery-notes menciona "Diagnóstico de Lucro" como core

- **US-005:** AIOS Integration (converter checkboxes)
  - Adicionar checklist de stories: backup ✅, 2FA ✅, qual próxima?
  - Documentar workflow `/develop-story` funcionando

**Resultado:** Stories visíveis com progresso ✅

---

### **PRIORIDADE 3: Validar PRD vs Código (2h)**
**Por quê:** discovery-notes + PRD definem features core, precisam estar no código.

| Feature (PRD) | Status Código? | Ação |
|---|---|---|
| **Radar de Lucro (churn >30d)** | ❓ Verificar | Criar story se não houver |
| **Copywriter (IA para WhatsApp)** | ❓ Verificar | Validar Edge Function ai-proxy |
| **Comissões por profissional** | ❓ Verificar | Validar cálculo automático |
| **Deep Link WhatsApp** | ❓ Verificar | Testar integração |
| **Timeline com Swipes** | ✅ Prob. tem | Validar 60 FPS |
| **Soft Delete (lixeira)** | ❓ Verificar | Garantir `deleted_at` em todas tabelas |

**Resultado:** PRD ↔ Código alinhados ✅

---

## 📋 Tarefas Dia-a-Dia (7 Dias)

### **Dia 1 (Sáb, 1 Mar):** Setup Segurança
- [ ] **US-007:** Backup Manual
  - Criar `scripts/backup-supabase.js`
  - Documento `docs/BACKUP_PROCEDURE.md`
  - Teste: `npm run backup`
  - Commit

- [ ] **US-008:** 2FA Opcional
  - Habilitar em Supabase dashboard
  - Página `pages/settings/Security.tsx`
  - Teste: Enable/Disable 2FA
  - Commit

**Tempo:** 2h | **Checkpoints:** Backup rodando ✅, 2FA testado ✅

---

### **Dia 2 (Dom, 2 Mar):** Validar PRD

- [ ] **Auditoria PRD:**
  1. Radar de Lucro: Existe `pg_cron` script? Se não, criar story
  2. Copywriter: `ai-proxy` Edge Function existe? Se não, criar story
  3. Comissões: Campo no `commissions` table? Se não, criar migration
  4. Deep Link: Helper de WhatsApp existe? Se não, criar story
  5. Soft Delete: Todas tabelas têm `deleted_at`? Se não, criar migration

- [ ] **Criar Stories Faltantes:**
  - US-009: Radar de Lucro (se não houver)
  - US-010: Copywriter IA (se não houver)
  - US-011: Deep Link WhatsApp (se não houver)

**Tempo:** 3h | **Checkpoint:** PRD vs Código alinhados ✅

---

### **Dias 3-5 (2-4 Mar):** Estruturar Stories AIOS

- [ ] **US-004 (Finance Doctor):**
  - Status real: % concluído?
  - Quebrar em checkboxes: Hook, Component, Tests, RLS
  - Atualizar story com progresso

- [ ] **US-005 (AIOS Integration):**
  - Checkpoint: Backup ✅, 2FA ✅, qual próxima?
  - Atualizar com stories criadas acima
  - Documentar workflow AIOS

- [ ] **Criar US-009, 010, 011** (se faltarem)
  - Usar template de stories
  - Adicionar checkboxes granulares

**Tempo:** 4h | **Checkpoint:** 6+ stories com checkboxes visíveis ✅

---

### **Dias 6-7 (5-7 Mar):** Verificação Final

- [ ] **Validação AIOS:**
  - Todas stories têm checkboxes? ✅
  - Todas têm "Arquivos Impactados"? ✅
  - Todas têm "Definição de Pronto"? ✅

- [ ] **Validação Segurança:**
  - Backup testado ✅
  - 2FA testado ✅
  - RLS verificado (nenhuma fuga multi-tenant) ✅

- [ ] **Commits:**
  - Backup + 2FA + Stories
  - Documentação AIOS Semana 1

**Tempo:** 2h | **Checkpoint:** Semana 1 COMPLETA ✅

---

## 🎯 Resultados Esperados (Fin Semana 1)

### Segurança ✅
- [x] Backup manual configurado
- [x] 2FA opcional ativado
- [x] RLS verificado (multi-tenant seguro)

### AIOS ✅
- [x] 6+ stories estruturadas com checkboxes
- [x] Progresso visível em todas
- [x] `/develop-story` funcionando como fluxo padrão

### PRD ✅
- [x] Código alinhado com discovery-notes
- [x] Features core do PRD mapeadas e criadas
- [x] Novos stories criados se faltarem

### Documentação ✅
- [x] `docs/BACKUP_PROCEDURE.md`
- [x] `docs/2FA_SETUP.md`
- [x] Stories atualizadas
- [x] MEMORY do projeto atualizada

---

## 📚 Referências de Contexto

**Discovery Notes:** AgenX é AI Operating System com foco em:
- IA para recuperação de churn (Radar de Lucro)
- Agendamento público mobile-first (Booksy-style)
- Design adaptável (Brutal vs Beauty)
- Financeiro simplificado com comissões
- WhatsApp Deep Link como canal de comunicação

**PRD Backend:** Multi-tenant com RLS, Edge Functions, pg_cron automações

**PRD Frontend:** Bottom nav, Timeline vertical com swipes, temas dinâmicos, 60 FPS

**Implementation Plan Original:** 2 semanas, 8 batches (mas vocês estão na Semana 1 de AIOS consolidação, não MVP)

---

## ⚡ Fórmula de Sucesso

```
Dia 1: Segurança (Backup + 2FA) = 2h
Dia 2: Validar PRD vs Código = 3h
Dias 3-5: Estruturar Stories AIOS = 4h
Dias 6-7: Verificação + Documentação = 2h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL: 11h em 7 dias = 1.5h/dia média
RESULTADO: Semana 1 AIOS COMPLETA ✅
```

---

**Versão:** 1.0.0
**Data:** 1 Março 2026
**Próxima Review:** 7 Março (Go Live AIOS)
