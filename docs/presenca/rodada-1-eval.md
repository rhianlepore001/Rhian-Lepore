# Avaliação de design — rodada 1

**Veredito: NÃO PASSA.** A menor nota entre as telas avaliadas é **5,5/10**. A aprovação exige **todas as telas com pelo menos 9,5/10**, e a robustez com cadastro mínimo e fotos ruins continua sem evidência suficiente para receber nota.

**A direção visual das páginas públicas precisa ser repensada desde a primeira dobra.** Não recomendo tentar alcançar o nível pedido apenas ajustando espaçamentos, trocando a fonte ou aumentando o botão. Barbearia e salão usam essencialmente a mesma composição, tipografia e sequência de seções. As paletas diferenciam os temas, mas as casas continuam parecendo duas versões do mesmo template.

Concordo com o diagnóstico do Rhian sobre a barbearia. Minha ressalva é que o problema vai além do gosto pela serifada: a página apresenta categoria, local e promoção, mas não constrói uma imagem específica da casa nem torna o motivo para escolhê-la convincente. O resultado é correto como estrutura inicial de produto, mas ainda distante de um site que um estabelecimento premium pagaria para ter.

## Notas

As notas abaixo avaliam o que está visível nos prints. Não são notas de funcionamento, acessibilidade técnica ou qualidade do código.

| Tela | Nota | Justificativa |
|---|---:|---|
| **A. Barbearia — 390 px, primeira dobra e página inteira** | **5,5** | Categoria e bairro são claros, mas a serifada fina dá um ar genérico de editorial de luxo; a oferta se perde entre linha, texto miúdo e ações; a foto da casa entra pequena e mostra cadeiras vazias. A barra fixa corta o início da seção seguinte na primeira dobra. Ao longo da página, serviços, diferenciais e depoimentos repetem um ritmo previsível. |
| **B. Salão — 390 px, primeira dobra e página inteira** | **6,0** | A paleta clara é agradável e há boa legibilidade geral, mas a mesma composição da barbearia enfraquece a identidade. O título e a foto de espelhos dizem pouco sobre a experiência; a oferta tem pouco destaque e o botão final verde sobre verde perde força. A galeria reúne imagens de banco visualmente desconectadas. |
| **C. Página de serviço — 390 px, dois temas** | **6,5** | A foto é grande e há descrição, itens incluídos e chamada para agendar. Porém, o primeiro espaço é ocupado por cabeçalho, caminho de navegação e foto; nome, preço e duração não formam um bloco de decisão suficientemente rápido. O texto “É para você?” é genérico, e a barra fixa compete com o conteúdo. |
| **D. Agendamento aberto — 390 px, dois temas** | **6,5** | A seleção prévia aparece marcada e a ação de continuar é identificável. Ainda assim, cabeçalho, quatro etapas, busca, grupo e categorias consomem grande parte da altura: restam pouco mais de dois serviços visíveis. O rodapé cobre parte da lista no estado capturado, e o desenho arredondado e denso parece pertencer a outro produto. |
| **E. Painel Meu site — 390 px, painel do dono e editor demo** | **5,5** | No painel do dono, o cabeçalho fixo de configurações invade visualmente a área da prévia; o nome da casa quebra em três linhas e disputa espaço com o endereço. A prévia visível começa cortada no topo. No editor demonstrativo, os controles são compreensíveis, mas a tela é longa, com muitos blocos abertos e linguagem de progresso pouco específica. |
| **E. Painel Meu site — 1280 px, painel do dono e editor demo** | **7,0** | A relação entre controles e prévia lado a lado é útil. Porém, o bloco de status e as margens empurram o conteúdo principal para baixo; na captura do painel do dono, a prévia mostra pouco da oferta e do botão na primeira tela. Os cartões de tema comunicam cor, mas pouco sobre o resultado de cada direção. |
| **F. Barbearia — 1280 px** | **6,0** | O alinhamento é consistente e a foto tem mais presença que no celular, mas a composição texto à esquerda/foto à direita é previsível. A cadeira vazia domina a imagem; oferta e CTA têm pouco peso proporcional ao título. As seções seguintes repetem grades e faixas largas com bastante espaço sem função. |
| **F. Salão — 1280 px** | **6,5** | A paleta é coesa e os serviços são fáceis de varrer em três colunas. Falta, porém, uma identidade própria: a estrutura é quase idêntica à barbearia, a imagem principal é impessoal e o fechamento tem CTA pouco contrastante com a faixa verde. |
| **G. Salão com fotos ruins/poucas e cadastro mínimo** | **Não avaliado** | Não há captura identificável desse cenário no conjunto recebido. A prévia da casa fictícia mostra alguns dados limitados, mas usa foto de banco e não comprova o comportamento com foto escura, desfocada, mal enquadrada ou sem foto. **É uma lacuna de aprovação.** |

