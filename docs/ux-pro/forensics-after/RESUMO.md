# RESUMO FORENSE — telemetria de estilo do AgendiX

**Gerado em:** 2026-08-02T13:08:22.263Z
**Execuções:** 164 · **rotas auditadas:** 25 · **não auditadas:** 10
**Temas × modos efetivamente observados:** null-dark, barber-dark, barber-light

Fonte: `scripts/ui-forensics.mjs` (matriz de rotas) e `scripts/ui-states.mjs` (estados transversais). Tudo medido com `getComputedStyle` no Chromium real.

## 1. Cobertura — o que NÃO foi auditado, e por quê

Regra do §15: tela vazia auditada como cheia é auditoria mentindo. Estes itens ficam de fora, declarados:

| Escopo | Motivo |
|---|---|
| anon / barber / login-form-beauty | elemento [data-testid="category-beauty"] nao encontrado |
| anon / barber / book, anon / barber / queue-join, anon / barber / minha-area, anon / barber / portfolio | rota publica depende de profiles.business_slug, que esta vazio |

**Controle de tema (sondado, não presumido):**

| Persona | Tema controlável de fora? | Tema efetivo |
|---|---|---|
| owner | não | barber |
| staff | não | barber |

## 2. Redirecionamentos — a rota pedida não é a tela medida

Quando a persona não tem acesso, o número medido pertence à tela de destino, não à rota pedida. Sem isto, staff parece ter 10 telas idênticas.

| Persona | Rota pedida | Hash final | Execuções |
|---|---|---|---|
| owner | `meus-insights` | `#/insights` | 4 |
| staff | `cfg-agendamento` | `#/` | 4 |
| staff | `cfg-assinatura` | `#/` | 4 |
| staff | `cfg-clube-pix` | `#/` | 4 |
| staff | `cfg-clube` | `#/` | 4 |
| staff | `cfg-comissoes` | `#/` | 4 |
| staff | `cfg-equipe` | `#/` | 4 |
| staff | `cfg-geral` | `#/` | 4 |
| staff | `cfg-seguranca` | `#/` | 4 |
| staff | `cfg-servicos` | `#/` | 4 |
| staff | `clube-assinantes` | `#/` | 4 |
| staff | `insights` | `#/` | 4 |

## 3. Placar por rota

Alvo do §12: **≤ 7 tamanhos de fonte por tela**, espaçamento na escala de 4px, contraste AA (4,5:1 texto / 3:1 UI), alvo ≥ 44×44px, zero overflow em 390px.

