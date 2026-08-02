# Avaliação final — AgendiX (diretor de design convidado)

**Data:** 2026-08-02  
**Insumos:** `docs/ux-pro/AFTER/` (barber dark/light × viewports × personas) + `docs/ux-pro/forensics-after/RESUMO.md`  
**Viewport de referência:** 390×844  
**Benchmark:** rigor estrutural Linear/Stripe/Vercel + eficiência de nicho Fresha/Booksy/Trinks  
**Escopo julgado:** tema **barber** apenas. Beauty e rotas públicas com slug **não** estão na matriz AFTER/forense — lacuna declarada abaixo; nada foi inventado sobre esses eixos.

---

## Lacunas de julgamento (obrigatório)

| Lacuna | Evidência | Impacto no veredicto |
|---|---|---|
| Tema **beauty** ausente | AFTER só tem `barber-dark` / `barber-light`; forense: `login-form-beauty` não achou `[data-testid="category-beauty"]` | Não avalio beauty. Nota geral = barber. |
| Rotas públicas com slug | `book`, `queue-join`, `minha-area`, `portfolio` fora da auditoria (`profiles.business_slug` vazio) | Experiência do cliente final não julgada. |
| Staff × ajustes | Staff em `cfg-*`, `insights`, `clube-assinantes` redireciona para `#/` (forense §2) — screenshots “staff” dessas rotas medem o destino, não a rota | Não penalizo “ajustes staff”; penalizo ambiguidade de matriz. |
| `clube-publico` | Forense: 1 tamanho de fonte, 3 espaçamentos — amostra anêmica | Fora do placar ponderado de superfícies. |
| DELTA | Contraste −356 e alvos <44 −766 vs. passado | **Não** usado como aprovação. Só contexto: o produto ainda falha AA e ergonomia no estado atual. |

---

## 1. Placar por pilar e por superfície

Escala 0–10. Âncoras = números do RESUMO after. Média ponderada da superfície = Σ(nota × peso).

**Pesos:** Hierarquia 20 · Espaçamento 20 · Consistência 20 · Densidade 15 · A11y/ergonomia 15 · Microcopy/feedback 10.

### 1.1 Notas por pilar (produto, agregado barber)

| Pilar | Nota | Âncora telemetria |
|---|---:|---|
| 1. Hierarquia e tipografia | **6,2** | 13 tamanhos no produto; por tela: `insights`/`meus-insights` **9**, `dashboard`/`financeiro`/`cfg-assinatura` **8** (alvo ≤7). Famílias **5** (Chivo + JetBrains Mono + Inter + ui-sans-serif + monospace). Pesos **5** (400–900) — semântica parcial, escala inchada. |
| 2. Espaçamento e ritmo | **5,8** | **42** valores distintos; fora da escala 4px: `10px`×1704, `6px`×960, `2px`×376, `14px`×208. `cfg-geral`: **8** fora de escala, **20** valores de espaçamento. **61** quase-alinhamentos 1–3px. |
| 3. Consistência de componentes | **6,2** | Raios **8** (incl. artefato pill `≈3.35e7px`×1776). Sombras “efetivas” quase nulas (maioria token zero). Borders 1/2/4px ok; alturas de alvo não unificadas (ver a11y). |
| 4. Densidade e clareza de ação | **6,8** | Em 390px, Agenda/Clientes/Produtos respondem a pergunta da tela acima da dobra. Insights enterra ação sob grid de KPIs; Financeiro trunca aba (`HISTÓRI…`); header trunca marca (`BARBEARIA BO`) em várias telas. Overflow documento = 0; nós transbordam (header até **31px**, insights até **86px**). |
| 5. Acessibilidade e ergonomia | **4,8** | **242** violações AA (26 pares); light **2,6**/tela vs dark **0,5**. Alvos <44: soma **1728**; `clientes` **64** tipos/contagem agregada com ícones **24×24**×212. Ajuda **32×32**×76. Overflow documento 0, mas nós com excesso em login (**110px**), insights (**70–86px**), header. |
| 6. Microcopy e feedback | **4,5** | Erros de form existem e são curtos/acionáveis (`Informe o nome`, etc.). Empty de agenda tem CTA. **Skeleton: 0/8** capturas — estado esperado não apareceu. Falha de rede (8 runs): **0** alerta, **0** live region. `modal-agenda-novo` fora do primitivo Modal (2 runs). |

