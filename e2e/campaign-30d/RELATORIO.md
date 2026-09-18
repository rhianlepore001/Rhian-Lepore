# Relatório orquestrador — esqueleto A+B+C+E+F

Campanha simulada 30 dias · AgendiX · 2026-09-18  
Fontes: A · B · C · **E 3 barbeiros** · F clientes.  
**D recepção: TBD.** Não relançar A/B/C/E/F. Plano E2E final + backlog P0 **só após D**.

---

## 1. Vereditos

| Questão | Resultado | Canônico |
|---|---|---|
| Colaborador aceita booking online? | **FAIL** | CAM-001 (E-01..E-05); CAM-002 (E-06) |
| Colaborador vê/opera fila? | **PASS** | CAM-003 (E-11: call/serve/checkout) |
| Recepcionista ≠ barbeiro ACL? | **Não** | CAM-004 (E-07, E-D15 C3≡C1) |
| Staff conclui na Agenda? | **FAIL** (toast dono) | CAM-020; fila checkout OK |
| Add manual fila staff | UI mostra; SPEC F4 não | CAM-021 |
| Copy sucesso book | “CONFIRMADO” vs `pending` | CAM-013 |
| INSERT público | sem lock / sem revalidar slot | CAM-014 |
| Cancel Minha Área | UPDATE direto, falha silenciosa | CAM-016 |

---

## 2. Três jornadas (D ainda vazio)

| Quem | Matriz | Ligação |
|---|---|---|
| Owner | C D1–D30 | Aceita pending; QR fila |
| C1 ‖ C2 ‖ C3 | **E-D1..30** | Q1 FAIL / Q2 PASS / negativos |
| Cliente | F-C-01..30 | INSERT pending |
| Recepção | **D TBD** | não duplicar E-D15 ACL |

---

## 3. Canônicos

CAM-001…019 = A+B+C+F.  
CAM-020 E-09 · CAM-021 E-10 · CAM-022 E-14.  
Tabela: [`MATRIX.md`](./MATRIX.md).

**Rascunho P0** (reordenar com D): CAM-001, CAM-013, CAM-014, CAM-016.

---

## 4. GO / NO-GO

**NO-GO** autenticado sem credenciais.  
GO parcial anônimo: book + CAM-013.  
Desenho fechado: ACL, mapa, dono, 3 staff, cliente. Falta **balcão (D)**.
