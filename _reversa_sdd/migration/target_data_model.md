---
schemaVersion: 1
generatedAt: 2026-05-17T18:40:00Z
reversa:
  version: "1.0.0"
kind: target_data_model
producedBy: designer
---

# Target Data Model

> Modelo de dados alvo. Stack mantida: Supabase PostgreSQL com RLS.
> Principio: schema evolui por migrations incrementais, nao reescrita.

---

## Estrategia de dados

Como a stack de banco e mantida (Supabase PostgreSQL), o data model alvo e uma **evolucao incremental** do schema existente, nao uma reescrita. As mudancas sao:

1. **Tabelas novas**: `products` e `product_sales` (Fase 9)
2. **Colunas novas**: adicionadas por migration incremental
3. **RPCs novas/alteradas**: atomicidade de checkout e fila
4. **RLS policies**: auditadas e corrigidas
5. **Schema existente**: mantido intacto na maioria das tabelas

---

## Tabelas mantidas (sem mudanca de schema)

| Tabela | BC | Notas |
|---|---|---|
| profiles | Identity | Mantida |
| business_settings | Identity | Mantida |
| onboarding_progress | Identity | Mantida; source of truth para onboarding |
| appointments | Scheduling | Mantida |
| public_bookings | Public Booking | Mantida |
| public_clients | Public Booking | Mantida |
| queue_entries | Queue | Mantida |
| clients | CRM | Mantida |
| client_semantic_memory | CRM | Mantida |
| team_members | Team | Mantida |
| services | Catalog | Mantida |
| service_categories | Catalog | Mantida |
| finance_records | Finance | Mantida |
| commission_payments | Finance | Mantida |
| goal_settings | Finance | Mantida |
| business_galleries | Team | Mantida |
| audit_logs | Observability | Mantida |
| system_errors | Observability | Mantida |
| aios_logs | Observability | Mantida |
| ai_knowledge_base | Observability | Mantida |

---

## Tabelas novas: products + product_sales

```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    company_id UUID NOT NULL REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    sale_price NUMERIC NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    cost_price NUMERIC NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    image_url TEXT,
    category TEXT,
    sku TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    company_id UUID NOT NULL REFERENCES profiles(id),
    product_id UUID NOT NULL REFERENCES products(id),
    appointment_id UUID REFERENCES appointments(id),
    client_id UUID REFERENCES clients(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_sale_price NUMERIC NOT NULL CHECK (unit_sale_price >= 0),
    unit_cost_price NUMERIC NOT NULL CHECK (unit_cost_price >= 0),
    total_revenue NUMERIC NOT NULL CHECK (total_revenue >= 0),
    total_cost NUMERIC NOT NULL CHECK (total_cost >= 0),
    payment_method TEXT,
    sold_by UUID REFERENCES profiles(id),
    finance_record_id UUID REFERENCES finance_records(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON products
    FOR SELECT USING (
        company_id = get_auth_company_id()
        OR user_id = auth.uid()
    );

CREATE POLICY "products_insert" ON products
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND company_id = get_auth_company_id()
    );

CREATE POLICY "products_update" ON products
    FOR UPDATE USING (
        user_id = auth.uid()
        AND company_id = get_auth_company_id()
    );

CREATE POLICY "products_delete" ON products
    FOR DELETE USING (
        user_id = auth.uid()
        AND company_id = get_auth_company_id()
    );

CREATE POLICY "product_sales_select" ON product_sales
    FOR SELECT USING (company_id = get_auth_company_id());

-- product_sales deve ser criada por RPC controlada (sell_product).
-- Nao expor INSERT direto ao cliente para evitar vendas falsas sem baixa de estoque/finance_record.

-- Indices
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_products_active ON products(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_product_sales_company_created ON product_sales(company_id, created_at DESC);
CREATE INDEX idx_product_sales_product ON product_sales(product_id);
```

- **Origem no legado**: NOVO (sem equivalente)
- **BC**: Catalog
- **Fase**: 9

### Politica de acesso em produtos

- Owner: CRUD completo.
- Staff: pode ler produtos ativos e vender via RPC controlada, se o fluxo de venda por staff for habilitado.
- Staff nao deve editar cadastro, custo, estoque minimo ou deletar produto.
- Anonimo: sem acesso.
- Todas as leituras/escritas usam `company_id = get_auth_company_id()`; o frontend nunca fornece `company_id` como fonte de verdade.

### Rastro contabil de venda

`product_sales` preserva snapshot da venda (`unit_sale_price`, `unit_cost_price`, `quantity`, `total_revenue`, `total_cost`) para auditoria e calculo de margem. `finance_records` recebe o impacto financeiro agregado, mas nao deve ser a unica fonte de detalhe de venda de produto.

---

## RPCs novas/alteradas

### finish_queue_entry (NOVA -- Fase 4)