**Média ponderada geral (produto):**  
`6,2×0,20 + 5,8×0,20 + 6,2×0,20 + 6,8×0,15 + 4,8×0,15 + 4,5×0,10` = **5,83 / 10**

### 1.2 Placar por superfície (390px, owner barber; light/dark considerados)

| Superfície | H | E | C | D | A | M | Ponderada | Âncoras-chave |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Auth — login-gateway | 8,0 | 7,5 | 7,5 | 8,5 | 7,0 | 7,0 | **7,68** | 5 fontes, 0 AA, 0 alvos<44; nó overflow 19px |
| Auth — forms (login/register/forgot) | 7,0 | 6,5 | 6,5 | 7,5 | 5,5 | 6,0 | **6,53** | register AA×6; alvos<44; overflow root até 110px |
| Dashboard | 6,0 | 6,0 | 6,5 | 6,5 | 4,5 | 4,0 | **5,70** | 8 fontes; AA **32**; alvos<44 **17**; badge “Crítica” com 0% |
| Agenda | 7,5 | 7,0 | 7,0 | 8,5 | 5,5 | 7,5 | **7,13** | 6 fontes; AA **24** (quase só light); dias **~27×64**; empty com CTA |
| Clientes | 7,5 | 7,0 | 7,0 | 8,0 | 3,5 | 6,0 | **6,60** | 6 fontes; AA **6**; alvos<44 **64** (24×24×212) |
| Cliente detalhe | 6,5 | 6,5 | 6,5 | 7,0 | 4,5 | 5,5 | **6,18** | AA **13** (VIP 1,18:1 light); editar nome **16×16**; overflow card 16px |
| Financeiro | 6,0 | 6,5 | 6,5 | 6,5 | 4,5 | 5,0 | **5,93** | 8 fontes; AA **9**; alvos<44 **21**; abas truncadas |
| Fila | 6,5 | 6,0 | 6,5 | 6,0 | 5,0 | 5,5 | **6,00** | 7 fontes; AA **14**; alvos **14**; empty copy cortada |
| Insights / meus-insights | 5,0 | 5,5 | 6,0 | 5,0 | 4,5 | 5,0 | **5,20** | **9** fontes; AA **20–24**; alvos **21**; nós overflow **70–86px** |
| Produtos | 7,5 | 7,0 | 7,5 | 8,0 | 5,5 | 6,5 | **7,10** | **5** fontes; AA **6**; alvos **14**; CTA “Vender” claro |
| Ajustes (cfg-*) | 7,0 | 5,0 | 6,5 | 7,0 | 4,5 | 6,0 | **6,03** | cfg-geral: espaç. **8** off-scale, AA **24**, alvos **32**; sticky Salvar ok |
| Clube assinantes | 6,5 | 6,5 | 6,5 | 6,5 | 5,0 | 5,5 | **6,18** | 7 fontes; AA **14**; alvos **16** |

Média simples das superfícies da tabela (excluindo clube-publico): **≈ 6,35**.  
A média **oficial do veredicto** é a ponderada de pilares: **5,83**.

---

## 2. Parece DESENHADO ou SaaS funcional de dev?

**Veredito de impressão:** SaaS funcional com **ilhas** desenhadas — não um sistema premium coerente. A personalidade barber (ouro/preto, Chivo, brutalismo suave) existe; o rigor de aplicação não.

### Três momentos exatos

1. **DESENHADO — `login-gateway` 390**  
   Brand, uma pergunta (“escolha o negócio”), duas entradas visuais, um CTA de conta. Hierarquia e orçamento de viewport no nível do benchmark. Telemetria: 5 fontes, 0 AA, 0 alvos <44.

2. **DESENHADO (operacional) — `agenda` 390 empty**  
   Título → + Novo → seletor de dia → empty com ícone + “Nenhum agendamento neste dia.” + CTA. Isso é Fresha/Trinks: a pergunta da tela está respondida em um polegar. 6 fontes (dentro do alvo).

3. **SaaS de dev — header + Insights 390**  
   “BARBEARIA BO” truncado sob cluster de 4 ícones (lua/sino/ajuda/avatar a 32×32) enquanto Insights empilha seletor + Exportar + grid 2×2 de KPIs e só então rankings — com **9** tamanhos de fonte e nós transbordando até **86px**. Isso não é densidade profissional; é acúmulo de widgets sem direção de arte.

