# PRD v1 — Site do estabelecimento (Presença)

Status: rascunho v1, 24/11/2026. Autor: Bob (Produto), com base no discovery feito com o Rhian e na pesquisa em `referencias.md` e `diagnostico.md`. Design visual entra depois deste PRD.

Legenda: **[Decisão]** = o Rhian decidiu. **[Hipótese]** = vamos montar e testar no beta ("precisamos ir montando e testando para saber"). **[Pesquisa]** = número ou padrão com fonte em `referencias.md`.

## 1. Resumo

O Presença dá a cada barbearia ou salão um **site próprio de posicionamento e vendas** em `agendixstudio.com/nome-do-salao`. O site convence quem **ainda não conhece** a casa e leva essa pessoa a agendar ali mesmo. O conteúdo nasce do que o dono já cadastrou no AgendiX (serviços, equipe, fotos, horários, endereço, avaliações). Ele personaliza tudo nos Ajustes: cor, textos, fotos, oferta e seções. O site precisa ser feito para ser encontrado no **Google**, o canal prioritário, e ficar bonito ao ser compartilhado no **Instagram** e no WhatsApp. **Não é** a página de agendamento atual com outra cara.

## 2. Problema

- **Dono:** hoje o salão existe no Instagram, no WhatsApp e, quando muito, num perfil do Google. Isso não basta para parecer profissional nem para converter quem chega pelo Google. Um site feito por agência custa caro; segundo a NanoGlobals, de US$1.500 a US$5.000 para um site polido. Os construtores (Wix, Squarespace) exigem montar e manter os serviços em dois lugares. [Pesquisa]
- **Cliente novo:** antes de marcar, quer ver trabalho, preço, duração, quem atende, avaliações e onde fica. 90% olham o Instagram e 88% checam o Google antes de agendar. 66% preferem agendar por link ou app, e 72% gostariam de marcar fora do horário comercial (Beauty Fair/Radar 2024, 560 consumidores). [Pesquisa]
- **AgendiX hoje:** a página `/#/book/slug` já tem boa parte dos dados, mas abre direto no fluxo de agendamento. Não apresenta nem vende a casa. Por causa do `#` na URL, **não aparece no Google**, e o link compartilhado mostra a prévia genérica do AgendiX, não a do salão. [Diagnóstico]

## 3. Públicos e jobs-to-be-done

| Público | Job (quando… quero… para…) | O que precisa ver |
|---|---|---|
| **Dono** (barbearia ou salão pequeno ou médio, BR e PT, pouco técnico, vive no Instagram e no WhatsApp) | Quando alguém pesquisa "barbearia" perto de mim ou vê meu Instagram, quero ter um site que me faça parecer profissional e transforme curiosos em clientes, **sem trabalho e sem agência**. | Um site pronto em minutos com o que já cadastrou; personalizar sem saber design; ver resultado (visitas, agendamentos). |
| **Cliente novo vindo do Google** (prioritário) | Quando procuro "[barbearia/salão] em [bairro]", quero decidir rápido se o lugar é bom, perto e cabe no bolso, e marcar sem precisar mandar mensagem. | Tipo e bairro logo de cara, nota, fotos reais, serviços com preço e duração, localização e horário, botão agendar. |
| **Cliente novo vindo do Instagram** | Quando gosto de um corte ou trabalho no Instagram, quero ver os serviços e o preço e marcar com aquele profissional. | Link da bio abrindo rápido no celular, a oferta para a 1ª visita, equipe, agendar com quem eu escolher. |
| **Cliente recorrente** | Já conhece a casa e agenda pelo WhatsApp, ou pelo site se preferir. [Decisão] | Não é o público-alvo do site. O agendamento continua disponível para ele. |

## 4. Objetivos e não-objetivos

**Objetivos**
1. O dono sente "isso é profissional, quero isso" ao ver o site dele montado. É o gatilho de upgrade para o Presença.
2. Converter visitantes novos (Google e Instagram) em agendamentos no próprio site.
3. Fazer o salão **aparecer melhor no Google** para buscas do tipo "[tipo] em [bairro/cidade]", coerente com o perfil do Google Meu Negócio. [Decisão]
4. Zero manutenção dupla: mudou o serviço ou o preço no AgendiX, o site muda junto.

