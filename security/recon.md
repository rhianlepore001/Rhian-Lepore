# Reconhecimento preventivo do AgendiX

Data: 2026-10-18. Base: `f371508`, branch inicial `work`, árvore limpa. Escopo: somente checkout e processos locais descartáveis. Nenhuma consulta à aplicação, Auth, Storage, Stripe ou banco de produção foi autorizada ou realizada. Os resultados locais não atestam o estado implantado.

## Evidências e limitações iniciais

- Lidos `AGENTS.md`, `CLAUDE.md`, `MEMORY.md`, mapa `graphify-out/GRAPH_REPORT.md`, configurações, migrations, harnesses e código dos componentes sensíveis. O grafo foi gerado em `6af8a006`, anterior ao HEAD; serve como orientação, não como estado atual.
- `docs/audit/` não existe. Antecedentes disponíveis: `docs/specs/crit-public-clients-billing-SPEC.md`, `docs/specs/public-bookings-security-SPEC.md`, specs `alto-a01`/`alto-a02`/`alto-a04`/`alto-a06`, `docs/ops/ativar-protecao-senha-vazada.md`, `agendix-e2e-test/`, `research/` e `docs/rollbacks/`. O relatório externo `/workspace/audit/relatorio-seguranca-agendix.md` citado nesses documentos não está neste checkout.
- Node 24.19.0, npm 11.9.0 e dependências instaladas. CI usa Node 20. CLI Supabase disponível em `node_modules/.bin`; não há `supabase/config.toml`, PostgreSQL, Deno nem serviços locais da aplicação em execução no início.
- Runtime contém apenas URL e chave pública Supabase. O destino remoto não foi certificado como teste: nenhuma dessas variáveis será usada para acessar a rede. Testes frontend usarão valores fictícios e interceptação de rede.
- Rede restrita a hosts permitidos, sem VPN nem credenciais privilegiadas configuradas. Changelog em `supabase.com/changelog.md` bloqueado com HTTP 403; documentação atual de autorização de Edge Functions e permissões SQL consultada pelo conector de documentação, sem acessar projetos.
- Instalação de sistema sem privilégio não está disponível. Preparação de binários PostgreSQL em `/tmp`, usando pacotes do repositório Debian permitido; não altera dados existentes. Não executar `supabase db reset`, scripts remotos, seed demo, comandos de deploy ou suíte Playwright de produção.
- Histórico tem 203 arquivos SQL antes desta auditoria, versões duplicadas/nomes legados, `DROP TABLE` antigos e dependências em objetos não criados no histórico. Não é um bootstrap confiável de um projeto Supabase vazio. Harnesses representam subconjuntos declarados e usam snapshots históricos, cuja fidelidade atual ao remoto não foi verificada.

## Arquitetura e fronteiras de confiança

React 19 + Vite + TypeScript, HashRouter, Supabase JS, PostgreSQL/RLS, RPCs, Storage, duas Edge Functions e Vercel/PWA. Identidade autenticada: Supabase Auth → `profiles.id` (TEXT). Dono: `role=owner`, tenant próprio. Colaborador: `role=staff`, `profiles.company_id` aponta para o dono; `team_members.staff_user_id` vincula a conta ao profissional.

O tenant não tem uma única coluna universal: `user_id` TEXT é comum; `business_id` identifica o dono em dados públicos; produtos usam `company_id` UUID; `goal_settings.user_id` surgiu como UUID. Filtrar no frontend ajuda, mas RLS, GRANTs, triggers e autorização de cada RPC são as fronteiras efetivas.

Visitantes usam `/#/book/:slug`, `/#/minha-area/:slug`, fila, portfólio e clube. A chamada pública recebe o estabelecimento pelo catálogo/slug; esse contexto não concede acesso administrativo. O frontend persiste a identificação pública do cliente em localStorage por negócio; telefone não equivale a autenticação verificável.

## Banco e RLS

O inventário gerado localmente por `python3 security/tests/inventory.py` (não versionado) registra arquivos/linhas, declarações de tabelas, relações, todas as policies encontradas (incluindo USING/WITH CHECK, papel e operação), habilitações de RLS, funções e GRANT/REVOKE. É inventário de fontes, não catálogo efetivo: CREATE antigos podem ser removidos/substituídos por DROP ou SQL dinâmico. Use `tests/catalog.sql` somente em uma cópia local autorizada para obter o estado efetivo.

