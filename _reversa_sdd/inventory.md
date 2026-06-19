# Inventário do Projeto — agendix

> Gerado pelo Scout em 2026-05-03

---

## Visão Geral

**agendix** (também referenciado como *Beauty OS* / *AgendiX*) é um SaaS para gestão de barbearias e salões de beleza. Oferece agendamento, fila de espera, CRM de clientes, financeiro, comissões, marketing, onboarding wizard e dashboard com insights alimentados por IA.

---

## Estrutura de Pastas

```
.
├── .agent/                  # Configurações de agentes de IA
├── .agents/                 # Skills de agentes (Reversa, etc.)
├── .aiox-core/              # Framework interno de produto (templates, diagnósticos)
├── .claude/                 # Configurações Claude Code
├── .codex/                  # Configurações Codex
├── .github/workflows/       # CI/CD (GitHub Actions)
├── .harness/                # Test harness / QA
├── .interface-design/       # Recursos de design de interface
├── .opencode/               # Configurações OpenCode
├── .planning/               # Planejamento de funcionalidades
├── .playwright-mcp/         # Testes E2E com Playwright
├── .specs/                  # Especificações de funcionalidades
├── .vercel/                 # Configurações Vercel
├── .vscode/                 # Configurações VS Code
├── components/              # Componentes React
│   ├── appointment/         # Fluxo de agendamento
│   ├── dashboard/           # Dashboard e widgets
│   ├── marketing/           # Campanhas e oportunidades
│   ├── onboarding/          # Wizard de onboarding
│   └── security/            # 2FA e segurança
├── constants/               # Constantes globais
├── contexts/                # Contextos React (Auth, Theme, UI, etc.)
├── design-system/           # Tokens de design e estilos base
├── docs/                    # Documentação do projeto
├── hooks/                   # Custom React hooks
├── lib/                     # Integrações externas (Supabase, Gemini, OpenRouter)
├── pages/                   # Páginas da aplicação
│   └── settings/            # Sub-páginas de configurações
├── public/                  # Assets estáticos
├── scripts/                 # Scripts utilitários (backup, verificação RLS, etc.)
├── supabase/                # Backend Supabase
│   ├── functions/           # Edge Functions (Deno)
│   │   ├── create-checkout-session/
│   │   └── send-appointment-reminder/
│   └── migrations/          # Migrations SQL (~100 arquivos)
├── templates/               # Templates de código
├── test/                    # Testes unitários e de integração
├── utils/                   # Utilitários (datas, formatters, validações)
├── App.tsx                  # Entry point da aplicação React
├── index.tsx                # Mount point React
├── index.html               # HTML base
├── package.json             # Dependências e scripts
├── vite.config.ts           # Configuração Vite + PWA
├── vitest.config.ts         # Configuração Vitest
├── tsconfig.json            # Configuração TypeScript
├── types.ts                 # Tipos globais
└── constants.ts             # Constantes raiz
```

---

## Tecnologias e Frameworks

| Camada | Tecnologia | Versão | Observação |
|--------|------------|--------|------------|
| **Runtime** | Node.js | 20+ | Especificado no CI |
| **Linguagem** | TypeScript | ~5.8.2 | Strict mode |
| **Framework UI** | React | ^19.2.0 | SPA |
| **Routing** | react-router-dom | ^7.9.6 | HashRouter (AGENTS.md) |
| **Build Tool** | Vite | ^6.2.0 | Dev server porta 3000 |
| **PWA** | vite-plugin-pwa | ^1.2.0 | Auto-update, manifest BeautyOS |
| **Backend-as-a-Service** | Supabase | ^2.84.0 (client) / CLI ^2.72.0 | Auth, DB, Storage, Edge Functions |
| **Pagamentos** | Stripe | ^5.4.1 (React) / ^8.6.0 (JS) | Checkout integrado |
| **Charts** | Recharts | ^3.4.1 | Dashboard e relatórios |
| **Ícones** | lucide-react | ^0.554.0 | — |
| **QR Code** | qrcode | ^1.5.4 | Public booking links |
| **Captura de tela** | html2canvas | ^1.4.1 | — |
| **Tour/Onboarding** | driver.js | ^1.4.0 | Walkthroughs |
| **Focus trap** | focus-trap-react | ^12.0.0 | Acessibilidade |
| **IA / LLM** | @google/generative-ai | ^0.24.1 | Gemini integration |
| **IA / LLM (alt)** | openrouter | (lib/openrouter.ts) | OpenRouter integration |

