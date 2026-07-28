# SPEC — Onboarding de colaborador, agenda de folgas e dashboard staff (RASCUNHO SUPERADO)

**Tarefa:** RASCUNHO · **Data original:** 2026-07-19
**Data de superação:** 2026-07-24
**Status:** superado — substituído por `specs/active/SPEC-colaborador-permissoes-analise-2026-07-24.md`
**Motivo:** Rhian adicionou 3 features novas (permissões de fila, permissões de produtos, notificação de agendamento online, análise do colaborador) e pediu para juntar tudo no mesmo discovery. Esta SPEC continha apenas 3 features (F1 link convite, F2 folgas/horários, F3 dashboard staff).

> Mantida em `done/` apenas como histórico. **Não usar como referência de planejamento.** A nova SPEC herda as features F1, F2, F3 e adiciona F4, F5, F6, F7.

---

## 1. Contexto original (preservado para histórico)

O Agendix já tem fluxo de colaborador (staff): o dono cadastra a equipe, o staff se registra via link `/#/register?company={ownerUserId}` e assume `role: 'staff'`. O dashboard do staff já existe (`MeuDiaWidget` + `StaffEarningsCard`), com wireflow documentado em `SPEC-dashboard-colaborador-wireflow.md` (DONE).

Os 3 pedidos originais (todos preservados na nova SPEC 2026-07-24):
1. **Link de convite pro colaborador se registrar** (F1 — botão "Copiar link" no card de equipe).
2. **Dono escolhe folgas e horários dos colaboradores** (F2).
3. **Dashboard staff mostra seus dias/horários de trabalho** (F3 — extensão do que já existe).

---

## 2..4. [Conteúdo original das Features 1, 2, 3 omitido daqui — ver git history se precisar]

---

## 5. Dependências entre features (originais)

```
F1 (link convite)        ─ standalone
F2 (folgas/horários)     ─ standalone
F3 (dashboard staff)     ─ depende de F2
```

---

## 9. Próximo passo (quando virar sprint) — atualizado 2026-07-24

1. ~~Promover esta spec de `specs/active/` para cá (a partir daqui).~~ **Feito — superado por nova SPEC.**
2. **Nova referência**: `specs/active/SPEC-colaborador-permissoes-analise-2026-07-24.md` (Lion Claw discovery, 7 features: F1-F3 originais + F4 fila, F5 produtos, F6 notificação agendamento, F7 análise).
3. A nova SPEC herda F1, F2, F3 e adiciona 4 features novas (F4-F7).
4. Continua valendo: F1 standalone, F2 standalone, F3 depende de F2.
5. **F4 (permissões fila), F5 (permissões produtos), F6 (notificação agendamento), F7 (análise) — dependências a definir no Lion Claw da nova SPEC.**

> **Rhian (2026-07-24):** "junta tudo no mesmo discovery. Crio 1 SPEC nova atualizada que substitui o rascunho de 19/jul." Esta SPEC é o checkpoint histórico. Sem prazo. **Trabalho real vive na nova SPEC de 24/jul.**
