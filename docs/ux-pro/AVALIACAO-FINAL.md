# Avaliação final — AgendiX

**Rodada: 2**  
**Julgador:** diretor de design convidado (leitura cega)  
**Viewport de referência:** 390×844 · evidência visual: barber × dark/light · personas owner/staff/anon  
**Âncora quantitativa:** `docs/ux-pro/forensics-after/` (resumo.json, forensics via RESUMO.md)  
**Benchmark:** rigor Linear/Stripe/Vercel + eficiência Fresha/Booksy (paleta/personalidade fora do julgamento)

---

## 1. Placar

### 1.1 Por superfície × pilar (0–10)

| Superfície | Hierarquia tipográfica (20) | Espaçamento e ritmo (20) | Consistência de componentes (20) | Densidade e clareza de ação (15) | Acessibilidade e ergonomia (15) | Microcopy e feedback (10) | **Média ponderada** |
|---|---:|---:|---:|---:|---:|---:|---:|
| Auth (gateway + login) | 8,0 | 7,5 | 7,5 | 8,5 | 7,0 | 8,0 | **7,7** |
| Produtos | 8,0 | 7,0 | 6,5 | 7,5 | 6,0 | 7,0 | **7,0** |
| Clientes (+ detalhe) | 7,5 | 7,5 | 6,0 | 7,5 | 4,0 | 7,0 | **6,6** |
| Agenda | 7,5 | 7,0 | 6,5 | 5,5 | 5,5 | 7,0 | **6,6** |
| Fila | 7,0 | 6,5 | 6,0 | 6,5 | 5,5 | 6,5 | **6,4** |
| Financeiro | 6,5 | 6,5 | 6,5 | 6,0 | 5,5 | 6,5 | **6,3** |
| Dashboard | 6,5 | 6,5 | 6,0 | 6,5 | 5,5 | 5,5 | **6,2** |
| Ajustes | 7,0 | 5,0 | 6,0 | 7,0 | 4,5 | 7,5 | **6,1** |
| Insights | 5,5 | 5,5 | 5,5 | 6,5 | 5,0 | 6,5 | **5,7** |

### 1.2 Média por pilar (superfícies com peso igual)

| Pilar | Peso | Nota | Âncora numérica (estado atual) |
|---|---:|---:|---|
| Hierarquia e tipografia | 20% | **7,1** | 13 tamanhos de fonte no produto; 5 famílias (ui-sans, JetBrains Mono, Chivo, monospace, Inter); 23 line-heights; Insights/Dashboard com **9/8** tamanhos (alvo ≤7) |
| Espaçamento e ritmo | 20% | **6,6** | **42** valores de espaçamento; fora da escala 4px: `10px`×1704, `6px`×960, `2px`×376; cfg-geral: **20** espaçamentos / **8** fora da escala |
| Consistência de componentes | 20% | **6,3** | **8** raios distintos; modal-agenda-novo **fora** do primitivo Modal; shell mobile com header truncado + cluster de 4 ícones + FAB em todas as rotas núcleo |
| Densidade e clareza de ação | 15% | **6,8** | Agenda: 3 entradas para “novo agendamento”; Financeiro: fila de ações secundárias antes do CTA; Produtos/Clientes melhores no nicho operacional |
| Acessibilidade e ergonomia | 15% | **5,4** | **242** violações AA (26 pares); light **2,6**/tela vs dark **0,5**; **79** tipos de alvo &lt;44px; Clientes **64** alvos pequenos; contraste até **1,18:1** (cliente-detalhe light) |
| Microcopy e feedback | 10% | **6,8** | Skeletons: **0/8** capturados; falha de rede em 4 rotas núcleo **sem** alerta/live region; Dashboard: “0%” + “Estável” + badge “Crítica” ao mesmo tempo |

### 1.3 Média ponderada geral

**6,5 / 10**

(cálculo: 7,1×0,20 + 6,6×0,20 + 6,3×0,20 + 6,8×0,15 + 5,4×0,15 + 6,8×0,10)

Nenhum pilar ≥ 7,5. Acessibilidade está claramente abaixo da linha de produto usável no celular.

---

## 2. Parece desenhado ou SaaS funcional de desenvolvedor?

**Veredito de leitura:** SaaS funcional de desenvolvedor, com **ilhas** de intenção visual (auth, lista de clientes, card de produto). O produto tem personalidade de tema — isso não é o problema. O problema é a ausência de um sistema aplicado com rigor: tipografia, alvos, contraste light e hierarquia de ação não fecham.

