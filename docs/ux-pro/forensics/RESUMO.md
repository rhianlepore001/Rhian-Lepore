# RESUMO FORENSE — telemetria de estilo do AgendiX

**Gerado em:** 2026-08-02T09:18:41.741Z
**Execuções:** 164 · **rotas auditadas:** 25 · **não auditadas:** 12
**Temas × modos efetivamente observados:** null-dark, barber-dark, barber-light

Fonte: `scripts/ui-forensics.mjs` (matriz de rotas) e `scripts/ui-states.mjs` (estados transversais). Tudo medido com `getComputedStyle` no Chromium real.

## 1. Cobertura — o que NÃO foi auditado, e por quê

Regra do §15: tela vazia auditada como cheia é auditoria mentindo. Estes itens ficam de fora, declarados:

| Escopo | Motivo |
|---|---|
| owner / beauty, staff / beauty | tema nao controlavel: data-theme vem de profiles.user_type ("barber") e a conta de teste nao e' a conta VITE_DEV_EMAIL, logo o switcher dev nao existe |
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
| `insights` | nucleo | **10** | 14 | **3** | **8** | 1 | **36** | **23** | 1 | não |
| `meus-insights` | nucleo | **10** | 14 | **4** | **8** | 1 | **41** | **23** | 1 | não |
| `dashboard` | nucleo | **8** | 13 | **4** | **8** | 2 | **50** | **19** | 0 | não |
| `financeiro` | nucleo | **8** | 14 | **4** | **7** | 1 | **39** | **23** | 0 | não |
| `cfg-assinatura` | ajustes | **8** | 17 | **3** | **7** | 2 | **26** | **24** | 2 | não |
| `fila` | nucleo | 7 | 14 | **4** | **7** | 1 | **25** | **16** | 1 | não |
| `clube-assinantes` | ajustes | 7 | 15 | **3** | **8** | 1 | **27** | **18** | 0 | não |
| `agenda` | nucleo | 6 | 13 | **3** | **7** | 1 | **54** | **13** | 1 | não |
| `clientes` | nucleo | 6 | 12 | **2** | **8** | 1 | **28** | **65** | 0 | não |
| `cliente-detalhe` | nucleo | 6 | 11 | **3** | **8** | 1 | **33** | **23** | 1 | não |
| `cfg-geral` | ajustes | 6 | 20 | **8** | **7** | 1 | **45** | **51** | 3 | não |
| `cfg-agendamento` | ajustes | 6 | 15 | **4** | **7** | 1 | **32** | **29** | 1 | não |
| `cfg-equipe` | ajustes | 6 | 16 | **3** | **7** | 2 | **24** | **24** | 0 | não |
| `cfg-servicos` | ajustes | 6 | 16 | **3** | **7** | 1 | **18** | **25** | 1 | não |
| `cfg-comissoes` | ajustes | 6 | 16 | **4** | **7** | 1 | **36** | **25** | 1 | não |
| `cfg-clube` | ajustes | 6 | 15 | **3** | **7** | 1 | **19** | **25** | 1 | não |
| `cfg-clube-pix` | ajustes | 6 | 14 | **3** | **7** | 1 | **17** | **31** | 1 | não |
| `cfg-seguranca` | ajustes | 6 | 14 | **2** | **7** | 1 | **18** | **24** | 1 | não |
| `login-gateway` | auth | 5 | 10 | **2** | 3 | 0 | 0 | 0 | 0 | não |
| `login-form-barber` | auth | 5 | 10 | **2** | **4** | 1 | 0 | **2** | 0 | não |
| `produtos` | nucleo | 5 | 14 | **3** | **8** | 1 | **24** | **16** | 1 | não |
| `register` | auth | 4 | 11 | **3** | **4** | 1 | **6** | **9** | 1 | não |
| `forgot-password` | auth | 4 | 6 | **1** | 2 | 1 | 0 | **1** | 0 | não |
| `termos` | auth | 4 | 7 | 0 | 0 | 0 | 0 | **1** | 0 | não |
| `clube-publico` | publicas | 1 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | não |

