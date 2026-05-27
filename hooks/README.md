# Hooks

Hooks de dominio coordenam server state com TanStack Query.

## Contrato

- Hooks chamam services; componentes chamam hooks.
- Hooks pegam `companyId` exclusivamente de `useAuth()`.
- Queries usam `enabled: Boolean(companyId)` quando dependem de tenant.
- Query keys devem ser estaveis e explicitas.
- Mutations invalidam as query keys afetadas.
- Loading, error e empty devem ser expostos para a UI sem acoplar renderizacao.

## Query keys

Use arrays com dominio e escopo:

```ts
['scheduling', companyId, 'appointments', filters]
['finance', companyId, 'records', month]
['queue', companyId, 'entries']
```

## Limites

- Hooks nao fazem chamada direta ao Supabase.
- Hooks nao recebem `companyId` de componentes.
- Hooks nao formatam moeda, data ou texto final de UI.
- Estado local de modal, tabs e filtros visuais continua fora do TanStack Query.
