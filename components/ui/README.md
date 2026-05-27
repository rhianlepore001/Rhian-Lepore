# Components UI

`components/ui/` e o contrato de componentes base do AGENX v1.

## Componentes obrigatorios

- `Button`
- `Input`
- `Select`
- `Card`
- `Modal`
- `Table`
- `Tabs`
- `Badge`
- `EmptyState`
- `Skeleton`
- `ErrorState`

## Contrato visual

- Usar tokens de `design-system/tokens.css` e regras de `DESIGN.md`.
- Mobile-first, com touch target minimo de 48px em controles interativos.
- Focus visivel e acessivel.
- Estados obrigatorios quando aplicavel: hover, focus, active, disabled, loading, error e empty.
- Barber e Beauty usam os mesmos componentes; variacao deve vir por tokens.
- Icones devem vir de `lucide-react` quando existirem.

## Limites

- Nao usar biblioteca grande de UI.
- Nao criar componentes especificos de dominio nesta pasta.
- Nao colocar fetch, Supabase, TanStack Query ou regras de negocio em componentes base.
- Nao redesenhar telas existentes durante a criacao destes componentes.
