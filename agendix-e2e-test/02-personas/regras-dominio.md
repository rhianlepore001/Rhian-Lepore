# Regras de Domínio do AgendiX

> **Este arquivo é vivo**: começa com o que a gente extrai do PRODUCT.md / DECISIONS.md / GLOSSARY.md. O agente de domínio da auditoria (06) vai adicionar regras implícitas que ele descobrir (e flagged com `[DESCOBERTA PELO AGENTE]`). Você (Rhian) pode revisar, marcar como "confirmada" ou "rejeitada".

---

## Bloco A — Identidade de quem se registra / entra

| # | Regra | Fonte | Status |
|---|---|---|---|
| A1 | Quem se cadastra pela 1ª vez é SEMPRE o **dono** da empresa. O sistema não deve perguntar "você é o dono?". | (regra de domínio do produto, identificada por Rhian 2026-07-05; exemplo clássico de buraco de regra) | pendente confirmação |
| A2 | Existe uma **distinção de role** clara: `owner` (acesso total) vs `staff` (acesso limitado à própria agenda e comissões). | GLOSSARY.md | confirmada |
| A3 | Staff se cadastra via link de convite do dono: `/#/register?company={ownerUserId}` → role automático `staff`. | CLAUDE.md | confirmada |
| A4 | O dono é também um "profissional" no sentido de que ele pode atender e aparecer na agenda, mas **não recebe comissão** (a "comissão" dele é o próprio salário/lucro). | (regra de domínio, identificada por Rhian 2026-07-05) | pendente confirmação |
| A5 | Quando o **dono** olha a agenda, ele deve aparecer como "Você" (não só o nome), assim como acontece pro staff. Hoje aparece só o nome — o sistema não está reconhecendo a conta dono como self. | (bug reportado por Rhian 2026-07-05) | pendente confirmação |

## Bloco B — Agendamento

| # | Regra | Fonte | Status |
|---|---|---|---|
| B1 | Status do agendamento: `Pending → Confirmed → Completed/Cancelled`. | GLOSSARY.md | confirmada |
| B2 | Cancelamento e conclusão usam **RPCs atômicas** (`complete_appointment` v2). Não há fallback client-side oficial — fallback que existia é marcado como risco. | DECISIONS.md, RPC `complete_appointment` | confirmada |
| B3 | Slots disponíveis são calculados por `business_hours` (JSONB) + `duration_minutes` do serviço - agendamentos existentes. | GLOSSARY.md | confirmada |
| B4 | Booking público espelha em `appointments` via RPC `secure_create_booking` (SECURITY DEFINER). | DECISIONS.md, GLOSSARY.md | confirmada |

## Bloco C — Financeiro e comissão

| # | Regra | Fonte | Status |
|---|---|---|---|
| C1 | Conclusão de agendamento gera `finance_records` automaticamente via RPC `complete_appointment`. | GLOSSARY.md, RPC | confirmada |
| C2 | Comissão é percentual do valor do serviço, definida por `commission_rate` em `team_members`. | GLOSSARY.md | confirmada |
| C3 | Comissão é calculada por RPC `get_commissions_due`. | GLOSSARY.md | confirmada |
| C4 | Comissão pode ser "paga" via `commission_payments`. | GLOSSARY.md | confirmada |
| C5 | Dono **não recebe comissão** (regra A4). Hoje o sistema provavelmente tenta calcular e exibir — pode estar poluindo relatórios. | (Rhian 2026-07-05) | pendente confirmação |
| C6 | Financeiro não pode "parecer exportação de CSV" / "planilha Excel com cor". | PRODUCT.md (anti-reference) | confirmada |

## Bloco D — Fila digital

| # | Regra | Fonte | Status |
|---|---|---|---|
| D1 | Status da fila: `waiting → calling → serving → completed/cancelled/no_show`. | GLOSSARY.md | confirmada |
| D2 | Cliente entra na fila, é chamado pelo barbeiro, atendido, finaliza. Ciclo completo. | regra implícita do produto | pendente confirmação |
| D3 | Cliente pode ver status da fila via página `/#/queue/:id` (público, sem login). | CLAUDE.md | confirmada |
| D4 | "Se barber chama cliente e ele não aparece" — provavelmente deve virar `no_show`, não sumir da fila. | regra implícita | pendente confirmação |
| D5 | Posição na fila é calculada por RPC `get_queue_position`. | migration 20260218_queue_system.sql | confirmada |
| D6 | Cliente só pode ver a própria entrada (com `entry_id` + telefone como prova). RLS aplicado. | migration 20260218_queue_system.sql | confirmada |

## Bloco E — Onboarding e primeira impressão

