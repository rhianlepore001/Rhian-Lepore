# 🎭 EPIC-004 E2E Tests — Onboarding Wizard

Testes E2E completos para validar todo o fluxo de onboarding da aplicação, desde a setup inicial até a criação do primeiro agendamento.

## 📋 O que é testado

### ✅ Teste 1: SetupCopilot com 6 Steps
- **Services** — Adicionar serviço
- **Team** — Adicionar membro da equipe
- **Hours** — Configurar horário de funcionamento
- **Profile** — Atualizar perfil do negócio
- **Booking** — Ativar agendamento público
- **Appointment** — Pronto para criar agendamento

**Validações:**
- Cada step dispara evento `setup-step-completed`
- WizardPointer aparece com animação fade-in
- Spotlight escurece corretamente
- Badge "Opcional" visível no step Team

### ✅ Teste 2: First Appointment Creation
- Navegação até Agenda
- Clique no botão "Novo Agendamento"
- Preenchimento de cliente, serviço, profissional, data/hora
- Confirmação do agendamento
- **Validação:** Evento `system-activated` disparado após primeiro agendamento

### ✅ Teste 3: Animations & Accessibility
- WizardPointer tem animação ao aparecer
- prefers-reduced-motion detectado corretamente
- Detecção de dispositivo low-end (hardwareConcurrency ≤ 4)
- Animações CSS funcionando

### ✅ Teste 4: Event Listeners
- `setup-step-completed` listener registrado
- `system-activated` listener registrado
- Sem erros no console

## 🚀 Como Executar

### Prerequisitos
```bash
# Dev server rodando em http://localhost:3000
npm run dev

# Em outro terminal, rodar os testes
```

### Comandos

**Executar todos os testes E2E:**
```bash
npm run test:e2e
```

**Rodar com navegador visível (útil para debug):**
```bash
npm run test:e2e:headed
```

**Modo UI interativo (recomendado para explorar):**
```bash
npm run test:e2e:ui
```

**Modo debug com passo-a-passo:**
```bash
npm run test:e2e:debug
```

**Rodar teste específico:**
```bash
npx playwright test onboarding.spec.ts -g "SetupCopilot"
```

## 📊 Saída do Teste

### Console Output
```
📱 Navigating to app...
⏳ Waiting for SetupCopilot...
📦 Step 1/6: Services
✅ Services step completed
👥 Step 2/6: Team
✅ Team step completed
🕒 Step 3/6: Business Hours
✅ Hours step completed
👤 Step 4/6: Profile
✅ Profile step completed
📅 Step 5/6: Public Booking
✅ Booking step completed
➕ Clicking New Appointment...
👤 Step 1: Select client
📦 Step 2: Select services
💼 Step 3: Select professional
📅 Step 4: Select date and time
✅ Step 5: Confirm appointment
🎉 System-activated event fired: true
🎊 Activation banner visible: true
```

### HTML Report
Após executar, abrir relatório:
```bash
npx playwright show-report
```

Localização: `playwright-report/index.html`

## 🔍 Estrutura do Teste

```typescript
// Esperar evento disparar
const eventFired = await waitForEvent(page, 'setup-step-completed', 5000);
expect(eventFired).toBe(true);

// Verificar se elemento tem animação
const hasAnim = await hasAnimation(page, '[class*="WizardPointer"]');
expect(hasAnim).toBe(true);

// Verificar classe de low-end device
const isLowEnd = await page.evaluate(() =>
  document.documentElement.classList.contains('low-end-device')
);
```

## 🎯 Critérios de Sucesso

| Critério | Status |
|----------|--------|
| ✅ SetupCopilot com 6 steps completa | PASS |
| ✅ Todos eventos disparam | PASS |
| ✅ Animações funcionam | PASS |
| ✅ Primeira appointment cria system-activated | PASS |
| ✅ Banner de ativação aparece | PASS |
| ✅ Sem erros no console | PASS |
| ✅ prefers-reduced-motion respeitado | PASS |
| ✅ Low-end device detection funciona | PASS |

## ⚙️ Configuração (playwright.config.ts)

- **Browser:** Chromium (desktop)
- **Base URL:** http://localhost:3000
- **Timeout:** 60 segundos por teste
- **Retries:** 2 (CI) / 0 (local)
- **Screenshots:** Apenas falhas
- **Video:** Apenas falhas
- **Trace:** on-first-retry (debug)

## 🐛 Troubleshooting

### "Browser not found"
```bash
npx playwright install chromium
```

### "Connection refused" (dev server não está rodando)
```bash
npm run dev
# Esperar até "Ready in X ms"
# Abrir novo terminal para rodar testes
```

### "Element not found"
- Verifique se os IDs dos elementos no teste correspondem ao código real
- Use `npx playwright test --headed` para ver o navegador
- Use `npx playwright codegen http://localhost:3000` para gerar novos seletores

### Testes falhando aleatoriamente
- Aumentar timeout: `test.setTimeout(60000)`
- Adicionar `await page.waitForTimeout(1000)` entre ações
- Verificar se dev server tem capacidade suficiente

## 📝 Logs Detalhados

Habilitar logs do Playwright:
```bash
DEBUG=pw:api npm run test:e2e
```

Salvar logs em arquivo:
```bash
npm run test:e2e > test-output.log 2>&1
```

## 🚀 Integração CI/CD

Para rodar em CI (GitHub Actions, GitLab CI, etc):

```bash
# Instalar dependências
npm install

# Rodar testes (com retries e relatório)
npm run test:e2e

# Fazer upload do relatório
# (configurar no seu CI tool)
```

## 📚 Referências

- [Playwright Documentation](https://playwright.dev)
- [Test Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Tests](https://playwright.dev/docs/debug)

---

**Última atualização:** 2026-03-30
**EPIC:** EPIC-004 — Onboarding Wizard Refactor
**Status:** ✅ APPROVED FOR MERGE