**Não-objetivos (v1)**
- Prometer "primeiro lugar no Google". A promessa é honesta: "aparecer melhor". [Hipótese (d)]
- Site sob medida ou editor de arrastar e soltar livre. O sob medida é do plano topo, feito pela equipe. [Decisão]
- Blog, loja online completa, várias unidades e vários idiomas.
- Ofertas no Instagram: lá ele é prova social, sem oferta. [Decisão]
- Substituir o WhatsApp para recorrentes.
- Resposta automática no WhatsApp (outra frente do Presença; fora deste PRD).

## 5. Planos e o que cada um inclui [Decisão]

| Plano | Inclui |
|---|---|
| **AgendiX (R$19, trial de 30 dias)** | Página de agendamento atual (sem site). Domínio próprio como **oferta avulsa opcional**. |
| **Presença (R$49–69)** | Template completo de site/página de vendas em `agendixstudio.com/nome-do-salao`, personalizado pelo próprio dono nos Ajustes (cor, textos, fotos, seções, oferta). SEO local, prévia de compartilhamento e QR Code. Agendamento embutido. Somado ao WhatsApp que agenda, que fica fora deste PRD. |
| **Presença+** | Recursos de relacionamento: lembretes, reativação, lista de espera, avaliações Google, aniversário. O empurrão para avaliar no Google conversa com este site. |
| **Topo** | Site sob medida feito pela equipe, com domínio próprio e SEO. |

Pendente de decisão: preço do domínio avulso, e se o domínio do Presença+ é incluído ou avulso (ver Perguntas).

## 6. Requisitos funcionais — o site público

### 6.1 Endereço e acesso
- **RF-01** Cada salão no Presença tem o site em `agendixstudio.com/<slug>`, legível e indexável. **Aceite:** abrir a URL num navegador anônimo mostra o site do salão (não o login), e a ferramenta de inspeção de URL do Google vê o nome, a cidade e os serviços no conteúdo.
- **RF-02** O slug é o mesmo já usado no AgendiX. Uma troca de slug pelo dono mantém o endereço antigo redirecionando para o novo. **Aceite:** o slug antigo leva ao novo sem erro.
- **RF-03** Os links existentes `/#/book/<slug>` (bio do Instagram, Google, QR impresso) **continuam funcionando**. Ver seção 9.
- **RF-04** Salões do plano R$19 continuam com a página de agendamento atual. O site completo só aparece com o Presença ativo. Se o plano cair, o endereço continua levando ao agendamento, nunca a uma página quebrada. **Aceite:** um salão rebaixado não tem nenhum link morto.

### 6.2 Seções (ligáveis, em ordem configurável) [Hipótese (c)]
Ordem padrão sugerida, a testar:
1. **Topo:** nome e logo, frase de promessa ("Barbearia em [bairro]" sugerida), foto de capa, oferta da 1ª visita (se houver), botão **Agendar** e nota ou total de avaliações.
2. **Serviços:** todos os serviços ativos, por categoria, com preço (ou "a partir de") e duração. Cada um abre a página do serviço.
3. **Diferenciais:** 3–4 motivos para escolher a casa.
4. **Antes/depois e galeria:** fotos reais do trabalho e do ambiente.
5. **Equipe:** só a equipe com vínculo vigente, com foto, nome, especialidade e "Agendar com [nome]".
6. **Avaliações:** nota média, total e comentários (nomes abreviados).
7. **Clube/planos:** se o salão usa o Clube.
8. **Perguntas frequentes:** atraso, pagamento, estacionamento, crianças etc.
9. **Localização e horário:** endereço, mapa, ponto de referência, horário da semana, WhatsApp, Instagram.
10. **Chamada final:** repete a oferta e o Agendar.