## 4. Inventário global do produto

Agregado de todas as execuções. É aqui que se vê se o problema é local (uma tela) ou sistêmico (o vocabulário visual inteiro).

| Dimensão | Valores distintos no produto | Os mais usados (valor × ocorrências) |
|---|---|---|
| Tamanho de fonte | **13** | `12px` ×2986 · `14px` ×2166 · `18px` ×690 · `11px` ×400 · `16px` ×290 · `24px` ×224 · `30px` ×208 · `20px` ×208 · `36px` ×47 · `48px` ×12 · `19px` ×3 · `60px` ×2 |
| Peso de fonte | **5** | `500` ×4340 · `700` ×2042 · `600` ×500 · `400` ×203 · `900` ×152 |
| Altura de linha | **23** | `16px` ×2785 · `20px` ×2058 · `28px` ×792 · `24px` ×400 · `16.5px` ×400 · `36px` ×207 · `32px` ×106 · `18px` ×82 |
| Família | **5** | `ui-sans-serif` ×3216 · `JetBrains Mono` ×2176 · `Chivo` ×1305 · `monospace` ×312 · `Inter` ×228 |
| Espaçamento (padding/margin/gap) | **42** | `8px` ×8082 · `12px` ×6905 · `4px` ×6736 · `16px` ×6625 · `20px` ×2604 · `10px` ×1416 · `24px` ×1384 · `6px` ×974 · `32px` ×633 · `2px` ×376 · `-1px` ×208 · `48px` ×120 |
| Border-radius | **8** | `8px` ×1890 · `3.35544e+07px` ×1768 · `12px` ×976 · `4px` ×360 · `16px` ×248 · `6px` ×236 · `24px` ×62 · `28px` ×58 |
| Border-width | **3** | `1px` ×11936 · `2px` ×3336 · `4px` ×8 |
| Box-shadow | **6** | ver §4.1 |

### 4.1 Sombras em uso

