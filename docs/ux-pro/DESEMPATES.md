# DESEMPATES — Fase 5

**Data:** 2026-08-02  
**Regra aplicada:** onde crítico e validador divergem ≥1 nível ou há FALSO contestável, uma réplica com evidência nova. Sem evidência nova, prevalece o validador.  
**Fontes canônicas:** `validation/V1.md` (subagente retoma), `validation/V2.md` (orquestrador — V2 falhou por API). Réplica formal aos críticos **não rodou** (limite de API).

---

## Tabela de decisões

| ID | Crítico | Validador | Decisão final | Motivo (uma frase) |
|---|---|---|---|---|
| C1-005 | P1 | EXAGERADO P2 | **P2** | Segmented controls reais; P1 harsh vs wizard/rede. |
| C1-007 | P1 | EXAGERADO P2 | **P2** | Alvos <44 reais; cluster com C4-006/009 — não triplica P1. |
| C1-009 | P1 | EXAGERADO P2 | **P2** | picsum hardcoded é P2 de honestidade visual, não bloqueio. |
| C1-010 | P2 (todas as 10) | escopo inflado | **P2**, escopo **Agenda / Fila / CRM / StaffInsights / Products** | “Todas as 10” falso — várias já usam PageHeader. |
| C1-012 | P2 | EXAGERADO P3 | **P3** | Vidro/scale na Fila = polimento. |
| C1-020 | P3 | EXAGERADO P3 | **P3** | Microcopy; toggle mitiga. |
| C2-009 | P1 | CONFIRMADO duplicata C1-001 | **Duplicata** — correção na Fase A (on-accent) | Mesma raiz; não conta esforço extra. |
| C2-012 | P1 | CONFIRMADO P1 | **P1** | `'ring-2 ring-' + accentColor` não gera CSS (Tailwind v4 estático). |
| C2-013 | P1 | EXAGERADO P2 | **P2** | Switch 24px + aria opcional; label adjacente mitiga. |
| C2-017 | P2 | CONFIRMADO P2 | **CONFIRMADO P2** | Regressão RESOLVIDO-053: `ServiceSettings.tsx:209` tem `shadow-heavy`. |
| C2-019 / 021 / 022 / 024 | P2–P3 | EXAGERADO P3 | **P3 / fora do corte** | Editorial ou já coberto por C2-004. |
| C2-023 | P3 | CONFIRMADO P3 | **P3** | Campos silent round-trip — fora do corte A–E. |
| C2-025 | P3 | CONFIRMADO P3 | **P3** | Fallback `SAO PAULO` — fora do corte A–E. |
| C3-014 / 015 / 018 / 021 | P2 | EXAGERADO P3 | **P3** | Validador V2 prevalece. |
| C4-007 | P1 | EXAGERADO P2 | **P2** | Escala tipográfica = dívida, não bloqueio. |
| C4-010 | P2 | EXAGERADO P3 | **P3 / produto** | Não muda IA mobile sem Gate. |
| C4-014 | P2 | EXAGERADO P3 | **P3** | Contagem de famílias inclui fallback. |
| C4-017 | P2 | FORA | **FORA** → **CONHECIDO-008** | Dívida conhecida, não achado novo. |
| C4-018 | P3 | EXAGERADO | **Descartar** | Quase-alinhamento sem gutter unificado. |

---

## Evidência que fechou disputa

### C2-017 — shadow-heavy
`pages/settings/ServiceSettings.tsx:209` contém `shadow-heavy-sm` e `shadow-heavy` no HEAD → CONFIRMADO P2.

### C2-001 — miss do crítico (aceito no plano)
Além do save, `useEffect` não hidrata os dois toggles do backend — correção B trata leitura+escrita (path UI-only até Gate autorizar schema).

### Contagens finais
- **V1:** 35 CONFIRMADO · 12 EXAGERADO · 0 FALSO · 0 FORA  
- **V2:** 33 CONFIRMADO · 8 EXAGERADO · 0 FALSO · 1 FORA (C4-017)

---

## Sem divergência material (validador = crítico ou CONFIRMADO)

Todos os P0 e a maior parte dos P1 (C1-001…009, C2-001…014, C3-001…013, C4-001…006, C4-009, C4-013) **não entram nesta tabela** — consenso ou confirmação forte.

---

## Itens que exigem pergunta no Gate Humano (não desempate técnico)

1. **C2-001 path:** desabilitar toggles na UI até schema existir **vs** migration + persistência (última exige aprovação §2.1 / não tocar migration sem ok).  
2. **C4-010:** alterar IA do bottom nav **vs** só documentar agrupamento em “Mais”.  
3. **Gate 0.7:** seed + `user_type=beauty` — beauty e rotas públicas com slug ficam fora da prova de release se não autorizado.
