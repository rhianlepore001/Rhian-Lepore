# Loop 1 — Summary: Pesquisa de Mercado + Personas

> **Data**: 2026-07-05
> **Status**: ✅ Concluído (rodada 1 — pode ser refinado quando a auditoria achar gaps)
> **Próximo passo**: Loop 2 (auditoria com 5 agentes)

---

## O que foi feito

- **1 doc de benchmark** (`01-appbarber.md`) com 6.6/10 ReclameAqui, tabela de preços, features, tom de voz
- **1 doc comparativo** (`02-comparativo-mercado.md`) com 8 plataformas e matriz de features
- **1 doc de relatos reais** (`01-frases-literais.md`) com 23 citações literais (donos, clientes, reclamações)
- **3 personas** (`dono.md`, `colaborador.md`, `cliente.md`) com nome, perfil, jornada, o que odeia, o que ama
- **Este summary** com implicações cruzadas

---

## Top 10 insights (que vão virar regra de domínio ou sprint)

### 1. Lifecycle é o calcanhar de aquiles do mercado
AppBarber tem 3 reclamações de "não consigo excluir conta" (LGPD). Barbeiro tem "fechou a barbearia, sem estorno". Agendix tem a chance de ser **o melhor nisso** — e virar diferencial competitivo.

### 2. Dono não tem tempo, cliente não tem paciência
Ambos odeiam software complicado. Onboarding < 5min (dono) e agendamento < 3 toques (cliente) são inegociáveis.

### 3. Tema do produto reflete o nicho
"Mais um dashboard genérico de SaaS" é o pior que pode acontecer. Tema barber (dark industrial) e tema beauty (light elegante) **precisam aparecer** — caso contrário, é commodity.

### 4. Fechamento de mês é o ponto de dor #1
*"Primeiro: se todo fechamento de mês vira conferência, ajuste e barbeiro reclamando de valor, é sinal que o teu sistema não está te ajudando."* — frase literal. Comissão automática, fechamento de caixa, repasse — se Agendix brilha aqui, o dono evangeliza.

### 5. Retenção > aquisição
74% prefere agendar pelo celular (já é o canal). NPS, "book again", histórico, mensagens de retorno são features que vendem sozinhas. Agendix precisa ter.

### 6. LGPD não é cosmético
Exclusão de conta em 1 clique, exportação de dados antes do delete, política de privacidade clara. P0 absoluto.

### 7. Tom de voz "parceiro que entende", não "coach"
"Schedule" / "Book now" / "Sign in" = lixo. "Potencialize" / "transforme" = lixo. "Confirma pra gente? Sábado 14h, corte + barba" = bom. Tom é posicionamento.

### 8. Staff vê só o que é dele
Diferença crucial colaborador vs dono: comissão, faturamento, agenda de outro. Vazamento = P0. Regra B6 do `regras-dominio.md` é pra confirmar.

### 9. Dono não recebe comissão
Regra A4 do `regras-dominio.md` é pra confirmar. AppBarber faz por profissional, pode estar calculando pro dono. Auditar `get_commissions_due`.

### 10. Quem se cadastra = sempre dono
Regra A1 do `regras-dominio.md` é pra confirmar. Sistema não pode perguntar "você é o dono?" — o sistema assume.

---

## Implicações pra cada agente da auditoria

| Agente | O que checar primeiro (alta confiança) |
|---|---|
| **01 (UI visual)** | Tema barber/beauty aparece? Tem "cara de SaaS genérico"? Mobile 375px? |
| **02 (copy)** | Tem "Schedule" / "Book now" / "Sign in" em inglês? Tem "potencialize" / "transforme"? Tom por persona? |
| **03 (fluxo)** | Onboarding do dono < 5min até 1º agendamento? Link público do cliente em 3 toques até confirmar? |
| **04 (design system)** | Tema dual é consistente cross-tema? Hardcoded em vez de token? Tema do produto aparece? |
| **06 (domínio)** | A1 (registro = dono), A4 (dono sem comissão), A5 (dono = "Você" na agenda), B6 (staff só vê o que é dele), D4 (no_show da fila), LGPD (excluir conta) |

---

## Gaps de conhecimento (próximas rodadas de pesquisa)

- [ ] **Anolla (PT)**: o único concorrente séria em Portugal. Falta entender o mercado PT-PT, formato de pagamento (MBWAY, Multibanco), costumes.
- [ ] **Trinks Profissional** (app do staff, não do dono): screenshots e jornada. Não rolou ainda.
- [ ] **Booksy Boost / Booksy Pay**: features premium. Saber o que eles cobram extra.
- [ ] **Salonized (PT/global)**: se Rhian tem clientes em PT, vale benchmark.
- [ ] **Reddit r/Barbeiros / fóruns de barbearia BR**: relatos longos com dor real. Frases que não vêm do Instagram.
- [ ] **YouTube "Seu Elias" e canais similares**: canal de dono pra dono. Mais profundo que Instagram.

Esses gaps podem ser fechados em rodada 2 da pesquisa **depois** da primeira rodada de auditoria — quando soubermos o que vale aprofundar.

---

## O que tá pronto agora

```
agendix-e2e-test/
├── 00-planejamento/LOOP-MANIFESTO.md
├── 01-pesquisa-mercado/
│   ├── concorrentes/
│   │   ├── 01-appbarber.md          ← benchmark nº 1
│   │   └── 02-comparativo-mercado.md
│   ├── relatos-reais/
│   │   └── 01-frases-literais.md
│   ├── prompts/                     ← 5 briefings prontos
│   └── (este arquivo) SUMMARY.md
├── 02-personas/
│   ├── regras-dominio.md
│   ├── dono.md
│   ├── colaborador.md
│   └── cliente.md
├── 03-testes/                       ← vazio, aguardando agentes
├── 04-bugs-e-achados/               ← vazio
├── 05-sprints/                      ← vazio
└── 06-template-setup/               ← seed.mjs pronto, ambiente populado
```

---

## Sinal verde pra próxima fase?

Loop 1 (pesquisa + personas) está pronto. Loop 2 (auditoria com 5 agentes) pode começar.

Você (Rhian) tem 2 opções:

1. **Eu mesmo rodo o primeiro agente** (agente 03 — fluxo, que é o mais rápido de auditar)
2. **Você cola o briefing do agente 01 (UI visual) no Claude Code** e a gente roda o loop em paralelo
3. **Você quer revisar o material** antes de ir pra auditoria

Qual te atrai mais?
