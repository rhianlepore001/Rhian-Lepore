# Arquitetura de Contextos (Context-First) para Squads de Produção do Prompt de Elite

Rhian, a chave para squads de produção autônomos e eficazes é uma **arquitetura de contexto robusta e acessível**. Seus agentes não podem "pensar grande" se não tiverem um "cérebro" completo e atualizado do seu projeto. Vamos estruturar isso com base no que já identificamos no seu repositório e nos princípios do AIOS.

## 1. O Paradigma Context-First: O Cérebro do seu Projeto

No desenvolvimento agêntico, o contexto é o insumo mais crítico. Ele é o "cérebro" que permite aos seus agentes entender o *porquê*, o *o quê* e o *como* de cada tarefa. Uma arquitetura Context-First significa que:

*   **Tudo é Contexto:** Código, documentação, PRDs, histórias de usuário, testes, configurações, logs – tudo é uma forma de contexto que alimenta seus agentes.
*   **Contexto Estruturado:** O contexto não é uma bagunça de arquivos. Ele é organizado de forma lógica e acessível, permitindo que os agentes encontrem a informação exata que precisam no momento certo.
*   **Contexto Vivo:** O contexto é dinâmico e evolui com o projeto. Agentes de monitoramento e documentação garantem que ele esteja sempre atualizado.

## 2. As Camadas de Contexto para seus Squads de Produção

Vamos organizar o contexto do seu projeto em camadas, da mais abstrata à mais específica, garantindo que cada squad tenha a profundidade de informação necessária.

### 2.1. Camada 1: Visão Estratégica e de Negócio (O Grande Porquê)

Esta camada fornece a direção estratégica e os objetivos de alto nível do Prompt de Elite. É o "norte" para todos os agentes.

*   **Onde armazenar:** `docs/prd-backend.md`, `docs/prd-frontend.md`, `docs/SQUADS_ESTRATEGICOS.md`, `docs/PLAN-mvp-analise.md`.
*   **Conteúdo:** Visão do produto, proposta de valor, público-alvo, metas de negócio, análise de mercado, roadmap de funcionalidades, definição dos squads de produto (Alpha, Beta, Gamma, Delta, Epsilon) e seus módulos.
*   **Agentes Consumidores:** `@product-owner`, `@analyst`, `@architect`, `@strategist`.
*   **Como adicionar contexto:** Mantenha esses documentos atualizados com as decisões estratégicas. Qualquer mudança no roadmap ou na visão do produto deve ser refletida aqui.

### 2.2. Camada 2: Arquitetura e Design (O Grande O Quê)

Esta camada descreve a estrutura técnica do sistema, padrões de design e decisões arquiteturais.

*   **Onde armazenar:** `docs/architecture.md` (crie se não existir), `docs/design-system.md` (crie), `components/`, `lib/`, `hooks/`, `pages/`.
*   **Conteúdo:** Diagramas de arquitetura, padrões de design (ex: Atomic Design), componentes reutilizáveis, diretrizes de UI/UX, decisões sobre tecnologias (Next.js, Supabase, TailwindCSS, Antigravity, Claude Code).
*   **Agentes Consumidores:** `@architect`, `@dev`, `@designer`, `@qa`.
*   **Como adicionar contexto:** Documente todas as decisões arquiteturais. Crie um Design System claro e mantenha a biblioteca de componentes atualizada. Agentes podem auditar a conformidade com o Design System.

### 2.3. Camada 3: Histórias de Usuário e Especificações (O Que Fazer)

Esta é a camada mais granular de requisitos, onde as funcionalidades são detalhadas para implementação.

*   **Onde armazenar:** `docs/stories/[id]-[slug].md`, `docs/PLAN-copywriting.md`, `docs/PLAN-editable-goals.md`.
*   **Conteúdo:** Histórias de usuário com critérios de aceitação claros, especificações de copywriting, metas editáveis, fluxos de usuário detalhados.
*   **Agentes Consumidores:** `@sm` (Scrum Master), `@dev`, `@copywriter`, `@qa`.
*   **Como adicionar contexto:** Cada nova funcionalidade ou melhoria deve começar com uma Story bem definida. O agente `@sm` pode ajudar a fragmentar grandes tarefas em Stories atômicas.