- **RF-05** O botão **Agendar fica sempre ao alcance** no celular (fixo) e no topo do computador. [Pesquisa: padrão em Sauce, Squire, uogaweb]
- **RF-06** Uma seção sem conteúdo **não aparece** (ex.: equipe com 1 pessoa sem foto, galeria vazia). Nada de "em breve" ou espaço vazio.
- **RF-07** O site tem **mais que o agendamento**: no mínimo topo, serviços detalhados, galeria ou antes/depois, avaliações, localização e horário, e chamada final, com conteúdo vindo do cadastro. [Decisão] **Aceite:** um salão com cadastro completo publica um site com pelo menos 6 seções sem digitar nada além do que já tinha.

### 6.3 Página de serviço [Hipótese (b)]
- **RF-08** Cada serviço tem sua própria página no site, com endereço próprio. Mostra nome, descrição, o que inclui, duração, preço ou "a partir de" (com o motivo, ex.: "varia pelo comprimento"), fotos de antes/depois, para quem é indicado e o botão **Agendar este serviço**, que já entra no fluxo com o serviço escolhido.
- **RF-09** Campos vazios não aparecem. Um serviço só com nome, preço e duração ainda gera uma página digna.
- **Aceite:** do Google, a pessoa cai em "Corte degradê — [salão]", vê o preço e a duração e agenda em ≤ 4 toques até escolher o horário.

### 6.4 Oferta configurável [Hipótese (a)]
- **RF-10** O dono pode ligar **uma oferta principal**: desconto ou brinde na 1ª visita, serviço em destaque, combo com preço fechado ou plano do clube. Ela aparece no topo e na chamada final.
- **RF-11** A oferta tem texto curto, condição clara (ex.: "só 1ª visita") e validade opcional. Sem contagem regressiva nem urgência falsa.
- **RF-12** Combos com preço fechado podem ser agendados como um item. *A definir se reaproveita o agendamento de vários serviços que já existe.*
- **Aceite:** ligar ou desligar a oferta muda o site sem quebrar o layout. A oferta da 1ª visita não aparece como desconto aplicado para quem não é cliente novo. *Regra exata: pergunta aberta.*

### 6.5 Agendamento embutido
- **RF-13** Agendar abre o fluxo atual (serviço → profissional → data e hora → confirmação) **sem sair do site**, com a identidade visual do salão.
- **RF-14** Entradas com contexto: pelo serviço (já selecionado), pelo profissional (já selecionado), pela oferta (já aplicada ou indicada).
- **RF-15** WhatsApp como alternativa visível ("Prefere falar? Chame no WhatsApp"). [Pesquisa: Persona Beauty Studio]
- **Aceite:** um cliente novo agenda do topo do site até a confirmação no celular sem recarregar a página e sem sair do domínio.

### 6.6 SEO local, prévia e dados estruturados
- **RF-16** Cada site tem título e descrição próprios no formato "[Nome] — [Barbearia/Salão] em [bairro], [cidade]", editáveis com um padrão inteligente.
- **RF-17** **Prévia de compartilhamento** (WhatsApp, Instagram, Facebook) com o nome, a frase e a foto de capa do salão. **Aceite:** colar o link no WhatsApp mostra a capa e o nome do salão, não o AgendiX.
- **RF-18** Dados estruturados por salão (tipo barbearia ou salão, endereço, telefone, horário, faixa de preço, nota, serviços), coerentes com o perfil do Google. **Aceite:** passa sem erros no teste de resultados aprimorados do Google.
- **RF-19** Nome, endereço e telefone idênticos aos do perfil do Google. O painel orienta o dono a conferir e a colocar o link do site no perfil do Google. [Pesquisa: r/Barber, Booksy, Infuse]
- **RF-20** Sitemap com os sites e as páginas de serviço publicados. Sites despublicados ou de planos inativos não ficam no índice como site completo.
- **RF-21** Empurrão para avaliação no Google pós-atendimento (Presença+), com o link do perfil do salão. [Hipótese (d)]
- **Promessa ao dono:** "Seu salão aparece melhor no Google". Nunca "primeiro lugar". [Decisão]

