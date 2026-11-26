# Presença — Pré-renderização estática, `/s/:slug` e `sitemap.xml`

## Arquitetura
1. No momento de publicar ou despublicar em **Ajustes → Meu site**, `publishOwnerSite` / `unpublishOwnerSite` ([services/establishmentSite.ts](../../services/establishmentSite.ts)) invocam a Edge Function `publish-establishment-site`.
2. A Edge Function gera HTML estático completo (título, descrição, `canonical`, Open Graph, Twitter Cards, JSON-LD `HairSalon`/`LocalBusiness` e resumo semântico sem nenhuma menção ao AgendiX) e grava no bucket público `published-sites` (`sites/<slug>.html` e `sites/<slug>/servico/<id>.html`), além de atualizar `sitemap.xml` via `public.list_published_site_slugs()`.
3. Navegadores humanos recebem o boot leve `/presenca/site-boot.js` (compatível com CSP `script-src 'self'`, sem script inline) que redireciona imediatamente para `/#/site/<slug>` preservando `?origem=`. Rastreadores (Google, WhatsApp, Instagram) leem diretamente as meta tags e o JSON-LD da resposta HTTP 200.
4. A Edge Function `serve-establishment-site` entrega `GET /s/:slug`, `GET /s/:slug/servico/:serviceId` e `GET /sitemap.xml` direto do bucket `published-sites` com cache curto (`max-age=60, s-maxage=300`) e 404 para slugs reservados ou não publicados.

## Alteração proposta no `vercel.json` (aguardando aprovação explícita do Rhian)
Conforme instrução do PR #258, **`vercel.json` não foi alterado neste PR**. Para servir `/s/:slug` e `/sitemap.xml` diretamente na borda da Vercel quando as Edge Functions forem publicadas, inclua estes rewrites **antes** da regra catch-all `/((?!assets/).*)`:

```json
{
  "source": "/sitemap.xml",
  "destination": "https://lcqwrngscsziysyfhpfj.supabase.co/functions/v1/serve-establishment-site/sitemap.xml"
},
{
  "source": "/s/:slug",
  "destination": "https://lcqwrngscsziysyfhpfj.supabase.co/functions/v1/serve-establishment-site/s/:slug"
},
{
  "source": "/s/:slug/servico/:serviceId",
  "destination": "https://lcqwrngscsziysyfhpfj.supabase.co/functions/v1/serve-establishment-site/s/:slug/servico/:serviceId"
}
```
