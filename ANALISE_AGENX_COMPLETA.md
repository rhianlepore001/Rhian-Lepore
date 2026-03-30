# ANÁLISE COMPLETA — AgenX / Beauty OS
**Data:** 21/03/2026 | **Analista:** Claude (Dual Persona: Cliente + Dev Analista)

---

## PARTE 1 — MAPEAMENTO DO SISTEMA

### O que é o AgenX?
Sistema SaaS premium de gestão para **salões de beleza** (AgenX Beauty) e **barbearias** (AgenX Barber). Oferece agendamento online, gestão financeira, CRM de clientes, marketing com IA, controle de equipe e comissões.

### Stack Tecnológica
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript 5.8 + Vite 6 |
| Estilização | Tailwind CSS (glassmorphism + Brutal theme) |
| Banco de dados | Supabase (PostgreSQL + RLS) |
| Autenticação | Supabase Auth (⚠️ docs citam Clerk — divergência) |
| IA | Google Gemini API |
| Pagamentos | Stripe |
| Roteamento | React Router 7 (HashRouter) |
| Gráficos | Recharts |
| Deploy | Vercel |
| PWA | vite-plugin-pwa |

### Módulos do Sistema

#### Páginas Autenticadas (Dono)
- **Dashboard** — Métricas de lucro, meta mensal, agendamentos do dia, SetupCopilot
- **Agenda** — Gestão de agendamentos
- **Fila** — Sistema de fila digital
- **Clientes** — Lista e busca de clientes
- **CRM do Cliente** — Histórico individual, insights, semantic memory
- **Financeiro** — Receita, despesas, comissões, histórico, gráficos
- **Marketing** — Oportunidades AI, ChurnRadar, campanhas, clientes VIP
- **Insights/Reports** — Relatórios avançados
- **Configurações** (9 subpáginas): Geral, Agendamento, Equipe, Serviços, Comissões, Assinatura, Auditoria, Lixeira, Segurança, Logs

#### Páginas Staff (Profissional)
- Dashboard simplificado — "Meu Dia" widget
- Agenda — visão própria

#### Páginas Públicas (sem login)
- `/book/:slug` — Agendamento público (chat-bubble conversacional)
- `/queue/:slug` — Entrar na fila
- `/queue-status/:id` — Status da fila
- `/pro/:slug` — Portfólio do profissional
- `/minha-area/:slug` — Área do cliente

### Onboarding Wizard (5 etapas)
1. **Info do Negócio** — Nome, tipo, foto
2. **Serviços** — Cadastro obrigatório de pelo menos 1 serviço com preço
3. **Equipe** — Cadastro de pelo menos 1 profissional
4. **Meta Mensal** — Opcional (pode pular)
5. **Sucesso** — Sistema pronto

---

## PARTE 2 — VISÃO DO CLIENTE 👤

> *Persona: Mariana, 32 anos, dona de salão em São Paulo, 3 funcionárias, usa Instagram, nunca usou sistema de gestão antes. Está cansada de WhatsApp e caderninho.*

### Primeira Impressão — Cadastro

**O que funciona bem:**
- Design premium e diferenciado. A escolha visual "Barber vs Beauty" logo no cadastro é elegante e cria identidade imediata.
- O copy "Junte-se à elite da gestão inteligente" é aspiracional — conecta com o ego do profissional.
- Interface escura com dourado/neon transmite sofisticação. Parece uma ferramenta cara (no bom sentido).
- Seleção de região (BR/PT) antecipa internacionalização — profissional.

**O que gera fricção:**
- **Formulário de cadastro grande** — pede 7 campos de uma vez (nome, negócio, telefone, email, senha, confirmação, tipo, região). Para alguém vindo do celular, isso pode intimidar.
- **Não tem opção de cadastro via Google/Apple** — em 2026, não ter SSO é uma barreira enorme para conversão. A concorrente cadastra em 1 clique.
- **"Email Profissional"** como label pode confundir quem usa Gmail pessoal como email do negócio.
- **Sem indicação de trial** na tela de cadastro — o usuário não sabe que vai ganhar 7 dias grátis antes de se comprometer. Isso reduz a taxa de conversão.

### Onboarding

