# Crítica visual (Playwright)

Workflow para um agente **capturar PNGs** das superfícies-chave e preencher uma crítica com olho crítico. Não substitui a varredura longa de `docs/ux-pro/SUPER-PROMPT.md` (4 temas × forense). Isto é a captura rápida: desktop **1280×800** e mobile **390×844**.

O app usa **HashRouter**. URLs reais: `http://localhost:3000/#/login`, não `/login`.

## Como rodar

```bash
# 1) Chromium do Playwright (uma vez por máquina)
npx playwright install chromium

# 2) Credenciais só em .env / .env.local (gitignored) — nunca no código
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null; set +a

# 3) Captura (sobe `npm run dev` se a base for localhost).
#    Local exige as mesmas VITE_SUPABASE_* do app (`.env.local`).
npm run visual:critique
```

Saída (gitignored): `artifacts/visual-critique/`

```
artifacts/visual-critique/
  MANIFEST.json          # o que foi capturado / pulado e por quê
  claims.json            # frases da UI com trial/features (honestidade)
  SKIPPED.md             # placeholders das telas autenticadas sem sessão
  CRITIQUE.md            # cópia do template para preencher
  desktop/*.png
  mobile/*.png
```

Depois: abra os PNGs, copie o raciocínio em `CRITIQUE.md` (já é uma cópia de `CRITIQUE.template.md` se o arquivo ainda não existia). **Não commite a pasta `artifacts/`.**

Produção / preview (sem webServer local):

```bash
E2E_BASE_URL=https://agendixstudio.com npm run visual:critique
```

## Variáveis de ambiente

Nenhuma senha no repo. Aliases aceitos; o script não hardcoda conta.

| Variável | Função |
|---|---|
| `E2E_BASE_URL` | Default `http://localhost:3000` |
| `DEMO_SLUG` / `E2E_BOOK_SLUG` | Slug do booking público → `/#/book/:slug`. Sem slug, a rota é pulada. |
| `PLAYWRIGHT_STORAGE_STATE` / `VISUAL_CRITIQUE_STORAGE_STATE` | JSON de `storageState` (ex.: `e2e/.auth/user.json`). Preferível a senha. |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | Login pela UI se não houver storageState |
| `E2E_OWNER_EMAIL` / `E2E_OWNER_PASS` | Mesma conta dono já usada no e2e |
| `AGENDIX_TEST_EMAIL` / `AGENDIX_TEST_PASSWORD` | Alias legado |
| `VISUAL_CRITIQUE_SKIP_WEBSERVER=1` | Não sobe o Vite (servidor já no ar) |

`e2e/.auth/` já é gitignored. Gerar storageState (opcional):

```bash
# depois de um login manual no Playwright codegen / teste
# context.storageState({ path: 'e2e/.auth/user.json' })
```

Contas de teste: ver `.Agent/playwright-test-accounts.md` e o bloco E2E de `.env.example`.

## Rotas (adaptadas ao `App.tsx`)

Públicas (sempre tentadas):

| Nome do PNG | Hash | Notas |
|---|---|---|
| `login-gateway` | `/#/login` | Escolha Barbearia / Studio |
| `login-form` | `/#/login` após `category-barber` | Form e-mail/senha; **não** preenche senha no shot |
| `landing` | `/` e `/#/` | Anônimo vê a landing de marketing. Logado, `/#/` continua o Dashboard. |
| `book` | `/#/book/$DEMO_SLUG` | Só com slug. Página indisponível ainda é capturada (útil). |

Autenticadas (placeholders — só capturam com storageState ou credenciais env):

| Nome do PNG | Hash |
|---|---|
| `agenda` | `/#/agenda` |
| `crm` | `/#/clientes` |
| `financeiro` | `/#/financeiro` |
| `clube` | `/#/configuracoes/clube` |
| `fila` | `/#/fila` |

Não existe rota `/#/dashboard`: o painel logado é `/#/`. Não existe `/#/booking/:id` — o booking público é `/#/book/:slug`.

Sem sessão, o spec **passa** e escreve `SKIPPED.md` com o comando para completar os shots do produto.

## O que o agente faz com os PNGs

1. Preencher `artifacts/visual-critique/CRITIQUE.md` (template versionado: `CRITIQUE.template.md`).
2. Nota 1–10 por superfície; blockers P0; checklist de AI-slop; confrontar claims (trial **20 dias**, features).
3. Olhar mobile primeiro (persona barbeiro).
4. Não mudar trial. Não desenhar landing. Não versionar PNG com PII de produção.

Este spec **não** entra no `npx playwright test` padrão (está em `testIgnore` no `playwright.config.ts` da raiz). É só `npm run visual:critique`.

## Relação com o e2e já existente

- Runner: `@playwright/test` (já é devDependency).
- Padrão de login/gateway: `data-testid="category-barber"`, igual `e2e/audit-ui-producao.spec.ts` e `e2e/login-gateway-theme.spec.ts`.
- Auditoria antiga em produção (1440×900, outra pasta): `e2e/audit-ui-producao.spec.ts` + `playwright.prod.config.ts`.
- Plano 360° / personas: `agendix-e2e-test/`.