A avaliação anterior presente em [CRITIQUE.md](/workspace/presenca-site/prints/rodada-1/CRITIQUE.md) atribuiu 9,0 às telas. Discordo dessa nota visual: há uma base organizada e honesta para uma demonstração, mas a primeira impressão, a diferenciação entre casas e o tratamento das situações com conteúdo incompleto ainda não atingem o padrão do briefing.

## Direção de arte: refazer a partir da primeira dobra

Hoje, “Corte Fino” e “Studio Aurora” têm marca em serifada fina, título grande na mesma família, descrição, oferta abaixo de uma linha, duas ações, estrelas e foto retangular. Mais abaixo, ambos seguem serviços, diferenciais com checks, galeria, equipe com monogramas, depoimentos, FAQ, endereço e CTA final. A repetição é suficientemente forte para tornar a personalização percebida mais próxima de uma troca de cores e textos do que de uma identidade própria.

A serifada de alto contraste também aparece no logo, nos títulos, nos nomes dos serviços e nos depoimentos. Ela poderia funcionar como acento, mas, nesse volume e com traços muito finos, torna a leitura visual frágil no celular e imprime a mesma personalidade às duas casas. As quebras em duas linhas não são ilegíveis; o problema é que a escala e o desenho tipográfico recebem mais atenção que a proposta comercial, sem oferecer um caráter memorável em troca.

**Recomendação:** criar duas direções visuais realmente distintas, mantendo componentes e dados compartilhados. Cada direção precisa continuar funcionando quando o nome da casa é longo, o texto muda, a foto é limitada e uma oferta não existe.

### Direção 1 — Barbearia: ofício contemporâneo

- **Tipografia:** sans com boa presença e desenho humano nos títulos; uma serifada de traço mais robusto pode aparecer pontualmente como acento, sem carregar a página inteira. Título curto, com quebra natural em 360–430 px.
- **Paleta:** carvão, marfim quente e cobre mais contido, preservando contraste em textos e botões.
- **Foto:** privilegiar uma pessoa trabalhando, uma mão ou um detalhe real da casa, em enquadramento generoso. Se só houver foto do ambiente, valorizá-la com um recorte deliberado, sem depender de uma cadeira vazia como identidade.
- **Primeira dobra mobile:** marca compacta; categoria e bairro em linha curta; título com uma promessa concreta que possa vir dos dados reais; imagem com presença; oferta legível como bloco comercial; botão principal claro. A composição precisa permitir que foto, oferta e ação tenham peso, sem sacrificar a leitura para forçar tudo no mesmo espaço.
- **Tom:** seguro e direto, com informação específica sobre atendimento, técnica ou experiência quando esses dados existirem.

### Direção 2 — Salão: editorial humano e luminoso

- **Tipografia:** uma serifada editorial menos extrema, combinada com sans limpa para informação e preço. Reduzir o uso da serifada em textos longos e depoimentos.
- **Paleta:** off-white quente, verde profundo e uma superfície secundária suave; garantir que o botão final se destaque da faixa em que está.
- **Foto:** dar protagonismo a pessoas, textura de cabelo ou atendimento real. Evitar que uma sequência de fotos de modelos diferentes pareça um catálogo de banco de imagens.
- **Primeira dobra mobile:** composição mais aberta e luminosa que a da barbearia, com foto e conteúdo integrados por uma grade própria. A oferta deve ser reconhecível como benefício concreto, com condição próxima e legível.
- **Tom:** acolhedor e específico sobre consulta, preço combinado ou cuidado, desde que o estabelecimento tenha informado ou confirmado essas práticas.