Entidades identificadas nas declarações: `profiles`, `business_settings`, `team_members`, `clients`, `public_clients`, `appointments`, `service_categories`, `services`, `service_upsells`, `finance_records`, `commission_payments`, `commission_schedules`, `commission_reminder_log`, `commission_frequency_reset_backup`, `goal_settings`, `hair_records`, `queue_entries`, `queue_payments`, `products`, `product_sales`, `appointment_product_lines`, `membership_plans`, `client_memberships`, `membership_payments`, `pix_payments`, `agenda_blocks`, `appointment_reschedules`, `public_booking_auto_confirmations`, `notifications`, `onboarding_progress`, `trial_promotions`, `trial_promotion_grants`, `audit_logs`, `system_errors`, `bug_reports`, `aios_logs`, `content_calendar`, `marketing_assets`, `ai_knowledge_base`, `client_semantic_memory`, quatro `rag_context_*` e `rate_limits` (UNLOGGED). `public_bookings`, `business_galleries`, `campaigns` e `companies` são referenciadas sem CREATE completo identificável no conjunto; `bookings` e `business_profiles` aparecem na função de lembretes e exigem investigação.

Relações principais: atendimento → cliente/profissional; financeiro → atendimento/profissional; comissão → profissional; produto vendido → produto/atendimento/financeiro; assinatura de cliente → plano/cliente; pagamentos → assinatura; remarcação → atendimento; bloqueio → profissional; promoção concedida → promoção. Várias relações de tenant são TEXT sem FK, e FKs simples não comprovam que pai e filho pertencem ao mesmo tenant. Essas ligações também exigem testes com IDs de outro negócio.

Dados sensíveis: nomes, telefones, emails, nascimento, fotos, observações de CRM, histórico/horários, receitas/custos/comissões, endereço, dados Pix, Stripe customer ID, plano/status/trial e contexto de erros/screenshots. Catálogos públicos precisam selecionar apenas os campos de apresentação.

| Área | Contrato encontrado | Ponto a validar |
|---|---|---|
| Perfis | SELECT próprio/empresa; UPDATE próprio; INSERT/DELETE revogados; trigger trava identidade/billing | OR de policies legadas, RPCs de billing, metadados de signup |
| Clientes CRM | dono gerencia; staff SELECT/INSERT no tenant | UPDATE/DELETE, UPSERT, FKs e staff inativo |
| Clientes públicos | anon sem DML direto; SELECT tenant e ALL dono; RPCs públicas por telefone | RPC pode revelar/alterar PII mesmo com DML direto fechado |
| Agendamentos | policies por tenant + trigger de escopo de edição de staff | leitura de ex-staff, IDs externos, operações em lote |
| Pedidos públicos | anon sem INSERT/UPDATE/DELETE, SELECT sem policy pública após lockdown | RPCs alternativas, histórico, cancelamento e prova de identidade |
| Financeiro | owner ALL e policy histórica `Finance: company isolation` ALL | OR pode manter staff com acesso amplo apesar de RPCs de comissão owner-only |
| Comissões | RPCs recentes conferem owner; schedules/payments têm RLS | leitura/escrita direta e overloads antigas |
| Serviços/equipe | policies tenant e owner coexistem; catálogos por RPC | staff não deve editar comissão/is_owner/staff_user_id |
| Metas/galeria/configuração | políticas por id/tenant e catálogos públicos | tipos UUID/TEXT, configuração interna, permissões por operação |
| Auxiliares | RLS declarado na maioria das tabelas | `rate_limits` não tem ENABLE RLS identificado; objetos só referenciados exigem catálogo local fiel |

Não foi comprovada ausência de RLS no ambiente implantado. As views `audit_daily_summary` e `audit_recent_activity` não declaram `security_invoker`; conferir grants/uso antes de classificá-las como exposição efetiva.

## Funções PostgreSQL

Foram identificados 195 nomes de funções antes das correções; overloads e renames dinâmicos exigem catálogo para contagem efetiva. Funções SECURITY DEFINER são frequentes. Defaults de EXECUTE foram endurecidos em setembro e há allowlist pública por nome; funções criadas antes/depois e grants diretos precisam ser avaliados por assinatura, inclusive `__tenant_unsafe`.

- `get_auth_company_id`/`get_auth_role` leem `profiles` pelo `auth.uid()::text`, com search_path fixo. O corpo mais recente não consulta `team_members.active/deleted_at`: hipótese de sessão de ex-colaborador continuar autorizada.
- Wrappers de financeiro/dashboard derivam tenant e escondem funções internas. Conferir revogação de EXECUTE das internas, todos os overloads e papel (tenant correto sozinho não limita acesso financeiro de staff).
- `protect_profile_identity` bloqueia alteração de id/role/company_id e quatro campos de billing. `REVOKE UPDATE(colunas)` não remove privilégio UPDATE em nível de tabela; o trigger é indispensável. Flags de transação não são uma fronteira segura se houver RPC que permita usá-las indevidamente.
- `set_stripe_customer_id_for_caller(text)` é DEFINER, executável por authenticated e aceita `cus_*` informado pelo caller. Formato e idempotência não provam propriedade no Stripe. Prioridade máxima de reprodução.
- Signup valida slot de equipe e tenant; `complete_staff_invite` trava a linha do convite e impede owner assumir slot. O convite é identificado por empresa + UUID de profissional, sem expiração explícita no corpo: conferir uso único, catálogo público e dados devolvidos por RPC.
- RPCs públicas usam telefone completo ou `phones_match` (também aceita últimos oito dígitos). Validar colisões, conhecimento de telefone alheio, upsert de PII e histórico. Remover essa autenticação exige desenho de sessão/OTP e aprovação de fluxo/custo.
- Existem funções históricas sem search_path e SQL dinâmico. Validar permissões reais antes de corrigir apenas com base no nome ou texto histórico.

