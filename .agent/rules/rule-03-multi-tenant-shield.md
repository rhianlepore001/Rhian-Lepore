# LEI 03: Blindagem Multi-Tenant e Row Level Security (RLS)

## MOTIVO
Evitar o vazamento de dados entre inquilinos (empresas ou filiais).

## GATILHO
Ativado ao criar componentes, rotas ou migrações que acessem tabelas com dados de empresas/tenants no Supabase.

## VERIFICAÇÕES OBRIGATÓRIAS

### Regra de Ouro do Supabase RLS
O isolamento de dados DEVE ser configurado primariamente no banco de dados através de **Row Level Security (RLS)** usando migrações SQL. Nenhuma tabela deve ser criada sem `ENABLE ROW LEVEL SECURITY`.

### Cláusula de Empresa no Código JS/TS
Mesmo com o RLS ativado, queries executadas com a chave anônima (com sessão logada) DEVEM, por redundância, incluir `.eq('company_id', companyId_da_sessao)`.
**ATENÇÃO:** Se estiver usando o client *Service Role* em um Server Action, a query ignora o RLS. Nessas funções, filtrar por `company_id` vindo de uma validação de sessão rigorosa é vital.

### Origem da Identidade Segura
O `company_id` nunca deve ser aceito cegamente do payload de uma requisição ou parâmetros `GET`. Ele DEVE ser validado extraindo a informação da sessão do Supabase (`await supabase.auth.getUser()`).

## EXEMPLO ERRADO
```typescript
// app/api/users/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  // VAZAMENTO SEVERO! Confia no parâmetro URL cego.
  const companyId = searchParams.get('companyId') 
  
  const supabase = createAdminClient() // Usa service_role
  const { data } = await supabase.from('users').select('*').eq('company_id', companyId)
  
  return Response.json(data)
}
```

## EXEMPLO CORRETO
```typescript
// app/api/users/route.ts
import { createClient } from '@/utils/supabase/server'

export async function GET(req: Request) {
  const supabase = createClient() // Usa pacote SSR que pega os cookies nativamente
  
  // 1. Pega usuário real seguro
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  
  // 2. Extrai company_id do user metadata ou tabela profiles usando a session auth
  const companyId = user.user_metadata.company_id
  
  // 3. Busca dados (Seguro: RLS do banco aplicará na sessão + filtro via token seguro)
  const { data } = await supabase.from('users').select('*').eq('company_id', companyId)
  
  return Response.json(data)
}
```

## OBRIGAÇÃO NAS MIGRATIONS (.sql)
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    name TEXT NOT NULL
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Proteção real no banco usando o JWT default do Supabase
CREATE POLICY "tenant_isolation" ON agents
    FOR ALL
    USING (company_id = (auth.jwt() ->> 'company_id')::uuid);
```
