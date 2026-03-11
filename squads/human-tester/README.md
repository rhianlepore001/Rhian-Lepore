# 🧪 Human Tester Squad

Squad de testes com mentalidade humana. 5 agentes navegam pelo app real no browser via Playwright, cada um com uma perspectiva de teste diferente.

## Agentes

| Agente | Nome | Mentalidade | O que Testa |
|--------|------|-------------|-------------|
| 🧭 Explorer | Navi | "Nunca vi esse app" | Happy path, primeiro uso, intuitividade |
| 💥 Destroyer | Havoc | "Vou quebrar tudo" | Inputs inválidos, edge cases, permissões |
| 🔬 Meticulous | Pixel | "Nenhum detalhe escapa" | Visual, responsive, estados, consistência |
| ⚡ Speedster | Flash | "Rápido ou inaceitável" | Performance, console errors, stress |
| 🛡️ Guardian | Shield | "Ninguém passa" | Segurança, multi-tenant, XSS, auth |

## Cobertura

- **26 rotas** (9 públicas + 17 autenticadas)
- **13 modais** interativos
- **16+ formulários** com validação
- **2 temas** (Brutal + Beauty)
- **3 breakpoints** (mobile, tablet, desktop)
- **3 personas** (owner, staff, cliente)

## Uso Rápido

```bash
# Ciclo completo (5 agentes em sequência)
*full-test-cycle

# Agentes individuais
*explore       # Navi: navegar como primeiro uso
*destroy       # Havoc: tentar quebrar tudo
*inspect       # Pixel: inspecionar visualmente
*stress-test   # Flash: testar performance
*security-scan # Shield: verificar segurança
```

## Workflow

```
Navi (happy path) → [em paralelo] → Havoc (quebrar)
                                   → Pixel (inspecionar)
                                   → Flash (estressar)
                                   → Shield (proteger)
                   → Relatório consolidado
```

## Pre-requisitos

1. `npm run dev` rodando (localhost:3000)
2. Playwright MCP habilitado
3. Dados de teste no banco
