# Contas de teste — Playwright / E2E

Sempre que ativar Playwright (skill, MCP, `npx playwright test`, auditoria visual ou screenshots), use **estas contas** via variáveis de ambiente — nunca hardcode senha no código commitado.

## Fonte das credenciais

Arquivo local (gitignored): `.env` na raiz do projeto.

Carregar antes de rodar testes:

```bash
set -a && source .env && set +a
# ou
export $(grep -v '^#' .env | xargs)
```

## Contas

| Papel | Variáveis | Uso |
|-------|-----------|-----|
| **Gestor (owner)** | `E2E_OWNER_EMAIL` / `E2E_OWNER_PASS` | Agenda, Financeiro, Configurações, fluxos de dono |
| **Colaborador (staff)** | `E2E_STAFF_EMAIL` / `E2E_STAFF_PASS` | Agenda staff, Meus Insights, permissões restritas |

Aliases legados (mesma conta gestor): `AGENDIX_TEST_EMAIL` / `AGENDIX_TEST_PASSWORD`.

Base URL: `E2E_BASE_URL` (default `http://localhost:3000`).

## Regras obrigatórias

1. **Ler `.env` antes** de qualquer sessão Playwright — não pedir senha ao usuário se as vars existirem.
2. Preferir **gestor** para captura visual da Agenda e fluxos completos; usar **colaborador** só quando o cenário for de permissão/staff.
3. Nunca commitar `.env`, dumps de storageState com tokens, ou senhas em `MEMORY.md` / PRs / issues.
4. Repo é público: instruções podem citar nomes de variáveis; senhas ficam só no `.env` local.
5. Se o login falhar, verificar tipagem do e-mail do colaborador (`Bob.funcionario@gmail.com` — corrigir `.co` → `.com` se vier truncado).

## Smoke mínimo sugerido

```bash
set -a && source .env && set +a
npm run dev   # em outro terminal, porta 3000
npx playwright test --project=chromium   # ou script de auditoria visual
```

Login manual no browser: `#/login` → e-mail/senha do gestor ou colaborador.
