# Specs de produto — AgendiX

Índice de especificações entregues a agentes Cursor Cloud. **Somente documentação** neste diretório até a implementação ser puxada em branches de feature próprias.

| Spec | Arquivo | Status |
|---|---|---|
| Análise de performance dos colaboradores | [`colaboradores-performance-SPEC.md`](./colaboradores-performance-SPEC.md) | aguardando implementação |
| Overhaul de agendamento cliente/colaborador | [`booking-overhaul-SPEC.md`](./booking-overhaul-SPEC.md) | aguardando implementação |

## Padrões de entrega (todas as specs)

- Validator crítico: score **9–10** (≤8 = fix loop)
- Code review separado do implementador
- Relatório testado + screenshots (Playwright 390×844 e 1280)
- UI Impeccable (sem visual AI-slop)
- Migrations **additive-only** (novas tabelas/colunas/RLS; RPCs `_v2` ou params opcionais; sem drops/rewrites in-place)
- Regression guard revisa outras áreas antes do merge

## Posicionamento

> o serviço que faz o seu salão crescer
