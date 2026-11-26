# Presença — Ativação manual por estabelecimento

Enquanto a cobrança automática não estiver habilitada, o módulo **Presença** fica liberado manualmente por estabelecimento na tabela `public.establishment_sites` (`presence_enabled`).

## Como liberar para um estabelecimento (SQL Editor no Supabase)
Use o `business_slug` (ou `company_id`) do estabelecimento:

```sql
-- Liberar publicação do site para um slug específico
insert into public.establishment_sites (company_id, presence_enabled)
select id, true
from public.profiles
where business_slug = 'nome-do-salao'
on conflict (company_id) do update
set presence_enabled = true;
```

## Como revogar (desativa também eventual site publicado)
```sql
update public.establishment_sites
set published = false,
    presence_enabled = false
where company_id = (
  select id from public.profiles where business_slug = 'nome-do-salao'
);
```

## Experiência no editor enquanto não liberado
- O dono já pode personalizar visual, logo, textos, fotos, oferta, seções e salvar o rascunho normalmente.
- O botão **Publicar** permanece desabilitado com orientação amigável informando que a liberação para colocar no ar é feita pela equipe AgendiX.
