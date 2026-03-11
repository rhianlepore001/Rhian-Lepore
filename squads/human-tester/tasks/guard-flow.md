# Task: Guard Flow (Shield — Guardian)

## Metadata
- agent: guardian
- elicit: true
- tool: playwright (browser MCP)
- inputs: [security_area]
- outputs: [security_report, vulnerabilities, recommendations]

## Description
Shield verifica segurança, isolamento multi-tenant e proteção de dados
navegando pelo app e tentando acessar/manipular o que não deveria.

## Steps

### 1. Escolher Área
```
elicit:
  question: "Qual verificação de segurança?"
  options:
    1: "Autenticação (login, session, tokens)"
    2: "Autorização (permissões owner vs staff)"
    3: "Multi-tenant (isolamento de dados)"
    4: "Input sanitization (XSS, injection)"
    5: "Data exposure (console, network, bundle)"
    6: "SCAN COMPLETO (tudo)"
```

### 2. Testes de Autenticação
Via Playwright:
1. Acessar `#/agenda` sem login → deve redirecionar para `#/login`
2. Acessar `#/` sem login → deve redirecionar para `#/login`
3. Fazer login → verificar se token está no storage
4. Fazer logout → verificar se token foi removido
5. Após logout, pressionar "voltar" → não deve mostrar dados
6. Verificar se senha não aparece em texto plano no DOM

### 3. Testes de Autorização
Com conta de staff:
1. Navegar para `#/marketing` → deve ser bloqueado
2. Navegar para `#/fila` → deve ser bloqueado
3. Navegar para `#/insights` → deve ser bloqueado
4. Navegar para `#/configuracoes` → deve ser bloqueado (exceto serviços)
5. Verificar se sidebar não mostra links para rotas bloqueadas

### 4. Testes Multi-Tenant
Se possível com 2 contas de empresas diferentes:
1. Login como company_A → listar clientes
2. Login como company_B → listar clientes
3. Verificar: nenhum cliente de A aparece em B
4. Repetir para: agendamentos, serviços, transações, equipe
5. Manipular IDs na URL: `#/clientes/{id_de_outra_empresa}`

### 5. Input Sanitization
Em cada campo de texto do app:
1. Inserir: `<script>alert('XSS')</script>`
2. Inserir: `<img src=x onerror=alert(1)>`
3. Inserir: `' OR 1=1 --`
4. Verificar: tag renderiza como texto? Executa? Quebra layout?

### 6. Data Exposure
1. Abrir Console do browser → verificar logs sensíveis
2. Abrir Network tab → verificar responses com dados demais
3. Verificar localStorage/sessionStorage → dados sensíveis?
4. Verificar source code do bundle → .env variables expostas?
5. Verificar se error messages não expõem detalhes internos

### 7. Relatório de Segurança
| Vulnerabilidade | Severidade | Localização | Reprodução | Recomendação |
|----------------|-----------|-------------|------------|-------------|
| ...            | Critical/High/Medium/Low | Rota/Componente | Passos | Fix |
