# Auditoria G4 — Produtos v1

## Veredito

G4 aprovado com ajuste aplicado na migration `supabase/migrations/20260603_products_v1.sql`.

O modelo de segurança esperado para Produtos v1 está coerente:

- `products` usa RLS por tenant via `company_id::TEXT = get_auth_company_id()`.
- Staff pode ler produtos ativos do próprio tenant.
- Owner pode ler ativos e inativos do próprio tenant.
- Apenas owner pode criar ou editar catálogo diretamente.
- `product_sales` é somente leitura por tenant; criação direta fica bloqueada por ausência de policy de `INSERT`.
- Venda passa pela RPC `sell_product`, que valida tenant pelo produto e pelo agendamento opcional.

## Ajuste Feito

A RPC `sell_product` cria um registro em `finance_records`. No schema real, `finance_records.barber_name` é `NOT NULL`; a migration original não preenchia esse campo.

Corrigido em `20260603_products_v1.sql`:

- adiciona `barber_name` no insert financeiro;
- usa `profiles.full_name` do usuário autenticado;
- fallback: `Venda de Produto`.

## Prova Executada

Validação via MCP Supabase em transação com `ROLLBACK`, aplicando temporariamente a migration porque o banco remoto ainda não tem `products`, `product_sales` nem `sell_product`.

Cenários provados:

- Owner X cria produto ativo e inativo no tenant X.
- Owner X vê produtos ativos e inativos do próprio tenant.
- Owner Y não vê produto do tenant X.
- Owner Y não consegue vender produto do tenant X via `sell_product`; retorno esperado: `product_not_found`.
- Staff X vê produto ativo do tenant X.
- Staff X não vê produto inativo do tenant X.
- Staff X não consegue editar catálogo diretamente.
- Staff X não consegue criar produto diretamente.
- Staff X consegue vender produto ativo do tenant X via `sell_product`.
- Venda por staff reduz estoque de 10 para 8.
- `product_sales.sold_by` registra o usuário staff.
- `finance_records` é criado para o tenant X.
- Insert direto em `product_sales` é bloqueado por RLS.
- Venda com estoque insuficiente retorna `insufficient_stock`.

Resultado final da prova:

```sql
tenant_x_stock_after_staff_sale = 8
tenant_x_sales = 1
tenant_x_finance_records = 1
tenant_y_sales = 0
```

## Handoff Para C2

C2 pode implementar `/produtos` usando:

- leitura/criação/edição em `services/catalog.ts`;
- venda via `sellProduct()`/RPC `sell_product`;
- `companyId` sempre vindo de `useAuth()`;
- UI deve esconder ações de criação/edição para staff, mas o banco já bloqueia escrita direta.
