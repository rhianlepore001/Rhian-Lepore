# Product Context

## Projeto
AgendiX — SaaS B2B de gestão para barbearias e salões (Brasil/Portugal)

## screenCount
4

## screenCandidates
- dashboard (/#/)
- agenda (/#/agenda)
- login (/#/login)
- financeiro (/#/financeiro)

## appUrl
http://localhost:3000

## primaryUsers
- Dono (owner): mobile-first, entre atendimentos, visão operacional rápida
- Staff: agenda do dia, conclusão de atendimentos
- Cliente final: rotas públicas (booking, fila)

## visualReferences
(não informado — explorar na Fase 4)

## constraints
- **Brand fixo** — logo e identidade não mudam
- **Cores de tema fixas** — paleta preservada:
  - **Barber** — dourado (accent), variantes **dark e light**
  - **Beauty** — roxo (accent), variantes **dark e light**
- **Foco da auditoria:** craft em dark/light nos 2 temas — hoje genéricos demais
- Não redesenhar identidade de marca; elevar composição, hierarquia, componentes e estados

## auditMode
hybrid (code + browser)

## auditFocus
Genericidade visual em barber (dourado, dark+light) e beauty (roxo, dark+light); persistência de componentes; estados (empty, loading, error); densidade mobile-first

## faseAtual
8 ✅ — Sprints (`sprints.md`, S1→S8 decompostos) | Fase 6 ✅ Screen Lock 4/4 (`screen-lock.json` locked) | Próximo: `/ui-audit code` (S1→S8) ou aprovar sprints