**O que funciona bem:**
- 5 etapas claras com progresso visual.
- Tema adapta automaticamente (Beauty = roxo/neon, Barber = dourado/brutal). Mariana se sente "em casa".
- Obrigar cadastro de serviço com preço garante que o financeiro já funciona desde o dia 1.
- A etapa de Meta Mensal é psicologicamente poderosa — cria comprometimento emocional.

**O que gera fricção:**
- **Obrigar cadastro de equipe** na etapa 3 pode ser bloqueante. Muitos salões pequeninhos têm apenas a própria dona. Se Mariana trabalha sozinha, ela pode travar aqui e desistir.
- **Sem validação de WhatsApp** no cadastro — ela vai digitar o telefone mas não tem confirmação de que está correto.
- **Ausência de exemplos/sugestões de serviços** — a Mariana não sabe o que colocar. Um botão "Usar serviços populares para salão" ajudaria muito.
- **A tela de sucesso não mostra "próximos passos"** concretos — após o wizard, o usuário cai no dashboard sem saber por onde começar.

### Agendamento Público (/book/:slug)

**O que é diferencial real:**
- **Interface de chat-bubble conversacional** — em vez de formulário chato, o cliente conversa. Isso é inovador no mercado de salões brasileiro.
- Suporte a **reagendamento** e **edição** de agendamentos existentes.
- **Seleção de profissional** com foto e avaliação — cria confiança.
- **Upsells** nativos — a dona pode vender serviços adicionais automaticamente.
- **Google Review prompt** após o atendimento — genial para reputação.
- **Área do cliente** (`/minha-area/:slug`) — histórico próprio sem precisar de conta na plataforma.

**O que falta:**
- **Confirmação por WhatsApp** — o cliente quer receber mensagem automática. Isso é expectativa mínima em 2026.
- **Cancelamento pelo cliente** — não vi fluxo explícito de self-service de cancelamento.
- **Tempo de espera estimado na fila** — o sistema tem fila, mas o cliente quer saber "quanto tempo falta?".

### Financeiro

**O que é poderoso:**
- Receita, despesas, lucro, crescimento — tudo em uma tela.
- Filtro por mês, histórico de meses anteriores.
- Métodos de pagamento (PIX, dinheiro, cartão) já nativos.
- Comissões calculadas automaticamente — isso elimina conflitos com a equipe.

**Dor real do cliente:**
- **Lançamento manual ainda parece necessário** — a integração automática com o agendamento funciona, mas qualquer serviço fora da plataforma precisa ser lançado manualmente. Mariana vai esquecer.
- **Sem integração com nota fiscal** — para salões formalizados, isso é uma dor enorme.

### Marketing com IA

**O que encanta:**
- **ChurnRadar** — identifica clientes que estão sumindo antes de perder. Isso tem valor financeiro direto.
- **Clientes VIP automáticos** — reconhece quem gasta mais sem a dona precisar fazer nada.
- **Oportunidades de horários vazios** — calcula quanto está sendo perdido em slots não preenchidos.
- **Geração de mensagem de campanha com IA** — a dona não precisa escrever, só aprovar e enviar.

**O que falta:**
- **Envio automático** — a IA gera a mensagem mas quem envia ainda é a dona. Integração nativa com WhatsApp Business API seria o próximo nível.
- **Métricas de campanha** — depois de enviar, não dá pra saber se funcionou.

### Nota Geral — Perspectiva do Cliente: 8.2/10

**Pontos Fortes:** Design premium, booking conversacional, IA de marketing, financeiro completo.
**Pontos de Dor:** Sem SSO, onboarding pode travar, falta WhatsApp automático, sem NFe.

---

## PARTE 3 — VISÃO DO DEV ANALISTA 🔧

### Arquitetura Geral

**Rating: B+ (muito bom para um produto em estágio atual, com pontos críticos)**

A arquitetura é pragmática e funcional. React 19 com lazy loading em todas as páginas é uma decisão correta. O uso de HashRouter é uma escolha deliberada para facilitar o deploy em ambientes sem controle de servidor — funciona, mas limita SEO e deep-linking.

### Autenticação e Segurança

#### ✅ Bom
- **Rate limiting no login** via RPC `check_login_rate_limit` — anti-brute force implementado.
- **RLS no banco em 4 fases** (Core, Operational, Financial, Public) — isolamento multi-tenant bem pensado.
- **Validação de senha** via `validatePassword()` — boa prática.
- **Audit logs** completos — rastreabilidade de ações.
- **Soft delete** (lixeira) — dados não são perdidos permanentemente.
- **Error tracking** — sistema de log de erros do lado do servidor.