### 6.7 Compartilhamento e QR
- **RF-22** Nos Ajustes: copiar o link, compartilhar no WhatsApp, "link para a bio do Instagram" e **QR Code** para baixar ou imprimir (balcão, espelho, cartão).
- **RF-23** O link carrega a origem (Instagram, Google, QR) para medir de onde vêm visitas e agendamentos, sem dados pessoais.

## 7. Requisitos do painel de personalização (Ajustes → Meu site)

- **RP-01 Pronto de cara (padrões inteligentes):** ao ativar o Presença, o site já vem montado com o cadastro: nome, logo, capa, galeria, serviços, equipe vigente, horário, endereço, Instagram, WhatsApp, avaliações e o tipo de negócio (barbearia ou salão) definindo o estilo inicial. Frase de promessa sugerida: "[Tipo] em [bairro]". FAQ com perguntas comuns pré-preenchidas a partir da política já cadastrada.
- **RP-02 Configurável:**
  - **Visual:** cor principal, 2–3 estilos prontos (direção visual vem do design), logo e capa;
  - **Textos:** promessa, sobre, diferenciais, FAQ, título e descrição para o Google;
  - **Fotos:** galeria, antes/depois e fotos por serviço e por profissional;
  - **Seções:** ligar, desligar e reordenar;
  - **Oferta:** tipo, texto, condição e validade;
  - **Serviço:** descrição, o que inclui, indicado para e "a partir de";
  - **Contato:** WhatsApp, Instagram e ponto de referência.
- **RP-03 Nada é duplicado:** serviços, preços, durações, equipe e horários continuam editados nos lugares de hoje e refletem no site.
- **RP-04 Pré-visualização** em celular e computador antes de publicar, com os dados reais.
- **RP-05 Publicar e despublicar** explícitos. Mudanças só vão ao ar ao publicar, para evitar site quebrado durante a edição. *A testar: rascunho ou salvamento direto.*
- **RP-06 Checklist de qualidade** ("seu site está 70% completo: falta foto de capa, 3 serviços sem descrição"), com links diretos para resolver. Linguagem de incentivo, sem bloquear a publicação.
- **RP-07 Feito para o celular:** o dono configura tudo pelo telefone. Fotos sobem da galeria do celular.
- **RP-08 Ajuda curta** em cada campo, com exemplo do que funciona (ex.: diferencial bom vs. genérico).
- **Aceite:** um dono que nunca editou um site ativa, ajusta cor e promessa, confere a prévia e publica em **menos de 10 minutos**. É uma meta, a medir no beta.

## 8. Requisitos não-funcionais

