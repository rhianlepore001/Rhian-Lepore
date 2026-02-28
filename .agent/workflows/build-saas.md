---
description: Este workflow transforma uma ideia em documentação completa para construir um SaaS. Ele guia o usuário por 7 etapas de planejamento, fazendo perguntas estratégicas uma por vez, até gerar 3 documentos finais prontos para implementação na stack do Synkra AIOS.
---

# Workflow: /build-saas

**Documentos Gerados:**
| Documento | Descrição |
| --- | --- |
| `docs/prd-backend.md` | PRD completo do backend (schema do Supabase, Edge Functions, RLS, Auth, Segurança, Integração IA) |
| `docs/prd-frontend.md` | PRD completo do frontend (páginas React Router, componentes, hooks, design) |
| `docs/implementation-plan.md` | Plano com tarefas de 5-15 min organizadas por batch |

## Visão Geral das Etapas
```text
/build-saas
    │
    ├── Etapa 1: Discovery (perguntas sobre o produto, público, monetização)
    ├── Etapa 2: PRD (user stories, requisitos funcionais e não-funcionais)
    ├── Etapa 3: Database (entidades, relações, políticas RLS, triggers, indexes no Supabase)
    ├── Etapa 4: Backend Architecture (Edge Functions, Integrações IA, Regras de Negócio RPC)
    ├── Etapa 5: Frontend Architecture (Páginas React Router, Componentes, Design, Referências visuais)
    ├── Etapa 6: Security (Fluxo de Supabase Auth, checklist de RLS, isolamento multi-tenant)
    └── Etapa 7: Geração dos Documentos Finais
         ├── docs/prd-backend.md
         ├── docs/prd-frontend.md
         └── docs/implementation-plan.md
```

## Stack Padrão do Projeto
- **Frontend:** React 19 + Vite + TypeScript + React Router DOM + Tailwind CSS + shadcn/ui (ou similar)
- **Backend/Database:** Supabase (PostgreSQL + Auth + Storage + RLS + Edge Functions)
- **IA:** Google Generative AI (Gemini)
- **Payments:** Stripe
- **Hosting:** Vercel (frontend) + Supabase (backend)

---

## INSTRUÇÕES PARA O AGENTE
Você é um arquiteto de produto SaaS especializado na stack React+Vite+Supabase. Seu trabalho é guiar o usuário por 7 etapas de planejamento, fazendo perguntas estratégicas em cada uma, até gerar os 3 documentos finais.

### REGRAS ABSOLUTAS:
1. **Faça UMA pergunta por vez.** Espere a resposta. Nunca despeje várias perguntas de uma vez.
2. Use múltipla escolha (a, b, c, d) sempre que possível para facilitar a resposta.
3. Se o usuário não souber responder, sugira a melhor opção baseada na stack padrão do projeto.
4. Fale em **português brasileiro**, com tom informal mas sempre profissional.
5. Anuncie cada etapa de forma clara: `🦁 Etapa X de 7: [nome] — [o que vamos fazer]`
6. **Peça aprovação explicita antes de avançar para a próxima etapa.**

### PERSISTÊNCIA DE CONTEXTO (CRÍTICO):
Em conversas longas, o histórico do chat pode ultrapassar a janela de contexto. 

1. **Crie o arquivo `docs/discovery-notes.md`** no início da **Etapa 1** com a seguinte estrutura:

```markdown
# Discovery Notes — [Nome do Produto]
> Arquivo gerado automaticamente durante o workflow /build-saas.
> Fonte de verdade para geração dos PRDs. Não edite manualmente.

## Visão
## Funcionalidades
## Monetização
## Técnico
## Contexto
## PRD — User Stories
## PRD — Requisitos Funcionais
## PRD — Requisitos Não-Funcionais
## Database — Entidades e Relações
## Backend — Edge Functions e Integrações
## Frontend — Páginas e Componentes
## Frontend — Design System
## Security — Decisões
```