As duas alternativas são **direções de projeto**, não fatos a atribuir automaticamente às casas. Diferenciais, fotos, horários, avaliações e ofertas precisam vir de dados disponíveis; ausência deve resultar em uma composição honesta, sem promessas inventadas.

## Correções priorizadas para a próxima rodada

### P0 — Resolver antes de considerar a direção aprovada

1. **Refazer as primeiras dobras mobile dos dois temas como composições distintas.** Em 390 px, avaliar a hierarquia nesta ordem: quem é a casa e onde fica; motivo concreto para considerá-la; imagem com presença; oferta quando houver; ação de agendar. Testar também em 360 px, com nomes e textos mais longos. Não usar a mesma página com outra paleta como prova de duas identidades.

2. **Dar protagonismo comercial à oferta sem inventar urgência.** Na barbearia, “Corte + barba por R$ 65” deve ser percebido como benefício antes do texto de condições; “valor habitual R$ 75” e “primeira visita” devem permanecer próximos e legíveis. No salão, destacar a hidratação incluída e a condição de contratação. Verificar no fluxo que a entrada pela oferta preserva o contexto e apresenta condições e preço coerentes; os prints atuais não comprovam isso.

3. **Criar uma estratégia visual para fotos reais imperfeitas.** Projetar e capturar pelo menos: nenhuma foto; uma foto vertical escura de celular; uma foto horizontal de baixa resolução; duas imagens de proporções diferentes; e cadastro mínimo. Usar recorte ajustável e tratamento moderado, sem prometer recuperar detalhes que a imagem não tem. Sem foto adequada, a página deve ter uma composição tipográfica intencional, não um espaço vazio nem foto de banco apresentada como a casa.

4. **Corrigir a prévia do painel do dono no celular.** Na captura [owner-editor-390-preview.png](/workspace/presenca-site/prints/rodada-1/owner-editor-390-preview.png), a barra de configurações encosta na prévia e o topo do site aparece cortado; a marca longa quebra de modo desproporcional. Dar espaço real à prévia, ajustar a composição para nomes extensos e garantir que o dono consiga ver marca, título, oferta e CTA sem sobreposição. Conferir o estado também com rolagem real.

5. **Rever a barra fixa e as áreas de conteúdo no celular.** Na primeira dobra pública ela encobre o início do título seguinte; no agendamento, o rodapé cobre visualmente parte da lista. Reservar espaço para controles fixos e testar o último item de cada área rolável. A barra deve preservar acesso ao agendamento sem atrapalhar leitura ou interação.

### P1 — Fazer as páginas venderem melhor

6. **Transformar diferenciais em evidência da casa.** “Boa conversa” e “cuidado do seu jeito” são simpáticos, mas intercambiáveis. Priorizar informações concretas fornecidas pelo estabelecimento: especialidade, consulta, tempo de atendimento, forma de trabalho ou outra característica comprovável. Se não houver dado suficiente, não preencher a seção com promessas genéricas.

7. **Tornar serviços mais fáceis de comparar.** Aproximar nome, duração, preço e chamada em cada serviço; reduzir a extensão da descrição repetitiva e dar peso visual à ação. Na página de serviço, trazer nome, preço e duração para uma unidade de decisão fácil de encontrar, mantendo foto, inclusões e descrição. “É para você?” deve ajudar a escolher aquele serviço, sem frases que serviriam para qualquer corte.

8. **Tratar a prova social com precisão.** As demos identificam avaliações e depoimentos como fictícios, o que é correto. Em dados reais, mostrar nota e quantidade somente quando existirem e explicar a origem de “verificadas” quando essa afirmação for sustentada. No print do painel fictício aparece “1 avaliações verificadas”: corrigir o singular e conferir se o selo se aplica ao dado apresentado. Não preencher ausência de avaliações com números ou depoimentos inventados.

9. **Aproximar a localização de uma decisão prática.** Endereço e horários existem, mas a seção não oferece uma ação visível para chegar ao local. Quando houver endereço suficiente e destino válido, incluir “Como chegar”; disponibilizar contato apenas quando informado. Não afirmar que está aberto sem cálculo confiável de horário e fuso.