Honorable mention (dev): light mode — **200** violações AA vs **42** no dark; cinza `#6E6B64` sobre `#E5E5E5` a **4,22:1** espalhado em dezenas de rotas. A personalidade sobrevive; a aplicação AA não.

---

## 3. Tela mais fraca e mais forte

| | Superfície | Por quê |
|---|---|---|
| **Mais forte** | **Agenda (390, barber)** | Melhor equilíbrio pergunta/ação/empty. Tipografia sob controle (6). Empty acionável. É a tela que o barbeiro abre entre cortes — e ela se comporta como produto de nicho. |
| **Mais fraca** | **Insights (390, barber)** | Pior tipografia da matriz (9). Overflow real de nós (70–86px). Contraste AA 20–24. Densidade de “dashboard de métricas” sem ponto focal; Exportar e rankings competem com Snapshot. Staff nem vê a rota (redirect). |

Runner-up fraca: **Clientes** — layout limpo na foto, mas ergonomia catastrófica (**64** alvos <44; ícones 24×24×212). Visual “ok”, uso com polegar sujo de pomada: não.

---

## 4. Veredicto

### **REPROVAR**

Critérios: APROVAR exige média ≥ 8,5 e nenhum pilar < 7,5.  
Aqui: média **5,83**; **cinco** pilares abaixo de 7,5; a11y e microcopy abaixo de 5.

Não é “feio”. É **insuficientemente rigoroso** para o padrão que o próprio produto sugere na porta (login-gateway) e que o nicho exige no bolso.

### Cinco itens que mais custam qualidade

1. **Contraste AA no light (e resquícios no dark)** — 242 violações; light 2,6/tela. Texto secundário e badges (“Recomendado” 1,91:1; VIP note 1,18:1) quebram confiança em qualquer auditoria Stripe-level.

2. **Alvos de toque <44px sistêmicos** — 1728 ocorrências; header 32×32; Clientes 24×24 em massa; chips Semana/Mês 24px de altura. Barbeiro real = falha de produto, não nitpick.

3. **Escala tipográfica e de espaçamento sem teto** — 13 fontes / 42 spacings; 10px e 6px como “padrão paralelo”; Insights a 9 tamanhos. Premium SaaS corta vocabulário; aqui o vocabulário cresceu.

4. **Estados de sistema ausentes** — skeleton 0/8; falha de rede silenciosa em dashboard/clientes/financeiro/agenda. Spinner≠skeleton e “vazio”≠“caiu a rede” — o produto mente por omissão.

5. **Chrome truncado + overflow de nós** — marca cortada (`BARBEARIA BO`), abas cortadas, header 31px, Insights 86px, login 110px. Overflow do documento zerado mascara o problema: a UI ainda escorre.

---

## 5. Se pudesse mudar só TRÊS coisas

1. **Contrato de a11y do tema light + alvos ≥44 no chrome e listas**  
   Por quê: é o gap mais visível na mão (light) e o mais caro na telemetria (242 AA + 1728 alvos). Uma passada sistêmica em tokens de texto secundário e hit-slop do header/listas muda a percepção de “produto sério” mais rápido que qualquer redesign de card.

2. **Congelar escala: ≤7 fontes/tela, spacing só múltiplos de 4, ≤4 raios**  
   Por quê: Insights/Dashboard/Financeiro parecem “montados”; Agenda/Produtos parecem “desenhados”. O delta entre eles é disciplina de tokens, não criatividade. Matar 10/6/2px e o pill artifact alinha o produto ao rigor Linear sem matar a personalidade ouro/preto.

3. **Estados honestos: skeleton real + erro de rede com retry + empty sempre com uma ação**  
   Por quê: barbeiro não distingue “zero clientes” de “Wi-Fi caiu”. Hoje a forense prova que a UI não distingue tampouco. Corrigir isso eleva confiança operacional sem tocar em branding — e fecha o pilar mais frágil (4,5).

---

## Nota de método

- Julgamento independente: sem PLANO, critique, validation, DESEMPATES, ANTES-DEPOIS ou commits.  
- DELTA consultado só para ordem de grandeza; aprovação/reprovação ancorada no **estado after**.  
- Personalidade barber (ouro, dark brutal, mono em números) **não** foi penalizada; penalizei inconsistência de aplicação e falhas mensuráveis.  
- Beauty e booking público: **não julgados** — qualquer claim de “produto completo multi-vertical” ficaria especulativo.

**— Diretor de design convidado**