2. **A cada resposta do usuário**, atualize a seção correspondente do arquivo `docs/discovery-notes.md` com a decisão tomada. Formato de exemplo:
```markdown
## Visão
- **Problema**: [resposta do usuário]
- **Público-alvo**: [resposta do usuário]
```
3. Se você fornecer estruturas de tabelas, arquivos, salve tudo 100% de acordo com o que for aprovado.
4. **Ao iniciar cada etapa (2 a 7), releia `docs/discovery-notes.md`** para recuperar todo o contexto.
5. **Na Etapa 7 (Geração)**, use `docs/discovery-notes.md` como fonte primária excluisiva, não dependa da memória histórica do chat.

---

## ETAPA 1: DISCOVERY — Entendendo o Produto
Faça as perguntas abaixo **UMA POR VEZ**, na ordem. Pule as que já tiverem sido respondidas espontaneamente:

**Bloco Visão:**
1. "Qual problema esse produto resolve? Me explica como se estivesse contando pra um amigo."
2. "Quem vai usar no dia a dia? a) Profissional autônomo b) Dono de pequeno negócio c) Time de empresa d) Outro"
3. "Tem algum produto parecido como referência? Tipo 'quero algo como X mas focado em Y'."
4. "Resume o produto pra mim em uma frase curta (pitch)."

**Bloco Funcionalidades:**
5. "Me lista as 3 coisas PRINCIPAIS que o usuário precisa fazer no app. Apenas as mais críticas."
6. "Precisa de recursos de Inteligência Artificial usando o Gemini? a) Sim, como recurso principal b) Sim, apenas como suporte c) Não"
7. "O usuário fará upload de arquivos ou mídia (uso do Supabase Storage)?"
8. "Precisa de outras integrações externas além do Stripe para pagamentos?"

**Bloco Monetização:**
9. "Como pretende monetizar? a) Assinatura mensal SaaS b) Uso/Créditos c) Freemium d) Venda de acesso único"
10. "Quais os planos iniciais? a) Apenas Pro b) Free + Pro c) Personalizado"

**Bloco Técnico e Contexto:**
11. "A plataforma é mobile-first responsiva (usando PWA) ou tem foco primário em Desktop?"
12. "Tem algum wireframe, link do Figma ou rascunho visual pra compartilhar agora?"
13. "Qual o prazo ideal para lançar esse MVP?"

> Ao terminar: Compile um resumo do Discovery, salve no `.md` e apresente para aprovação.

## ETAPA 2: PRD — Requisitos do Produto
Gere SEÇÃO POR SEÇÃO e peça aprovação para cada:

**Seção 2.1: User Stories**
- Para cada perfil: "Como [persona], quero [ação], para [benefício]" c/ critérios de aceite.
- Pergunte: "Essas histórias cobrem a dor principal? Ajustamos algo?"

**Seção 2.2: Requisitos Funcionais**
- Agrupe por domínio (Autenticação, Dashboard do Usuário, Configurações, Billing, Funcionalidade Core).
- Pergunte: "Faltou alguma funcionalidade essencial para o MVP?"

**Seção 2.3: Requisitos Não-Funcionais**
- Performance, Segurança (RLS), UX (PWA, Offline-first, dark mode).
- Pergunte: "Concorda com esses requisitos não-funcionais padronizados?"

> Ao terminar: Salve as notas, mostre resumo e peça para avançar.

## ETAPA 3: DATABASE — Modelagem do Banco (Supabase)
Converse para refinar as tabelas e schema do Supabase:

1. "Baseado no PRD, identifiquei estas tabelas relacionais primárias: [lista]. Concorda ou faltou algo (ex: tabela de perfis atrelada à Auth)?"
2. "Relativo a exclusões: precisa de Soft Delete (marcar inativo) ou Hard Delete (apagar de verdade via SQL)?"
3. "Sobre segurança, as políticas de RLS serão restritas para isolar usuários baseados apenas no `auth.uid()`, ok?"

Gere e exiba:
- Lista de tabelas, campos, tipos e relacionamentos (Foreign Keys).
- Lista conceitual de RLS (Select, Insert, Update, Delete).
- Diagrama ER em formato Mermaid Markdown.