## Storage

Buckets declarados: `logos`, `covers`, `team_photos`, `service_images`, `client_photos`, `bug-screenshots` e `marketing_images`. Imagens de marca/catálogo e fotos são públicas nas declarações; `bug-screenshots` também é criado como público, embora suas policies SELECT sejam por tenant. Um bucket público serve o arquivo por URL sem aplicar a policy de leitura de objetos: risco importante de screenshots com PII. Não foi feita requisição a URL real.

Gravação usa primeira pasta igual a `auth.uid()` para fotos/branding e tenant para screenshots. Correções A-01/A-02 removem policies amplas conhecidas, mas policies permissivas somam por OR. Validar INSERT, UPDATE com troca de pasta/bucket, UPSERT e DELETE. Staff e dono têm UUIDs distintos: não generalizar pastas sem validar o fluxo existente.

Não foram encontradas restrições de bucket `allowed_mime_types`/`file_size_limit` suficientes para atestar validação no servidor. Accept HTML/validação frontend não substitui Storage. SVG/HTML, limites, listagem e metadados permanecem pendentes de API Storage local.

## Edge Functions e Stripe

`create-checkout-session`: chama `auth.getUser()` com JWT do caller; lista permitida de Price IDs; `mode=subscription`; URLs de retorno; consulta o customer do perfil; se vazio, reaproveita customer localizado por email ou cria; grava vínculo por RPC autenticada. CORS `*`, erros externos devolvidos em texto, sem restrição explícita de método ou idempotency key. Falta conferir metadata do customer, papel de dono e vínculo imutável do lado confiável. A exceção de preview permite qualquer domínio Vercel que contenha `rhian-lepore`, cuja propriedade não é provada.

`send-appointment-reminder`: cria cliente service_role e envia Resend sem autenticar/autorizar a requisição no handler, sem marcação de idempotência e interpolando nomes em HTML. A validação de gateway não está versionada. Um JWT válido de usuário comum não autoriza envio global. Só fixtures locais podem reproduzir isso; nunca chamar o envio real.

Não há handler Stripe webhook versionado para validar assinatura, deduplicar eventos e atualizar status. `.env.example` citar `STRIPE_WEBHOOK_SECRET` não comprova implementação. Não será criado mecanismo novo de ativação de planos sem contrato de billing/eventos e ambiente de teste. Retorno de checkout não deve ativar plano. Preços oficiais não serão alterados.

## Frontend e autenticação

`AuthContext` centraliza getSession/onAuthStateChange, perfil, tenant e login/logout; Supabase JS persiste sessão no navegador. Guards em `App.tsx` protegem rotas de dono, mas são controles de UX. `isDev` por email de build não é autorização backend. Recuperação trata callback HashRouter, PKCE/token_hash/implicit e limpa URL; alteração de email/configuração Auth exigem ambiente GoTrue autorizado.

Login chama rate limit opcional via RPC e segue aberto em erro. Isso não substitui limitação no endpoint Auth (que o usuário pode chamar diretamente). Normalização/uniqueness, redirecionamentos permitidos, duração/revogação de JWT, secure email change e captcha não estão versionados como configuração ativa.

React codifica texto por padrão. `PixDisplay` usa `dangerouslySetInnerHTML` para SVG gerado localmente por biblioteca QR, não HTML recebido do cliente. Exportação PDF usa escape HTML; CSV precisa avaliação de fórmulas. WhatsApp normalmente normaliza dígitos e codifica mensagem; links externos e reviewUrl exigem esquema permitido. Logger/bug reporter capturam URL e console: validar remoção de tokens/PII antes de persistir.

Política de senha atual: oito caracteres + uma maiúscula no app; números/símbolos opcionais. **A-05 permanece risco aceito em 2026-10-15**, conforme `docs/ops/ativar-protecao-senha-vazada.md`: proteção de senha vazada vinculada ao plano pago segundo a decisão anterior. Configuração e preço atuais não foram consultados no projeto. Não alterar política, plano ou Auth nesta auditoria.

## Infraestrutura e dependências

