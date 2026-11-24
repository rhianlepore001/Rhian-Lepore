# Presença — MVP do site do estabelecimento (rodada 1)

Trabalho local na branch `feat/site-estabelecimento`. Nenhum push, PR, deploy, merge ou aplicação remota de SQL faz parte desta rodada.

## Abrir e validar

```bash
npm run dev
```

- Barbearia fictícia: `/#/site/demo-corte-fino`.
- Salão fictício: `/#/site/demo-studio-aurora`.
- Editor fictício: `/#/site-demo/editor/barber` ou `/#/site-demo/editor/beauty`.
- Painel do dono: `/#/configuracoes/meu-site`, em Ajustes → Meu site, protegido por `OwnerRouteGuard`.
- Site real publicado: `/#/site/:slug`.
- Serviço: `/#/site/:slug/servico/:serviceId`.
- Caminho sem hash, isolado do roteador interno: `/s/:slug` e `/s/:slug/servico/:serviceId`.
- `/#/book/:slug` e demais links existentes continuam usando o roteador original.

`index.tsx` seleciona a entrada pública por caminho/hash e carrega o produto com importação dinâmica. A troca de hash entre o site e as páginas do produto funciona no mesmo documento. O site público tem um boundary sem dependência de autenticação ou envio automático de relatórios. O app interno preserva o boundary existente.

O agendamento abre em iframe de mesma origem dentro de um diálogo nativo, com Escape e devolução do foco. Parâmetros: `rebook=<serviço>`, `pro=<profissional>`, `embed=site`, `appearance` e `brand`. O modo embutido remove o cabeçalho duplicado do catálogo. A identidade é aplicada ao iframe sem mudar a lógica de reserva, autenticação ou cobrança. Demos usam o adaptador de simulação existente em `/demo-preview#/demo/{barber|beauty}/book/simulacao-{barber|beauty}` e não fazem chamadas ao Supabase.

Ofertas levam o serviço e a condição ao diálogo. O motor mantém o preço do cadastro. Nenhum desconto é aplicado automaticamente: a equipe confere a elegibilidade e concede a condição no atendimento. Essa limitação aparece na tela.

## Dados e segurança

`services/establishmentSite.ts` consome as RPCs públicas atuais. Antes do catálogo real, a rota pública exige `get_public_establishment_site` com publicação e entitlement ativos. Se a migration ainda não existir ou o plano não estiver liberado, mostra indisponibilidade com acesso ao agendamento existente. A leitura de prévia do dono usa somente o catálogo público atual.

`lib/establishment/model.ts` normaliza uma allowlist explícita. Equipe inativa/removida é descartada; nomes privados de avaliadores não são usados, e contatos em comentários são removidos. Não há consulta de clientes, telefone de cliente, dados financeiros, nem modificação de autenticação. Os nomes dos depoimentos das demos são fictícios e abreviados; avaliações reais aparecem como cliente verificado, porque a RPC existente não expõe nomes.

Configuração altera apresentação, nunca preço/duração/equipe vigente. As seções vazias são omitidas, e o menu usa as mesmas seções disponíveis. Upload de foto reutiliza o bucket `covers`, sob prefixo `companyId` da sessão; aceita JPG/PNG/WebP, limita a 10 MB e recodifica para WebP de até 1600px antes de enviar, removendo metadados. Nenhum upload real foi executado nesta rodada. Na demo, o seletor usa apenas assets locais.

Rascunhos têm adaptador remoto e fallback local somente quando a tabela inexiste. Falhas de permissão/rede não simulam salvamento remoto. O fallback informa explicitamente que os dados ficam no navegador e usa chave isolada por `companyId`. O rascunho privado é separado do snapshot publicado; salvar não publica. Publicar/despublicar só chama o banco após ação do dono e quando `presence_enabled` estiver liberado. Na demo, os controles de publicação ficam desabilitados.

## Migration pendente de aprovação

- `supabase/migrations/20261124133813_establishment_sites.sql`.
- Rollback: `docs/rollbacks/20261124133813_establishment_sites.rollback.sql`.
- Verify: `supabase/tests/establishment_sites.verify.sql`.
- Testes e harness isolados: `supabase/tests/establishment_sites.*.sql`.
- Runner: `scripts/test-sql-establishment-sites.sh`.