| Rota | Grupo | Fontes | Espaç. | Fora 4px | Raios | Sombras | Contraste AA (soma) | Alvos <44px | Quase-alinh. 1–3px | Overflow 390 |
|---|---|---|---|---|---|---|---|---|---|---|
| `insights` | nucleo | **9** | 16 | **4** | **8** | 1 | **20** | **21** | 2 | não |
| `meus-insights` | nucleo | **9** | 16 | **4** | **8** | 1 | **24** | **21** | 2 | não |
| `dashboard` | nucleo | **8** | 13 | **4** | **8** | 2 | **32** | **17** | 1 | não |
| `financeiro` | nucleo | **8** | 14 | **4** | **7** | 1 | **9** | **21** | 0 | não |
| `cfg-assinatura` | ajustes | **8** | 17 | **3** | **7** | 2 | **8** | **9** | 1 | não |
| `fila` | nucleo | 7 | 14 | **4** | **7** | 1 | **14** | **14** | 3 | não |
| `clube-assinantes` | ajustes | 7 | 15 | **3** | **8** | 1 | **14** | **16** | 1 | não |
| `agenda` | nucleo | 6 | 13 | **3** | **7** | 1 | **24** | **11** | 1 | não |
| `clientes` | nucleo | 6 | 12 | **2** | **8** | 1 | **6** | **64** | 0 | não |
| `cliente-detalhe` | nucleo | 6 | 11 | **3** | **8** | 1 | **13** | **21** | 1 | não |
| `cfg-geral` | ajustes | 6 | 20 | **8** | **7** | 1 | **24** | **32** | 3 | não |
| `cfg-agendamento` | ajustes | 6 | 15 | **4** | **7** | 1 | **10** | **10** | 1 | não |
| `cfg-equipe` | ajustes | 6 | 16 | **3** | **7** | 2 | **6** | **9** | 0 | não |
| `cfg-servicos` | ajustes | 6 | 16 | **3** | **7** | 1 | **2** | **9** | 1 | não |
| `cfg-comissoes` | ajustes | 6 | 16 | **4** | **7** | 1 | **18** | **9** | 1 | não |
| `cfg-clube` | ajustes | 6 | 15 | **3** | **7** | 1 | **2** | **9** | 1 | não |
| `cfg-clube-pix` | ajustes | 6 | 14 | **3** | **7** | 1 | **2** | **12** | 1 | não |
| `cfg-seguranca` | ajustes | 6 | 14 | **2** | **7** | 1 | **2** | **9** | 1 | não |
| `login-gateway` | auth | 5 | 10 | **2** | 3 | 0 | 0 | 0 | 0 | não |
| `login-form-barber` | auth | 5 | 10 | **2** | **4** | 1 | 0 | **2** | 0 | não |
| `produtos` | nucleo | 5 | 14 | **3** | **8** | 1 | **6** | **14** | 1 | não |
| `register` | auth | 4 | 11 | **3** | **4** | 1 | **6** | **8** | 1 | não |
| `forgot-password` | auth | 4 | 6 | **1** | 2 | 1 | 0 | **1** | 0 | não |
| `termos` | auth | 4 | 7 | 0 | 0 | 0 | 0 | **1** | 0 | não |
| `clube-publico` | publicas | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | não |

## 4. Inventário global do produto

Agregado de todas as execuções. É aqui que se vê se o problema é local (uma tela) ou sistêmico (o vocabulário visual inteiro).

| Dimensão | Valores distintos no produto | Os mais usados (valor × ocorrências) |
|---|---|---|
| Tamanho de fonte | **13** | `12px` ×3106 · `14px` ×2198 · `18px` ×710 · `11px` ×400 · `16px` ×302 · `24px` ×248 · `20px` ×240 · `30px` ×212 · `36px` ×43 · `48px` ×12 · `19px` ×3 · `60px` ×2 |
| Peso de fonte | **5** | `500` ×4562 · `700` ×2034 · `600` ×524 · `400` ×205 · `900` ×152 |
| Altura de linha | **23** | `16px` ×2881 · `20px` ×2090 · `28px` ×844 · `24px` ×412 · `16.5px` ×400 · `36px` ×211 · `32px` ×130 · `18px` ×82 |
| Família | **5** | `ui-sans-serif` ×3310 · `JetBrains Mono` ×2232 · `Chivo` ×1393 · `monospace` ×312 · `Inter` ×230 |
| Espaçamento (padding/margin/gap) | **42** | `8px` ×8050 · `12px` ×6937 · `4px` ×6866 · `16px` ×6813 · `20px` ×2740 · `10px` ×1704 · `24px` ×1464 · `6px` ×960 · `32px` ×657 · `2px` ×376 · `14px` ×208 · `-1px` ×208 |
| Border-radius | **8** | `8px` ×1970 · `3.35544e+07px` ×1776 · `12px` ×984 · `4px` ×360 · `16px` ×272 · `6px` ×236 · `24px` ×62 · `28px` ×58 |
| Border-width | **3** | `1px` ×12144 · `2px` ×3464 · `4px` ×8 |
| Box-shadow | **7** | ver §4.1 |

### 4.1 Sombras em uso

