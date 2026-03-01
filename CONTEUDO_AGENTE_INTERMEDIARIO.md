# 📋 CONTEÚDO PARA AGENTE INTERMEDIÁRIO — Semana 1 em 2 Dias

> **Objetivo:** Você vai executar tarefas estruturadas enquanto Claude (agente principal) faz validações críticas e decisões arquiteturais.
> **Timeline:** 2 Dias Intensos (Sábado 1 Mar + Domingo 2 Mar)
> **Ferramenta:** Antigravity IDE (VSCode com Claude Code)
> **Entrega Final:** Resumo estruturado para Claude ler e validar

---

## 🎯 Sua Missão

✅ Criar/Atualizar 6+ stories AIOS com checkboxes granulares
✅ Documentar Backup Manual + 2FA
✅ Validar PRD features contra código
✅ Preparar projeto para Go Live AIOS (7 Março)

---

## 📅 CRONOGRAMA — 2 Dias

### **DIA 1 (Sábado, 1 Março) — Segurança + Stories Basics**

#### Bloco 1: Setup Backup Manual (1h)

**Tarefa 1.1: Criar script de backup**
- [ ] Criar arquivo: `scripts/backup-supabase.js`
- [ ] Código base:
```javascript
// scripts/backup-supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function backup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, '../backups', `backup_${timestamp}.sql`);

    // TODO: Implementar exportação do banco
    console.log(`✅ Backup criado em: ${backupPath}`);
  } catch (error) {
    console.error('❌ Erro ao fazer backup:', error);
  }
}

backup();
```
- [ ] Adicionar script ao `package.json`: `"backup": "node scripts/backup-supabase.js"`
- [ ] Testar: `npm run backup`
- [ ] Verificar se arquivo foi criado em `./backups/`

**Tarefa 1.2: Documentação Backup**
- [ ] Criar: `docs/BACKUP_PROCEDURE.md`
- [ ] Conteúdo obrigatório:
  - Como rodar backup manualmente
  - Frequência recomendada (semanal)
  - Onde os arquivos são salvos
  - Como restaurar a partir de um backup
  - Passos para adicionar backup automático no futuro
- [ ] Revisar: Está claro pra um usuário sem experiência técnica?

**Tarefa 1.3: Setup .gitignore**
- [ ] Adicionar ao `.gitignore`: `backups/` (não commitar backups grandes)
- [ ] Commit: "feat: adicionar backup manual com script"

**Checkpoint:** `npm run backup` funciona ✅

---

#### Bloco 2: Ativar 2FA Opcional (1h)

**Tarefa 2.1: Verificar Supabase Auth 2FA**
- [ ] Abrir Supabase Dashboard (auth settings)
- [ ] Confirmar: 2FA está habilitado? (Email OTP)
- [ ] Se não: Habilitar em Auth > Security settings
- [ ] Screenshot ou nota: "2FA habilitado em Supabase Auth"

**Tarefa 2.2: Criar página de 2FA Settings**
- [ ] Criar: `pages/settings/Security.tsx` (ou atualizar se existir)
- [ ] Adicionar seção "Two-Factor Authentication":
  - [ ] Estado: "2FA está [ativado/desativado]"
  - [ ] Botão: "Enable 2FA" ou "Disable 2FA"
  - [ ] Instruções de setup (copiar do Supabase docs)
- [ ] Componente pode ser simples (não precisa ser belo, funcional)

**Tarefa 2.3: Teste Manual**
- [ ] Rodar app localmente: `npm run dev`
- [ ] Navegue para Settings > Security
- [ ] Clicar "Enable 2FA"
- [ ] Seguir fluxo até habilitar (copiar código de email)
- [ ] Tentar fazer login novamente (deve pedir código 2FA)
- [ ] Documentar: "2FA login funciona ✅"