### Três momentos exatos

1. **Header mobile em qualquer rota núcleo (390)** — o nome vira “BARBEARIA BO…” cortado enquanto o canto direito empilha lua + sino + ajuda + avatar. Em 390px isso não é chrome de produto desenhado; é chrome de desktop comprimido. Telemetria: nós do header transbordam até **31px**; ícones de ajuda/perfil medem **32×32**.

2. **Agenda 390 — três “Novo Agendamento” na mesma viewport** — botão ouro no topo, CTA no empty state, FAB “+” no tab bar. Em Fresha/Booksy a ação primária do dia é uma. Aqui a UI não decide. Telemetria: alvos de dia ~**27×64** (largura insuficiente); **24** violações de contraste na rota.

3. **Dashboard — métrica que se contradiz** — “0%”, rótulo “Estável” e pill “Crítica” no mesmo card. Isso não é densidade operacional; é composição de widgets sem regra editorial. Telemetria da rota: **8** fontes, **32** violações de contraste, **17** alvos &lt;44px.

---

## 3. Tela mais fraca e mais forte

| | Superfície | Por quê |
|---|---|---|
| **Mais fraca** | **Insights** (390 owner) | **9** tamanhos de fonte; **16** espaçamentos / **4** fora da escala; **8** raios; **20–24** contrastes; overflow interno de cards até **86px**; ranking cortado pelo FAB. Parece dashboard de métricas empilhadas, não ferramenta de gestor entre atendimentos. |
| **Mais forte** | **Auth — login-gateway** (e login-form barber) | **5** fontes, **0** violações AA medidas, alvos grandes, hierarquia clara, brand presente. É a única superfície que passa no teste “isto foi composto de propósito”. Produtos chega perto no núcleo (5 fontes, card operacional legível), mas o shell e o light mode puxam para baixo. |

---

## 4. Veredicto

### **REPROVAR**

Critério de aprovação plena: média ≥ 8,5 **e** nenhum pilar &lt; 7,5.  
Estado: média **6,5**; **todos** os pilares &lt; 7,5; acessibilidade em **5,4**.

Não há base para “aprovar com ressalvas”: o light mode sozinho (200 violações AA, média 2,6/tela) e os alvos de toque (Clientes com 64) tornam o produto hostil ao usuário real declarado — barbeiro no celular, sem paciência.

### Cinco itens que mais custam qualidade

1. **Contraste no barber-light** — 200 violações vs 42 no dark; pares até 1,18:1 e 2,34:1 em texto de UI. Light não é um segundo tema; é um tema quebrado.
2. **Alvos de toque abaixo de 44×44** — 79 tipos; epidemia em Clientes (64), cfg-geral (32), chrome global (32×32), chips de dia na Agenda (~27px).
3. **Vocabulário tipográfico sem teto** — 13 tamanhos, 5 famílias, 23 line-heights; Insights/Dashboard estouram o teto de 7.
4. **Espaçamento fora de grade** — 42 valores; `10/6/2px` sistêmicos; cfg-geral com frações (`33.14px`) e 8 fora da escala 4px.
5. **Estados e feedback ausentes ou mentirosos** — zero skeletons capturados; falha de rede silenciosa em dashboard/clientes/financeiro/agenda; empty/crítico semanticamente incoerente; modal de agenda fora do primitivo Modal.

---

## 5. Se pudesse mudar só três coisas

1. **Fechar o sistema** — no máximo 7 tamanhos, 2 famílias (display + mono para dado), escala 4px, ≤4 raios. Aplicar em shell + núcleo primeiro. Sem isso, cada tela continua “quase”.
2. **Tornar o light utilizável e o polegar primeiro** — corrigir os pares AA do light (prioridade absoluta) e elevar chrome, chips, ícones de lista e controles de mês/dia para ≥44×44. O usuário é 390px.
3. **Uma ação primária por tela + estados honestos** — matar CTAs duplicados (Agenda); skeleton real; erro de rede visível (não mimetizar vazio); regras para badges de severidade (Crítica não convive com Estável em 0%).

---

## Retorno ao orquestrador

| Campo | Valor |
|---|---|
| **Média ponderada** | **6,5** |
| **Veredicto** | **REPROVAR** |
| **3 momentos** | (1) Header 390 trunca marca e empilha 4 ícones &lt;44px · (2) Agenda com 3 CTAs de novo agendamento · (3) Dashboard 0% + Estável + Crítica no mesmo card |