#### ⚠️ Atenção
- **INCONSISTÊNCIA DE DOCS**: O `CLAUDE.md` afirma migração para Clerk, mas o código usa **Supabase Auth** diretamente. Isso pode causar confusão para novos devs que lerem a documentação e buscarem integração Clerk.
- **Email dev hardcoded em produção** (`rleporesilva@gmail.com` na linha 155 do AuthContext.tsx). A flag `isDev` é ativada por e-mail específico. Funciona como bypass de UX para desenvolvimento, mas é um anti-pattern: se esse email for comprometido ou se o dev sair do projeto, há uma porta de comportamento especial não documentada.
- **`localStorage` usado para `devUserType`** — `rhian_lepore_dev_type` — funcionalidade de dev exposta ao usuário final via DevTools.
- **Fail-open no rate limit**: se o RPC de rate limit falhar, o login prossegue. Para proteção de segurança, fail-closed seria mais seguro (mas mais agressivo para UX).

#### 🔴 Crítico
- **`company_id` do dono não verificado no RLS** em alguns locais — as políticas de RLS de fase 2 usam `auth.uid()::text = user_id`. Isso é correto para owner, mas para staff que herda o `company_id` do dono, é crítico garantir que as RPCs de escrita também verifiquem a hierarquia corretamente.

### Multi-Tenancy

A implementação é sólida: `company_id` é o UUID do owner, e staff herda via `profile.company_id`. Cada query deve filtrar por `company_id`. O padrão "Condomínio Fechado" do RLS (só dono vê seus dados) está bem implementado nas migrações vistas.

**Observação:** O código de registro (`AuthContext.tsx` linha 272) seta `company_id: data.companyId || authData.user.id` — o owner usa seu próprio userId como company_id. Isso é elegante mas cria uma dependência implícita que não está documentada claramente.

### Estado Global e Context

**Bem feito:** Uso de React Context puro (sem Redux/Zustand) é a escolha certa para esse tamanho de app. O `AuthContext` com `useMemo` para o value previne re-renders desnecessários.

**Problema:** O `AuthContext` está fazendo **muita coisa** — é responsável por autenticação, perfil, subscription, role, team member ID, dev flags e mais. Com o crescimento do produto, isso vai virar um gargalo de re-renders e dificuldade de testes.

### Banco de Dados

**90+ migrations** mostram um produto em evolução rápida. Isso é sinal de produto ativo, mas também de **dívida técnica acumulada**:

- Múltiplas migrações de "fix" e "hotfix" no mesmo dia (`20260218` tem +20 arquivos).
- Rollbacks presentes (`20260222_rollback_vector_and_semantic_memory.sql`) — sinal de features que foram implementadas e revertidas.
- Migrações de consolidação (`consolidate_rls_final`, `definitive_finance_fix`) — indicam que houve problemas antes.

**Sugestão crítica:** Criar uma migration de estado zero consolidada seria útil para novos ambientes. Ter 90+ arquivos sequenciais aumenta o tempo de setup e o risco de erro em novos deploys.

### Performance

**Pontos positivos:**
- Lazy loading em todas as páginas com Suspense/fallback.
- Custom hooks separados por domínio (`useDashboardData`, `useMarketingOpportunities`, `useAIOSDiagnostic`).
- Índices de banco adicionados (migration `20260318_add_database_indexes.sql`).

**Pontos de atenção:**
- `any` type usado em vários lugares (`businessSettings: any`, `transactions: any[]`) — perde type safety em pontos críticos.
- Queries diretas ao Supabase dentro de componentes sem camada de abstração — dificulta mocking para testes e cria duplicação de lógica.
- Finance.tsx importa `supabase` diretamente — não há service layer.

### Sistema de IA (AIOS)

Existe um framework interno chamado **AIOS** (AI Operating System) com:
- `useAIOSDiagnostic` — diagnóstico do negócio via IA.
- `AIAssistantChat` — chat integrado em todas as telas autenticadas.
- `AISemanticInsights` — insights semânticos.
- RAG (Retrieval-Augmented Generation) com tabelas vetoriais no Supabase.
- `useMarketingOpportunities` — oportunidades geradas por IA.

