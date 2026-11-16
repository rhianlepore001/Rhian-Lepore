# AGENTS.md

Instruções de comportamento e processo para agentes de IA que trabalham neste repositório (Cursor no computador do Rhian, Cloud Agents e qualquer outro agente).
Para detalhes técnicos do stack, pastas e comandos, consulte `CLAUDE.md`.
Para publicar, siga `docs/runbooks/publicacao.md` e a skill `.cursor/skills/publicar-agendix/SKILL.md`.
Para contas de teste e variáveis, siga `docs/runbooks/acessos.md`. Nunca grave senhas neste arquivo.

---

## O que é o AgendiX

SaaS de gestão para barbearias e salões (Brasil e Portugal). Produto do Rhian Lepore.

- Repositório: `rhianlepore001/Rhian-Lepore`
- App em produção: https://www.agendixstudio.com
- Supabase de produção: `lcqwrngscsziysyfhpfj`
- Stack: React 19 + TypeScript + Vite (HashRouter), Supabase com RLS e RPCs `SECURITY DEFINER`, Vercel, GitHub Actions
- Temas: `barber` (escuro) e `beauty` (claro), via `UIContext`

Fase atual: **Fase 0**. Só avançamos de fase quando tudo isto estiver verdadeiro:

- o Tales usa o AgendiX como agenda principal da Moderna por 2 semanas
- 5 a 10 barbearias estão no beta
- o WhatsApp funciona num iPhone de verdade
- não há bug crítico em aberto
- o smoke test está verde

Depois vem o seed de dados. O "algoritmo 360" só entra com 20 clientes reais ativos. Não antecipe essas fases.

---

## Idioma e tom

- Responda sempre em português brasileiro (pt-BR), de forma simples e direta.
- Código, nomes de variáveis e comentários técnicos seguem as convenções do projeto (inglês).
- Mensagens de commit e descrições de PR em pt-BR.
- Sem preâmbulos longos. Se não souber, diga. Não invente APIs nem padrões que não existem no projeto.

---

## Regras permanentes do Rhian

Estas proibições valem sempre, mesmo com pedido informal. Não há exceção por "OK rápido":

- Nunca imprimir, colar em PR, commit, issue ou log: segredos, tokens, chaves, senhas ou connection strings.
- Nunca usar cartão real.
- Nunca enviar mensagens a terceiros (WhatsApp, e-mail, Slack, etc.).
- Nunca burlar proteção de branch, hooks ou regras de CI (`--no-verify`, bypass, etc.).
- Nunca criar contas de dono.

Só faça o item abaixo com OK explícito do Rhian, neste chat, para esta ação:

1. Produção, merge, exclusão, force-push ou publicação.
2. Qualquer mudança no banco. Toda migration precisa de rollback testado e script de verify. Se o verify falhar, rode o rollback e **pare**.
3. Mexer em cadastro, onboarding ou autenticação, e só se ele tiver pedido essa mudança.

Um PR por vez, sempre aberto em rascunho, até o Rhian pedir para publicar.

Antes de publicar uma mudança de interface: prints em 390px, barbearia no tema escuro e salão no tema claro. Crítica visual com a skill `playwright-visual-critique` (e, quando couber, `impeccable` e `design-taste-frontend`). Nota 8 ou menos reprova, e a tela não vai para o ar.

Trabalhe em TDD: Vitest no app, Playwright no fluxo, SQL em PostgreSQL 17 isolado. Nunca use o banco de produção para experimentar.

---

## Modelos (Cursor)

- Nunca use modelos ou modos fast.
- Neste repositório, no Cursor, use só Grok ou Composer.
- O agente principal fica no mesmo modelo do começo ao fim do PR. Não troque no meio.
- Composer 2.5 entra só para rodar ou escrever testes, como ferramenta auxiliar.
- Grok 4.6 low entra só em subagentes de apoio (revisão, verificação). O modelo do PR não muda por causa disso.

---

## Fluxo de trabalho

### Antes de codar
1. Leia `graphify-out/GRAPH_REPORT.md` como mapa da codebase; depois o arquivo e os vizinhos.
2. Observe imports, nomes e estilo do código ao lado. Não assuma biblioteca nova: confira o `package.json`.
3. Páginas novas seguem `React.lazy()` + `<Suspense>` (ver `CLAUDE.md`). Rotas usam HashRouter: `/#/rota`, nunca `/rota`.

