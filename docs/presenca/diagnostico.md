# Diagnóstico — o que o AgendiX já tem para o site do estabelecimento

Análise somente leitura em 24/11/2026. Base: `main` em `888b84f4` (#253), sincronizada com `origin/main`. Não alterei código, banco nem produção.

## 1. Superfícies públicas que já existem

| Rota (HashRouter) | Arquivo | O que mostra hoje |
|---|---|---|
| `/#/book/:slug` | `pages/PublicBooking.tsx` (2.244 linhas), `components/PublicBusinessHeader.tsx` | **Já é quase um "mini-site" com agendamento.** Cabeçalho com capa, logo, nome, nota e total de avaliações (abre a lista), botões WhatsApp, Instagram e "Como chegar" (busca no Google Maps pelo endereço), **galeria em carrossel** com visualização ampliada e alternância claro/escuro. Logo abaixo, uma navegação "Explore o estabelecimento" (serviços e produtos). O fluxo de agendamento tem 4 etapas: serviços (com busca, categorias, foto e descrição), profissional, data e hora, revisão. Inclui política de agendamento, agendamento em grupo, vitrine de produtos e reagendar ou cancelar pelo cliente. |
| `/#/pro/:slug` | `pages/ProfessionalPortfolio.tsx` (70 linhas) | Cartão simples do profissional: foto, nome, cargo, empresa, bio e o botão "Ver serviços e horários", que leva a `/book/:slug?pro=` com o profissional já escolhido. Ainda não tem fotos de trabalhos do profissional. |
| `/#/minha-area/:slug` | `ClientArea` | Área do cliente final. |
| `/#/clube/:slug` | `JoinClub` | Adesão ao clube de assinatura. |
| `/#/queue/:slug` | `QueueJoin` | Entrada na fila de espera. |
| `/#/avaliar/:token` | `PublicReview` | O cliente avalia o atendimento. É a fonte das avaliações **internas** exibidas no `/book`. |

## 2. Dados que já existem e podem alimentar o site sem trabalho extra do dono

| Dado | Onde é editado | Exposto publicamente por |
|---|---|---|
| Nome, telefone (WhatsApp), endereço, Instagram, **slug** | Ajustes → Geral | `get_public_profile_by_slug` |
| Logo e foto de capa | Ajustes → Geral ("Identidade Visual") | idem |
| **Galeria do estabelecimento**, ordenável | Ajustes → Geral (`BusinessGalleryManager`) | `get_public_gallery_catalog` (`business_galleries`) |
| Tipo de negócio, barbearia (`barber`) ou salão (`beauty`) | Cadastro | Define o tema: barbearia em escuro e dourado, salão em claro e lilás |
| Horário de funcionamento, fuso, região BR/PT, política de cancelamento e atraso | Ajustes → Geral | `get_public_business_settings_json` |
| Serviços com preço, duração, categoria, descrição e foto | Ajustes → Serviços | `get_public_services_catalog`, `get_public_categories_catalog` |
| Equipe com foto, nome, cargo, bio e especialidades | Ajustes → Equipe | profissionais públicos, `get_public_professional_portfolio` |
| Avaliações (nota média, total, comentários) | Coletadas via `/avaliar` | Usadas no `/book` |
| Produtos (vitrine opcional) | Produtos | `get_public_products_catalog` |
| Clube / planos | Ajustes → Clube | `/clube/:slug` |
| Horários livres em tempo real | Agenda | `get_available_slots_v2`, `get_full_dates_v2` |

Conclusão: **cerca de 80% do conteúdo de um site de barbearia ou salão já está cadastrado** (é uma estimativa). O que falta é sobretudo uma *apresentação de site* e a *descoberta pelo Google*, não dados.

## 3. Lacunas frente às referências

| Lacuna | Por que importa (referência) | Esforço para o dono |
|---|---|---|
| **Não tem página de "vitrine"**: o `/book` abre direto no fluxo "Escolha seus serviços". | Os sites de referência apresentam a casa (primeira dobra, fotos, equipe, avaliações) e mantêm o agendar a um toque. | Nenhum: dá para montar com os dados que já existem. |
| **Não tem texto de apresentação ou "sobre"**, nem frase de posicionamento. | Live True, HER e Dom Barbudo dizem "o que e onde" na primeira linha. | Baixo: 1 frase e 1 parágrafo, ou sugestão automática. |
| **Horário de funcionamento** não aparece como bloco visível no cabeçalho (só é usado no cálculo de horários). *Confirmar visualmente.* | Logística (umhorario, revisões). | Nenhum. |
| **Mapa e referência de localização** são só um botão "Como chegar". | Localização foi o fator nº 1 no TCC; "endereço vago" é sinal de alerta. | Nenhum. Um ponto de referência seria opcional. |
| **Avaliações do Google** não aparecem; só as internas. | 88% checam o Google. As revisões preferem avaliação de terceiros. | Médio: vincular o perfil Google. Isso já está no Presença+. |
| **Personalização visual mínima**: o tema é fixo por tipo de negócio, sem cor de marca nem estilo. | Gran Cavalheiro e Yello: identidade própria. | Baixo: escolher 1 cor e 1 de 2 ou 3 estilos. |
| **Portfólio por profissional** sem fotos de trabalho. | "O cliente escolhe a pessoa" (P22, Church Barber). | Médio: fotos por profissional. |
| **FAQ e políticas** como bloco do site (atraso, formas de pagamento, estacionamento, crianças). | Dom Barbudo, Asgard, Cut & Shout. | Baixo, com perguntas padrão pré-preenchidas. |
| **Não há link com o Instagram** além do botão. | O dono vive no Instagram e quer "puxar" as fotos de lá. Hipótese. | Depende da API da Meta. Avaliar. |
| **Domínio próprio** (ex.: `barbeariadoze.com.br`). | É o pacote "topo" na estratégia. O Squire oferece. | Alto: compra de domínio e DNS. Fica fora do MVP. |

## 4. HashRouter e SEO — impacto (crítico)

O que vi:
- O app usa HashRouter, então a URL pública de um salão é `agendixstudio.com/#/book/slug`.
- Buscadores **ignoram o que vem depois do `#`**. Para o Google, todas as páginas de todos os salões são a mesma URL, `agendixstudio.com/`, e hoje a raiz sem sessão redireciona para o login (`docs/site-v2.md`).
- `vercel.json` reescreve qualquer caminho para o `index.html`. Testei `https://www.agendixstudio.com/book/teste`: responde 200 com o título genérico "AgendiX — Agenda e gestão para barbearias e salões". Como o roteador é por hash, esse caminho não mostra o salão.
- Não existe meta ou OG por estabelecimento: nenhum `document.title`, `og:` ou JSON-LD em `PublicBooking.tsx`. **Um link do salão colado no WhatsApp ou no Instagram mostra a prévia genérica do AgendiX**, não a capa e o nome do salão.

Consequência: hoje o site do salão **não aparece no Google** por nome ou bairro e **não gera prévia bonita ao compartilhar**. As duas coisas são centrais para o que o dono espera de um "site".

Opções (para decidir no discovery; nada implementado):
1. **Rotas de caminho só para o site público** (ex.: `agendixstudio.com/s/slug` ou `slug.agendixstudio.com`), com HTML gerado no servidor ou na borda (Vercel Function ou middleware). O HTML injeta título, descrição, OG com a capa e JSON-LD `HairSalon`/`BarberShop` (endereço, horário, nota). O app interno continua com HashRouter.
2. **Pré-renderização** periódica ou ao salvar Ajustes: gera um HTML estático por slug. É mais simples, mas fica desatualizado se a regeneração falhar.
3. **Migrar o app inteiro para BrowserRouter**: maior risco (login, onboarding, deep links já distribuídos). Não recomendado como primeiro passo.
4. Não depende de rota: **sitemap** com os slugs, **canonical** e a orientação ao dono para colocar o link no perfil Google e na bio do Instagram.

Restrições a respeitar: a CSP aplicada atualmente (`script-src 'self'`…), o login e o cadastro preservados, e os links `/#/book/slug` já divulgados pelos clientes, que precisam continuar funcionando (redirecionar ou manter os dois).

## 5. Riscos e cuidados já visíveis

- **LGPD**: o site público não pode expor dados de clientes finais (nomes nas avaliações devem ser abreviados ou consentidos; nada de telefone). As RPCs públicas atuais são `SECURITY DEFINER` com escopo restrito, e é preciso manter esse padrão.
- **Ex-colaboradores**: a equipe exibida precisa respeitar o vínculo vigente (#253 já exige isso para os dados da empresa; conferir na listagem pública).
- **Performance**: o `PublicBooking.tsx` é grande. Uma vitrine que carregue o bundle inteiro do app pode ficar lenta no 4G. As referências insistem em "rápido no celular".