| # | Regra | Fonte | Status |
|---|---|---|---|
| E1 | Novo usuário passa por wizard de 5 steps (dados → horário → serviços → equipe → conclusão). Progresso salvo em `onboarding_progress`. | DECISIONS.md, GLOSSARY.md | confirmada |
| E2 | Onboarding é o momento crítico de **conversão**: o dono precisa ver valor concreto nos primeiros 30s, sem "potencialize" / "transforme" — copy deve ser direta. | PRODUCT.md, briefing inicial da auditoria | confirmada |
| E3 | `onboarding_progress` referencia `companies(id)` mas a tabela `companies` **não existe** — modelo multi-tenant incompleto. | DECISIONS.md ADR-008 | confirmada (dívida técnica) |
| E4 | Onboarding não pode deixar o dono preso: se ele fechar no meio, volta de onde parou, sem perder progresso. | regra implícita de UX | pendente confirmação |

## Bloco F — Multi-tenant e segurança

| # | Regra | Fonte | Status |
|---|---|---|---|
| F1 | Isolamento de dados por `company_id` em todas as tabelas, RLS no Supabase. | DECISIONS.md ADR-001 | confirmada |
| F2 | `company_id` vem do session Supabase via `useAuth()`. Nunca de URL params ou form inputs. | DECISIONS.md ADR-001 | confirmada |
| F3 | Queries sem `company_id` retornam vazio silenciosamente (RLS, não erro). | DECISIONS.md ADR-001 | confirmada |
| F4 | Fluxos públicos (booking, queue) usam RPCs `SECURITY DEFINER` para contornar RLS. | DECISIONS.md ADR-006 | confirmada |
| F5 | `profiles.company_id` é TEXT mas várias migrations e RPCs tratam como UUID — inconsistência pode causar bugs. | DECISIONS.md ADR-010 | confirmada (dívida técnica) |
| F6 | Staff só vê a própria agenda e comissões. Não vê faturamento geral nem outros funcionários. | GLOSSARY.md | pendente confirmação |

## Bloco G — Clientes

| # | Regra | Fonte | Status |
|---|---|---|---|
| G1 | Cliente público (`public_clients`) tem `UNIQUE(business_id, phone)` — não duplica por telefone. | GLOSSARY.md | confirmada |
| G2 | Cliente público é espelhado no CRM via RPC `mirror_public_client_to_crm`. | GLOSSARY.md | confirmada |
| G3 | Cliente pode ter `loyalty_tier` (fidelidade). | GLOSSARY.md | confirmada |
| G4 | "Churn" = cliente que parou de agendar. Detectado por `get_marketing_opportunities`. | GLOSSARY.md | confirmada |

## Bloco H — Tema e marca

| # | Regra | Fonte | Status |
|---|---|---|---|
| H1 | Dois temas: **barber** (dark industrial) e **beauty** (light elegante). | DECISIONS.md ADR-003 | confirmada |
| H2 | Temas são "irmãos, não primos distantes" — cross-tema consistente. | PRODUCT.md (Design Principles) | confirmada |
| H3 | Copy 100% em pt-BR. Zero inglês na interface final. | PRODUCT.md (Accessibility) | confirmada |
| H4 | Personalidade: **elegante, confiável, eficiente**. Não "potencialize", não "transforme". | PRODUCT.md (Brand) | confirmada |
| H5 | Sem glassmorphism decorativo, sem big-number+sparkline clichê. | PRODUCT.md (Anti-references) | confirmada |
| H6 | Modo claro deve ter contraste real (não desbotado). | PRODUCT.md (Anti-references) | confirmada |
| H7 | Touch targets mínimo 48×48dp. | PRODUCT.md (Accessibility) | confirmada |
| H8 | Estados de erro PRÓXIMOS ao campo, não no topo da página. | PRODUCT.md (Accessibility) | confirmada |

## Bloco I — AIOS (pós-MVP)

| # | Regra | Fonte | Status |
|---|---|---|---|
| I1 | AIOS é sistema de agentes IA. Features pós-MVP — **não priorizar** no momento. | GLOSSARY.md, CLAUDE.md | confirmada |

---

## Como esse arquivo evolui

1. **Antes da auditoria (agora)**: ele já tem o que a gente extraiu do repo. Revisado por você.
2. **Durante a auditoria (loop 2)**: o agente 06 (domínio) cataloga regras implícitas e adiciona aqui com tag `[DESCOBERTA PELO AGENTE]`.
3. **Depois da auditoria**: você (Rhian) revisa cada `[DESCOBERTA PELO AGENTE]` e marca como **confirmada** ou **rejeitada** (e justifica se rejeitar).
4. **A cada sprint**: se uma regra for mudada no código, atualize aqui também. Esse doc vira **fonte da verdade de regras de negócio**.

## Próximo passo

Loop 1 (pesquisa de mercado) ainda não rodou. Quando rodar, esse arquivo também vai ser cruzado com AppBarber/Trinks pra ver o que o mercado espera vs o que o AgendiX faz.
