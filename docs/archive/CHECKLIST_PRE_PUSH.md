# Checklist Pré-Push — AgenX AIOS

> **Objetivo:** Validação automática antes de fazer git push. Execute TODAS as verificações abaixo.

---

## ✅ Checklist de Validação (FASE 1)

**Tempo esperado:** 5 minutos

### 1️⃣ Code Quality (Lint + Typecheck)

```bash
# Validar ESLint
npm run lint

# Validar TypeScript
npm run typecheck
```

**Status:**
- ✅ PASS: Continuar
- ❌ FAIL: Corrigir erros, rodar novamente

---

### 2️⃣ Testes (Unit + Integration)

```bash
# Rodar testes
npm test -- --run

# (Opcional) Ver coverage
npm run test:coverage
```

**Status:**
- ✅ PASS: Continuar
- ❌ FAIL: Corrigir testes, rodar novamente

---

### 3️⃣ Build Production

```bash
# Validar que build é possível
npm run build
```

**Status:**
- ✅ PASS: Continuar
- ❌ FAIL: Corrigir build, rodar novamente

---

### 4️⃣ Story Compliance (CRÍTICO)

**Antes de fazer push, responda:**

- [ ] Existe uma story (`docs/stories/`) para esta mudança?
- [ ] A story tem `status: in-progress` ou `status: done`?
- [ ] Os checkboxes de "Critérios de Aceitação" estão preenchidos?
- [ ] Os arquivos modificados estão na seção "Arquivos Impactados"?

**Se NÃO:** Crie uma story primeiro usando `/develop-story`

---

### 5️⃣ RLS & Security (Se mexeu em DB)

**Se modificou qualquer coisa em `supabase/migrations/` ou `lib/supabase.ts`:**

- [ ] Todas as queries filtram por `company_id`?
- [ ] RLS está habilitado na tabela?
- [ ] Nenhuma query expõe dados de outra empresa?
- [ ] Nenhuma senha/API key hardcoded no código?

**Checklist rápido:**
```bash
# Verificar se há TODO ou FIXME relacionado a segurança
grep -r "TODO.*security\|FIXME.*RLS" src/

# Verificar se há hardcoded keys
grep -r "SUPABASE_KEY\|GEMINI_KEY" src/ --exclude-dir=node_modules
```

---

### 6️⃣ Commit Message (Português BR)

**Formato:**
```
[tipo]: breve descrição em PT-BR

Descrição mais longa se necessário.

Story: US-XXX (link para docs/stories/)
```

**Exemplos válidos:**
```
feat: implementar módulo Doutor Financeiro

Adiciona análise de fluxo de caixa usando Gemini.

Story: US-004
```

```
fix: corrigir RLS em appointments

Filtro por company_id agora está correto.

Story: US-006
```

---

## ⏱️ Fluxo Recomendado (5 min)

```bash
# 1. Lint + Typecheck
npm run lint && npm run typecheck
# ↓ Se FAIL, corrigir e repetir
# ↓ Se PASS, continuar

# 2. Testes
npm test -- --run
# ↓ Se FAIL, corrigir e repetir
# ↓ Se PASS, continuar

# 3. Build
npm run build
# ↓ Se FAIL, corrigir e repetir
# ↓ Se PASS, continuar

# 4. Verificar story
# (Manual) Abrir docs/stories/US-XXX
# (Manual) Preencher checkboxes

# 5. Verificar RLS (se aplicável)
# (Manual) Revisar supabase/ e lib/supabase.ts

# 6. Commit
git add .
git commit -m "feat: descrição em PT-BR

Descrição.

Story: US-XXX"

# 7. Push
git push origin branch-name
```

---

## 🔴 Bloqueadores Críticos (STOP!)

**Se qualquer um desses é true, NÃO FAÇA PUSH:**

| Bloqueador | O Que Fazer |
|---|---|
| ❌ `npm run lint` falha | Rodar `npm run lint --fix` |
| ❌ `npm run typecheck` falha | Corrigir tipos TypeScript |
| ❌ `npm test` falha | Corrigir testes ou código |
| ❌ `npm run build` falha | Debugar build errors |
| ❌ Nenhuma story existe | Criar com `/develop-story` |
| ❌ Story não tem checkboxes preenchidos | Preencher antes de push |
| ❌ Código tem senha/API key hardcoded | Remover imediatamente |
| ❌ Commit message não tem "Story: US-XXX" | Adicionar referência de story |

---

## 📝 Checklist Final (Antes de git push)

```
PRE-PUSH VALIDATION CHECKLIST
═════════════════════════════

1. Code Quality
   [ ] npm run lint — PASS
   [ ] npm run typecheck — PASS

2. Tests
   [ ] npm test -- --run — PASS

3. Build
   [ ] npm run build — PASS

4. Story
   [ ] Story existe (docs/stories/)
   [ ] Status é in-progress ou done
   [ ] Checkboxes preenchidos
   [ ] Arquivos Impactados atualizados

5. Security
   [ ] RLS verificado (se DB change)
   [ ] Nenhuma senha hardcoded
   [ ] Nenhum secret em logs

6. Commit
   [ ] Mensagem em PT-BR
   [ ] Referência "Story: US-XXX"

═════════════════════════════
✅ PRONTO PARA PUSH
```

---

## 🤖 Próxima Etapa (Fase 2)

Quando os scripts Python forem implementados, esse checklist será **automatizado**:

```bash
python .agent/scripts/checklist.py .
# → Roda TUDO acima automaticamente
# → Bloqueia se falhar em críticos
# → Avisa se falhar em avisos
```

---

**Versão:** 1.0.0
**Criado:** 2026-02-28
**Próxima Update:** Quando Python scripts forem prontos
