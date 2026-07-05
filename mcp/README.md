# Audit MCP — acesso restrito à seção de Auditoria

Servidor MCP que deixa um assistente de IA (Claude Code / Cursor) **ler e modificar
apenas a seção Auditoria** do Agendix — a lista de problemas, sugestões e dúvidas
que aparece em _Configurações → Auditoria_ (tabela `bug_reports`).

## Por que é seguro / o escopo

O servidor **só conhece a tabela `bug_reports`**. Não existe nenhuma ferramenta capaz
de tocar em clientes, agenda, financeiro ou na trilha imutável `audit_logs`. A
fronteira da permissão é o cardápio de ferramentas abaixo — nada além disso é possível.

Além disso ele entra com o **login de teste do `.env`** (`AGENDIX_TEST_EMAIL`), então a
RLS do Supabase limita tudo ao tenant daquele login.

## Ferramentas

| Ferramenta | O que faz |
|---|---|
| `audit_list` | Lista registros (filtros: status, tipo, gravidade, categoria, origem, nível, busca por texto, paginação). |
| `audit_get` | Mostra um registro completo pelo id. |
| `audit_update_status` | Muda o status (`new`, `triaged`, `planned`, `in_progress`, `fixed`, `wontfix`). Ao marcar `fixed`, grava `resolved_at`. |
| `audit_create` | Cria um registro novo (título + descrição obrigatórios). |
| `audit_delete` | Apaga UM registro. **Exige `confirm: true`** (irreversível). |
| `audit_delete_resolved` | Apaga todos os `fixed`. **Exige `confirm: true`** (irreversível). |

As duas ferramentas de apagar têm um cofre: sem `confirm: true` elas só avisam o que
seria apagado, sem tocar em nada.

## Como ligar

Já está registrado em `.mcp.json` na raiz do projeto. Ao abrir o projeto no Claude Code
ou Cursor, o servidor `agendix-audit` aparece e as ferramentas ficam disponíveis no chat.
Nenhuma instalação nova é necessária (reutiliza `@supabase/supabase-js` do app).

## Credenciais

O servidor lê o `.env` da raiz sozinho — **nenhum segredo fica no `.mcp.json`**. Ordem:

1. `SUPABASE_SERVICE_KEY` (ou `SUPABASE_SERVICE_ROLE_KEY`), se definido → acesso total,
   ignora RLS. Use só se precisar administrar registros de qualquer empresa.
2. Senão, `VITE_SUPABASE_ANON_KEY` + login `AUDIT_MCP_EMAIL`/`AUDIT_MCP_PASSWORD`
   (com fallback para `AGENDIX_TEST_EMAIL`/`AGENDIX_TEST_PASSWORD`) → sessão autenticada,
   isolada por tenant.

## Observações

- Apagar um registro remove **a linha no banco**, mas não o arquivo de screenshot no
  bucket `bug-screenshots`. Se quiser que o MCP também limpe o screenshot, é um ajuste
  simples de acrescentar.
- Roda contra o banco padrão do `.env` (produção). O alcance fica contido à seção de
  auditoria, mas apagar aqui é definitivo.

## Teste rápido (linha de comando)

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"audit_list","arguments":{"limit":3}}}' \
 | node mcp/audit-mcp.mjs
```
