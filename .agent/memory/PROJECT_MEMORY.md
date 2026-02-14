# 🧠 PROJECT MEMORY - Barber/Beauty OS

> **Última Atualização:** 14/02/2026
> **Versão:** 0.1.0
> **Status:** Em Desenvolvimento

---

## 🏗️ Contexto do Projeto

**Objetivo:** SaaS de gestão para Barbearias e Salões de Beleza (Multi-tenant / Multi-tema).
**Tech Stack:** React (Vite), TypeScript, Supabase, Clerk (Auth), TailwindCSS (v4), Stripe.

### 🎨 Temas e Design
- **Sistema Dual:** Tema "Barber" (Brutalista/Dark) e Tema "Beauty" (Elegante/Roxo).
- **Detecção:** Automática via URL ou preferência do usuário.
- **Assets:** Backgrounds e logos dinâmicos em `public/`.
- **Componentes Chave:** `BrutalCard`, `BrutalButton`, `BrutalBackground`.

### 🔐 Autenticação & Segurança
- **Provedor:** Migração para Clerk em andamento (Híbrido com Supabase).
- **RLS:** Row Level Security ativo no Supabase.
- **Regras:** Acesso restrito por tenant/user_id.

---

## 📜 Regras de Ouro (Memória)

1. **Atualizar Sempre:** Ao finalizar uma tarefa significativa, adicione uma entrada no Log.
2. **Seja Conciso:** Use bullet points. Evite prosa longa.
3. **Foque no "O Que" e "Por Que":** O código mostra o "Como". A memória deve explicar a decisão.

---

## 📝 Memória de Alterações (Reverse Chronological)

### [14/02/2026] - Implementação da Memória Persistente
- **O que foi feito:** Criação do sistema de memória centralizada (`PROJECT_MEMORY.md`).
- **Por que:** Evitar fragmentação de contexto e economizar tokens entre sessões.
- **Arquivos:** `.agent/memory/PROJECT_MEMORY.md`, `.agent/rules/GEMINI.md`.

### [Anterior] - Refatoração e Temas
- **Temas:** Implementação completa dos temas Barber e Beauty com troca dinâmica.
- **Componentes:** Criação de `Brutal*` components para design system consistente.
- **Docs:** Geração de documentação extensa em `INDICE_ARQUIVOS.md` e guias de tema.
- **Auth:** Início da integração com Clerk.