### Durante
- Mudanças mínimas e focadas. Sem refatoração não pedida.
- Prefira editar arquivo existente a criar outro.
- Não adicione comentários no código a menos que o Rhian peça.
- Respeite a pasta certa: `pages/`, `components/`, `hooks/`, `supabase/migrations/`.

### Depois
Rode, nesta ordem, e só então diga que terminou:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Se um teste antigo quebrar, avalie se o teste ainda está certo. Comente a ambiguidade com o Rhian.

### Commits e PRs
- Commit só quando pedido, ou quando o PR de rascunho precisar ser aberto ou atualizado.
- Mensagens em pt-BR, imperativo: `adiciona tela de agenda`, `corrige filtro de company_id`.
- Um assunto por commit. Nunca secrets, `.env` ou credenciais.
- Nunca `--no-verify` ou `--force` sem pedido explícito.
- PR em rascunho, título e corpo em pt-BR: por quê, o quê, como testar.
- Publicação (ready + merge + banco + Vercel) só pelo runbook, e só com OK do Rhian.

---

## Segurança do produto

- Multi-tenant: todo query no banco filtra por `company_id`. Query sem `company_id` volta vazia, sem erro (RLS).
- `company_id` vem sempre da sessão Supabase via `useAuth()`, nunca de URL ou formulário.
- Nunca desabilitar RLS sem entender o impacto.
- Auth: só Supabase Auth via `useAuth()`. Ignore referências antigas a Clerk.
- Repo é público: nada de segredo em `MEMORY.md`, PRs, issues ou docs.

---

## Armadilhas conhecidas

1. **iOS Safari** bloqueia `window.open` depois de um `await`. WhatsApp (e qualquer app externo) abre por um `<a>` real que a pessoa toca; no PWA em tela cheia, use a mesma aba.
2. **Receita reconhecida** usa `COALESCE(completed_at, appointment_time)`. Não troque o critério sem pedido.
3. **Convite de colaborador** (PR #206): o link leva um código secreto, vale 30 dias, é de uso único. O gestor pode gerar um novo em Equipe. Link antigo ou falso mostra que o convite foi atualizado.
4. **Testes que escrevem no banco de verdade**, se apontados para produção: `e2e/staff-invite-flow.spec.ts` e `e2e/ciclo-de-receita.spec.ts` (e equivalentes). Nunca rodar contra produção. O Playwright principal já ignora `ciclo-de-receita`. A jornada 15 dias tem configuração isolada; a variante ao vivo se recusa a rodar contra produção.
5. **Playwright no Ubuntu 24.04** já foi instável no CI (ver PRs #198 e #199). O CI atual em `main` não tem um job geral de Playwright; tem Lint/Typecheck/Tests, Meta consent e os jobs de WhatsApp templates. Não misture falha de instalação do browser com falha de produto. Ver o runbook de publicação para o que pode ficar vermelho.
6. **HashRouter**, **lazy sem Suspense**, **OwnerRouteGuard** e **mobile first**: ver `CLAUDE.md`.

---

## Cursor no computador e Cloud Agents

- Regras permanentes estão em `.cursor/rules/` (`alwaysApply` ou `globs` por área). Não duplique isso em prompts longos: leia as regras e este arquivo.
- Skills em `.cursor/skills/`: `publicar-agendix`, `impeccable`, `design-taste-frontend` (Taste Skill) e `playwright-visual-critique`.
- Segredos e contas de teste nunca entram no repositório. O Rhian cadastra os valores em `.env.local` (já no `.gitignore`) e nos Secrets dos Cloud Agents. Nomes das variáveis e o passo a passo: `docs/runbooks/acessos.md`.
- Preferir Runtime Secrets no Cursor, para o valor não aparecer na transcrição nem no commit.
- O script antigo `scripts/backup-supabase.js` (`npm run backup`) não é o backup de publicação. Use o runbook.

### Instruções específicas dos Cloud Agents

- Instale dependências com `npm ci` (ou `npm install` se ainda não houver lock usável).
- App local: `npm run dev` em `http://localhost:3000`.
- Não rode specs perigosos contra URL de produção. Não aplique migration em produção sem o OK do Rhian e sem seguir o runbook.
- Se faltar uma variável de ambiente, explique qual e pare. Não invente credencial e não peça senha no chat se a variável puder ser lida do ambiente.

---

## graphify

Antes de explorar a codebase, leia `graphify-out/GRAPH_REPORT.md`. Depois de mudar código, rode `graphify update .` (AST-only).

Ciclo v1.0 encerrado. Backlog em `specs/active/`.