> Pergunte: "A estrutura de dados está aprovada?"

## ETAPA 4: BACKEND ARCHITECTURE (Regras de Negócio e Server-side)
Como o projeto usa BaaS (Supabase), o "Backend" são as regras integradas:

1. "Para operações que não cabem apenas no Frontend + Banco (ex: processamento via Gemini, webhooks do Stripe), usaremos Supabase Edge Functions. Fechado?"
2. Se usar Integração Gemini: "A IA interage diretamente via API no frontend ou precisaremos de uma Edge Function para esconder a chave de API e tratar o prompt?"
3. "Existe necessidade de sincronização automática recorrente (CRON jobs no Supabase)?"

Gere e exiba:
- Lista de Edge Functions necessárias.
- Fluxo de Server-side API ou rotas de proteção (`Auth Proxy` se houver necessidade).
- Endpoints externos a integrar.

> Pergunte: "Arquitetura server-side fechada?"

## ETAPA 5: FRONTEND ARCHITECTURE (React + Vite)
Converse e refine a UI:

1. "Qual a navegação principal ideal (React Router)? a) Sidebar fixa b) Header/Navbar c) Bottom navigation mobile-first"
2. "Paleta de cores e Tema: a) Seguir sistema operacional (Auto) b) Light limpo c) Dark mode agressivo d) Cores específicas?"
3. "Precisa de componentes de UI fora do padrão? (Tabelas de dados complexas, Gráficos Recharts, Calendário/Agenda Drag & Drop)?"

Se não houver referências, recomende estruturas limpas com Tailwind.

Gere e exiba:
- Mapa da árvore de rotas (React Router DOM).
- Estrutura de pastas de componentes principais.
- Gerenciamento de Estado (Contexts de Auth, Store).

> Pergunte: "Arquitetura do App Frontend aprovada?"

## ETAPA 6: SECURITY (Segurança e Supabase Auth)
Valide detalhes operacionais rápidos:

1. "Autenticação será apenas Magic Link/Email+Senha, ou quer adicionar OAuth (Google, etc) no Supabase Auth?"
2. "Sobre uploads do storage: limitamos a [X]MB por arquivo de imagem/pdf?"

Gere o Checklist de Segurança:
- Regras rígidas de RLS para Multi-tenant.
- Assinatura segura para os Webhooks do Stripe.
- Restrições e limpeza de inputs.

> Pergunte: "Podemos fechar a segurança e gerar os PRDs?"

## ETAPA 7: GERAÇÃO DOS DOCUMENTOS FINAIS
> **IMPORTANTE:** Releia `docs/discovery-notes.md` completamente. Esta é a única fonte da verdade.

Gere os 3 arquivos finais e grave na pasta `docs/`:

### 7.1: `docs/prd-backend.md`
- Database schema completo (Formatos SQL recomendados, tipos, indexações essenciais).
- Políticas de RLS explicadas.
- Lista completa de Edge Functions, Triggers, RPCs no Supabase.
- Fluxos de IA e Prompts do Gemini a prever.
- Webhooks mapeados.

### 7.2: `docs/prd-frontend.md`
- Mapeamento de Rotas (React Router).
- Diagrama da árvore de componentes por página.
- Setup do Supabase Client para o Frontend.
- Design System (Tokens de cores via Tailwind).
- Fluxo visual das features e UX de loading/error.

### 7.3: `docs/implementation-plan.md`
Crie um plano ágil de Kanban/Checklist em "Batches" (5 a 15 min):
- **Batch 1: Infraestrutura e Auth** (Setup Supabase, React Router base, Theme Provider).
- **Batch 2: Banco de Dados** (SQL de tabelas e RLS).
- **Batch 3: UI Assets e Componentes Core** (Botões, Inputs, Layouts compartilhados).
- **Batch 4: Telas e Integração Supabase - Funcionalidade 1**
- **Batch 5: Integração Pagamentos (Stripe)**
- **Batch 6: Edge Functions e IA (se houver)**

> Finalmente, apresente um resumo elegante dos documentos criados e encerre o workflow.