| Ocorrências | Valor computado |
|---|---|
| 522 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0` |
| 4 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(201, 162, 74) ` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(240, 235, 224)` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(201, 162, 74,` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgb(26, 22, 16) 0p` |
| 2 | `rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(139, 105, 20,` |

### 4.2 Espaçamentos fora da escala de 4px

| Valor | Ocorrências | Rotas onde aparece |
|---|---|---|
| `10px` | 1416 | login-gateway, login-form-barber, register, dashboard, agenda, fila +16 |
| `6px` | 974 | login-form-barber, register, dashboard, agenda, fila, cliente-detalhe +13 |
| `2px` | 376 | register, dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| `-1px` | 208 | cfg-geral, cfg-agendamento, cfg-comissoes |
| `14px` | 112 | login-gateway, fila, financeiro |
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

**55 defeitos distintos de contraste** (par cor/fundo/tamanho), somando 598 ocorrências.

| Razão medida | Exigido | Cor do texto | Fundo efetivo | Tamanho/peso | Ocorr. | Modos | Rotas | Exemplo de texto |
|---|---|---|---|---|---|---|---|---|
| **1:1** | 4.5:1 | `rgb(18, 16, 14)` | `rgb(18, 16, 14)` | 12px/700 | 38 | barber-dark | dashboard, agenda, fila, clientes, cliente-detalhe +14 | 1 |
| **1:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(229, 229, 229)` | 12px/700 | 38 | barber-light | dashboard, agenda, fila, clientes, cliente-detalhe +14 | 1 |
| **1.18:1** | 4.5:1 | `rgb(234, 234, 234)` | `rgb(216, 216, 216)` | 14px/500 | 2 | barber-light | cliente-detalhe | Cliente VIP - prefere horário  |
| **1.91:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(201, 162, 74)` | 12px/900 | 2 | barber-light | cfg-assinatura | Recomendado |
| **2.34:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(242, 242, 242)` | 12px/700 | 4 | barber-light | cfg-geral | Ajuda |
| **2.61:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(255, 255, 255)` | 12px/500 | 3 | barber-light | cliente-detalhe | Membro desde 2021 / aline.lima@example.com |
| **2.61:1** | 4.5:1 | `rgb(160, 160, 160)` | `rgb(255, 255, 255)` | 14px/500 | 2 | barber-light | cliente-detalhe | aline.lima@example.com / +55 619923489031 |
| **2.64:1** | 3:1 | `rgb(5, 150, 105)` | `rgb(216, 216, 216)` | 20px/700 | 12 | barber-light | dashboard, insights, cfg-geral, cfg-agendamento, cfg-equipe +7 | R$ 0,00 |
| **2.64:1** | 3:1 | `rgb(5, 150, 105)` | `rgb(216, 216, 216)` | 30px/700 | 12 | barber-light | dashboard, insights, cfg-geral, cfg-agendamento, cfg-equipe +7 | R$ 0,00 |
| **3.13:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(207, 203, 192)` | 14px/700 | 38 | barber-light | dashboard, agenda, fila, clientes, cliente-detalhe +14 | B |
| **3.13:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(207, 203, 192)` | 12px/700 | 6 | barber-light | dashboard, insights, meus-insights | Hoje / Mês |
| **3.13:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(207, 203, 192)` | 16px/700 | 38 | barber-light | dashboard, agenda, fila, clientes, cliente-detalhe +14 | B |
| **3.42:1** | 4.5:1 | `rgb(5, 150, 105)` | `rgb(235, 247, 243)` | 12px/700 | 10 | barber-light | insights, meus-insights, cfg-agendamento, cfg-assinatura, produtos | Excelente / +114% Retenção |
| **3.51:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(218, 214, 204)` | 12px/700 | 7 | barber-light | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +2 | Geral / Agendamento |
| **3.51:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(218, 214, 204)` | 14px/500 | 41 | barber-light | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +14 | Geral / Agendamento |
| **3.57:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(216, 216, 216)` | 16px/700 | 1 | barber-light | cliente-detalhe | R$ 170,00 |
| **3.57:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(216, 216, 216)` | 12px/500 | 2 | barber-light | cliente-detalhe | Próxima Visita |
| **3.57:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(216, 216, 216)` | 18px/700 | 1 | barber-light | cliente-detalhe | R$ 170,00 |
| **3.6:1** | 4.5:1 | `rgb(201, 162, 74)` | `rgb(89, 74, 41)` | 12px/700 | 2 | barber-dark | dashboard | Próximo |
| **3.62:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(218, 218, 218)` | 18px/500 | 2 | barber-light | clientes | Diego Melo |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 12px/700 | 12 | barber-light | dashboard, insights, meus-insights | Semana / Mês |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 14px/500 | 2 | barber-light | cfg-agendamento | http://localhost:4173/#/book/ |
| **3.73:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(216, 216, 216)` | 12px/500 | 2 | barber-light | cfg-agendamento | Dica: Use o nome da sua barbea |
| **3.76:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(229, 221, 202)` | 12px/700 | 2 | barber-light | dashboard | Próximo |
| **3.77:1** | 4.5:1 | `rgb(5, 150, 105)` | `rgb(255, 255, 255)` | 12px/700 | 4 | barber-light | insights, meus-insights | -5.1% |
| **3.87:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(220, 220, 220)` | 14px/500 | 8 | barber-light | cfg-comissoes | Configure a taxa de comissão ( / Quando você marca um agendamen |
| **3.87:1** | 4.5:1 | `rgb(110, 107, 100)` | `rgb(220, 220, 220)` | 12px/700 | 8 | barber-light | clube-assinantes | Ativos / Pendentes |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 14px/600 | 36 | barber-light | dashboard, agenda, clientes, produtos, cfg-agendamento +7 | Agendar / Novo Agendamento |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 12px/500 | 6 | barber-light | agenda, meus-insights | dom / Mês |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 18px/700 | 2 | barber-light | agenda | 2 |
| **4.04:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(229, 229, 229)` | 12px/700 | 12 | barber-light | agenda, clientes, cliente-detalhe, financeiro, meus-insights | Todos / Agenda |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 12px/600 | 23 | barber-light | agenda, clientes, cliente-detalhe, financeiro, fila +1 | Novo Agendamento / Todos |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 12px/700 | 8 | barber-light | cliente-detalhe, cfg-geral, cfg-clube-pix, clube-assinantes | Último / Adicionar Foto |
| **4.04:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(229, 229, 229)` | 12px/600 | 8 | barber-light | financeiro | Filtrar / Exportar |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 16px/700 | 1 | barber-light | cfg-geral | Salvar Alterações |
| **4.04:1** | 4.5:1 | `rgb(139, 105, 20)` | `rgb(229, 229, 229)` | 12px/500 | 2 | barber-light | cfg-clube | ← Configurar Pix |
| **4.04:1** | 4.5:1 | `rgb(229, 229, 229)` | `rgb(139, 105, 20)` | 14px/700 | 2 | barber-light | agenda | BF |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 14px/400 | 2 | barber-dark | register | Studio |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 12px/400 | 2 | barber-dark | register | Beauty salon |
| **4.21:1** | 4.5:1 | `rgb(143, 133, 116)` | `rgb(37, 37, 37)` | 12px/600 | 2 | barber-dark | register | Portugal · EUR |

### 5.1 Texto com cor idêntica ao fundo (razão 1:1 — literalmente invisível)

Razão exatamente 1:1 não é "contraste baixo": é texto que não existe na tela. Vale conferir o seletor antes de tratar como defeito de cor — costuma ser duas utilitárias de `background` na mesma classe, e a que vence é a que o CSS gerado colocou por último.

| Cor = fundo | Tamanho/peso | Ocorr. | Modos | Rotas | Seletor medido |
|---|---|---|---|---|---|
| `rgb(18, 16, 14)` | 12px/700 | 38 | barber-dark | 19 rotas | `button#header-notifications-btn > span.absolute.-top-0.5.-right-0.5` |
| `rgb(229, 229, 229)` | 12px/700 | 38 | barber-light | 19 rotas | `button#header-notifications-btn > span.absolute.-top-0.5.-right-0.5` |

**Violações por combinação tema × modo** (mostra se um modo é sistematicamente pior):

| Tema × modo | Execuções | Violações | Média por tela |
|---|---|---|---|
| barber-dark | 88 | 80 | 0.9 |
| barber-light | 76 | 518 | 6.8 |

## 6. Alvos de toque abaixo de 44×44px

No viewport de referência 390×844: **106 tipos distintos** de alvo pequeno.

| Rótulo | Caixa medida | Ocorr. | Nome acessível | Rotas |
|---|---|---|---|---|
| _(sem rótulo)_ | 24×24 | 208 | sim | clientes |
| Abrir notificações | 38×38 | 76 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| Ajuda e reportar problema | 32×32 | 76 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| Ativar modo claro | 38×38 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| BobBarberB | 32×32 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| Bob FuncionarioBarberB | 32×32 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| Ativar modo escuro | 38×38 | 38 | sim | dashboard, agenda, fila, clientes, cliente-detalhe +14 |
| _(sem rótulo)_ | 20×20 | 32 | sim | agenda, fila, clientes, cliente-detalhe, produtos +4 |
| _(sem rótulo)_ | 68×36 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Abrir menu de configurações | 40×40 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Geral | 96.8×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Agendamento | 154.2×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Equipe | 101.5×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Serviços | 116.2×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Comissões | 128.1×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Assinatura | 135.8×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Notificações | 146.2×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Segurança | 132.7×34 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Fechar menu de configurações | 36×36 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Notificações | 263×42 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Voltar ao Dashboard | 247×20 | 18 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +4 |
| Agendamento | 263×42 | 16 | sim | cfg-geral, cfg-equipe, cfg-servicos, cfg-comissoes, cfg-assinatura +3 |
| Equipe | 263×42 | 16 | sim | cfg-geral, cfg-agendamento, cfg-servicos, cfg-comissoes, cfg-assinatura +3 |
| Serviços | 263×42 | 16 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-comissoes, cfg-assinatura +3 |
| Comissões | 263×42 | 16 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-assinatura +3 |
| Assinatura | 263×42 | 16 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +3 |
| Segurança | 263×42 | 16 | sim | cfg-geral, cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes +3 |
| Geral | 263×42 | 16 | sim | cfg-agendamento, cfg-equipe, cfg-servicos, cfg-comissoes, cfg-assinatura +3 |
| Agenda | 91.4×26 | 12 | sim | insights, meus-insights |
| Adicionar Pausa (Almoço) | 298×32 | 12 | sim | cfg-geral |
| Repetir | 28×20 | 12 | sim | cfg-geral |
| _(sem rótulo)_ | 1×1 | 10 | **não** | cfg-agendamento |
| Repetir Estilo | 224×34 | 8 | sim | cliente-detalhe |
| Mês anterior | 36×36 | 8 | sim | financeiro, insights, meus-insights |
| Próximo mês | 36×36 | 8 | sim | financeiro, insights, meus-insights |

## 7. Alinhamento e overflow

**45** pares de coordenada X separados por 1 a 3px (assinatura de desalinhamento):

| Rota | Viewport | Persona | X₁ | X₂ | Δ | Blocos em X₁ | Blocos em X₂ |
|---|---|---|---|---|---|---|---|
| `register` | 390x844 | anon | 199 | 201 | 2px | 1 | 1 |
| `fila` | 390x844 | owner | 200 | 201 | 1px | 1 | 1 |
| `cliente-detalhe` | 390x844 | owner | 29 | 30 | 1px | 2 | 1 |
| `insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `meus-insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `cfg-geral` | 390x844 | owner | 33 | 34 | 1px | 3 | 1 |
| `cfg-geral` | 390x844 | owner | 114 | 116.5 | 2.5px | 7 | 1 |
| `cfg-geral` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-agendamento` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-servicos` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-comissoes` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-assinatura` | 390x844 | owner | 209.8 | 210 | 0.2px | 1 | 1 |
| `cfg-assinatura` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-clube` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-clube-pix` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `cfg-seguranca` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |
| `agenda` | 1440x900 | owner | 496 | 498.8 | 2.8px | 1 | 1 |
| `cliente-detalhe` | 1440x900 | owner | 301 | 302 | 1px | 1 | 1 |
| `produtos` | 1440x900 | owner | 280 | 281 | 1px | 1 | 2 |
| `cfg-geral` | 1440x900 | owner | 309 | 310 | 1px | 2 | 1 |
| `cfg-geral` | 1440x900 | owner | 501.9 | 504.2 | 2.3px | 1 | 1 |
| `agenda` | 1440x900 | staff | 496 | 498.8 | 2.8px | 1 | 1 |
| `produtos` | 1440x900 | staff | 280 | 281 | 1px | 1 | 2 |
| `fila` | 390x844 | owner | 200 | 201 | 1px | 1 | 1 |
| `cliente-detalhe` | 390x844 | owner | 29 | 30 | 1px | 2 | 1 |
| `insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `meus-insights` | 390x844 | owner | 29 | 30 | 1px | 1 | 1 |
| `cfg-geral` | 390x844 | owner | 33 | 34 | 1px | 3 | 1 |
| `cfg-geral` | 390x844 | owner | 114 | 116.5 | 2.5px | 7 | 1 |
| `cfg-geral` | 390x844 | owner | 299 | 302 | 3px | 1 | 1 |

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
| `div.h-[100dvh].overflow-y-auto.bg-theme-bg > header.fixed.left-0.md:left-64 > div.h-16.md:h-20.flex > div.flex.items-center.gap-3` | 19px | agenda, fila, clientes, cliente-detalhe, produtos |
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