10. **Dar ritmo à página inteira.** Reduzir a sensação de sequência automática de seções com título grande, linha e três itens. Variar composição em função do conteúdo disponível; aproximar as informações que ajudam a decidir; evitar grandes faixas vazias no desktop. A página deve continuar equilibrada quando galeria, equipe ou avaliações não existirem.

### P1 — Simplificar o agendamento sem perder contexto

11. **Dar mais espaço útil à escolha no primeiro passo.** Compactar cabeçalho e indicador de etapas; avaliar se busca, categorias e “Agendar em grupo” precisam aparecer simultaneamente em telas pequenas. Manter visíveis o serviço selecionado, preço, duração e próximo passo.

12. **Explicitar o contexto quando a pessoa entra por um serviço.** A seleção marcada é um bom começo; um resumo claro do que já foi escolhido reduziria a dúvida sobre precisar escolher novamente. Se for possível selecionar vários serviços, deixar essa possibilidade compreensível sem confundir seleção única e múltipla. Confirmar comportamento em vez de inferi-lo pelo círculo e pelo check.

13. **Harmonizar o fluxo incorporado com o site.** O contraste entre o site editorial e o modal cheio de bordas, cápsulas e cartões arredondados é brusco. Melhorar proporções e consistência de controles, preservando a clareza operacional do fluxo existente.

### P2 — Refinar painel e acabamento

14. **Organizar o editor por tarefas do dono.** Dar prioridade a identidade, foto principal, informações para contato e oferta; deixar opções secundárias progressivamente acessíveis. Substituir indicadores vagos como “5 de 5 cuidados prontos” por linguagem que explique o que está completo e o que falta, quando aplicável. No desktop, aproximar a prévia das alterações e preservar área útil na primeira tela.

15. **Revisar detalhes tipográficos e de contraste.** Reduzir textos excessivamente pequenos, especialmente condições, metadados e ações secundárias; testar cores de marca variadas. No salão, reforçar o contraste perceptível entre CTA final e fundo. Conferir o resultado por medição e em tela real, pois os prints não permitem certificar conformidade.

16. **Revisar a consistência das imagens.** As fotos de serviço e galeria variam muito em temperatura, assunto e qualidade; algumas parecem pertencer a estabelecimentos diferentes. Construir um tratamento discreto e consistente, respeitando as fotos reais. Equipe com monogramas é um fallback honesto, mas não deve simular retratos ou aumentar artificialmente a prova de confiança.

## Critérios de aceite para a rodada 2

- Capturar **390 × 844 e 360 px**, primeiro a dobra e depois a página inteira, para as duas direções. Conferir nomes curtos e longos, oferta presente e ausente, e o início da seção seguinte sem conteúdo encoberto.
- Capturar serviço e agendamento nos dois temas, incluindo seleção vinda de serviço, oferta e profissional quando o fluxo suportar; mostrar também o fim das listas e estados relevantes.
- Capturar o **painel real com mocks**, em mobile e 1280 px, tanto nos controles quanto na prévia, incluindo nome longo e alterações visíveis.
- Apresentar o cenário de **cadastro mínimo e fotos ruins/poucas** descrito no P0, sem trocar as imagens por fotografias de banco para esconder o problema.
- Conferir a versão 1280 px depois de aprovar a composição mobile: peso da foto, proporção do CTA, ritmo da página e diferenças reais entre os dois estilos.
- Verificar contraste, foco, nomes acessíveis, alvos de toque, comportamento das sanfonas, rolagem e preservação do contexto por testes próprios. Nenhum desses itens pode ser certificado por esta avaliação estática.

**Escopo e limites:** avaliei os prints fornecidos e os arquivos adicionais da rodada, usando o briefing e as skills citadas como critérios. Conforme solicitado, não rodei o app, não gerei mocks nem novos prints e não editei código. Não há captura de 360 px no conjunto recebido; comportamento interativo, carregamento, acessibilidade técnica e robustez com fotos ruins permanecem sem verificação independente. As imagens de página inteira também podem registrar elementos fixos na posição da captura, então a extensão de eventuais obstruções precisa ser confirmada em navegação real.

Este relatório é a entrega completa para ser salva como `rodada-1-eval.md`; o arquivo não foi gravado porque o ambiente disponível nesta sessão permite apenas leitura.