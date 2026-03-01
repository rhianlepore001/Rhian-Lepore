# 🚀 START — Agente Intermediário

> **Você:** Agente Especializado em Tarefas Estruturadas
> **Claude:** Agente Principal (Validação + Decisões)
> **Timeline:** 2 Dias (1-2 Março 2026)
> **Ferramenta:** Antigravity IDE (VSCode + Claude Code)
> **Meta:** Completar Semana 1 AIOS em 2 dias intensos

---

## 🎯 SUA MISSÃO

Você vai **executar tarefas estruturadas e progressivas** enquanto Claude valida tudo. Seu trabalho é:

1. ✅ Criar scripts (Backup)
2. ✅ Criar páginas (2FA Settings)
3. ✅ Criar/atualizar stories AIOS
4. ✅ Documentar tudo
5. ✅ Fazer commits
6. ✅ Criar resumo final para Claude ler

---

## 📚 LEIA PRIMEIRO

1. **`CONTEUDO_AGENTE_INTERMEDIARIO.md`** ← ROTEIRO COMPLETO
   - Tem tudo o que você precisa fazer
   - Dia 1 (Bloco 1, 2, 3, 4)
   - Dia 2 (Bloco 1, 2, 3, 4)
   - Checklist final

2. **`SEMANA_1_PLANO_MELHORADO.md`** ← CONTEXTO
   - Por que essas tarefas?
   - O que é esperado?
   - Resultados finais

3. **`discovery-notes.md`** ← PRD CONTEXT
   - O que é AgenX?
   - Features core?
   - User stories?

---

## 🛠️ COMO COMEÇAR (AGORA!)

### **Passo 1: Abrir Antigravity IDE**
```bash
# No seu terminal
code .
# Ou abrir VSCode normalmente com Claude Code ativado
```

### **Passo 2: Criar pasta de backups**
```bash
mkdir -p backups
```

### **Passo 3: Começar com DIA 1, Bloco 1**
Abra `CONTEUDO_AGENTE_INTERMEDIARIO.md` e siga:
- Tarefa 1.1: Criar `scripts/backup-supabase.js`
- Tarefa 1.2: Criar `docs/BACKUP_PROCEDURE.md`
- Tarefa 1.3: Atualizar `.gitignore`
- Tarefa 1.4: Commit

---

## 📖 ESTRUTURA DO CONTEÚDO

```
DIA 1 (Sábado, 1 Mar)
├── Bloco 1: Setup Backup (1h)
│   ├── Tarefa 1.1: Script backup
│   ├── Tarefa 1.2: Documentação
│   ├── Tarefa 1.3: .gitignore
│   └── Checkpoint: npm run backup ✅
│
├── Bloco 2: 2FA Opcional (1h)
│   ├── Tarefa 2.1: Verify Supabase
│   ├── Tarefa 2.2: Create page
│   ├── Tarefa 2.3: Test manual
│   ├── Tarefa 2.4: Documentation
│   └── Checkpoint: Login com 2FA ✅
│
├── Bloco 3: Create Stories (2h)
│   ├── Tarefa 3.1: US-004 (Finance Doctor)
│   ├── Tarefa 3.2: US-005 (AIOS Integration)
│   ├── Tarefa 3.3: US-007 (Backup)
│   ├── Tarefa 3.4: US-008 (2FA)
│   └── Checkpoint: 4 stories ✅
│
└── Bloco 4: Commit (30 min)
    ├── Stage + Commit Dia 1
    └── Checkpoint: Dia 1 DONE ✅

DIA 2 (Domingo, 2 Mar)
├── Bloco 1: Auditoria PRD (2h)
│   ├── Tarefa 1.1: Checklist features
│   ├── Tarefa 1.2: Identificar gaps
│   └── Checkpoint: PRD vs Código ✅
│
├── Bloco 2: Create Stories Faltantes (2h)
│   ├── Tarefa 2.1: US-009 (Radar Lucro)
│   ├── Tarefa 2.2: US-010 (Copywriter)
│   ├── Tarefa 2.3: US-011 (Deep Link)
│   ├── Tarefa 2.4: US-012 (Soft Delete)
│   └── Tarefa 2.5: US-013 (Comissões)
│   └── Checkpoint: 5 stories ✅
│
├── Bloco 3: Consolidate (1h)
│   ├── Tarefa 3.1: Atualizar README
│   └── Tarefa 3.2: Atualizar Memory
│
└── Bloco 4: Final Commit + Resumo (1h)
    ├── Commit Dia 2
    └── Criar RESUMO_AGENTE_DIA_1_2.md ✅
```