Tabela tenant `establishment_sites`: `draft_config`, `published_config`, `published`, `presence_enabled`. RLS exige dono da empresa da sessão. Cliente autenticado não pode alterar entitlement, excluir registros ou ler outra empresa. Anônimo não lê a tabela. RPC pública expõe somente a allowlist aninhada da configuração publicada, nunca o rascunho. `presence_enabled` começa falso. Não há vínculo novo com Stripe ou billing.

Teste executado em PostgreSQL 17 local isolado, com permissão de dono/staff/outro tenant/anônimo, entitlement, snapshot, allowlist aninhada, verify, rollback duas vezes e reaplicação. O harness simula apenas as dependências necessárias; antes de qualquer aprovação de aplicação, conferir as definições reais de `profiles`, `get_auth_company_id()` e `get_auth_role()` no ambiente de destino.

```bash
PGBIN=/tmp/pg17/bin \
LD_LIBRARY_PATH=/tmp/pg17/node_modules/@embedded-postgres/linux-x64/native/lib \
bash scripts/test-sql-establishment-sites.sh
```

## SEO: entregue e decisão necessária

Entregue no cliente: título/descrição por casa e serviço, Open Graph, canonical para `/s/:slug`, JSON-LD `HairSalon` (barbearia e salão) ou `LocalBusiness` (estúdio), catálogo/preços/moeda/endereço/horários. `BarberShop` não é um tipo atual do Schema.org; ver [HairSalon](https://schema.org/HairSalon). Não incluí estrelas self-serving em rich results. JSON-LD é serializado com escape seguro. Demos e prévias têm `noindex` no cliente.

O caminho `/s/` funciona com o rewrite SPA atual, sem migrar o roteador do produto. **Ainda entrega o HTML genérico do app ao crawler. Meta tags no cliente não garantem indexação nem prévia correta em WhatsApp/Instagram.** A função de servidor/edge ainda precisa de decisão e implementação; não está escondida como requisito cumprido.

Proposta recomendada: uma função Vercel somente para `/s/:slug` e suas páginas de serviço. Ela consulta a RPC pública de configuração e os catálogos públicos atuais com chave publicável, gera HTML com conteúdo, OG/JSON-LD e canonical antes da hidratação, e usa cache curto com invalidação ao publicar. Não usar service role, sessão de dono ou dados privados. Preservar CSP, erro/404 e fallback para agenda em plano inativo. Gerar sitemap apenas de sites publicados/entitled; indexar serviços ativos. O mapa global exige um endpoint público mínimo de slugs publicados, hoje inexistente. Domínio raiz `/<slug>`, nomes reservados, histórico de slug e redirects precisam de decisão própria para evitar colisões com produto e arquivos.

## Limites desta rodada

Sem métricas de conversão, testes de desconto automático, integração Google Business Profile, promessa de ranking, domínio próprio, slug redirects ou SSR. Sem antes/depois inventado ou depoimento real atribuído a pessoa fictícia. Planos do clube continuam disponíveis pelo fluxo existente; não ganharam seção própria neste template. Sem autorização para produção. A publicação exige liberar a migration e decidir como provisionar o entitlement no beta.

O bundle público evita carregar `App` e `PublicBooking` no acesso inicial; o shell compartilhado ainda tem React, router, fontes e CSS do produto. Core Web Vitals em 4G real precisam de medição no preview público autorizado, não foram presumidos por um teste local.

## Verificações

```bash
npm run typecheck
npm run lint
npm run build
npm test -- --run
npx playwright test --config e2e/establishment/playwright.config.ts
```

Playwright usa chave publicável falsa, intercepta todas as chamadas Supabase e cobre ambas as demos em 390/1280px, responsividade 360–430px, serviço, agendamento com contexto, catálogo real simulado e painel autenticado simulado com prévia e rascunho. Prints e crítica ficam em `/workspace/presenca-site/prints/rodada-1/`; relatório de autoria em `/workspace/presenca-site/rodada-1-autor.md`.

O runner de E2E usa porta 3001 para não depender de credenciais locais nem interferir no servidor de trabalho na porta 3000. O teste legado de Meta bridge usa `Request` e `AbortController` da mesma janela Happy DOM, corrigindo a incompatibilidade entre Node 24 e JSDOM no harness, sem mudar o comportamento do produto.
