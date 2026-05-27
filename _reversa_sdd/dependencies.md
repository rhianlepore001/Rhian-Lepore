# Dependências — agendix

> Gerado pelo Scout em 2026-05-03

---

## Dependências de Produção

| Pacote | Versão | Finalidade |
|--------|--------|------------|
| `@google/generative-ai` | ^0.24.1 | Integração com Gemini (AI Assistant) |
| `@stripe/react-stripe-js` | ^5.4.1 | Componentes React para Stripe |
| `@stripe/stripe-js` | ^8.6.0 | SDK JavaScript do Stripe |
| `@supabase/supabase-js` | ^2.84.0 | Cliente Supabase (Auth, DB, Realtime, Storage) |
| `driver.js` | ^1.4.0 | Walkthroughs e tours na UI |
| `focus-trap-react` | ^12.0.0 | Gerenciamento de foco para acessibilidade |
| `html2canvas` | ^1.4.1 | Captura de DOM como imagem |
| `lucide-react` | ^0.554.0 | Biblioteca de ícones |
| `qrcode` | ^1.5.4 | Geração de QR Codes (booking links) |
| `react` | ^19.2.0 | Framework UI |
| `react-dom` | ^19.2.0 | Renderizador DOM do React |
| `react-router-dom` | ^7.9.6 | Roteamento (HashRouter) |
| `recharts` | ^3.4.1 | Gráficos e visualizações de dados |

---

## Dependências de Desenvolvimento

| Pacote | Versão | Finalidade |
|--------|--------|------------|
| `@playwright/test` | ^1.58.2 | Testes end-to-end |
| `@testing-library/jest-dom` | ^6.6.3 | Matchers customizados para DOM |
| `@testing-library/react` | ^16.1.0 | Utilitários de teste para React |
| `@testing-library/user-event` | ^14.5.2 | Simulação de eventos de usuário |
| `@types/html2canvas` | ^0.5.35 | Tipos para html2canvas |
| `@types/node` | ^22.14.0 | Tipos Node.js |
| `@types/qrcode` | ^1.5.6 | Tipos para qrcode |
| `@types/react` | ^19.2.14 | Tipos React |
| `@types/react-dom` | ^19.2.3 | Tipos React DOM |
| `@typescript-eslint/eslint-plugin` | ^7.18.0 | Regras ESLint para TS |
| `@typescript-eslint/parser` | ^7.18.0 | Parser ESLint para TS |
| `@vitejs/plugin-react` | ^5.0.0 | Plugin Vite para React (Fast Refresh) |
| `@vitest/coverage-v8` | ^2.1.8 | Cobertura de testes (V8) |
| `@vitest/ui` | ^2.1.8 | UI interativa do Vitest |
| `baseline-browser-mapping` | ^2.10.0 | Mapeamento de baseline de browsers |
| `dotenv` | ^17.3.1 | Carregamento de variáveis de ambiente |
| `eslint` | ^8.57.1 | Linter JS/TS |
| `eslint-plugin-react` | ^7.37.5 | Regras ESLint para React |
| `eslint-plugin-react-hooks` | ^4.6.2 | Regras ESLint para Hooks |
| `happy-dom` | ^15.11.7 | Ambiente DOM para testes (alternativo ao jsdom) |
| `jsdom` | ^25.0.1 | Ambiente DOM para testes |
| `supabase` | ^2.72.0 | CLI do Supabase |
| `typescript` | ~5.8.2 | Compilador TypeScript |
| `vite` | ^6.2.0 | Build tool e dev server |
| `vite-plugin-pwa` | ^1.2.0 | Geração de PWA (manifest, service worker) |
| `vitest` | ^2.1.8 | Framework de testes |

---

## Gerenciador de Pacotes

- **npm** (evidenciado por `package-lock.json` e CI `npm ci`)

---

## Integrações Externas Detectadas

1. **Supabase** — Auth, PostgreSQL, Storage, Edge Functions, Realtime
2. **Stripe** — Pagamentos e assinaturas (checkout sessions)
3. **Google Generative AI (Gemini)** — Assistente de IA e geração de conteúdo
4. **OpenRouter** — Proxy para múltiplos modelos LLM (via `lib/openrouter.ts`)
