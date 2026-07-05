# Relatório Parcial — Agente 02 (Copy/Microcopy)
# Frente: E2E — Jornada Completa

**Data**: 2026-07-05
**Auditor**: Agente 02 (loop 2 do `agendix-e2e-test`)
**Método**: auditoria estática (leitura de `pages/`, `components/`, greps de strings). Sem navegação em produção.

---

## Sumário executivo (3-5 bullets)

- **1 P0 de copy**: erro técnico bruto do Supabase exposto ao dono via `alert()` nativo em `ClientCRM.tsx` (linhas 149, 206, 232, 309) e `Clients.tsx:159` — o dono vê strings como `"new row violates row-level security policy"`. Quebra confiança e vaza detalhe interno.
- **`ClientCRM.tsx` usa `alert()` nativo do SO** para sucesso E erro (5 locais) em vez do `showToast()` do projeto — inconsistente, bloqueia UI, "cara de produto de 2005".
- **Bug semântico em `Agenda.tsx:782`**: `showToast('Solicitação recusada.', 'success')` mostra toast verde para uma rejeição — confunde o barbeiro no dia a dia.
- **Tom de voz geral calibrado** nas 3 personas. Melhor copy do produto está em `QueueJoin` ("Entre na fila sem esperar em pé!"). Desvios pontuais em `QueueStatus` (empty state técnico) e termos ("agendamento" vs "reserva").
- **2 achados da auditoria anterior (ALTO-001, ALTO-002) ainda abertos**, com novas instâncias não cobertas em `ClientCRM`.

---

## Tom de voz por persona — está calibrado?

- **Dono (interno)**: ✅ coerente — direto, sem paternalismo. Desvios menores: "MRR" sem legenda e "Liquidar" (termo opaco pra público de barbearia).
- **Colaborador/staff**: ✅ coerente — "Acessar minha agenda", "Atendimentos do dia" no tom certo.
- **Cliente final (público)**: ✅ na maioria. `QueueJoin` é o melhor copy do produto. Problemas: `QueueStatus` tem empty state técnico e há inconsistência "agendamento" vs "reserva".

---

## Termos canônicos encontrados

- Canônico: **"agendamento"** (não "reserva"), **"cliente"** (não "consumidor"/"usuário"), **"serviço"** (não "procedimento").
- Inconsistência: "reserva" aparece em contexto de cliente público onde o resto usa "agendamento".
- "MRR" e "Liquidar" — jargão que destoa do tom de barbearia.

---

## Achados por severidade

### 🔴 P0 — Bloqueantes

#### P0-C01 — Erro técnico do Supabase exposto ao usuário via `alert()` nativo
- **Arquivos**: `ClientCRM.tsx:149, 206, 232, 309` e `Clients.tsx:159`
- **Comportamento atual**: `alert('Erro: ' + error.message)` — o dono vê strings brutas do Postgres/Supabase (ex: `"new row violates row-level security policy"`).
- **Impacto**: quebra de confiança + vazamento de detalhe interno (nome de policy, estrutura). LGPD/segurança à parte, é péssima impressão.
- **Fix sugerido**: substituir por `showToast('Não foi possível concluir. Tente novamente.', 'error')`, logando o `error.message` só no `Logger`.

---

### 🟠 P1 — Graves

#### P1-C01 — `ClientCRM.tsx` usa `alert()` nativo do SO para feedback de sucesso
- **Arquivos**: `ClientCRM.tsx` (5 locais — notas salvas, cliente atualizado, foto atualizada)
- **Problema**: usa o diálogo modal do sistema operacional em vez do `showToast()` do projeto. Inconsistente com o resto do app, bloqueia a UI, "cara de produto antigo".
- **Fix**: trocar todos os `alert()` por `showToast(..., 'success')`.

#### P1-C02 — `Agenda.tsx:782` — toast verde ("success") para ação de rejeição
- **Arquivo**: `Agenda.tsx:782` — `showToast('Solicitação recusada.', 'success')`
- **Problema**: bug semântico. Ação de recusar/rejeitar exibe feedback verde de sucesso. Confunde o barbeiro.
- **Fix**: mudar para `'info'` ou `'error'` conforme convenção do produto (1 linha).

#### P1-C03 a P1-C05 — (demais P1 catalogados pelo agente)
- Instâncias adicionais de `alert()`/feedback inconsistente e microcopy confusa em componentes-chave. Ver greps do agente; agrupados sob a mesma classe de problema (feedback nativo vs `showToast`).

---

### 🟡 P2 — Polimento

13 instâncias em 10 arquivos. Classes principais:
- Empty state técnico/frio em `QueueStatus` (deveria ter tom humano, seguindo o padrão de `QueueJoin`).
- Inconsistência de termo "agendamento" vs "reserva" no fluxo público do cliente.
- "MRR" sem legenda e "Liquidar" opaco na tela do dono.
- Mensagens de erro genéricas ("Erro ao concluir. Tente novamente.") em vez de dizer o que aconteceu + próxima ação.

---

### 🟢 P3 — Cosmético

4 itens cosméticos (micro-ajustes de gramática/pontuação que não afetam compreensão a olho nu).

---

## Top 5 quick wins de copy

| # | Onde | Texto atual | Texto sugerido | Por quê |
|---|------|-------------|----------------|---------|
| 1 | `ClientCRM.tsx` / `Clients.tsx` (5 locais) | `alert('Erro: ' + error.message)` | `showToast('Não foi possível concluir. Tente novamente.', 'error')` | Esconde erro técnico, usa componente do projeto |
| 2 | `Agenda.tsx:782` | `showToast('Solicitação recusada.', 'success')` | `showToast('Solicitação recusada.', 'info')` | Corrige cor/semântica do feedback |
| 3 | `ClientCRM.tsx` (sucesso) | `alert('Cliente atualizado')` | `showToast('Cliente atualizado', 'success')` | Consistência com o resto do app |
| 4 | `QueueStatus` empty state | (técnico/frio) | Tom humano seguindo `QueueJoin` | Primeira impressão do cliente |
| 5 | Tela do dono | "Liquidar" / "MRR" | "Dar baixa" / "Receita recorrente (MRR)" | Vocabulário de barbearia, não de SaaS |

---

## Cruzamento com auditoria anterior (20260610)

| ID 20260610 | Estado |
|-------------|--------|
| MÉDIO-005 (empty state Clients sem copy humana) | 🟢 **Resolvido** |
| ALTO-001 (erro técnico exposto) | 🟠 **Ainda aberto** — novas instâncias em `ClientCRM` |
| ALTO-002 (feedback inconsistente) | 🟠 **Ainda aberto** — `alert()` nativo persiste em `ClientCRM` |

---

## Validação que precisa ser manual

- Confirmar visualmente o `alert()` nativo vs `showToast` em produção (navegação humana).
- Tom de voz do empty state de `QueueStatus` — testar com cliente real pra medir se soa acolhedor.
- Decisão de produto (Rhian): "reserva" vs "agendamento" no público — padronizar.

Fim do relatório do Agente 02.
