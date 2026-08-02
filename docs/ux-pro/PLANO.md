# PLANO — Profissionalização UI/UX AgendiX

**Branch:** `design/ux-pro-sweep`  
**Status:** Gate humano **APROVADO** (2 Ago 2026) — Fases A–E em implementação na branch `design/ux-pro-sweep`.  
**Matriz auditada:** barber × dark/light (beauty e slugs públicos: Gate 0.7 aberto).  
**Insumos:** C1–C4, V1–V2, DESEMPATES.md, BASELINE.md (CONHECIDO-###), forensics/RESUMO.md.

---

## 1. Diagnóstico (10 linhas)

O AgendiX já tem design system (`tokens.css`, `components/ui/*`, temas por atributo) — e a tela **não o usa**. O produto parece amador porque cada superfície reimplementa botão, modal, input, empty e loading com classes literais e ramos `isBeauty`, enquanto o light mode quebra contraste on-accent (texto ~4:1 ou 1:1 no badge). Falha de rede vira lista vazia: o usuário lê “sem dados” quando a API abortou. Em Ajustes, saves celebram sucesso sem persistir toggles/comissões — mentira de UI. Nas públicas, o CTA do ClientArea barber é quase invisível (~1:1) e ratings “5.0” são fabricados. Chrome (Header, SettingsLayout) concentra alvos <44px e o badge de notificações some no light. A distância entre Produtos (já em ui/*) e Agenda/Ajustes é a prova: o vocabulário existe; a disciplina não. Profissionalizar é **fechar a rachadura DS ↔ folha**, não redesenhar a marca.

---

## 2. Placar atual (rubrica §12)

Notas = julgamento do orquestrador após júri (0–10). Meta release: média ponderada ≥ 8,5 e nenhum pilar < 7,5.

### Por pilar (produto auditado: barber)

| # | Pilar | Peso | Nota | Comentário |
|---|---|---|---|---|
| 1 | Hierarquia e tipografia | 20 | **5,5** | 13 tamanhos; títulos 2xl–4xl misturados; KPI sem escala |
| 2 | Espaçamento e ritmo | 20 | **5,0** | 6px/10px dominantes; padding de página dobrado |
| 3 | Consistência de componentes | 20 | **4,5** | ui/* ocioso; wizard/forms/empty ad-hoc; shadow-heavy vivo |
| 4 | Densidade e clareza de ação | 15 | **6,0** | Núcleo usável; Dashboard denso (CONHECIDO-016/017) |
| 5 | Acessibilidade e ergonomia | 15 | **4,0** | On-accent light; badge 1:1; alvos 20–34px; ClientArea CTA |
| 6 | Microcopy e feedback | 10 | **3,5** | Rede silenciosa; saves que mentem; “5.0”; erros crus |

**Média ponderada atual ≈ 4,9** — longe da meta.

### Por superfície (média dos 6 pilares, aproximada)

| Superfície | Nota | Driver |
|---|---|---|
| Dashboard | 5,5 | Densidade + contraste light |
| Agenda | 5,0 | Wizard ad-hoc, loading, padding |
| Clientes / CRM | 5,0 | picsum, datas falsas, alvos WhatsApp |
| Financeiro | 4,5 | loading morto, erro silencioso |
| Fila | 5,0 | língua visual própria (P3) |
| Produtos | **7,5** | referência interna (ui/*) |
| Ajustes (9 telas) | **4,0** | saves mentem, forms, shadow-heavy |
| Auth (Login/Register/Forgot) | 5,5 | Forgot alienígena; Register sem hint |
| Públicas (booking/queue/club/area) | **4,0** | CTA 1:1, tema sem data-*, 5.0 fake |
| Chrome (Header/Nav/Layout) | 4,5 | badge, alvos, density |

Beauty: **não pontuado** (Gate 0.7).

---

## 3. Fases de implementação (risco ↑ / impacto ↓)

Ordem: sistêmico → mentiras de save → núcleo → chrome → públicas → ajustes → polimento.  
Cada fase: achados, arquivos, risco, esforço (S/M/L), prova de melhora.

### Fase A — Tokens e primitivos (sistêmica)

| | |
|---|---|
| **Achados** | C1-001, C1-008, C4-002, C4-005, C4-001 (causa no Header mas token on-accent ajuda), C4-007 (parcial: type/spacing tokens), C4-008, CONHECIDO-015 |
| **Arquivos** | `design-system/tokens.css`, `hooks/useBrutalTheme.ts` (`buttonPrimary` / on-accent), opcional `scripts/check-design-debt.mjs` |
| **Risco** | Médio — light muda em massa; dark deve permanecer estável |
| **Esforço** | M |
| **Exceção §2.1** | **Sim — token de cor** `--color-on-accent` (e recalibração de accent/success sobre surface no light) só com razão medida ≥4,5:1 texto / ≥3:1 UI |
| **Prova** | Forensics §5: violações light ↓; botão primário e badge ≥4,5:1; dark delta ≈0 |

### Fase B — Honesty: saves e feedback de rede (P0/P1 críticos)

| | |
|---|---|
| **Achados** | C2-001 (save **e** load), C2-002, C1-002, C4-003, C4-016, C1-003, C4-012, C4-013 |
| **Arquivos** | `PublicBookingSettings.tsx`, `CommissionsSettings.tsx`, `Finance.tsx`, `Agenda.tsx` / CRM / Clients (ErrorState + skeleton), `Products` como referência |
| **Risco** | B-001: **alto se migration**; path seguro = desabilitar/remover toggles até schema (e não fingir estado hidratado). B-002: médio (corrigir binding `editedMembers`) |
| **Esforço** | M |
| **Exceção §2.1** | **C2-001 path dados:** só com aprovação explícita de migration; default do plano = **só UI** |
| **Prova** | Toggle que não persiste não existe ou persiste; comissão salva o que a UI mostra; abort de rede → ErrorState (não empty); Finance mostra loading |

### Fase C — Composição: Modal, segmented, PageHeader, density

| | |
|---|---|
| **Achados** | C1-004, C1-005 (P2), C1-006, C4-004, C1-010 (escopo desempatado), C1-011, C2-003…014 (incl. **C2-012** ring interpolado), C2-017, CONHECIDO-005, CONHECIDO-013, CONHECIDO-014 |
| **Arquivos** | `AppointmentWizard` → `ui/Modal`; páginas núcleo; `SettingsLayout` + settings; `SubscriptionSettings.tsx` (ring estático); `ServiceSettings` (shadow-heavy); Segmented se necessário |
| **Risco** | Médio (wizard = fluxo que paga a conta — testar agendar) |
| **Esforço** | L |
| **Prova** | overlaysAdHoc=0 no wizard; role=dialog + Esc; títulos via PageHeader nas 5 páginas do escopo; 0 `shadow-heavy` em pages/; settings usam ui/Input + SettingsRow nas telas tocadas |

### Fase D — Chrome e ergonomia

| | |
|---|---|
| **Achados** | C4-001 (bug `${colors.bg}` no border), C4-006, C4-009, C1-007, C2-006, CONHECIDO-018, CONHECIDO-019 |
| **Arquivos** | `Header.tsx`, `SettingsLayout.tsx`, `BottomMobileNav` (só se Gate aprovar C4-010), Agenda header a11y |
| **Risco** | Baixo–médio |
| **Esforço** | S–M |
| **Prova** | Badge contraste ≥4,5:1; NavLink settings ≥44px; Voltar ≥44px; ícones Agenda com aria-label |

### Fase E — Públicas e auth

| | |
|---|---|
| **Achados** | C3-001…013, C3-016, C3-017, C3-019, C3-020; CONHECIDO-021…023 (se couber sem mudar contrato de URL) |
| **Arquivos** | `ClientArea.tsx`, `ForgotPassword.tsx`, `Register.tsx`, `ProfessionalPortfolio.tsx`, booking/queue/club pages, `passwordValidation` hint |
| **Risco** | Médio em tema público (C3-002: setar `data-theme`/`data-mode` sem quebrar booking) |
| **Esforço** | M |
| **Prova** | CTA ClientArea barber ≥4,5:1; sem “5.0” literal; Forgot no DS; Register com hint + mapError; checkbox → ui/Checkbox |

### Fase F — Polimento e CONHECIDO estrutural (opcional no mesmo release)

| | |
|---|---|
| **Achados** | C1-012…022 (P2/P3 confirmados), C3-014+ P3, C4-007 resto, CONHECIDO-001…004, 007…012, 016…017 |
| **Arquivos** | Fila visual, locale, picsum/CRM copy, Dashboard densidade |
| **Risco** | Variável; CONHECIDO-007 (useBrutalTheme) é L+ e pode sair do corte |
| **Esforço** | L se incluir 007 |
| **Prova** | Delta forensics spacing/type; Dashboard pergunta da tela acima da dobra |

---

## 4. Mapa achado → fase (P0/P1 obrigatórios)

| Prioridade | IDs | Fase |
|---|---|---|
| P0 | C2-001, C2-002, C3-001, C4-001 | B, E, D (+ A para on-accent) |
| P1 | C1-001…004/006/008, C2-003…008/010–012/014, C3-002…010, C4-002…006, C4-009, C4-013 | A–E |
| P2 (ex-P1 V1) | C1-005, C1-007, C1-009, C2-013 | C, D, F |
| P2 confirmados | C1-010/011/013…018, C2-015…017, C3-011+, C4-008/012/015… | C, E, F |
| P3 / descartados | ver §5 | — |

Duplicatas conscientes (mesmo root): C1-001↔C4-002, C1-002↔C4-003, C1-006↔C4-004, C2-006↔C4-009 — **uma correção na raiz**.

---

## 5. Deliberadamente descartado (deste release)

| Item | Por quê |
|---|---|
| C2-022…025, C3-021, C4-018 | P3 / evidência fraca |
| C4-010 mudança de IA | Decisão de produto — só documentar a menos que Gate diga “mudar” |
| C4-017 como achado | Já é CONHECIDO-008 |
| Beauty pixel-perfect / slugs públicos | Gate 0.7 não autorizado |
| Redesign de marca / troca de fontes / novos acentos | Congelado §2.1 |
| CONHECIDO-007 big-bang (desmontar useBrutalTheme) | Alto risco; candidato a milestone separado |
| CONHECIDO-025 sidebar fantasma | Investigar se reaparecer; não CSS cego |
| Migrations RLS / regras de negócio | Proibido |
| Dependência nova | Proibido sem Gate |

---

## 6. Exceções §2.1 — aprovação explícita necessária

| # | Tipo | O quê | Risco |
|---|---|---|---|
| E1 | Token de cor | `--color-on-accent` (+ recalibração light de accent/success sobre surface se AA exigir) | Visual light em massa |
| E2 | Camada de dados (opcional) | Persistência real dos toggles C2-001 (colunas/migration) | Schema + RLS; **default = não** |
| E3 | Camada de dados (leve) | C2-002 só corrige leitura/escrita de campos **já existentes** | Baixo — não é regra nova |

---

## 7. Critérios de “pronto para Fase 9”

1. Fases A–E implementadas (F opcional conforme Gate).  
2. Gates verdes a cada commit: `typecheck`, `lint`, `test`, `build`.  
3. Matriz AFTER + `ANTES-DEPOIS.md` + delta forensics.  
4. Fluxos manuais: agendar→aceitar→cobrar; cliente→histórico; financeiro do mês.  
5. Placar próprio reavaliado — **não substitui** Evaluator final.

---

## 8. Perguntas ao Gate (responda para destravar)

1. **Pode ir** nas Fases A–E com E1 (token on-accent) e E3 (fix commissions), **sem** migration E2 (toggles C2-001 viram UI desabilitada/removida)?  
2. Incluir Fase F / Dashboard (CONHECIDO-016/017) neste sweep ou milestone seguinte?  
3. Autoriza Gate 0.7 (beauty + seed) antes da implementação, ou release só barber?  
4. C4-010: só documentar IA mobile, ou reposicionar Fila no bottom nav?

---

*Fim do plano. Aguardando aprovação humana. Fases 7–10 não iniciam sem “pode ir”.*
