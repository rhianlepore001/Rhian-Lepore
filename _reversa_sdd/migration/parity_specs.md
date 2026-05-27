---
schemaVersion: 1
generatedAt: 2026-05-17T19:20:00Z
reversa:
  version: "1.0.0"
kind: parity_specs
producedBy: inspector
---

# Parity Specs

> Especificacoes de paridade para a migracao Strangler Fig do AGENX.
> Transicao de paradigma: procedural hibrido -> funcional leve (gap medio-baixo).

---

## Estrategia geral de validacao

### Modos selecionados

| Modo | Aplicavel | Justificativa |
|---|---|---|
| Shadow mode | Nao | Stack mantida; nao ha sistema paralelo para espelhar trafego |
| Characterization tests | **Sim** | Derivar comportamento esperado dos fluxos criticos do legado |
| Contract tests | **Sim** | Validar interfaces Supabase (RPCs, Realtime channels, Edge Functions) |
| Data parity | **Sim (parcial)** | Validar migrations e backfills; nao ha mudanca de banco |

### Criterios de paridade aceita

| Metrica | Valor | Janela |
|---|---|---|
| Divergencia funcional | 0% nos fluxos criticos (appointment, finance_record, queue) | Por fase |
| Cobertura de testes | Todos os `.feature` passando | Antes do merge de cada fase |
| Regressao multi-tenant | 0 vazamentos cross-tenant | Continuo |
| Criterio de bloqueio | Qualquer `.feature` falhando bloqueia o merge da fase | Sempre |

---

## Cobertura adaptada ao paradigma

**Transicao detectada**: procedural hibrido -> funcional leve (composicao de hooks)

| Dimensao | Obrigatoria | Como validar |
|---|---|---|
| Equivalencia funcional | Sim | Mesma entrada -> mesma saida em todos os fluxos |
| Imutabilidade | Sim | Verificar que hooks nao mutam dados diretamente; schemas Zod `.readonly()` |
| Ausencia de side effects no dominio | Sim | Services retornam dados; nao disparam efeitos colaterais fora da borda |
| Equivalencia sob composicao | Sim | Hooks compostos produzem mesmo resultado que chamadas diretas legadas |
| Atomicidade de transacao | Sim | RPCs novas equivalentes ao comportamento esperado (nao ao legado, que tinha bugs) |

**Nota**: como o legado tinha bugs de atomicidade (G2, G3), a paridade nao e com o comportamento bugado, mas com o comportamento *esperado* (corrigido). Os `.feature` refletem o comportamento correto.

---

## Fluxos criticos cobertos

| # | Fluxo | Arquivo `.feature` | Fase | Regras cobertas |
|---|---|---|---|---|
| 1 | Login + sessao | 01-auth-login.feature | 1 | BR-001 a 010 |
| 2 | Onboarding | 02-onboarding.feature | 1 | BR-048, 049, 050 |
| 3 | Criar agendamento | 03-create-appointment.feature | 2 | BR-011, 018, 025, 026 |
| 4 | Checkout | 04-checkout.feature | 2 | BR-014, 019, 022 |
| 5 | Booking publico | 05-public-booking.feature | 3 | BR-015 a 017, 020, 021 |
| 6 | Fila digital | 06-queue.feature | 4 | BR-027 a 033 |
| 7 | Financeiro + comissoes | 07-finance.feature | 5 | BR-034 a 047 |
| 8 | CRM clientes | 08-crm.feature | 6 | BR-051, 052 |
| 9 | Permissoes staff | 09-staff-permissions.feature | cross | BR-010, 013, 024, 033, 034, 035 |
| 10 | Produtos v1 | 10-products.feature | 9 | Novo |

---

## Lacunas de cobertura

| Lacuna | Motivo | Mitigacao |
|---|---|---|
| Sem characterization_specs preexistentes | Reversa nao gerou specs de caracterizacao executaveis | Derivar de code-analysis.md e SDDs |
| Sem sequences/ preexistentes | Reversa nao gerou diagramas de sequencia | Derivar de fluxos documentados |
| Memoria semantica (RAG) | Pos-v1; cobertura limitada | Teste manual |
| Dashboard KPIs | Depende de RPC; validacao manual | Query de validacao |

## Gates adicionais de qualidade visual

Além dos `.feature`, a Fase 0 e a Fase 10 exigem gate visual/documental:

- Design system documentado e usado como contrato visual.
- Componentes base com estados `hover`, `focus`, `active`, `disabled`, `loading`, `error` e `empty`.
- Auditoria anti-AI-slop com `impeccable`: sem glassmorphism gratuito, card grids genericos, glow/neon excessivo, gradientes decorativos ou copy generica.
- Responsividade validada nos fluxos mobile de booking, fila, agenda e checkout.
- Telas criticas devem parecer parte do mesmo produto: Dashboard, Agenda, Booking Publico, Financeiro, Fila, Clientes, Configuracoes e Produtos.