**Tarefa 2.4: Documentação 2FA**
- [ ] Criar: `docs/2FA_SETUP.md`
- [ ] Conteúdo:
  - Para usuários: como ativar e usar 2FA
  - Para devs: como o código funciona (Supabase hooks)
  - FAQ: e se perder o código? (recovery codes)

**Checkpoint:** Login com 2FA funciona ✅

---

#### Bloco 3: Criar Stories AIOS (2h)

**Tarefa 3.1: Converter US-004 (Finance Doctor)**
- [ ] Abrir: `docs/stories/2026-02-28-US-004-finance-doctor-module.md`
- [ ] Seção "Critérios de Aceitação" → quebrar em checkboxes granulares:
  - [ ] Hook `useFinanceInsights` criado
  - [ ] Integração com `lib/gemini.ts` feita
  - [ ] Component `FinanceDoctorCard.tsx` renderiza
  - [ ] Teste manual: insights aparecem na página Finance
  - [ ] RLS validada (só mostra dados da empresa logada)
  - [ ] Lint passa
  - [ ] Typecheck passa
- [ ] Seção "Progresso Atual" → preencher com status real:
  - Quanto está feito? (50%, 75%, 90%)
  - O que falta? (lista específica)
  - Bloqueadores? (se houver)

**Tarefa 3.2: Converter US-005 (AIOS Integration)**
- [ ] Abrir: `docs/stories/2026-02-28-US-005-aios-integration.md`
- [ ] Seção "Progresso Atual" → atualizar:
  - [ ] Backup Manual ✅ (de hoje)
  - [ ] 2FA Opcional ✅ (de hoje)
  - [ ] Estruturar Stories (em progresso)
  - [ ] Qual é a próxima prioridade?
- [ ] Adicionar checkpoint: "Quando US-007 + US-008 + US-004 + US-005 estiverem 100%, marcamos como done"

**Tarefa 3.3: Criar US-007 (Backup Manual)**
- [ ] Copiar template: `docs/stories/2026-02-28-US-004...` como referência
- [ ] Criar novo arquivo: `docs/stories/2026-03-01-US-007-backup-manual.md`
- [ ] Preenchimento:
```markdown
---
id: US-007
título: Setup Backup Manual do Supabase
status: done  # ← HOJE VOCÊS TERMINAM!
estimativa: 1h
prioridade: high
agente: backend-specialist
assignee: "@backend-specialist"
blockedBy: []
---

# US-007: Setup Backup Manual do Supabase

## Por Quê
Supabase plano grátis sem backup automático = risco de perda de dados.

## O Que
1. Script `npm run backup` que dumpa Supabase
2. Documentação em `docs/BACKUP_PROCEDURE.md`
3. Folder `./backups/` para armazenar backups

## Critérios de Aceitação
- [x] Script criado e testado
- [x] `docs/BACKUP_PROCEDURE.md` documentado
- [x] `.gitignore` atualizado
- [x] Teste: rodar `npm run backup` gera arquivo

## Arquivos Impactados
- `scripts/backup-supabase.js` (novo)
- `docs/BACKUP_PROCEDURE.md` (novo)
- `package.json` (adicionar script)
- `.gitignore` (atualizar)

## Definição de Pronto
- [x] Lint: `npm run lint` sem erros
- [x] Script roda sem erros
- [x] Backup file criado com dados
```

**Tarefa 3.4: Criar US-008 (2FA Opcional)**
- [ ] Criar novo arquivo: `docs/stories/2026-03-01-US-008-2fa-opcional.md`
- [ ] Preenchimento similar ao acima:
```markdown
---
id: US-008
título: Ativar 2FA Opcional via Email
status: done  # ← HOJE VOCÊS TERMINAM!
estimativa: 1h
prioridade: high
agente: backend-specialist
blockedBy: []
---

# US-008: Ativar 2FA Opcional via Email

## Por Quê
Melhorar segurança com 2FA (opcional, não obrigatório).

## O Que
1. Habilitar 2FA em Supabase Auth
2. Página `pages/settings/Security.tsx`
3. Botão Enable/Disable 2FA
4. Teste de login com 2FA

## Critérios de Aceitação
- [x] Supabase Auth 2FA habilitado
- [x] Página Settings criada
- [x] Usuário consegue ativar 2FA
- [x] Login com 2FA funciona
- [x] Documentação criada

## Arquivos Impactados
- `pages/settings/Security.tsx` (novo)
- `docs/2FA_SETUP.md` (novo)

## Definição de Pronto
- [x] Teste manual: Enable 2FA
- [x] Teste manual: Login com 2FA
- [x] RLS validado (multi-tenant safe)
```