### 2.4. Camada 4: Código e Implementação (O Como)

Esta camada contém o código-fonte e todos os artefatos diretamente relacionados à implementação.

*   **Onde armazenar:** `src/` (ou a raiz do seu código), `.agent/`, `.aios-core/`, `.aios/handoffs/`, `.claude/`, `.cursor/rules/agents/`, `.gemini/`, `.github/agents/`, `.squads/`, `n8n-skills/`, `supabase/migrations/`, `scripts/`, `constants/`, `contexts/`.
*   **Conteúdo:** Código-fonte, configurações de agentes, definições de squads, regras para agentes (ex: `.cursor/rules/agents/`), scripts de automação, migrações de banco de dados, constantes, contextos específicos de módulos, skills do n8n.
*   **Agentes Consumidores:** `@dev`, `@qa`, `@architect`, `@deployer`.
*   **Como adicionar contexto:** O próprio código é um contexto. Comentários bem feitos, testes unitários e de integração, e a organização lógica do código são cruciais. Os diretórios `.agent/`, `.aios-core/`, `.squads/` já fornecem um bom ponto de partida para organizar as definições dos seus agentes e squads de produção.

### 2.5. Camada 5: Testes e Qualidade (A Validação)

Esta camada garante que o código atenda aos padrões de qualidade e aos requisitos.

*   **Onde armazenar:** `test/`, `testsprite_tests/`, `checklists/` (no `.aios-core` ou em squads específicos).
*   **Conteúdo:** Testes unitários, de integração, E2E, checklists de QA, relatórios de cobertura de código.
*   **Agentes Consumidores:** `@qa`, `@dev`.
*   **Como adicionar contexto:** Mantenha os testes atualizados e abrangentes. Os agentes de QA podem gerar novos casos de teste ou executar os existentes.

## 3. Como Adicionar Contexto para seus Squads de Produção (Prática)

### 3.1. Documentação Estruturada (Markdown é seu Aliado)

Seu diretório `docs/` já é um excelente começo. Continue aprimorando-o:

*   **PRDs Detalhados:** Para cada grande funcionalidade, tenha um PRD (Product Requirements Document) claro. Ele serve como o "contrato" entre o negócio e o desenvolvimento.
*   **Histórias de Usuário Atômicas:** Cada `docs/stories/[id]-[slug].md` deve ser uma unidade de trabalho pequena e bem definida, com critérios de aceitação claros. Isso é o que o `@dev` vai implementar.
*   **Guias e Manuais:** Crie guias para padrões de código, uso de ferramentas, e processos de deploy. Ex: `docs/CODING_STANDARDS.md`, `docs/DEPLOYMENT_GUIDE.md`.

### 3.2. Configurações e Artefatos (Codificando as Regras)

*   **`constants/` e `contexts/`:** Utilize esses diretórios para armazenar variáveis de ambiente, configurações globais, e contextos específicos de módulos que seus agentes podem consultar.
*   **`.aios-core/config/`:** Siga o padrão do AIOS Core para definir regras de estilo de código (`coding-standards.md`), tecnologias (`tech-stack.md`) e estrutura de diretórios (`source-tree.md`). Seus agentes de desenvolvimento e QA podem usar isso para garantir conformidade.
*   **`checklists/`:** Crie checklists para revisão de código, testes, deploy, etc. Agentes de QA podem usar esses checklists para validar o trabalho.

### 3.3. Memória do Projeto (RAG e Bancos de Dados Vetoriais)

Você já está no caminho certo com o Claude Code e a ideia de orquestração. Para dar "memória" aos seus squads de produção:

*   **Indexação de Documentação:** Use um pipeline de RAG para indexar todos os seus arquivos `docs/`, `config/`, `checklists/`, `templates/` em um banco de dados vetorial. Isso permite que seus agentes consultem rapidamente qualquer parte da documentação do projeto.
*   **Logs e Histórico:** Mantenha logs detalhados das ações dos agentes e dos resultados dos testes. Indexe esses logs para que os agentes possam aprender com o histórico e evitar erros repetidos.
*   **Contexto de Código:** Indexe trechos de código relevantes (ex: componentes, funções utilitárias) para que os agentes de desenvolvimento possam encontrar exemplos e padrões existentes rapidamente.

