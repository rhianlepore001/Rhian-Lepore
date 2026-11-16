# Jornada mock — 15 dias virtuais

Conjunto de cenários e smoke tests em Chromium, com desktop (1280×800), iPhone emulado (390×844) e Android emulado (393×851). Não representa 15 features completas nem um ciclo de receita validado.

| Dia | O que é verificado |
|---|---|
| D1 | Cadastro mock abre o wizard; onboarding não é concluído |
| D2 | Primeiro passo do wizard visível |
| D3 | Smoke dos ajustes de agendamento |
| D4 | Agenda com URL no dia civil correto |
| D5 | UI cria atendimento e confere os dados persistidos no mock |
| D6 | Smoke do catálogo público, sem enviar pedido |
| D7 | Painel exibe solicitação online mockada no dia correto |
| D8 | Smoke da grade de agenda; não faz checkout |
| D9–D12 | Smoke de fila pública, fila autenticada, financeiro e comissões |
| D13 | Abre histórico e relatório de comissão mockada |
| D14–D15 | Smoke de análises e navegação entre rotas |

D1/D2 usam o mesmo estado de cadastro. Antes de D3 o estado é substituído explicitamente por um dono já configurado. A suíte não valida conclusão do onboarding, confirmação de booking, checkout, `complete_appointment`, Stripe, RLS nem persistência real.

## Execução isolada

```bash
npm run e2e:journey-15d
E2E_ANCHOR_DATE=2026-09-01 npm run e2e:journey-15d -- --project desktop
npm test -- --run test/journeySafety.test.ts
```

A config coleta apenas `journey-15d.spec.ts`, inicia seu próprio Vite e nunca reutiliza servidor. Recusa `E2E_BASE_URL` fora de `http://localhost:<porta>` ou `http://127.0.0.1:<porta>` antes de navegar. A config Vite dedicada não lê `.env` da raiz. Não forneça credenciais reais.

O Supabase é fictício: URL local `<baseURL>/__journey_supabase_mock` e chave `e2e-fake-anon-key`. Assim REST, Auth, Functions e realtime usam a mesma origem do servidor de teste, sem exceção para outro backend. Os handlers respondem em memória; websocket realtime local é fechado sem conectar. Service workers são bloqueados. Links de fontes externas são removidos do HTML servido pelo harness para usar fontes do sistema.

Qualquer tentativa de HTTP ou WebSocket fora da origem local é bloqueada e reprova a jornada com a URL na mensagem. Um teste separado tenta propositalmente REST, Auth, Functions e websocket em `outside.invalid`, validando bloqueio e denúncia sem deixar tráfego sair. Outra regressão usa dois servidores locais e confirma que um redirect para fora da base nunca chega ao destino.

O relógio do app avança com `page.clock.setFixedTime` para 09h em São Paulo a cada cenário. Datas de atendimentos, solicitações e comissões derivam da mesma âncora civil (`2026-09-01` por padrão).

## Relatórios

Cada chamada cria `artifacts/journey-15d/<timestamp-uuid>/`, contendo ledgers por ambiente, `RELATORIO.md`, `summary.json` e evidências Playwright de falhas. `JOURNEY_OUT_DIR` altera apenas a pasta pai. Artefatos e ledgers são ignorados pelo Git; a CI os retém por sete dias.

O ledger registra e relança erros; o relatório é salvo em `finally`. Warns, skips e cenários ausentes não recebem pontos. Uma falha Playwright zera a nota do respectivo ambiente. A nota se refere às asserções executadas, sem achados históricos ou promessa de cobertura completa.

## Live separado (somente staging)

O script `e2e:journey-15d:live` tem config própria e não participa da CI nem das configs compartilhadas. É um smoke de três superfícies (agenda, financeiro e comissões), não um teste de receita ou checkout. Não foi executado nesta correção.

Exige destinos explícitos de staging em `E2E_BASE_URL` e `VITE_SUPABASE_URL`. Quando autorizado para staging, usa credenciais exclusivas desse ambiente. A config e o spec recusam explicitamente o app `agendixstudio.com` (incluindo subdomínios) e o ref Supabase de produção; não fazem skip para mascarar esse destino. Não execute live nem ciclo-de-receita contra produção.
