# Types

Tipos novos devem ser derivados de schemas Zod.

## Contrato

- `shared.ts` contem tipos transversais.
- `types/<domain>.ts` contem schemas de dominio.
- Schemas terminam com `Schema`.
- Tipos exportados usam `z.infer<typeof schema>`.
- Validacao runtime acontece em services, payloads publicos e respostas de RPC/Supabase.

## Regras

- Nao duplicar automaticamente todo o `types.ts` legado.
- Migrar tipos por dominio conforme cada fase avanca.
- IDs, `company_id`, timestamps, dinheiro e paginacao devem reutilizar `shared.ts`.
- Dados de Supabase devem ser tratados como `unknown` ate passar por schema quando forem parte da camada nova.
