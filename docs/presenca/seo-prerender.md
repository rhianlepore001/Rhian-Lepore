# Presença — Pré-renderização estática, `/s/:slug` e `sitemap.xml`

## Arquitetura
1. No momento de publicar ou despublicar em **Ajustes → Meu site**, `publishOwnerSite` / `unpublishOwnerSite` ([services/establishmentSite.ts](../../services/establishmentSite.ts)) invocam a Edge Function `publish-establishment-site` (`verify_jwt = true` em [supabase/config.toml](../../supabase/config.toml)).
2. A Edge Function gera HTML estático completo (título, descrição, `canonical`, Open Graph, Twitter Cards, Instagram, JSON-LD `HairSalon`/`LocalBusiness` e resumo semântico sem nenhuma menção ao AgendiX) e grava no bucket público `published-sites` (`sites/<slug>.html` e `sites/<slug>/servico/<id>.html`), além de atualizar `sitemap.xml` via `public.list_published_site_slugs()`.
3. Navegadores humanos recebem o boot leve `/presenca/site-boot.js` (compatível com CSP `script-src 'self'`, sem script inline) que redireciona imediatamente para `/#/site/<slug>` preservando `?origem=`. Rastreadores (Google, WhatsApp, Instagram) leem diretamente as meta tags, links e JSON-LD da resposta HTTP 200.
4. Como o domínio `supabase.co` converte respostas HTML/XML em `text/plain`, a entrega pública é feita pela função serverless da Vercel [`api/site-seo.ts`](../../api/site-seo.ts) (via [`api/_lib/siteSeo.ts`](../../api/_lib/siteSeo.ts)), roteada por [vercel.json](../../vercel.json):
   - `/sitemap.xml` → `/api/site-seo?kind=sitemap` (`Content-Type: application/xml; charset=utf-8`)
   - `/s/:slug` → `/api/site-seo?kind=site&slug=:slug` (`Content-Type: text/html; charset=utf-8`)
   - `/s/:slug/servico/:serviceId` → `/api/site-seo?kind=service&slug=:slug&serviceId=:serviceId` (`Content-Type: text/html; charset=utf-8`)
   - Todo o restante fora de `/assets/` e `/api/` continua indo para `/index.html` (SPA intacto).
5. Quando não houver HTML pré-renderizado no bucket para um slug válido e não reservado (site ainda não publicado, despublicado ou aguardando geração), `/s/:slug` e `/s/:slug/servico/:serviceId` redirecionam via `302` (`Cache-Control: no-store`) para `/#/book/<slug>` (preservando `?origem=`), evitando links mortos (RF-04). Slugs reservados ou malformados continuam retornando `404`.
6. Caso a Edge Function `serve-establishment-site` permaneça publicada no Supabase como utilitário de leitura, ela fica configurada em [supabase/config.toml](../../supabase/config.toml) com `verify_jwt = false` e compartilha o mesmo fallback `302`.
