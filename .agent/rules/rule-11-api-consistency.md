# LEI 11: Consistência de API REST

## MOTIVO
APIs previsíveis reduzem erros de integração e facilitam onboarding de novos devs.

## GATILHO
Ativado ao criar routers, controllers ou endpoints de API.

## CONVENÇÕES DE ROTAS

| Ação       | Método | Rota             | Response        |
|------------|--------|------------------|-----------------|
| Listar     | GET    | /resources       | 200 + array     |
| Detalhe    | GET    | /resources/:id   | 200 + objeto    |
| Criar      | POST   | /resources       | 201 + objeto    |
| Atualizar  | PATCH  | /resources/:id   | 200 + objeto    |
| Substituir | PUT    | /resources/:id   | 200 + objeto    |
| Deletar    | DELETE | /resources/:id   | 204 (no content)|

## PADRÃO DE RESPOSTA DE ERRO

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email inválido",
    "field": "email",
    "request_id": "req_abc123"
  }
}
```

## EXEMPLO ERRADO

```python
@app.get("/getUsers")           # verbo no path
@app.post("/user/create")       # singular + verbo
@app.post("/delete-user/{id}")  # POST pra delete?
```

## EXEMPLO CORRETO

```python
@router.get("")                              # GET /users
async def list_users(): ...

@router.get("/{user_id}")                    # GET /users/:id
async def get_user(user_id: UUID): ...

@router.post("", status_code=201)            # POST /users
async def create_user(payload: UserCreate): ...

@router.patch("/{user_id}")                  # PATCH /users/:id
async def update_user(user_id: UUID, payload: UserUpdate): ...

@router.delete("/{user_id}", status_code=204) # DELETE /users/:id
async def delete_user(user_id: UUID): ...
```