---

## 💻 COMANDOS RÁPIDOS

```bash
# Criar arquivo
touch scripts/backup-supabase.js

# Criar pasta
mkdir -p backups

# Ver status
git status

# Adicionar tudo
git add .

# Commit
git commit -m "sua mensagem aqui"

# Ver logs
git log --oneline -5

# Testar backup
npm run backup

# Lint
npm run lint

# Typecheck
npm run typecheck
```

---

## ✨ TIPS para Sucesso

### ✅ Faça commitS Frequentes
- A cada tarefa completada = 1 commit
- Não deixa pra fazer tudo no final
- Mensagens claras em PT-BR

### ✅ Teste Tudo Manualmente
- Script rodou? Verificou o arquivo?
- 2FA page criada? Conseguiu ativar?
- Story foi salva? Checklist está claro?

### ✅ Documentação Clara
- Imagine um novo dev lendo
- Instruções step-by-step
- Exemplos quando possível

### ✅ RLS & Segurança
- Nunca deixar fuga de dados
- Sempre validar `establishment_id`
- Se duvidar, pergunta pra Claude

### ✅ Lint & Typecheck
- `npm run lint` antes de cada commit
- `npm run typecheck` antes de cada commit
- Não deixa erros passarem

---

## 🆘 SE TIVER DÚVIDA

1. **Releia `CONTEUDO_AGENTE_INTERMEDIARIO.md`** — a resposta provavelmente está lá
2. **Cheque a tarefa específica** — qual bloco/tarefa você está?
3. **Documente a dúvida no RESUMO** — Claude vai resolver quando terminar

---

## 📝 ENTREGA FINAL

Quando terminar DIA 2:

1. ✅ Criar arquivo: `RESUMO_AGENTE_DIA_1_2.md`
2. ✅ Incluir:
   - O que foi completado
   - Stories criadas
   - Validações feitas
   - Questões para Claude
   - Arquivos criados/modificados
3. ✅ Fazer último commit
4. ✅ Avisar Claude: "Pronto! Resumo está em `RESUMO_AGENTE_DIA_1_2.md`"

Claude vai ler o resumo e:
- ✅ Validar tudo
- ✅ Resolver dúvidas
- ✅ Decidir próximos passos (Semana 2)

---

## 🎊 VAMOS LÁ!

**Você consegue fazer isso em 2 dias!**

1. Abra Antigravity IDE
2. Leia `CONTEUDO_AGENTE_INTERMEDIARIO.md`
3. Comece com DIA 1, Bloco 1
4. Siga passo a passo
5. Faça commits frequentes
6. Termine com RESUMO para Claude

---

## 📞 QUANDO TERMINAR

Quando você TERMINAR TUDO (Dia 2 à noite):

```
Avise Claude:
"Agente intermediário aqui! Semana 1 AIOS (2 dias) está COMPLETA!

Resumo está em: RESUMO_AGENTE_DIA_1_2.md
Commits foram feitos com mensagens claras.

Aguardando validação e próximos passos!"
```

---

**Boa sorte, Agente! 🚀**

Vocês vão fazer Semana 1 em 2 dias e deixar o projeto PRONTO pra Semana 2! 💪