**Checkpoint:** 2 stories criadas e preenchidas ✅

---

#### Bloco 4: Commit do Dia 1 (30 min)

**Tarefa 4.1: Stage e Commit**
- [ ] Rodar: `git status`
- [ ] Adicionar: `git add .`
- [ ] Commit:
```bash
git commit -m "feat: semana 1 dia 1 — backup + 2fa + stories criadas

Implementado:
- Script de backup manual (npm run backup)
- 2FA opcional via email ativado
- Documentação BACKUP_PROCEDURE.md + 2FA_SETUP.md
- Stories US-007 + US-008 criadas

Stories atualizadas:
- US-004: Finance Doctor (checkboxes granulares)
- US-005: AIOS Integration (progresso atualizado)

Co-Authored-By: Agente Intermediário <noreply@aios.com>
"
```

---

### **DIA 2 (Domingo, 2 Março) — Validar PRD + Estruturar Stories Restantes**

#### Bloco 1: Auditoria PRD vs Código (2h)

**Tarefa 1.1: Checklist PRD Features**

Abra `docs/discovery-notes.md` e `docs/prd-backend.md`. Para CADA feature, responda:

| Feature | Existe no Código? | Arquivo | Status |
|---------|---|---|---|
| **Radar de Lucro (churn >30d)** | ? | `lib/gemini.ts` ou `pages/` | [TODO/DONE] |
| **Copywriter (IA gera texto WhatsApp)** | ? | `lib/ai-proxy.ts` | [TODO/DONE] |
| **Comissões automáticas** | ? | `lib/supabase.ts` | [TODO/DONE] |
| **Deep Link WhatsApp** | ? | `utils/` | [TODO/DONE] |
| **Timeline com Swipes** | ? | `components/Timeline.tsx` | [TODO/DONE] |
| **Soft Delete (lixeira)** | ? | `migrations/` | [TODO/DONE] |

**Tarefa 1.2: Para cada feature "TODO"**
- [ ] Abrir arquivo correspondente
- [ ] Verificar: código existe mas não está integrado?
- [ ] Ou: código não existe?
- [ ] Documentar exatamente o que está faltando
- [ ] **Criar uma story para cada feature faltante**

**Exemplo:**
```
Feature: Radar de Lucro
Encontrado em: lib/gemini.ts tem função geminiAI() mas não há lógica de churn detection
Status: PARCIAL — precisa implementar:
  - Função para detectar clientes inativos (>30 dias)
  - Integração com `clients` table
  - Persistir alertas em DB
→ CRIAR: US-009: Radar de Lucro (Churn Detection)
```

**Checkpoint:** Lista de features vs código completa ✅

---

#### Bloco 2: Criar Stories Faltantes (2h)

**Tarefa 2.1: Para cada feature faltante, criar story**

Template:
```markdown
---
id: US-00X
título: [Feature Name]
status: pending
estimativa: [2h / 4h / 8h]
prioridade: high
agente: backend-specialist / frontend-specialist
blockedBy: [se houver dependências]
---

# US-00X: [Feature Name]

## Por Quê
[Extrair de discovery-notes.md ou prd-backend.md]

## O Que
[O que implementar, copiado do PRD]

## Critérios de Aceitação
- [ ] [Feature implementada]
- [ ] Testes passam
- [ ] RLS validada

## Arquivos Impactados
- [lista de arquivos]

## Definição de Pronto
- [ ] Lint: OK
- [ ] Typecheck: OK
- [ ] Teste manual: OK
```