## 4. Squads de Produção (Os Bastidores do Prompt de Elite)

Agora, vamos definir os squads que trabalharão nos bastidores, construindo e mantendo o Prompt de Elite. Eles seguirão o ciclo de vida de uma alteração que você já mapeou no `aios-workflow.md`.

### 4.1. Squad de Planejamento e Análise (O Cérebro Estratégico)

*   **Agentes:** `@product-owner`, `@analyst`, `@architect`.
*   **Função:** Traduzir a visão de negócio em requisitos técnicos, atualizar PRDs, criar especificações de arquitetura e garantir a viabilidade técnica das funcionalidades.
*   **Contexto Principal:** Camada 1 (Visão Estratégica) e Camada 2 (Arquitetura).
*   **Workflow:**
    1.  `@product-owner` recebe uma nova ideia/requisito.
    2.  `@analyst` pesquisa e detalha o requisito, atualizando `prd-backend.md` ou `prd-frontend.md`.
    3.  `@architect` avalia o impacto na arquitetura, atualiza `architecture.md` e cria uma spec técnica.
    4.  Saída: Um arquivo de arquitetura ou brief aprovado.

### 4.2. Squad de Fragmentação e Gestão (O Cérebro Organizacional)

*   **Agentes:** `@sm` (Scrum Master - River), `@story-creator`.
*   **Função:** Quebrar grandes planos em histórias de usuário atômicas, garantir que as histórias sejam claras e testáveis, e gerenciar o backlog.
*   **Contexto Principal:** Camada 1 (Visão Estratégica), Camada 3 (Histórias de Usuário).
*   **Workflow:**
    1.  `@sm` recebe o brief aprovado do Squad de Planejamento.
    2.  `@story-creator` (pode ser o `@sm` ou um agente dedicado) cria `docs/stories/[id]-[slug].md` com base no brief.
    3.  `@sm` garante que cada story seja pequena o suficiente para ser implementada e testada em uma única rodada.
    4.  Saída: Backlog de histórias de usuário prontas para desenvolvimento.

### 4.3. Squad de Desenvolvimento (As Mãos que Codificam)

*   **Agentes:** `@dev`, `@copywriter`, `@designer`.
*   **Função:** Implementar as histórias de usuário, escrever código, criar conteúdo (copy) e desenvolver componentes visuais.
*   **Contexto Principal:** Camada 3 (Histórias de Usuário), Camada 4 (Código), Camada 2 (Arquitetura/Design System).
*   **Workflow:**
    1.  `@dev` pega uma Story do backlog.
    2.  `@dev` implementa a lógica baseada EXCLUSIVAMENTE nos critérios de aceitação da Story.
    3.  Se a Story envolve copy, `@copywriter` gera o texto usando `PLAN-copywriting.md` como contexto.
    4.  Se a Story envolve UI, `@designer` cria ou adapta componentes usando o Design System.
    5.  Saída: Código implementado e pronto para validação.

### 4.4. Squad de Qualidade e Testes (Os Olhos Críticos)

*   **Agentes:** `@qa`, `@tester`.
*   **Função:** Garantir que o código atenda aos padrões de qualidade, que as funcionalidades estejam corretas e que não haja regressões.
*   **Contexto Principal:** Camada 3 (Histórias de Usuário), Camada 4 (Código), Camada 5 (Testes).
*   **Workflow:**
    1.  `@qa` recebe o código implementado.
    2.  `@tester` executa testes automatizados (unitários, integração, E2E) e checklists de UX.
    3.  `@qa` compara o resultado com os critérios de aceitação da Story.
    4.  Saída: Aprovação para merge ou solicitação de ajustes (com feedback detalhado).

### 4.5. Squad de Operações e Deploy (O Guardião da Produção)

*   **Agentes:** `@deployer`, `@devops`, `@monitor`.
*   **Função:** Gerenciar o pipeline de CI/CD, garantir a execução de testes, realizar o deploy em produção e monitorar a saúde do sistema.
*   **Contexto Principal:** Camada 4 (Código), Camada 5 (Testes), `docs/BACKUP_PROCEDURE.md`, `docs/2FA_SETUP.md`.
*   **Workflow:**
    1.  `@deployer` recebe a aprovação do `@qa`.
    2.  `@devops` executa o pipeline de CI/CD (lint, typecheck, testes, build, deploy).
    3.  `@monitor` acompanha a saúde do sistema em produção e alerta sobre anomalias.
    4.  Saída: Funcionalidade em produção e sistema estável.

