# Browser Setup — Playwright Configuration

## Pre-requisitos
1. Dev server rodando: `npm run dev`
2. Playwright MCP habilitado no Claude Code
3. Browser Chromium disponível

## Configuração de Teste

### Viewports por Breakpoint
```yaml
mobile:
  width: 375
  height: 812
  device: "iPhone 13"

tablet:
  width: 768
  height: 1024
  device: "iPad"

desktop:
  width: 1440
  height: 900
  device: "Desktop"
```

### Base URLs
```yaml
local: "http://localhost:3000"
public_booking: "http://localhost:3000/#/book/{slug}"
queue: "http://localhost:3000/#/queue/{slug}"
```

### Credenciais de Teste
```yaml
owner:
  email: "{test owner email}"
  password: "{test password}"

staff:
  email: "{test staff email}"
  password: "{test password}"

# IMPORTANTE: Não commitar credenciais reais
# Usar .env.test.local para credenciais
```

### Fluxo de Setup Antes de Cada Sessão
1. Verificar dev server: `curl http://localhost:3000`
2. Abrir browser via Playwright
3. Navegar para `http://localhost:3000`
4. Verificar que app carregou (check for title element)
5. Se autenticado → Iniciar testes autenticados
6. Se público → Iniciar testes públicos

### Screenshots
- Salvos em: `docs/test-reports/screenshots/`
- Naming: `{agente}-{rota}-{breakpoint}-{timestamp}.png`
- Exemplo: `navi-dashboard-mobile-20260308.png`