Esse é o **maior diferencial técnico** do produto. A integração de IA diretamente no fluxo de negócio (não como add-on) é uma vantagem competitiva real.

### PWA e Mobile

- `vite-plugin-pwa` instalado — app instalável.
- Design "mobile first" mencionado no CLAUDE.md.
- `BottomMobileNav` component — navegação inferior para mobile.

### Escalabilidade

**Gargalos potenciais:**
- Supabase na camada gratuita/inicial tem limites de conexões simultâneas.
- Edge Functions (`create-checkout-session`, `send-appointment-reminder`) são boas para serverless, mas o envio de lembretes via edge function tem limitações de scheduling.
- Multi-tenancy via RLS é escalável até certo ponto — em escala de milhares de tenants, RPCs complexas podem gerar lentidão.

### Qualidade de Código

- **TypeScript com `strict`** — bom.
- **ESLint configurado** com zero warnings permitidos — rigoroso e correto.
- **Cobertura de testes**: estrutura existe (Vitest + Testing Library) mas não foi possível avaliar quantidade/cobertura atual.
- **Naming conventions**: bem seguido (PascalCase components, camelCase utils).

---

## PARTE 4 — RESUMO EXECUTIVO

### O que o AgenX faz melhor que a concorrência
1. **Booking conversacional** (chat-bubble) — único no mercado BR.
2. **AIOS / IA embarcada** — não é add-on, é central ao produto.
3. **Dual theme** (Barber + Beauty) com identidade visual forte para cada segmento.
4. **ChurnRadar** — prevenção de perda de clientes antes de acontecer.
5. **Design premium** que justifica preço acima da média.

### Top 5 Prioridades de Melhoria

| # | Prioridade | Impacto | Complexidade |
|---|-----------|---------|-------------|
| 1 | Adicionar SSO (Google/Apple) no cadastro | Alto (conversão +20%) | Médio |
| 2 | WhatsApp Business API nativo | Alto (retenção) | Alto |
| 3 | Remover dev email hardcoded do código | Alto (segurança) | Baixo |
| 4 | Etapa de equipe opcional no onboarding | Médio (ativação) | Baixo |
| 5 | Consolidar migrations em estado zero | Médio (DevEx) | Médio |

### Matriz de Risco

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Email dev hardcoded comprometido | Baixa | Alto | Remover e usar feature flag env var |
| RLS mal configurado em nova feature | Média | Crítico | Code review obrigatório para qualquer migration |
| Burn-out de contexto do AuthContext | Alta | Médio | Separar em AuthContext + ProfileContext + SubscriptionContext |
| 90+ migrations lentas em novo deploy | Alta | Médio | Criar migration consolidada de baseline |

---

## NOTA SOBRE ACESSO AO SITE

O acesso ao `promptdeelite.com` foi bloqueado pelo proxy da sandbox e a extensão Chrome estava desconectada durante esta análise. Toda a análise de UX foi baseada em **leitura direta do código-fonte** (Register.tsx, OnboardingWizard.tsx, PublicBooking.tsx e componentes relacionados), o que permite uma análise técnica completa mas sem screenshots visuais.

**Para completar com acesso real ao site:**
1. Reconecte a extensão Claude in Chrome
2. Solicite: "Agora acesse promptdeelite.com, faça o cadastro e documente com screenshots"

---

## PARTE 5 — ANÁLISE VISUAL AO VIVO (promptdeelite.com)

> Acesso real ao site realizado via browser em 21/03/2026.

### Tela de Seleção Inicial (/#/login)

**O que foi visto:** Dois cards lado a lado — *BARBEARIA / "DOMINE SEU TERRITÓRIO"* e *Beauty & Spa / "Revele sua essência"*. Ao fazer hover, os cards revelam imagens de fundo reais (homem sendo barbeado no Barber; interior de salão no Beauty). A diferença de identidade visual entre os dois segmentos é imediata e poderosa.

**Avaliação:** ✅ Excelente primeiro impacto. A imagem de fundo no hover é um detalhe premium que eleva a percepção de valor antes mesmo do usuário se cadastrar.

### Login Barber vs Login Beauty — Comparação Visual

