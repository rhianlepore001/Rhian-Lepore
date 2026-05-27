# spec-id: PARITY-10
# origem: migration_strategy.md Fase 9
# target: BC-8 Catalog
# regras: Novo (produtos v1)

@paridade
Funcionalidade: Produtos v1

  Cenario: Cadastrar produto
    Dado que o owner acessa a tela de produtos
    Quando preenche nome, preco venda, custo, estoque e estoque minimo
    Entao o produto e criado com is_active = true

  Cenario: Venda de produto avulsa
    Dado que existe produto com estoque = 10
    Quando o owner vende 2 unidades
    Entao estoque atualiza para 8
    E finance_record e criado com revenue = preco_venda * 2
    E product_sales registra product_id, quantity, unit_sale_price, unit_cost_price, total_revenue e total_cost

  Cenario: Venda com estoque insuficiente
    Dado que existe produto com estoque = 1
    Quando o owner tenta vender 3 unidades
    Entao o sistema retorna erro "insufficient_stock"
    E o estoque permanece 1

  Cenario: Produto vinculado a atendimento
    Dado que o owner esta finalizando um atendimento
    Quando adiciona produto a venda
    Entao finance_record e criado com appointment_id vinculado
    E product_sales tambem referencia appointment_id

  Cenario: Staff vende produto sem poder editar catalogo
    Dado que um staff pertence ao tenant X
    E existe produto ativo no tenant X
    Quando o staff vende 1 unidade via RPC sell_product
    Entao a venda e permitida
    E o estoque atualiza
    E product_sales.sold_by registra o usuario staff
    Mas o staff nao consegue editar preco, custo ou estoque minimo diretamente

  Cenario: RLS multi-tenant
    Dado que produto pertence ao owner X
    Quando owner Y faz query em products
    Entao o produto NAO e retornado

  Cenario: RPC nao aceita spoofing de tenant
    Dado que usuario do tenant X esta autenticado
    E existe produto do tenant Y
    Quando tenta vender o produto do tenant Y via sell_product
    Entao a RPC retorna erro de autorizacao ou product_not_found
    E o estoque do tenant Y permanece inalterado
    E nenhum finance_record e criado no tenant Y