| Ocorrências | Valor computado |
|---|---|
| 522 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(240, 235, 224)` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(201, 162, 74,` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(201, 162, 74) ` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(26, 22, 16) 0p` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(139, 105, 20,` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(107, 80, 16) 0` |

### 4.2 Espaçamentos fora da escala de 4px

| Valor | Ocorrências | Rotas onde aparece |
|---|---|---|
| `10px` | 1704 | login-gateway, login-form-barber, register, dashboard, agenda, fila +16 |
| `6px` | 960 | login-form-barber, register, dashboard, agenda, fila, cliente-detalhe +13 |
| `2px` | 376 | register, dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| `14px` | 208 | login-gateway, fila, financeiro, insights, meus-insights |
| `-1px` | 208 | cfg-geral, cfg-agendamento, cfg-comissoes |
| `137px` | 48 | dashboard, insights, cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos +6 |
| `530px` | 48 | dashboard, insights, cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos +6 |
| `126px` | 12 | clube-assinantes, meus-insights |
| `225px` | 8 | meus-insights |
| `30px` | 4 | cfg-geral |
| `33.1562px` | 4 | cfg-geral |
| `33.1406px` | 4 | cfg-geral |
| `106px` | 4 | cfg-clube |
| `369px` | 4 | cfg-geral |
| `439px` | 4 | cfg-clube |
| `507px` | 4 | clube-assinantes |
| `111px` | 2 | forgot-password |
| `771.578px` | 2 | dashboard |
| `37.1562px` | 2 | cfg-geral |
| `37.1406px` | 2 | cfg-geral |

## 5. Contraste — violações WCAG AA medidas

**26 defeitos distintos de contraste** (par cor/fundo/tamanho), somando 242 ocorrências.

| Razão medida | Exigido | Cor do texto | Fundo efetivo | Tamanho/peso | Ocorr. | Modos | Rotas | Exemplo de texto |
|---|---|---|---|---|---|---|---|---|
| **1.18:1** | 4.5:1 | `rgb(234, 234, 234)` | `rgb(216, 216, 216)` | 14px/500 | 2 | barber-light | cliente-detalhe | Cliente VIP - prefere horário  |
| **1.91:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(201, 162, 74)` | 12px/900 | 2 | barber-light | cfg-assinatura | Recomendado |
| **2.34:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(242, 242, 242)` | 12px/700 | 4 | barber-light | cfg-geral | Ajuda |
| **2.61:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(255, 255, 255)` | 12px/500 | 3 | barber-light | cliente-detalhe | Membro desde 2021 / aline.lima@example.com |
| **2.61:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(255, 255, 255)` | 14px/500 | 2 | barber-light | cliente-detalhe | aline.lima@example.com / +55 619923489031 |
| **3.6:1** | 4.5:1 | `rgb(201, 162, 74)` | `rgb(89, 74, 41)` | 12px/700 | 2 | barber-dark | dashboard | Próximo |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 12px/700 | 12 | barber-light | dashboard, insights, meus-insights | Semana / Mês |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 14px/500 | 2 | barber-light | cfg-agendamento | http://localhost:4173/#/book/ |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 12px/500 | 2 | barber-light | cfg-agendamento | Dica: Use o nome da sua barbea |
| **3.87:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(220, 220, 220)` | 14px/500 | 8 | barber-light | cfg-comissoes | Configure a taxa de comissão ( / Quando você marca um agendamen |
| **3.87:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(220, 220, 220)` | 12px/700 | 8 | barber-light | clube-assinantes | Ativos / Pendentes |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 14px/400 | 2 | barber-dark | register | Studio |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 12px/400 | 2 | barber-dark | register | Beauty salon |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 12px/600 | 2 | barber-dark | register | Portugal · EUR |
| **4.22:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(229, 229, 229)` | 12px/700 | 16 | barber-light | agenda | Bob / Diego |
| **4.22:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(229, 229, 229)` | 12px/500 | 25 | barber-light | fila, financeiro, cfg-equipe, cfg-assinatura, meus-insights +1 | Compartilhe o QR Code ou adici / Chame o próximo da fila para c |
| **4.22:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(229, 229, 229)` | 14px/500 | 33 | barber-light | insights, meus-insights, dashboard, agenda, fila +14 | Rankings por receita no mês se / Sair |
| **4.22:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(229, 229, 229)` | 12px/600 | 49 | barber-light | dashboard, agenda, fila, clientes, cliente-detalhe +14 | Operação / Crescimento |
| **4.27:1** | 4.5:1 | `rgb(220, 38, 38)` | `rgb(252, 238, 238)` | 12px/700 | 6 | barber-light | dashboard, insights, meus-insights | Crítica / 6 críticos |
| **4.36:1** | 4.5:1 | `rgb(239, 68, 68)` | `rgb(43, 28, 26)` | 12px/700 | 6 | barber-dark | dashboard, insights, meus-insights | Crítica / 6 críticos |
| **4.36:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(25, 37, 31)` | 14px/500 | 10 | barber-dark | dashboard | Cadastrar serviços / Adicionar equipe |
| **4.46:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(235, 235, 235)` | 12px/500 | 26 | barber-light | cfg-geral, cfg-comissoes | Adicionar Pausa (Almoço) / Mensal • Dia 5 |
| **4.47:1** | 4.5:1 | `rgb(168, 154, 130)` | `rgb(61, 52, 32)` | 12px/500 | 2 | barber-dark | dashboard | Ative e envie o link para seus |
| **4.48:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(33, 32, 28)` | 12px/700 | 12 | barber-dark | dashboard, insights, meus-insights | Semana / Mês |
| **4.48:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(33, 32, 28)` | 14px/500 | 2 | barber-dark | cfg-agendamento | http://localhost:4173/#/book/ |
| **4.48:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(33, 32, 28)` | 12px/500 | 2 | barber-dark | cfg-agendamento | Dica: Use o nome da sua barbea |

**Violações por combinação tema × modo** (mostra se um modo é sistematicamente pior):

| Tema × modo | Execuções | Violações | Média por tela |
|---|---|---|---|
| barber-dark | 88 | 42 | 0.5 |
| barber-light | 76 | 200 | 2.6 |

## 6. Alvos de toque abaixo de 44×44px

No viewport de referência 390×844: **79 tipos distintos** de alvo pequeno.

| Rótulo | Caixa medida | Ocorr. | Nome acessível | Rotas |
|---|---|---|---|---|
| _(sem rótulo)_ | 24×24 | 212 | sim | clientes |
| Ajuda e reportar problema | 32×32 | 76 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| BobBarberB | 32×32 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| Bob FuncionarioBarberB | 32×32 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| _(sem rótulo)_ | 20×20 | 32 | sim | agenda, fila, clientes, cliente-detalhe, produtos +4 |
| _(sem rótulo)_ | 68×36 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Abrir menu de configurações | 40×40 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Fechar menu de configurações | 36×36 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Agenda | 91.4×26 | 12 | sim | insights, meus-insights |
| Adicionar Pausa (Almoço) | 298×32 | 12 | sim | cfg-geral |
| Repetir | 28×20 | 12 | sim | cfg-geral |
| _(sem rótulo)_ | 1×1 | 10 | **não** | cfg-agendamento |
| Repetir Estilo | 224×34 | 8 | sim | cliente-detalhe |
| Mês anterior | 36×36 | 8 | sim | financeiro, insights, meus-insights |
| Próximo mês | 36×36 | 8 | sim | financeiro, insights, meus-insights |
| Semana | 74.6×24 | 6 | sim | dashboard, insights, meus-insights |
| Mês | 46.4×24 | 6 | sim | dashboard, insights, meus-insights |
| seg27 | 27.1×64 | 4 | sim | agenda |
| ter28 | 27.2×64 | 4 | sim | agenda |
| qua29 | 27.1×64 | 4 | sim | agenda |
| qui30 | 27.1×64 | 4 | sim | agenda |
| sex31 | 27.1×64 | 4 | sim | agenda |
| sáb1 | 27.1×64 | 4 | sim | agenda |
| dom2 | 27.1×64 | 4 | sim | agenda |
| Abrir assistente IA | 24×44 | 4 | sim | financeiro |
| Exportar | 131.3×40 | 4 | sim | insights, meus-insights |
| + 3 horários vagos | 332×32 | 4 | sim | insights, meus-insights |
| Trimestre | 89.9×24 | 4 | sim | insights, meus-insights |
| Ajuda | 78×24 | 4 | sim | cfg-geral |
| Selecionar país | 53.9×42 | 3 | sim | register, cfg-geral |
| Hoje | 52.3×24 | 2 | sim | dashboard |
| _(sem rótulo)_ | 28×28 | 2 | sim | dashboard |
| Voltar para Clientes | 196×20 | 2 | sim | cliente-detalhe |
| Editar nome do cliente | 16×16 | 2 | sim | cliente-detalhe |
| Desativar cliente | 40×44 | 2 | sim | cliente-detalhe |

## 7. Alinhamento e overflow

**61** pares de coordenada X separados por 1 a 3px (assinatura de desalinhamento):

| Rota | Viewport | Persona | X₁ | X₂ | Δ | Blocos em X₁ | Blocos em X₂ |
|---|---|---|---|---|---|---|---|
| `register` | 390x844 | anon | 199 | 201 | 2px | 1 | 1 |
| `dashboard` | 390x844 | owner | 198 | 201 | 3px | 1 | 1 |
| `agenda` | 390x844 | owner | 198 | 199 | 1px | 1 | 1 |
| `fila` | 390x844 | owner | 198 | 200 | 2px | 1 | 1 |
| `fila` | 390x844 | owner | 198 | 201 | 3px | 1 | 1 |
| `fila` | 390x844 | owner | 200 | 201 | 1px | 1 | 1 |
| `cliente-detalhe` | 390x844 | owner | 29 | 30 | 1px | 2 | 1 |
| `insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `insights` | 390x844 | owner | 198 | 201 | 3px | 1 | 3 |
| `meus-insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `meus-insights` | 390x844 | owner | 198 | 201 | 3px | 1 | 3 |
| `cfg-geral` | 390x844 | owner | 33 | 34 | 1px | 3 | 1 |
| `cfg-geral` | 390x844 | owner | 114 | 116.5 | 2.5px | 7 | 1 |
| `cfg-geral` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-agendamento` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-servicos` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-comissoes` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-assinatura` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-clube` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-clube-pix` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-seguranca` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `clube-assinantes` | 390x844 | owner | 198 | 201 | 3px | 1 | 2 |
| `agenda` | 390x844 | staff | 198 | 199 | 1px | 1 | 1 |
| `fila` | 390x844 | staff | 198 | 201 | 3px | 1 | 1 |
| `agenda` | 1440x900 | owner | 496 | 498.8 | 2.8px | 1 | 1 |
| `cliente-detalhe` | 1440x900 | owner | 301 | 302 | 1px | 1 | 1 |
| `produtos` | 1440x900 | owner | 280 | 281 | 1px | 1 | 2 |
| `cfg-geral` | 1440x900 | owner | 309 | 310 | 1px | 2 | 1 |
| `cfg-geral` | 1440x900 | owner | 501.9 | 504.2 | 2.3px | 1 | 1 |
| `agenda` | 1440x900 | staff | 496 | 498.8 | 2.8px | 1 | 1 |

**Overflow horizontal do documento:** 0 execuções.

**Nós que transbordam em 390px** (sem `overflow-x` declarado):

| Seletor | Excesso máx. | Rotas |
|---|---|---|
| `div.min-h-screen.bg-[#0A0A0A].flex > div.w-full.max-w-3xl.grid > button.group.relative.h-72 > div.absolute.inset-0.overflow-hidden` | 19px | login-gateway |
| `div#root > div.min-h-screen.flex.items-center` | 110px | login-form-barber, register |
| `div#root > div.min-h-screen.flex.items-center > div.w-full.max-w-3xl.relative` | 10px | login-form-barber |
| `div#root > div.min-h-screen.flex.items-center > div.w-full.max-w-3xl.relative > div.flex-1.relative.bg-[#1C1C1C]` | 10px | login-form-barber |
| `div#root > div.min-h-screen.bg-[var(--color-bg)].flex > div.w-full.max-w-md.z-10` | 6px | forgot-password |
| `div#root > div.min-h-screen.bg-[var(--color-bg)].flex > div.w-full.max-w-md.z-10 > div.bg-[var(--color-card)].border-4.border-black` | 10px | forgot-password |
| `button#header-notifications-btn` | 2px | dashboard, agenda, fila, clientes, cliente-detalhe |
| `div.space-y-6.md:space-y-8.p-3 > section.grid.grid-cols-2.gap-3 > div.bg-theme-card.border-theme-border.border > div.p-4.md:p-5` | 6px | dashboard |
| `section.grid.grid-cols-2.gap-3 > div.bg-theme-card.border-theme-border.border > div.p-4.md:p-5 > div.flex.items-center.justify-between` | 22px | dashboard |
| `div#root > div.h-[100dvh].overflow-y-auto.bg-theme-bg > nav.md:hidden.fixed.bottom-6 > div.relative.-top-10.flex` | 4px | dashboard, agenda, fila, clientes, cliente-detalhe |
| `div.h-[100dvh].overflow-y-auto.bg-theme-bg > header.fixed.left-0.md:left-64 > div.h-16.md:h-20.flex > div.flex.items-center.gap-3` | 31px | agenda, fila, clientes, cliente-detalhe, produtos |
| `div.p-3.md:p-6.max-w-7xl > div.space-y-4.md:space-y-6 > div.grid.grid-cols-1.md:grid-cols-3 > div.bg-theme-card.rounded-lg.overflow-hidden` | 16px | cliente-detalhe |
| `div.space-y-8.fade-in > div > div.grid.grid-cols-1.md:grid-cols-2 > div.bg-theme-card.border-theme-border.border` | 70px | insights, meus-insights |
| `div > div.grid.grid-cols-1.md:grid-cols-2 > div.bg-theme-card.border-theme-border.border > div.p-4.md:p-5` | 70px | insights, meus-insights |
| `div.grid.grid-cols-1.md:grid-cols-2 > div.bg-theme-card.border-theme-border.border > div.p-4.md:p-5 > div.flex.items-start.justify-between` | 86px | insights, meus-insights |
| `div.h-[100dvh].overflow-y-auto.bg-theme-bg > header.fixed.left-0.right-0 > div.h-16.md:h-20.flex > div.flex.items-center.gap-3` | 12px | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes |
| `header.fixed.left-0.right-0 > div.h-16.md:h-20.flex > div.flex.items-center.gap-3 > a.flex.items-center.gap-3` | 12px | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes |
| `div.h-16.md:h-20.flex > div.flex.items-center.gap-3 > a.flex.items-center.gap-3 > div.relative` | 12px | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes |
| `div.grid.grid-cols-1.md:grid-cols-2 > div.relative.p-4.md:p-5 > div.flex.items-center.gap-5 > div.relative` | 4px | cfg-equipe |
| `main.flex-1.min-w-0.min-h-screen > div.p-4.md:p-8.flex-1 > div.space-y-6 > div.bg-theme-card.border-theme-border.border` | 18px | cfg-comissoes |

## 8. Estados transversais

Capturados: **28** · não capturados: **8**

Coluna "skeleton acima da base": para receitas de carregamento medimos a mesma tela duas vezes — uma assentada (linha de base) e uma sob rede lenta. Só o **delta** prova que existe estado de carregamento; o valor absoluto conta elementos permanentes da UI e mentiria.

| Estado | Grupo | Rede | Diálogo | Usa primitivo Modal | Skeleton (abs / base / Δ) | Spinner Δ | Alertas | Região live | Overlays ad-hoc | Reqs interceptadas | Shot |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `modal-agenda-novo` | modal | normal | não | **não** | 1 | — | 0 | 0 | 1 | — | `docs/ux-pro/shots-states/dark-390/modal-agenda-novo.png` |
| `modal-financeiro-lancamento` | modal | normal | sim | sim | 2 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/modal-financeiro-lancamento.png` |
| `modal-clientes-novo` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/modal-clientes-novo.png` |
| `modal-produtos-novo` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/modal-produtos-novo.png` |
| `modal-fila-adicionar` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/modal-fila-adicionar.png` |
| `form-erro-produtos` | validacao | normal | sim | sim | 1 | — | 3 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/form-erro-produtos.png` |
| `toast-aviso-financeiro` | toast | normal | sim | sim | 2 | — | 0 | 1 | 0 | — | `docs/ux-pro/shots-states/dark-390/toast-aviso-financeiro.png` |
| `vazio-clientes-busca` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/vazio-clientes-busca.png` |
| `vazio-produtos-busca` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/vazio-produtos-busca.png` |
| `vazio-agenda-semana-livre` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/dark-390/vazio-agenda-semana-livre.png` |
| `falha-rede-dashboard` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 22 | `docs/ux-pro/shots-states/dark-390/falha-rede-dashboard.png` |
| `falha-rede-clientes` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 22 | `docs/ux-pro/shots-states/dark-390/falha-rede-clientes.png` |
| `falha-rede-financeiro` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 23 | `docs/ux-pro/shots-states/dark-390/falha-rede-financeiro.png` |
| `falha-rede-agenda` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 24 | `docs/ux-pro/shots-states/dark-390/falha-rede-agenda.png` |
| `modal-agenda-novo` | modal | normal | não | **não** | 1 | — | 0 | 0 | 1 | — | `docs/ux-pro/shots-states/light-390/modal-agenda-novo.png` |
| `modal-financeiro-lancamento` | modal | normal | sim | sim | 2 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/modal-financeiro-lancamento.png` |
| `modal-clientes-novo` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/modal-clientes-novo.png` |
| `modal-produtos-novo` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/modal-produtos-novo.png` |
| `modal-fila-adicionar` | modal | normal | sim | sim | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/modal-fila-adicionar.png` |
| `form-erro-produtos` | validacao | normal | sim | sim | 1 | — | 3 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/form-erro-produtos.png` |
| `toast-aviso-financeiro` | toast | normal | sim | sim | 2 | — | 0 | 1 | 0 | — | `docs/ux-pro/shots-states/light-390/toast-aviso-financeiro.png` |
| `vazio-clientes-busca` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/vazio-clientes-busca.png` |
| `vazio-produtos-busca` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/vazio-produtos-busca.png` |
| `vazio-agenda-semana-livre` | vazio | normal | não | — | 1 | — | 0 | 0 | 0 | — | `docs/ux-pro/shots-states/light-390/vazio-agenda-semana-livre.png` |
| `falha-rede-dashboard` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 22 | `docs/ux-pro/shots-states/light-390/falha-rede-dashboard.png` |
| `falha-rede-clientes` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 22 | `docs/ux-pro/shots-states/light-390/falha-rede-clientes.png` |
| `falha-rede-financeiro` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 23 | `docs/ux-pro/shots-states/light-390/falha-rede-financeiro.png` |
| `falha-rede-agenda` | falhaRede | cortada | não | — | 0 | — | 0 | 0 | 0 | 23 | `docs/ux-pro/shots-states/light-390/falha-rede-agenda.png` |

**Estados que não apareceram** — cada linha é um estado que o produto não tem, ou que a receita não alcançou:

| Estado | Grupo | Motivo |
|---|---|---|
| `skeleton-dashboard` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-clientes` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-financeiro` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-agenda` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-dashboard` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-clientes` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-financeiro` | skeleton | estado esperado "skeleton" nao apareceu |
| `skeleton-agenda` | skeleton | estado esperado "skeleton" nao apareceu |

**Mensagens de erro/aviso efetivamente renderizadas** (texto literal, para julgar microcopy):

| Ocorr. | Texto |
|---|---|
| 2 | Informe o nome |
| 2 | Informe um preço válido |
| 2 | Informe um custo válido |
| 2 | Por favor, preencha pelo menos a descrição e o valor. |

**Sobreposições que não usam o primitivo `Modal`** — cada uma reimplementa foco, escape, scroll-lock e geometria por conta própria:

- `modal-agenda-novo`
- `modal-agenda-novo`

**Falha de rede sem aviso ao usuário** — a tela não distingue "sem dados" de "falhou ao carregar":

- `falha-rede-dashboard` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-clientes` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-financeiro` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-agenda` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-dashboard` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-clientes` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-financeiro` — nenhum alerta nem região live; texto sugere estado vazio: **false**
- `falha-rede-agenda` — nenhum alerta nem região live; texto sugere estado vazio: **false**

---

_Gerado por `scripts/ux-pro-report.mjs`. Números vêm de `forensics.json` e `estados.json`; nenhum valor foi estimado._