| Aspecto | Barber | Beauty |
|---------|--------|--------|
| Fundo | Preto/charcoal com borda dourada | Roxo/violeta profundo |
| Botão | Dourado com ícone ⚡ | Lilás/violeta com ícone ✦ |
| Tipografia | Monospace, maiúsculas, angular | Sans-serif, mais leve |
| Card | Parafusos visíveis nos 4 cantos | Bordas arredondadas, sem parafusos |
| Tagline | "PODER. CONTROLE. PRECISÃO." | "O SISTEMA QUE FAZ SEU NEGÓCIO CRESCER" |
| Versão | V2.8 (footer) | V2.8 (footer) |

**Avaliação:** ✅ A diferenciação é dramática e totalmente consistente. Cada tema tem sua própria personalidade — não é só troca de cor, é uma identidade completa.

### Formulário de Registro

- BEAUTY pré-selecionado quando vindo do card Beauty (`?type=beauty` na URL) — ✅ boa UX
- Seleção de Barber/Beauty no próprio formulário faz a troca de tema **em tempo real** — ✅ impressionante
- Grid de 2 colunas (Domínio + Região na esquerda; Negócio/Contato/Email/Senha na direita) — ✅ eficiente
- Placeholder "EX: STUDIO GLOW" no nome do negócio — ✅ orienta o usuário

### 🐛 Bug Encontrado em Produção

**Reprodução:** Acessar `/#/login` → clicar "Beauty & Spa" → clicar "NÃO TEM CONTA? CRIAR AGORA"

**Resultado:** Tela vermelha "SISTEMA INTERROMPIDO — Ocorreu um erro inesperado. Nossa equipe técnica foi notificada automaticamente."

**Segundo acesso (reload):** Formulário carregou normalmente.

**Diagnóstico provável:** Race condition no carregamento lazy do componente `Register.tsx` + algum estado do contexto não inicializado. Pode ser um erro de hidratação React ou Supabase ainda não inicializado quando o componente tenta montar. O ErrorBoundary está funcionando corretamente (captura e exibe mensagem amigável), mas o crash não deveria ocorrer.

**Severidade:** Média — afeta apenas o primeiro acesso via fluxo Beauty→Login→Cadastro. Reload resolve. Mas em termos de conversão, perder o usuário na primeira tentativa de cadastro é crítico.

### Página 404 do Booking (`/book/slug-inexistente`)

Exibe "NÃO ENCONTRADO — O estabelecimento não existe ou o link está incorreto."

**Avaliação:** ✅ Mensagem clara. ⚠️ Sem nenhum CTA — nenhum botão de "Voltar", "Conhecer o AgenX", ou link para o site. Oportunidade de conversão e branding perdida.

### Recuperação de Senha

Card com parafusos (tema Barber), ícone de email, campo único, botão "ENVIAR LINK". Simples e direto. ✅

### Versão do Sistema

Footer exibe "AGENX MANAGEMENT FLOW • V2.8" — versão pública visível. Isso é informação de engenharia exposta ao usuário final e potencialmente útil para ataques de versão-targeting. Considerar remover ou ocultar.

---

## PARTE 6 — RANKING FINAL CONSOLIDADO

### Como Cliente: 8.4/10
| Critério | Nota |
|---------|------|
| Design e identidade visual | 9.5/10 |
| Primeiro impacto (landing de seleção) | 9.0/10 |
| Fluxo de cadastro | 7.5/10 |
| Onboarding (código) | 8.0/10 |
| Booking conversacional | 9.5/10 |
| Marketing com IA | 9.0/10 |
| Financeiro | 8.5/10 |
| Estabilidade (bug na tela de registro) | 6.5/10 |

### Como Dev Analista: B+ (78/100)
| Critério | Nota |
|---------|------|
| Arquitetura geral | 80/100 |
| Segurança (RLS, rate limit) | 85/100 |
| Segurança (email dev hardcoded) | 55/100 |
| Qualidade de código (TypeScript) | 78/100 |
| Banco de dados (migrations) | 72/100 |
| Diferencial tecnológico (AIOS/IA) | 95/100 |
| Testabilidade | 65/100 |
| DevEx (documentação vs. realidade) | 60/100 |

---

*Análise gerada por Claude — 21/03/2026*
*Acesso ao vivo: promptdeelite.com confirmado em 21/03/2026*
