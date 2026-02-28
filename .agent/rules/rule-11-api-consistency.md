# LEI 11: Consistência de API REST e API Routes (Next.js)

## MOTIVO
O Next.js App Router adotou uma estrutura forte e baseada em convenções estritas em sua pasta `app/api/.../route.ts`. Seguir esse padrão previne confusões com o express/fastapi antigos. 

## GATILHO
Ativado ao criar roteamentos web para sistemas externos consumirem a aplicação (Webhooks, apps de celular, etc). 

> ALERTA: Interfaces da própria aplicação React não deveriam consumir endpoints `app/api` internos se possível — Server Components leem o BD diretamente, Client Components devem usar Server Actions primariamente, exceto em fluxos de arquivos/streams pesados.

## CONVENÇÕES DE PASTAS (ROUTE HANDLERS)

O App Router roteia as funções baseado em pastas nomeadas e exports da função HTTP explícita correspondente (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

| Rota Next.js (Arquivo)       | Export      | Retorno Padrão  | Ação                     |
|------------------------------|-------------|-----------------|--------------------------|
| `app/api/users/route.ts`     | `export GET`| 200 + Array Json| Lista de itens           |
| `app/api/users/[id]/route.ts`| `export GET`| 200 + Obj Json  | Detalhes de UM item      |
| `app/api/users/route.ts`     | `export POST`| 201 + Obj Json | Cria um item             |
| `app/api/users/[id]/route.ts`| `export PATCH`| 200 + Obj Json | Atualização parcial      |
| `app/api/users/[id]/route.ts`| `export DELETE`| 204 (status)  | Remoção de um item       |

## PADRÃO DE ERROS

Retorne o erro formatado via `Response.json({}, { status })`, padronizando chaves de erro da API. A Vercel/Next irá comprimir e lidar com o cache adequadamente.

```typescript
// Padrão Unificado de Rejeição de APIs:
return Response.json(
  {
    error: {
      code: "VALIDATION_ERROR",
      message: "Email invalido",
    }
  },
  { status: 400 }
)
```

## EXEMPLO ERRADO
```typescript
// /app/api/createUser.ts (Arquivo nomeado com a ação, formato Pages Router velho ou fora do App Router)
// /app/api/users/route.ts
export async function UPDATE(req) { // UPDATE NÃO EXITE EM HTTP REST. É UPDATE_ACTION (Server Action) OU PATCH (HTTP METHOD)
  return Response.json("Sucesso") 
}
```

## EXEMPLO CORRETO
```typescript
// /app/api/users/route.ts
export async function GET(req: Request) {
  // Lógica de listagem de usuários...
  return Response.json([{ id: 1, name: "Maria" }])
}

export async function POST(req: Request) {
  // Criação...
  return Response.json({ id: 2, name: "Novo" }, { status: 201 })
}

// /app/api/users/[id]/route.ts
export async function PATCH(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Atualiza campo parcial...
  return Response.json({ id, name: "Atualizado" })
}

export async function DELETE(
  req: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Deleta do banco...
  return new Response(null, { status: 204 }) // Sem dados devolvidos, só o status correto
}
```