Vercel configura nosniff, frame DENY, referrer policy, permissions policy e CSP Report-Only. Report-Only não bloqueia execução; inclui unsafe-inline/eval e imagens HTTPS amplas. Enforce depende de validação em preview autorizado e aprovação. Sem sourcemap de produção explícito no Vite; verificar artefato gerado. Dev server aceita qualquer Host e expõe 0.0.0.0; não é configuração de hosting de produção.

Chaves `VITE_OPENROUTER_API_KEY`/`VITE_GEMINI_API_KEY` são consumidas no browser; Vite também define GEMINI_API_KEY como constante. Não há prova de segredo real configurado/exposto neste ambiente. O padrão é inadequado para chaves privadas; migração da IA para backend altera integração e exige serviço/testes próprios. Chave anon/publishable Supabase e Stripe publishable não são segredos por si só.

Lockfile está versionado; ranges de dependências existem. Executar `npm audit` e analisar alcance de cada advisory. CI não executa testes SQL nem build atualmente. Não executar E2E existente sem revisar: há projetos de produção e setup com conta remota.

## Riscos potenciais ao encerrar a Fase 1

São hipóteses/observações até reprodução local, sem afirmar exploração em produção.

| Prioridade | Risco potencial | Evidência que falta |
|---|---|---|
| Alta | vínculo Stripe controlado por cliente e adoção de customer por email | reproduzir RPC e handler com mocks |
| Alta | PII e alteração de cliente por telefone sem prova de posse | executar RPCs atuais com visitante fictício |
| Alta | staff mantém acesso após desativação e policies ALL excedem permissões | matrix SQL com sessões simuladas e policies exatas |
| Alta | lembretes globais com service role acionáveis por usuário comum | handler real com clientes/sender substituídos |
| Alta | screenshot público pode conter dados internos | semântica documentada + API Storage local pendente |
| Média | origem Vercel parecida aceita como retorno de checkout | teste das duas allowlists |
| Média | dependências, CSV, logs, MIME/tamanho e views | reproduções específicas e auditoria de dependências |
| Residual | A-05, ausência de webhook versionado, CSP Report-Only | decisão/configuração/ambiente adicional |

## Plano de validação e critérios de aceite

1. Preparar PostgreSQL efêmero em socket Unix, sem rede externa, roles anon/authenticated/service_role e donos A/B + staff A; importar código SQL real e declarar cada simplificação. DML fora do tenant: zero linhas ou SQLSTATE 42501; INSERT/UPSERT/lote devem ser atômicos. Fluxos legítimos precisam passar no mesmo fixture.
2. Executar testes históricos de clientes/billing, fotos/storage, pedidos públicos, signup, equipe, comissões, financeiro, bloqueios e antecedência, incluindo rollback quando suportado. Não interpretar falha de bootstrap como vulnerabilidade.
3. Criar provas locais para RPC de customer, privacidade por telefone, staff inativo/financeiro, URLs e Edge Functions. Aceite billing: cliente nenhum escolhe customer; apenas backend autorizado vincula dono correto; conflito não sobrescreve; customer metadata deve corresponder ao usuário, sem adotar por email. Nenhum teste chama Stripe/Resend.
4. Aceite URLs: somente origens exatas configuradas/defaults; preservar produção/localhost e permitir previews explicitamente configurados. Aceite lembrete: rejeitar caller sem segredo de job antes de criar cliente privilegiado ou enviar; fixtures verificam zero efeitos.
5. Registrar testes iniciais antes das correções. Aplicar apenas correções isoladas comprovadas; mudança de autenticação pública, política comercial, senha, CSP enforce e planos depende de decisão explícita e fica documentada.
6. Typecheck → lint → build → Vitest; SQL + regressões e ciclo apply/test/rollback/test/reapply/test para migration nova. Revisão independente por agente ao terminar correções, nota e limites em `reviews/`. Documentar comandos, status de cada escopo e propostas de PR sem publicar, commitar, mergear ou fazer deploy.

## Atualização SEC-02 — 20/10/2026

O mapa histórico de RPCs por telefone acima não equivale mais à autorização proposta no branch: `20261020122744_private_booking_access.sql` revoga os acessos legados de cadastro/booking, lookup/cancelamento de assinatura e recuperação de fila por telefone. Novas RPCs de booking aceitam capacidade por pedido, com hash no schema privado `agendix_private`; nenhuma capacidade de booking autoriza consulta de perfil/histórico/clube/fila. O frontend usa `/#/minha-area/<slug>?booking=<id>&token=<segredo>` e `/#/book/<slug>?edit=<id>&token=<segredo>`, sem pré-preenchimento por telefone ou OTP.

Criação/benefícios de Clube e tickets de Fila por UUID continuam fora do fechamento funcional. Limites, ciclo SQL e revisões em [reviews/sec02.md](reviews/sec02.md). Inventário JSON gerado foi retirado do PR, e MEMORY.md foi restaurado ao conteúdo da main.