## 5. Construindo um Workflow de Squads de Agentes com Maior Contexto

Seu `aios-workflow.md` já descreve o ciclo de vida de uma alteração. Agora, vamos integrá-lo com a ideia de squads e contexto profundo:

1.  **Início:** Um `@product-owner` (humano ou agente) inicia uma nova funcionalidade, atualizando o PRD.
2.  **Planejamento Agêntico:** O `@analyst` e `@architect` (agentes) leem o PRD e a arquitetura existente (Camadas 1 e 2) para gerar uma especificação técnica detalhada.
3.  **Fragmentação Agêntica:** O `@sm` (agente) lê a especificação técnica e o histórico de stories (Camada 3) para criar novas `docs/stories/[id]-[slug].md` atômicas.
4.  **Desenvolvimento Agêntico:** O `@dev` (agente) lê a Story (Camada 3), o código existente (Camada 4) e o Design System (Camada 2) para implementar o código. Ele pode consultar o `@copywriter` ou `@designer` (agentes) para artefatos específicos.
5.  **Validação Agêntica:** O `@qa` e `@tester` (agentes) leem a Story (Camada 3), o código (Camada 4) e os testes existentes (Camada 5) para executar testes e validar a implementação.
6.  **Deploy Agêntico:** O `@deployer` e `@devops` (agentes) leem o código aprovado (Camada 4) e os scripts de deploy (Camada 4) para automatizar o processo de CI/CD e colocar em produção.
7.  **Monitoramento Contínuo:** O `@monitor` (agente) acompanha o sistema em produção, usando logs e métricas como contexto para identificar problemas e oportunidades de melhoria.

## 6. Próximos Passos para Você

*   **Formalize seus Contextos:** Comece a criar os arquivos de documentação que ainda não existem (ex: `architecture.md`, `design-system.md`).
*   **Indexe seu Repositório:** Implemente um pipeline de RAG para indexar todo o seu diretório `docs/` e `config/` em um banco de dados vetorial. Isso será o "cérebro" consultável dos seus agentes.
*   **Comece Pequeno:** Escolha um workflow simples (ex: o ciclo de vida de uma Story pequena) e tente automatizar as interações entre 2-3 agentes. Use seus conhecimentos em Claude Code e Antigravity para isso.
*   **Defina os Prompts dos Agentes:** Para cada agente, crie um prompt que defina seu papel, suas ferramentas, suas restrições e como ele deve interagir com o contexto e outros agentes.

Rhian, você já tem uma base sólida. A transição para essa arquitetura de squads de produção é um passo natural e poderoso. Ela permitirá que seu projeto evolua de forma autônoma e escalável, liberando seu tempo para focar na visão estratégica e nas grandes ideias. Você está construindo uma verdadeira fábrica de software agêntica!

## Referências

[1] rhianlepore001. (s.d.). *Rhian-Lepore/docs/SQUADS_ESTRATEGICOS.md at main*. GitHub. Disponível em: [https://github.com/rhianlepore001/Rhian-Lepore/blob/main/docs/SQUADS_ESTRATEGICOS.md](https://github.com/rhianlepore001/Rhian-Lepore/blob/main/docs/SQUADS_ESTRATEGICOS.md)
[2] rhianlepore001. (s.d.). *Rhian-Lepore/docs/aios-workflow.md at main*. GitHub. Disponível em: [https://github.com/rhianlepore001/Rhian-Lepore/blob/main/docs/aios-workflow.md](https://github.com/rhianlepore001/Rhian-Lepore/blob/main/docs/aios-workflow.md)
[3] SynkraAI. (s.d.). *aiox-core/docs/guides/squads-overview.md at main*. GitHub. Disponível em: [https://github.com/SynkraAI/aiox-core/blob/main/docs/guides/squads-overview.md](https://github.com/SynkraAI/aiox-core/blob/main/docs/guides/squads-overview.md)