```sql
CREATE OR REPLACE FUNCTION finish_queue_entry(
    p_queue_entry_id UUID,
    p_service_name TEXT,
    p_price NUMERIC,
    p_professional_id UUID,
    p_payment_method TEXT,
    p_client_name TEXT,
    p_client_phone TEXT
) RETURNS JSON AS $$
DECLARE
    v_company_id UUID;
    v_client_id UUID;
    v_appointment_id UUID;
BEGIN
    -- 0. Resolver tenant pelo usuario autenticado.
    -- Nunca confiar em p_user_id/p_company_id vindo do frontend em SECURITY DEFINER.
    v_company_id := get_auth_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    -- Validar ownership da fila e do profissional.
    IF NOT EXISTS (
        SELECT 1 FROM queue_entries
        WHERE id = p_queue_entry_id
          AND business_id = v_company_id
          AND status = 'serving'
    ) THEN
        RAISE EXCEPTION 'queue_entry_not_found_or_invalid';
    END IF;

    IF p_professional_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM team_members
        WHERE id = p_professional_id
          AND user_id = v_company_id
          AND active = true
    ) THEN
        RAISE EXCEPTION 'invalid_professional';
    END IF;

    -- 1. Buscar ou criar cliente
    SELECT id INTO v_client_id FROM clients
        WHERE user_id = v_company_id AND phone = p_client_phone LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clients (user_id, company_id, name, phone, source)
        VALUES (v_company_id, v_company_id, p_client_name, p_client_phone, 'fila')
        RETURNING id INTO v_client_id;
    END IF;

    -- 2. Criar appointment Completed
    INSERT INTO appointments (user_id, client_id, professional_id, service, price, status, appointment_time, payment_method)
    VALUES (v_company_id, v_client_id, p_professional_id, p_service_name, p_price, 'Completed', now(), p_payment_method)
    RETURNING id INTO v_appointment_id;

    -- 3. Criar finance_record
    INSERT INTO finance_records (user_id, appointment_id, professional_id, client_name, service_name, revenue, type, status, payment_method)
    VALUES (v_company_id, v_appointment_id, p_professional_id, p_client_name, p_service_name, p_price, 'revenue', 'paid', p_payment_method);

    -- 4. Atualizar queue_entry
    UPDATE queue_entries
    SET status = 'completed'
    WHERE id = p_queue_entry_id
      AND business_id = v_company_id;

    RETURN json_build_object('success', true, 'appointment_id', v_appointment_id, 'client_id', v_client_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

- **Origem**: BR-MIGRAR-029, BR-DESCARTAR-002 (substitui transacao client-side)
- **Justificativa**: atomicidade garantida por transacao implicita do PostgreSQL

### sell_product (NOVA -- Fase 9)

```sql
CREATE OR REPLACE FUNCTION sell_product(
    p_product_id UUID,
    p_quantity INTEGER,
    p_appointment_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'dinheiro'
) RETURNS JSON AS $$
DECLARE
    v_company_id UUID;
    v_product RECORD;
    v_sale_id UUID;
    v_finance_record_id UUID;
BEGIN
    v_company_id := get_auth_company_id();

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'unauthorized';
    END IF;

    IF p_quantity <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'invalid_quantity');
    END IF;

    SELECT * INTO v_product
    FROM products
    WHERE id = p_product_id
      AND company_id = v_company_id
      AND is_active = true
    FOR UPDATE;

    IF v_product IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'product_not_found');
    END IF;

    IF v_product.stock < p_quantity THEN
        RETURN json_build_object('success', false, 'error', 'insufficient_stock');
    END IF;

    -- Atualizar estoque
    UPDATE products SET stock = stock - p_quantity, updated_at = now()
    WHERE id = p_product_id
      AND company_id = v_company_id;

    -- Criar finance_record
    INSERT INTO finance_records (user_id, appointment_id, service_name, revenue, type, status, payment_method, description)
    VALUES (v_company_id, p_appointment_id, v_product.name, v_product.sale_price * p_quantity, 'revenue', 'paid', p_payment_method, 'Venda: ' || v_product.name || ' x' || p_quantity)
    RETURNING id INTO v_finance_record_id;

    INSERT INTO product_sales (
        user_id,
        company_id,
        product_id,
        appointment_id,
        quantity,
        unit_sale_price,
        unit_cost_price,
        total_revenue,
        total_cost,
        payment_method,
        sold_by,
        finance_record_id
    )
    VALUES (
        v_company_id,
        v_company_id,
        p_product_id,
        p_appointment_id,
        p_quantity,
        v_product.sale_price,
        v_product.cost_price,
        v_product.sale_price * p_quantity,
        v_product.cost_price * p_quantity,
        p_payment_method,
        auth.uid(),
        v_finance_record_id
    )
    RETURNING id INTO v_sale_id;

    RETURN json_build_object('success', true, 'sale_id', v_sale_id, 'finance_record_id', v_finance_record_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### Regras obrigatorias para RPCs SECURITY DEFINER

- Nunca aceitar `p_user_id`, `p_company_id` ou tenant vindo do frontend como fonte de verdade.
- Derivar o tenant via `auth.uid()` e helper server-side (`get_auth_company_id()` ou equivalente).
- Validar ownership de todos os IDs recebidos: fila, produto, appointment, cliente e profissional.
- Usar `FOR UPDATE` em estoque/produtos para evitar corrida de venda simultanea.
- Falhar fechado (`RAISE EXCEPTION`) quando ownership nao puder ser provado.
- Manter `SET search_path = public` em todas as RPCs SECURITY DEFINER.

---

## Policies RLS a auditar (Fase 2, 4, 5)

| Tabela | Problema | Acao |
|---|---|---|
| finance_records | Staff filtra por nome no frontend | Corrigir: filtro por professional_id |
| queue_entries | Sem verificacao de duplicata | Adicionar check ou RPC |
| appointments | Fallback client-side expoe operacoes separadas | Remover fallback apos RPC atomica |
| Todas criticas | Verificar staff nao acessa dados de outro tenant | Auditoria com vulnerability-scanner |

---

## Consideracoes do paradigma funcional leve

| Aspecto | Implementacao |
|---|---|
| Imutabilidade | Schemas Zod com `.readonly()` para dados de leitura; objetos nunca mutados em hooks |
| Side effects na borda | Services fazem IO; hooks compoe; componentes renderizam |
| Composicao | Hooks compostos (`useScheduling` compoe `useAppointments` + `useCheckout`) |
| Validacao em borda | Zod `.parse()` na entrada de services e na saida de RPCs |
