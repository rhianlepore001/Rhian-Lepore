# Task: Break Flow (Havoc — Destroyer)

## Metadata
- agent: destroyer
- elicit: true
- tool: playwright (browser MCP)
- inputs: [target_area]
- outputs: [bugs_found, crash_report, security_issues]

## Description
Havoc tenta quebrar cada funcionalidade do app com inputs inválidos,
ações inesperadas e comportamentos abusivos. Tudo que sobrevive está pronto.

## Steps

### 1. Escolher Alvo
```
elicit:
  question: "O que tentar quebrar?"
  options:
    1: "Formulários (todos os inputs inválidos)"
    2: "Modais (abrir/fechar/interromper)"
    3: "Permissões (acessar onde não deve)"
    4: "Fluxos (interromper no meio)"
    5: "TUDO (chaos completo)"
```

### 2. Executar Ataques por Categoria

#### A. Formulários
Para cada formulário encontrado:
1. Submeter completamente vazio
2. Preencher com dados inválidos por tipo:
   - Email: `abc`, `@.com`, `<script>alert(1)</script>`
   - Telefone: `abc`, `123`, `+55(00)00000-00000000`
   - Senha: `1`, `a`.repeat(1000)
   - Nome: `<img src=x onerror=alert(1)>`, `' OR 1=1 --`
   - Preço: `-1`, `0`, `abc`, `99999999`
3. Verificar: mensagem de erro? Campo marcado? App crashou?

#### B. Modais
1. Abrir modal e fechar imediatamente
2. Abrir modal, preencher dados, fechar sem salvar
3. Clicar no botão de salvar 10x rápido
4. Abrir modal sobre modal (se possível)
5. Pressionar ESC durante animação de abertura

#### C. Navegação
1. Usar botão voltar do browser em cada fluxo
2. Digitar URL de rota protegida diretamente
3. Alterar IDs na URL para valores inexistentes
4. Navegar para rota que não existe (#/pagina-fake)

#### D. Estado
1. Limpar localStorage e recarregar cada página
2. Modificar dados do localStorage via DevTools
3. Fazer logout e pressionar voltar no browser

### 3. Documentar Cada Bug
Para cada bug encontrado:
- **Onde:** Rota + componente
- **Como reproduzir:** Passos exatos
- **Esperado:** O que deveria acontecer
- **Atual:** O que aconteceu
- **Severidade:** Critical / High / Medium / Low
- **Screenshot:** Evidência visual