---

## Pontos de Entrada

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `index.html` | HTML entry | Base da SPA, mount point `#root` |
| `index.tsx` | App bootstrap | Renderiza `<App />` |
| `App.tsx` | App root | Router, providers, lazy loading + Suspense |
| `vite.config.ts` | Build config | Vite + React + PWA + alias `@/` |
| `vitest.config.ts` | Test config | Vitest + happy-dom/jsdom |
| `.env.example` | Env template | Variáveis de ambiente documentadas |
| `.github/workflows/ci.yml` | CI/CD | Lint, typecheck, test, coverage em PR/push |

---

## Scripts Disponíveis (package.json)

- `dev` — Vite dev server (`--host`)
- `build` — Build de produção
- `preview` — Preview do build
- `lint` — ESLint (ts, tsx, zero warnings)
- `typecheck` — `tsc --noEmit`
- `test` — Vitest
- `test:ui` — Vitest com UI
- `test:coverage` — Vitest com cobertura
- `backup` — Backup Supabase (`scripts/backup-supabase.js`)

---

## Banco de Dados (Superficial)

- **Plataforma:** Supabase (PostgreSQL)
- **Migrations:** ~100 arquivos em `supabase/migrations/`
- **RLS:** Histórico extenso de Row Level Security (foco em `company_id`)
- **Edge Functions:**
  - `create-checkout-session` — Stripe checkout
  - `send-appointment-reminder` — Lembretes de agendamento
- **Análise detalhada:** a cargo do **Data Master**

---

## Testes

- **Framework:** Vitest ^2.1.8
- **Ambiente:** happy-dom / jsdom
- **Bibliotecas:** @testing-library/react, @testing-library/jest-dom, @testing-library/user-event
- **E2E:** Playwright (@playwright/test ^1.58.2)
- **Arquivos de teste:** ~16 (mix de `*.test.tsx`, `*.test.ts`)
- **Cobertura:** @vitest/coverage-v8 configurado

---

## Módulos Identificados

1. **auth** — Login, registro, recuperação de senha, 2FA, contexto de autenticação
2. **agenda** — Calendário, agendamentos, wizard de booking, edição, review
3. **public-booking** — Reserva pública (cliente final), QR code, fila
4. **queue** — Fila de espera (join, status, management)
5. **clients/crm** — Cadastro de clientes, histórico, insights, área do cliente
6. **dashboard** — Visão geral do negócio, métricas, AIOS, recomendações
7. **finance** — Controle financeiro, comissões, checkout, relatórios
8. **marketing** — Campanhas, oportunidades, calendário de conteúdo
9. **onboarding** — Wizard de configuração inicial do negócio
10. **staff/team** — Profissionais, comissões, portfolio
11. **settings** — Configurações gerais, serviços, equipe, financeiro, segurança, assinatura
12. **security/audit** — Logs de auditoria, 2FA, RLS, logs do sistema
13. **subscriptions** — Planos, Stripe, trial, paywall
14. **ai-assistant** — Chat com IA, prompts, memória semântica, diagnósticos
15. **supabase-backend** — Migrations, Edge Functions, RPCs, RLS policies

---

## Observações do Scout

- O projeto utiliza **HashRouter** (`/#/rota`) conforme restrição em AGENTS.md.
- **Lazy loading** é obrigatório dentro de `<Suspense>` para todas as páginas.
- **Multi-tenant:** todo query no banco DEVE filtrar por `company_id` (RLS).
- **Mobile-first:** público-alvo são barbeiros que usam celular.
- O histórico de migrations é extenso e indica evolução rápida do schema; atenção especial às policies RLS.