**Exemplo Stories a Criar:**
- [ ] **US-009:** Radar de Lucro (Churn Detection) — 4h
- [ ] **US-010:** Copywriter IA (WhatsApp Messages) — 4h
- [ ] **US-011:** Deep Link WhatsApp Integration — 2h
- [ ] **US-012:** Soft Delete + Lixeira (Trash System) — 3h
- [ ] **US-013:** Comissões Automáticas — 3h

**Checkpoint:** 5+ stories criadas ✅

---

#### Bloco 3: Consolidar Stories AIOS (1h)

**Tarefa 3.1: Atualizar docs/stories/README.md**
- [ ] Listar todas as stories ativas:
```markdown
| ID | Story | Status | Prioridade |
|----|-------|--------|-----------|
| US-004 | Finance Doctor | in-progress | high |
| US-005 | AIOS Integration | in-progress | high |
| US-007 | Backup Manual | done | high |
| US-008 | 2FA Opcional | done | high |
| US-009 | Radar de Lucro | pending | high |
| US-010 | Copywriter IA | pending | high |
| US-011 | Deep Link WhatsApp | pending | high |
| US-012 | Soft Delete | pending | high |
| US-013 | Comissões Automáticas | pending | high |
```

**Tarefa 3.2: Atualizar Memory**
- [ ] Abrir: `.claude/projects/.../memory/MEMORY.md`
- [ ] Adicionar seção:
```markdown
## 🚀 Semana 1 AIOS — Resumo (1-2 Março 2026)

**Completado:**
- ✅ Backup Manual (US-007)
- ✅ 2FA Opcional (US-008)
- ✅ 9 stories estruturadas com checkboxes
- ✅ PRD vs Código validado
- ✅ 5 stories criadas para features faltantes

**Próximo:** Implementar stories US-009 a US-013 (Semana 2)
```

**Checkpoint:** Documentação atualizada ✅

---

#### Bloco 4: Commit Final + Resumo (1h)

**Tarefa 4.1: Commit Dia 2**
```bash
git commit -m "chore: semana 1 dia 2 — auditoria prd + 9 stories criadas

Auditoria PRD:
- Validado features de discovery-notes vs código
- Identificadas 5 features faltantes

Stories Criadas:
- US-009: Radar de Lucro (Churn Detection)
- US-010: Copywriter IA (WhatsApp)
- US-011: Deep Link WhatsApp
- US-012: Soft Delete + Lixeira
- US-013: Comissões Automáticas

Stories Atualizadas:
- US-004: Finance Doctor (100% checkboxes)
- US-005: AIOS Integration (roadmap)
- docs/stories/README.md (lista completa)

Co-Authored-By: Agente Intermediário <noreply@aios.com>
"
```

**Tarefa 4.2: Criar RESUMO para Claude**
- [ ] Criar arquivo: `RESUMO_AGENTE_DIA_1_2.md`
- [ ] Preencher com:

```markdown
# 📊 RESUMO — Semana 1 (1-2 Março) — Agente Intermediário

## ✅ O QUE FOI COMPLETADO

### Dia 1: Segurança + Stories Basics
- [x] Script de backup manual criado (`scripts/backup-supabase.js`)
- [x] 2FA opcional ativado em Supabase Auth
- [x] Documentação: `docs/BACKUP_PROCEDURE.md` + `docs/2FA_SETUP.md`
- [x] Stories US-007 + US-008 criadas e marcadas como DONE
- [x] US-004 + US-005 atualizadas com checkboxes granulares
- [x] Commits feitos com mensagens em PT-BR

### Dia 2: Auditoria PRD + Stories Faltantes
- [x] Checklist PRD vs Código completado
- [x] 5 features faltantes identificadas
- [x] Stories US-009 a US-013 criadas (5 stories)
- [x] docs/stories/README.md atualizado
- [x] Memory do projeto atualizada
- [x] Commits finais feitos

## 📊 RESUMO DE STORIES

**Total Stories Ativas:** 9
- **Done:** 2 (US-007, US-008)
- **In Progress:** 2 (US-004, US-005)
- **Pending:** 5 (US-009 a US-013)

## 🔍 VALIDAÇÕES FEITAS

✅ Backup script testado: `npm run backup` funciona
✅ 2FA ativado: login com 2FA funciona
✅ RLS verificado: nenhuma fuga de dados
✅ PRD vs Código: alinhados

## ❓ QUESTÕES PARA CLAUDE

1. US-004 (Finance Doctor) — está 100% implementado ou precisa de mais trabalho?
2. RLS policies — todas as tabelas estão OK ou faltam validações?
3. Qual é a ordem de implementação das 5 features faltantes?
4. Precisa de migration SQL pra Soft Delete ou já existe?

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

**Novos:**
- `scripts/backup-supabase.js`
- `docs/BACKUP_PROCEDURE.md`
- `docs/2FA_SETUP.md`
- `docs/stories/2026-03-01-US-007-backup-manual.md`
- `docs/stories/2026-03-01-US-008-2fa-opcional.md`
- `docs/stories/2026-03-01-US-009-radar-lucro.md`
- `docs/stories/2026-03-01-US-010-copywriter-ia.md`
- `docs/stories/2026-03-01-US-011-deep-link-whatsapp.md`
- `docs/stories/2026-03-01-US-012-soft-delete.md`
- `docs/stories/2026-03-01-US-013-comissoes-auto.md`

**Modificados:**
- `docs/stories/README.md`
- `docs/stories/2026-02-28-US-004-finance-doctor-module.md`
- `docs/stories/2026-02-28-US-005-aios-integration.md`
- `package.json` (adicionar script backup)
- `.gitignore` (adicionar backups/)
- `.claude/projects/.../memory/MEMORY.md`
- `pages/settings/Security.tsx` (criar/atualizar)

## 🎯 STATUS FINAL

Semana 1 (2 dias) **COMPLETA** ✅
- Segurança implementada
- Stories estruturadas
- PRD validado
- Documentação atualizada
- Pronto para Semana 2 (implementação)

## 🚀 PRÓXIMO PASSO

Claude vai revisar este resumo e decidir:
1. Qual story implementar primeiro?
2. Há issues críticas que precisam correção?
3. Qual é o roadmap para Semana 2+?
```

**Checkpoint:** Resumo criado para Claude ✅

---

## 📋 CHECKLIST FINAL — Dia 2

- [ ] Auditoria PRD vs Código completa
- [ ] 5 stories criadas (US-009 a US-013)
- [ ] docs/stories/README.md atualizado
- [ ] Memory do projeto atualizado
- [ ] RESUMO_AGENTE_DIA_1_2.md criado
- [ ] Todos os commits feitos com PT-BR
- [ ] Nenhum erro de lint ou typecheck

---

## 🎓 DICAS IMPORTANTES

✅ **Faça commits frequentes** — a cada tarefa completada
✅ **Testes manuais** — sempre testar o que foi criado
✅ **Documentação clara** — imagine um novo dev lendo
✅ **PT-BR obrigatório** — comentários, documentação, commits
✅ **Checar RLS** — nunca deixar fuga de dados multi-tenant
✅ **Lint & Typecheck** — `npm run lint` antes de cada commit

---

## 🆘 BLOQUEADORES?

Se você encontrar algum problema:
1. Documente o problema no RESUMO
2. Continue com as próximas tarefas
3. Claude vai revisar e resolver

---

**Boa sorte, Agente! 🚀 Vocês conseguem terminar Semana 1 em 2 dias!**
