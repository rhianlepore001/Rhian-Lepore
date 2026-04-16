# AGENTS.md

Instruções de comportamento e processo para agentes de IA que trabalham neste repositório.
Para detalhes técnicos do projeto (stack, arquitetura, comandos, estrutura), consulte `CLAUDE.md`.

---

## Idioma

- **Toda a cadeia de pensamento (chain of thought) deve ser em português brasileiro (pt-BR).**
- Todas as respostas, explicações, raciocínios e interações com o usuário devem ser em pt-BR.
- Código, nomes de variáveis e comentários técnicos seguem as convenções do projeto (inglês), mas toda comunicação com o usuário é em pt-BR.
- Mensagens de commit e descrições de PR devem ser em pt-BR quando o contexto do projeto for em pt-BR.

---

## Comportamento do agente

### Princípios gerais
- **Concisão**: respostas curtas e diretas. Sem preâmbulos nem recapitulações desnecessárias.
- **Proatividade equilibrada**: execute quando solicitado, mas não surpreenda o usuário com ações não pedidas. Se em dúvida, pergunte.
- **Honestidade**: se não souber ou não puder fazer algo, diga. Não invente APIs, bibliotecas ou padrões que não existem no projeto.
- **Seguimento de convenções**: antes de criar ou editar código, observe os padrões do arquivo e dos arquivos vizinhos. Mimique o estilo existente.

### Quando perguntar vs. agir
- **Pergunte** quando houver mais de uma abordagem razoável e a escolha impacta arquitetura ou UX.
- **Aja** quando o caminho é claro e alinhado com padrões existentes do projeto.
- **Nunca** tome decisões destrutivas ou irreversíveis sem confirmação explícita do usuário.

### Comunicação
- Apresente código e mudanças sem explicações óbvias — o código deve se explicar.
- Use referências de arquivo no formato `caminho/do/arquivo:linha` quando relevante.
- Nunca use emojis a menos que o usuário peça explicitamente.

---

## Fluxo de trabalho

### Antes de codar (obrigatório)
1. **Ler contexto**: entenda o arquivo que vai modificar e os arquivos relacionados antes de fazer qualquer mudança.
2. **Verificar padrões**: observe imports, naming conventions, estrutura de componentes e estilo do código vizinho.
3. **Verificar dependências**: nunca assuma que uma biblioteca existe — confirme no `package.json` ou em imports existentes.
4. **Verificar rotas e estrutura**: se criar páginas, siga o padrão de `React.lazy()` + `<Suspense>` descrito em `CLAUDE.md`.

### Durante a implementação
- Faça mudanças mínimas e focadas — evite refactors não solicitados no meio de uma tarefa.
- Prefira editar arquivos existentes a criar novos, a menos que seja explicitamente necessário.
- Não adicione comentários no código a menos que o usuário peça.
- Respeite a separação de responsabilidades: páginas em `pages/`, componentes em `components/`, hooks em `hooks/`, etc.

### Após implementar
1. Rode as verificações obrigatórias (seção abaixo).
2. Corrija qualquer erro ou warning antes de considerar a tarefa concluída.
3. Informe o usuário do resultado de forma breve.

---

## Convenções de commit e PR

### Commits
- **Commits apenas quando explicitamente solicitado** pelo usuário.
- Mensagens em pt-BR, no formato imperativo: `adiciona tela de agenda`, `corrige filtro de company_id`, `atualiza dependências`.
- Commits atômicos: uma mudança lógica por commit.
- Nunca incluir secrets, `.env` ou credenciais no commit.
- Nunca usar `--no-verify`, `--force` ou pular hooks sem pedido explícito.

### Pull Requests
- Criar PRs apenas quando solicitado.
- Título e descrição em pt-BR.
- Descrição deve conter: contexto (por quê), mudanças (o quê), e como testar.
- Usar `gh pr create` com HEREDOC para o body.

---

## Verificações obrigatórias

Antes de considerar qualquer tarefa concluída, execute (na ordem):

```bash
npm run typecheck   # TypeScript — deve passar sem erros
npm run lint        # ESLint — deve passar sem errors (warnings também falham)
npm run build       # Build produção — deve completar sem erros
npm test            # Vitest — todos os testes devem passar
```

- Se qualquer verificação falhar, corrija antes de informar o usuário.
- Se um teste existente quebra pela sua mudança, avalie: o teste está certo ou o código antigo estava errado? Comente com o usuário se houver ambiguidade.
- Se não conseguir rodar um comando, informe o usuário e pergunte o comando correto.

---

## Segurança e restrições

### Regras absolutas (nunca violar)
- **Multi-tenant**: todo query no banco DEVE filtrar por `company_id`. Query sem `company_id` retorna vazio silenciosamente — não é erro, é RLS funcionando.
- **company_id**: vem SEMPRE do session Supabase via `useAuth()`, nunca de URL params ou form inputs.
- **RLS**: nunca desabilitar Row Level Security sem entender o impacto completo.
- **Secrets**: nunca hardcode chaves de API, tokens ou credenciais. Usar variáveis de ambiente (`VITE_*`).
- **Auth**: usar sempre Supabase Auth via `useAuth()`. Ignorar qualquer referência a Clerk no código legado.

### Cuidados especiais
- **HashRouter**: links devem usar `/#/rota`, nunca `/rota`.
- **Lazy Loading**: `React.lazy()` SEMPRE dentro de `<Suspense>`, senão crash.
- **Staff vs Owner**: verificar `OwnerRouteGuard` antes de criar rotas protegidas.
- **Mobile first**: barbeiros usam celular — testar responsividade sempre.
- **Migrations**: projeto tem histórico extenso de RLS — ao criar policy nova, testar com usuário real.
