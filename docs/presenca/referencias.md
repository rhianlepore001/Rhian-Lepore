# Site do estabelecimento — Referências e voz do público

Pesquisa feita em 24/11/2026 (Lisboa). Os links foram verificados com `curl` nessa data (HTTP 200, salvo indicação).

Como ler as notas:
- **[revisão X]**: a avaliação vem de uma análise publicada (link na seção Fontes).
- **[HTML]**: sinal visto no HTML da página (títulos, links de WhatsApp/Maps, motor de agendamento).
- **[caso]**: estudo de caso publicado pela agência que fez o site.
- **Hipótese**: inferência minha, ainda não confirmada.

Sites montados por JavaScript podem esconder parte do conteúdo do HTML, então a ausência de um sinal **não prova** que o elemento falta.

## 1. Barbearias

| # | Site | País | Onde acerta | Onde é fraco |
|---|---|---|---|---|
| 1 | [Original Barbershop](https://originalbarbershop.nyc) | EUA | Primeira dobra com bairro, endereço e dois botões: "Book Now" e "View Services". Serviços mostram **preço + duração**. Perfil individual de cada barbeiro. Explica a diferença entre walk-in e horário marcado. [revisão websiteunpacked] | Faixa de texto repetida que não responde nada ao cliente. Foto da primeira dobra escura demais. [revisão] |
| 2 | Sauce (SoHo, NY): [estudo de caso](https://www.lyfar.com/blog/sauce-barbershop-booking-path/) | EUA | Botão "Book Now" **fixo na tela o tempo todo**. Carrossel de barbeiros com foto e mini-perfil. Seção de cultura (DJ, eventos). [caso] | O agendamento sai para outro site (Timely). O site da Sauce não respondeu ao `curl` (000), por isso uso o estudo de caso. |
| 3 | [Birds Barbershop](https://birdsbarbershop.com) | EUA | Tom de voz forte ("Haircuts for all y'all"). O agendamento abre em **popup sem sair da página**. Preços por tipo de corte. Depoimentos com nome do barbeiro. [revisão nanoglobals] | Não tem perfil individual dos barbeiros. [revisão] |
| 4 | [Scissors & Scotch](https://scissorsscotch.com) | EUA | Conceito claro: barbearia com bar. Serviços com nomes temáticos fáceis de lembrar. Agendamento em modal. Mostra 4.000+ avaliações Google (4,9). Clube de assinatura. [revisão] | É franquia e parece impessoal, sem nomes dos barbeiros. [revisão] |
| 5 | [Barber & Co (Miami)](https://www.barberandco.com) | EUA | Visual editorial escuro de "marca de moda", que justifica o preço premium. Fluxo começa pela unidade. Captura de e-mail com desconto. [revisão] | É premium: a linguagem não serve para a barbearia de bairro. |
| 6 | [Heritage Barbershop](https://www.heritagebarbershop.com) | EUA | Preço **e** duração dentro do fluxo de agendar. [revisão] | — |
| 7 | [Ruffians](https://ruffians.co.uk) | Reino Unido | Prova social logo no título ("Award Winning Barbershops"). Agenda online pelo Squire. [revisão uogaweb] | — |
| 8 | [Rudy's](https://rudysbarbershop.com) | EUA | Muitas unidades: escolhe estado → cidade → loja. [revisão] | Não se aplica ao salão pequeno. |
| 9 | [Barbearia Corleone](https://barbeariacorleone.com.br) | BR (SP) | Seções em linguagem de cliente: "O cardápio completo, sem letra miúda", "Os 12 mais vendidos da casa", "Agende do jeito que preferir", "Barbeiro, cadeira reservada para você", "Nossas unidades", "Avaliações". Agenda pela Trinks e WhatsApp em muitos pontos. Uma página por unidade. [HTML] | Hipótese: é um site sob medida, caro, fora do alcance do nosso público (é a referência do plano de topo). |
| 10 | [Dom Barbudo Barber Club](https://dombarbudobarberclub.com.br) | BR (Salvador) | Começa por **"Barbearia no Caminho das Árvores"**: bairro na primeira linha, bom para SEO local. Serviços com condição de primeira visita. "Por que escolher". "O que dizem nossos clientes". Bloco "Como agendar: 1. Fale no WhatsApp". FAQ. Mapa. [HTML] | O agendamento é só por WhatsApp, sem horários livres visíveis. **Esta é a lacuna que o AgendiX resolve.** |
| 11 | [Gran Cavalheiro](https://grancavalheiro.com) | BR (Curitiba) | Clima da casa (preto, couro, caramelo). Dois botões repetidos no topo, no meio e no fim: Agendar e Assinar o Clube. Endereço e telefone logo abaixo da primeira dobra, "porque muita gente entra só para ligar". Nota Google e depoimentos. [caso Dezetoro](https://dezetoro.com/projetos/gran-cavalheiro) | Está em WordPress feito por agência. O agendamento vai para um motor externo (CashBarber). [HTML] |
| 12 | P22 Barbearia: [estudo de caso](https://www.grapenexus.com/caso/p22.php) | BR (SP) | Página única que **cabe numa tela de celular**. Os dois botões que importam (agendar no WhatsApp e ver os planos) ficam logo abaixo da frase de abertura. Equipe com nome e especialidade: "em barbearia o cliente escolhe a pessoa, não só o lugar". [caso] | Agenda só pelo WhatsApp. |
| 13 | [Barbearia Asgard](https://barbeariaasgard.com) | PT (Porto/Gaia) | Quiz "Descobre o teu corte" (5 perguntas e 2 sugestões). "4,9 estrelas em mais de 3.600 avaliações no Google". Preços e serviços. Lojas. FAQ. [HTML] | Muito conteúdo (escola, tatuagem). Rede grande. |
| 14 | [Figaro's Lisboa](https://figaroslisboa.com/pt-pt/) | PT | Marca clássica (navalha, toalha quente). Marcação online em destaque. [HTML] | Pouco texto indexável no HTML. Hipótese: SEO fraco. |
| 15 | [MR. LUCAS](https://mrlucas.pt) · [Barbearia Marques](https://www.barbeariamarques.com) · [Brooklyn Barbearia PT](https://www.brooklynbarbearia.pt/reservar) | PT | Barbearias de bairro com marcação online e mapa. A Marques tem cidade e bairro no título. [HTML] | Sites simples, de template. Ficam como referência do "mínimo aceitável". |

## 2. Salões de beleza

| # | Site | País | Onde acerta | Onde é fraco |
|---|---|---|---|---|
| 1 | [The Lane](https://www.thelanesalon.com) | EUA | Editorial limpo, muito branco, fotos do trabalho. "Book Now" no topo. Agenda embutida (Mangomint) sem sair do site. [revisão mangomint + HTML] | — |
| 2 | [Yello](https://yello.salon) | EUA | Paleta própria (verde e creme) e retratos animados de cada profissional: a personalidade aparece online. [revisão mangomint] | — |
| 3 | [Duck & Dry](https://duckanddry.com) | Reino Unido | Uma especialidade (escova). **Lookbook** para escolher o estilo antes de marcar. [revisão uogaweb] | — |
| 4 | [Taylor Taylor](https://www.taylortaylorlondon.com) | Reino Unido | O espaço é o produto: fotografa o ambiente, não só o cabelo. [revisão] | O servidor respondeu 202 (proteção antirrobô). |
| 5 | [Live True London](https://livetruelondon.com) | Reino Unido | Diz **o que é e onde** já no título ("London Hair Salon"). [revisão] | Pouco poético, o que é de propósito. |
| 6 | [Glasshouse Salon](https://glasshousesalon.co.uk) | Reino Unido | Posicionamento por valores no título ("Organic Hair & Sustainable Beauty"). [revisão] | O agendamento sai para a Fresha e o cliente deixa o site. [revisão] |
| 7 | [Salon Mystique](https://www.salonmystique.com) · [The Harlot](https://harlotsalon.com) | EUA | Vídeo na primeira dobra mostrando o espaço e a equipe em ação. A Harlot tem grade de profissionais. [revisão mangomint] | O vídeo pesa no celular. |
| 8 | [Persona Beauty Studio](https://studiopersona.pt) | PT (Lisboa) | Textos de cliente: "Veja os preços antes de marcar" (com aviso de que o preço varia por comprimento), "Escolha a profissional e um horário livre online, a qualquer hora. Prefere falar? Envie mensagem", "Escolha com quem quer marcar", "Como chegar ao estúdio". [HTML] | — **Referência muito próxima do que queremos.** |
| 9 | [HER. By Tânia Pereira](https://byher.pt) | PT (Porto) | Título com especialidade e cidade ("Cabelo, Cor e Balayage no Porto"). "O que o seu cabelo está a pedir?" leva ao serviço certo. Depoimentos. Avisos de horários de fim de ano. Guias de cuidado. Imprensa (CNN). [HTML] | Muito conteúdo. Exige manutenção. |
| 10 | [Cut & Shout](https://cutandshout.pt) | PT (Lisboa) | "Estúdio conceito de cabelo". Consulta prévia incluída. Escolhe o profissional. Depoimentos. FAQ. [HTML + busca] | — |
| 11 | [Retrô Hair](https://retrohair.com.br) | BR (SP) | Voz de marca ("Sua cabeça. Suas regras."). "Conheça a nossa equipe". Agenda pela Avec. WhatsApp muito presente. [HTML] | Rede grande. |
| 12 | [Jacques Janine](https://jacquesjanine.com.br) · [Werner Coiffeur](https://wernercoiffeur.com.br) · [Laces and Hair](https://www.lacesandhair.com.br) · [Soho Hair](https://sohohair.com.br) · [Beleza Natural](https://belezanatural.com.br) | BR | Grandes redes: páginas de unidade e WhatsApp. A Beleza Natural tem posicionamento claro ("crespos, cachos e ondulados"). [HTML] | Agendamento fragmentado. A Jacques Janine usa um link externo por unidade. O Studio W (fora da tabela) só agenda por telefone. A Laces usa formulário. **Mesmo os grandes no Brasil não resolvem bem "ver horário e marcar".** [busca] |

## 3. Plataformas e concorrentes que geram site

| Plataforma | O que entrega | Ponto forte | Ponto fraco |
|---|---|---|---|
| [Squire, landing page](https://getsquire.com/features/landing-page) (o site bloqueia robô com 403; o conteúdo foi lido pela busca) | Site preenchido **automaticamente** com nome, endereço, serviços, preços e link de agendar. Escolha de template, cores, fotos e bio da equipe, "sem código, sem arrastar". Endereço grátis ou domínio próprio. Botão Book Now sempre visível. Agenda e pagamento em popup. | **É o modelo mais próximo do Presença.** | Add-on pago: US$25/mês segundo a Trym. |
| [Booksy, perfil](https://biz.booksy.com/pt-br/recursos/perfil-booksy) | Perfil público com serviços, preços, equipe, horários, avaliações, fotos, capa, logo, descrição, link e QR Code. | Marketplace (44 milhões de clientes, segundo a própria Booksy). | Não é site com domínio próprio. O Boost cobra 30% da 1ª visita de cliente novo. [Trym] |
| [Fresha](https://www.fresha.com/for-business) | Página básica grátis e "Smart Website" por US$15,95/mês. | Marketplace. | Site "funcional, não bonito" [Entro]. Cobra 20% da 1ª reserva vinda do marketplace, mesmo quando o cliente reserva no site próprio. [Trym] |
| [Vagaro, construtor de site](https://www.vagaro.com/pro/website) | MySite, add-on de US$20/mês. | Tudo num lugar só. | O cliente precisa de conta Vagaro para agendar. [Trym] |
| [Trinks](https://negocios.trinks.com/solucoes/) · [ajuda](https://ajuda.trinks.com/conheca-todas-as-possibilidades-de-agendamento-online-com-a-trinks) | Hotsite do estabelecimento com serviços e agendamento, mais API para site próprio. | Líder no Brasil. Usada pela Corleone. | A partir de cerca de R$110/mês [busca]. Há relatos de instabilidade no Reclame Aqui. |
| AppBarber (site com 403 para robôs) | Página `sites.appbarber.com.br/seu-negocio`. | Foco em barbearia. | Reputação "Regular" no Reclame Aqui, 53,3% das reclamações resolvidas [busca]. |
| [Avec](https://negocios.avec.app) | Link de agendamento. "App próprio white label" marcado como "em breve". | Usada pela Retrô Hair. | — |
| [Wix, template Barber](https://www.wix.com/website-template/view/html/4180) · [Squarespace](https://www.squarespace.com/templates) | Templates bonitos. | Liberdade de design. | O dono monta tudo e mantém os serviços em dois lugares. A agenda não conversa com o sistema. O Squarespace não tem plano grátis. |
| [Linktree](https://linktr.ee) | Link na bio. | Zero esforço. É o que muitos usam hoje. | Não passa profissionalismo e não aparece no Google. Hipótese, mas consistente com as revisões. |

## 4. Padrões que se repetem (as revisões convergem)

1. **Agendar a um toque, sem sair da página.** O botão fica fixo ou no topo e o agendamento abre em modal ou popup. Sites que mandam o cliente para fora (Facebook, outra plataforma) tiveram o pior resultado de conversão na revisão da NanoGlobals.
2. **O trabalho aparece antes das palavras.** Fotos reais da casa, da equipe e dos cortes. Foto de banco "mata" o clima, segundo a NanoGlobals.
3. **Preço e duração visíveis** antes de marcar. "A partir de" vale, se for honesto. Isso aparece na uogaweb, na NanoGlobals, na umhorario e no Persona.
4. **As pessoas da equipe**, com foto, nome e especialidade, e escolher com quem marcar. "Em barbearia o cliente escolhe a pessoa", diz o caso P22.
5. **Avaliações de terceiros, principalmente do Google**, com nota e número total.
6. **O que é e onde**, na primeira linha: bairro ou cidade no título (Dom Barbudo, HER, Live True, Marques).
7. **Logística**: endereço, mapa, horário de funcionamento, WhatsApp, política de atraso e cancelamento.
8. **Diferenciais opcionais**: clube ou assinatura, combos com nome, quiz "descubra seu corte", lookbook, FAQ.

## 5. Voz do público

### Cliente final (quem agenda)

| Achado | Fonte |
|---|---|
| **90%** olham o Instagram do salão e **88%** checam avaliações no Google antes de agendar. | [Beauty Fair / Radar Pesquisas, 2024: 560 consumidores](https://negociosdebeleza.beautyfair.com.br/cabelo-e-gestao/86-das-clientes-confiam-mais-no-profissional-do-que-na-influenciadora-e-o-salao-precisa-entender-o-que-isso-significa/) |
| **66%** preferem agendar por link ou app, e **72%** gostariam de agendar fora do horário comercial. A demora do WhatsApp e ter de mandar várias mensagens frustram. | idem |
| Fidelidade vem da qualidade (53%), do atendimento (33%) e da confiança no profissional (27%). 38% alternam entre salões, então há abertura para trocar. 74% dão peso ao clima do ambiente. | idem |
| As avaliações cinco estrelas falam do **profissional**, não da estrutura. | idem |
| O que checar antes de marcar: preço, duração, higiene (fotos do ambiente), poder escolher o profissional, localização com referência. Sinais de alerta: "sob consulta" em serviço simples e endereço vago. | [Um Horário, guia para o cliente](https://umhorario.com.br/blog/como-escolher-salao-ou-barbearia) |
| Numa barbearia, **localização (40,7%)**, qualidade (22,2%) e agendamento (9,6%) foram os maiores fatores de escolha. 85,2% aprovam o agendamento. É uma amostra pequena: 27 clientes. | [Unisales, TCC 2022](https://unisales.br/wp-content/uploads/2023/06/FATORES-QUE-INFLUENCIAM-NA-DECISAO-DE-COMPRA-DOS.pdf) |
| O cliente escolhe vendo fotos de trabalhos, o que está perto e o que os outros dizem. O primeiro passo costuma ser o Instagram ou o Google. | [Infuse](https://www.infusesoftware.com/blog/marketing-digital-para-saloes-e-barbearias/) |

### Dono (quem paga)

| Achado | Fonte |
|---|---|
| Muitas mensagens "tem horário hoje?" tomam o tempo do profissional e geram atraso. Uma agenda online com horários livres resolve. | [Infuse](https://www.infusesoftware.com/blog/marketing-digital-para-saloes-e-barbearias/) |
| No r/Barber, a pergunta "precisa de site ou basta Instagram?" teve como resposta resumida pela busca que o Instagram não basta para clientes novos. O que importa é o perfil Google completo, e um site de uma página serve de "base profissional e pesquisável" com o botão de agendar. Nome, endereço e telefone devem ser iguais em todo lugar. | [r/Barber](https://www.reddit.com/r/Barber/comments/1pexedz/do_barbers_even_need_a_website_in_2025_or_is/). O fetch deu timeout; o conteúdo vem do resumo da busca. **Confirmar antes de citar.** |
| O dono quer **zero trabalho**. O Squire vende exatamente "os dados da loja já vêm preenchidos, sem código, sem arrastar", e a Entro critica a Fresha por "montar a partir dos seus inputs". | [Squire](https://getsquire.com/features/landing-page), [Entro](https://entro.work/blog/best-salon-website-builders-for-salons) |
| O dono não quer pagar comissão por cliente novo (Booksy Boost 30%, Fresha 20%). | [Trym](https://www.trym.app/best-barbershop-software) |
| No Brasil, o padrão hoje é Instagram mais WhatsApp. Até redes grandes agendam por WhatsApp, telefone ou formulário (Dom Barbudo, Studio W, Laces). | Sinais no HTML e na busca |
| **Hipótese, a validar em entrevista:** o dono quer parecer "do tamanho" da barbearia premium da cidade sem pagar agência (R$1,5 mil a R$5 mil por um site polido, segundo a NanoGlobals em dólar). Quer puxar as fotos do Instagram e não quer manter os serviços em dois lugares. | — |

## 6. Fontes das revisões

- websiteunpacked, 21 sites de barbearia (2026): https://websiteunpacked.com/barber-website-design
- NanoGlobals, 20 sites de barbearia (mar/2026): https://nanoglobals.com/barbershop-websites/
- uogaweb, 14 sites de salão (2026): https://uogaweb.com/squarespace-design-insights/hair-beauty-salon-website-examples
- Mangomint, 7 sites de salão (set/2026): https://www.mangomint.com/blog/7-beautiful-hair-salon-web-designs/
- Trym, comparativo de preços (nov/2026; o autor é concorrente): https://www.trym.app/best-barbershop-software
- Entro, construtores de site para salão: https://entro.work/blog/best-salon-website-builders-for-salons

Descartados: o site da Sauce (sem resposta) e `vagaro.com/pro/mysite` (404, trocado pelo link atual).