- **RNF-01 Mobile-first:** pensado para 360–414 px primeiro. Sem rolagem horizontal de 320 px a 1440 px.
- **RNF-02 Rápido no 4G:** o conteúdo principal aparece rápido sem precisar baixar o app inteiro. Meta: Core Web Vitals "bom" (LCP ≤ 2,5 s, CLS ≤ 0,1, INP ≤ 200 ms) no celular. Fotos otimizadas automaticamente.
- **RNF-03 Acessibilidade:** WCAG 2.1 AA (contraste, alt nas fotos, foco visível, alvos de toque ≥ 44 px). Qualquer cor escolhida pelo dono mantém o contraste legível (o sistema ajusta ou avisa).
- **RNF-04 LGPD e privacidade:** nenhum dado de cliente final exposto. Avaliações com nome abreviado ou consentido, sem telefone nem e-mail. Medição de visitas sem dados pessoais; aviso de cookies se houver rastreamento além do essencial. Política de privacidade e termos acessíveis.
- **RNF-05 Só equipe vigente:** ex-colaboradores nunca aparecem (coerente com o #253).
- **RNF-06 Segurança:** o site público só lê dados públicos e aprovados pelo dono, mantendo o padrão restrito atual das consultas públicas e a CSP vigente.
- **RNF-07 Disponibilidade:** se a agenda estiver fora do ar, o site ainda mostra o conteúdo e o WhatsApp.
- **RNF-08 BR e PT:** moeda, formato de telefone e textos-padrão por região (pt-BR / pt-PT).

## 9. Compatibilidade com links existentes

- Os links `/#/book/<slug>` já divulgados continuam funcionando. Com o Presença ativo, devem levar ao site ou ao agendamento sem erro. *A decidir: qual dos dois.*
- `/#/pro/<slug>`, `/#/clube/<slug>`, `/#/minha-area/<slug>` e `/#/queue/<slug>` seguem funcionando.
- O endereço novo `agendixstudio.com/<slug>` não pode colidir com rotas do produto (login, landing, termos etc.). É preciso uma lista de nomes reservados.
- **Aceite:** um teste com os links antigos de 5 salões de verdade não mostra nenhum 404 nem cai no login.

## 10. Opções técnicas para SEO (para decisão, sem implementar)

O roteamento por `#` impede a indexação. Opções levantadas no diagnóstico:
1. **Rotas de caminho só para os sites públicos**, com HTML gerado no servidor ou na borda (título, prévia, dados estruturados e conteúdo no HTML). O app interno continua como está.
2. **Pré-renderização** por salão ao publicar ou periodicamente. Mais simples; risco de ficar desatualizado.
3. **Migrar o app inteiro** para rotas sem `#`. Maior risco (login, onboarding, links antigos); não recomendado como 1º passo.
4. **Complementos independentes:** sitemap, canonical e a orientação ao dono para ligar o site ao perfil do Google.

Critérios para decidir: indexação real e prévia correta, velocidade no 4G, não tocar no login e no cadastro, manter os links antigos, custo na Vercel e esforço.

## 11. Hipóteses a testar no beta

| # | Hipótese | Como medir |
|---|---|---|
| H1 | Ver o próprio site montado faz o dono querer o Presença. | % dos donos do beta que dizem "quero pagar", e intenção de pagar R$49 vs. R$69 em entrevista. |
| H2 | Uma oferta de 1ª visita aumenta a conversão de visitantes novos. | Taxa visita → agendamento com e sem oferta (alternar por período ou por salão). |
| H3 | A página de serviço detalhada converte mais que a lista simples. | Agendamentos vindos de páginas de serviço; tempo até agendar. |
| H4 | O conjunto e a ordem de seções (c) servem para barbearia e salão. | Rolagem até cada seção, cliques em Agendar por seção, seções que o dono desliga. |
| H5 | Site ligado ao perfil Google mais página "[tipo] em [bairro]" fazem o salão aparecer melhor. | Impressões e cliques no Google Search Console por salão, antes e depois (4–8 semanas); visitas de origem Google. |
| H6 | O empurrão pós-atendimento aumenta as avaliações no Google. | Nº de avaliações novas no perfil, antes e depois. |
| H7 | O dono configura sozinho em menos de 10 minutos. | Tempo da ativação à publicação; pedidos de ajuda. |
| H8 | O Instagram como prova social, sem oferta, ajuda a converter. | Agendamentos com origem Instagram vs. outras origens. |

## 12. Métricas de sucesso

- **Ativação:** % de donos no Presença com o site publicado em até 7 dias; checklist de qualidade ≥ 80%.
- **Conversão:** visitas únicas → início de agendamento → agendamento confirmado, por origem (Google, Instagram, QR, direto).
- **Aquisição:** agendamentos de **clientes novos** vindos do site por salão por mês.
- **Google:** impressões e cliques por salão (Search Console); avaliações novas no Google.
- **Negócio:** conversão R$19 → Presença; retenção do Presença em 60 e 90 dias.
- **Qualidade:** Core Web Vitals "bom" em ≥ 75% das visitas no celular; zero incidentes de dados expostos.

As metas numéricas ficam para depois do beta. Não temos linha de base hoje.

## 13. Plano de validação (beta com 3–5 donos)

1. **Recrutar** 3–5 donos reais: barbearia e salão, e pelo menos 1 em Portugal se possível, com cadastro razoável (serviços com preço e algumas fotos).
2. **Entrevista inicial** (20 min): como os clientes novos chegam hoje, o que ele acha de site, o que já tentou, quanto pagaria.
3. **Montar o site** de cada um com os dados reais (protótipo ou versão beta) e mostrar. Captar a reação: o "uau", o que falta, o que tiraria.
4. **Deixar ele personalizar sozinho** e observar (tempo, dúvidas).
5. **Publicar** e colocar o link na bio do Instagram e no perfil Google por 4–8 semanas.
6. **Medir** H1–H8 e fazer a entrevista final. Decidir preço, seções e oferta padrão.

Dados de demonstração devem ser rotulados como fictícios. Nada vai para produção sem o OK do Rhian.

## 14. Riscos

| Risco | Mitigação |
|---|---|
| Virar só "o agendamento com outra cara". | RF-07 e critérios de aceite de conteúdo mínimo; avaliação do Rhian antes do beta. |
| SEO não entregar resultado visível em semanas. | Promessa honesta; medir pelo Search Console; vender também prévia, profissionalismo e conversão. |
| Fotos ruins ou faltando deixam o site feio. | Esconder seções vazias, checklist, dicas de foto, estilos que funcionem com poucas fotos. |
| Cor escolhida pelo dono quebra o contraste. | Ajuste automático e aviso (RNF-03). |
| Expor dados de clientes ou de ex-equipe. | RNF-04 e RNF-05; testes específicos. |
| Quebrar links antigos ou colidir com rotas. | Seção 9; nomes reservados; teste com links reais. |
| Lentidão por carregar o app inteiro. | RNF-02; medir antes do beta. |
| Oferta mal configurada (desconto indevido). | Regra clara de 1ª visita; texto da condição visível. |
| Concorrência (Trinks, Booksy, Squire) com site incluído ou add-on. | Diferencial: zero manutenção dupla, foco BR e PT, Google e WhatsApp juntos, sem comissão por cliente novo. [Pesquisa: Trym] |

## 15. Fases

**MVP (beta)**
- Site em `agendixstudio.com/<slug>`, indexável, com prévia de compartilhamento e dados estruturados.
- Seções: topo com promessa, oferta e Agendar; serviços; galeria ou antes/depois; equipe; avaliações; localização e horário; chamada final. Liga/desliga e ordem.
- Página de serviço detalhada com "Agendar este serviço".
- Uma oferta configurável (1ª visita ou serviço em destaque).
- Agendamento embutido sem sair do site; WhatsApp alternativo.
- Ajustes → Meu site: padrões do cadastro, cor, 2–3 estilos, textos, fotos, prévia, publicar; checklist; link, QR e bio.
- Links antigos funcionando; só equipe vigente; LGPD.

**Depois (v2+)**
- Diferenciais e FAQ avançados, combos com preço fechado, destaque do Clube.
- Avaliações do Google no site e empurrão pós-atendimento (Presença+).
- Portfólio por profissional, puxar fotos do Instagram, lookbook ou "descubra seu corte".
- Domínio próprio (avulso e topo), várias unidades, painel de resultados (visitas e agendamentos por origem).
- Site sob medida (topo) com fluxo de pedido para a equipe.

## 16. Perguntas em aberto para o Rhian

1. Com o Presença ativo, o link antigo `/#/book/slug` deve abrir o **site** ou continuar no **agendamento direto**?
2. Preço do **domínio próprio avulso** no plano R$19, e se o Presença+ inclui domínio ou é sempre avulso.
3. Faixa final do Presença: **R$49 ou R$69**? Testar as duas no beta?
4. Oferta da 1ª visita: como saber que é cliente novo (telefone já cadastrado?) e quem arca com o desconto. O dono decide tudo?
5. Quais 3–5 donos convidar para o beta? Algum de Portugal?
6. O site do plano **topo** usa a mesma base (template avançado) ou é independente?
7. Slug: permitir que o dono troque livremente? E as regras para nomes repetidos ("barbearia-do-joao")?
8. Avaliações no site no MVP: só as internas do AgendiX, ou já tentar as do Google?
9. O site deve ter versão pt-PT (texto e moeda) já no MVP?
10. Medição: podemos usar o Google Search Console por salão (exige o dono verificar) ou só medição própria?
