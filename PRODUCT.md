# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Donos de barbearias e salões de beleza no Brasil e em Portugal. Empreendedores pequenos e médios, nem sempre técnicos, que usam o celular entre um cliente e outro. Precisam marcar horário, receber quem chega, cobrar e ver se o dia fechou.

**Secondary:** Clientes finais que abrem o link público da casa para marcar corte, barba, cabelo, unhas ou estética. Querem rapidez no navegador, sem baixar aplicativo.

## Product Purpose

AgendiX é a agenda que faz o salão crescer: link de agendamento, fila, CRM, checkout, financeiro e clube. Substitui caderno, planilha e WhatsApp bagunçado. Não é um ERP de módulos.

Success para o dono: o cliente marca sozinho, o horário vazio vira visita, o dia fecha no caixa.

## Positioning

Booking + crescimento da agenda, não “gestão completa”. O mecanismo que um vizinho de categoria não copia com honestidade: o cliente agenda no navegador pelo link da casa; a casa atende, cobra e reenche a grade no mesmo ritmo. Sem percentual inventado de movimento. Sem marketplace.

## Operating Context

- O dono olha o celular no balcão, sob luz de loja, com a casa andando.
- Cadastro escolhe barbearia ou salão; **dentro do produto** existem temas visuais distintos (barber / beauty). Isso é do app, não da vitrine.
- A vitrine de marketing (`/` anônimo) é uma superfície Persuade: uma marca só, para barbearias **e** salões.
- Trial de 20 dias, sem cartão no cadastro. Depois: Solo R$ 34,90 / Equipe R$ 59,90 (Brasil) ou Solo € 9,90 / Equipe € 19,90 (Portugal).
- HashRouter (`/#/rota`). Stack: React 19, TypeScript, Vite, Tailwind, Supabase, Vercel.

## Capabilities and Constraints

Confirmado no MVP: agenda por profissional, link público de booking, fila digital, CRM, checkout do atendimento, financeiro, comissões, produtos no serviço, clube com Pix (BR) ou MB WAY (PT), análises da grade, temas de app barbearia e salão.

Não faz parte do produto atual: aplicativo nativo, lembrete automático por WhatsApp, módulo de marketing, IA no plano, marketplace.

`company_id` vem da sessão. Multi-tenant com RLS.

## Brand Commitments

- Nome: AgendiX. Voz: pt-BR direto, dono→dono, frases curtas, você. Sem jargão de IA ou corporativo.
- Personalidade do produto (app): elegante, confiável, eficiente.
- **Vitrine de marketing (binding, 16 Set 2026):** chrome universal e neutro. Warm off-white / charcoal / no máximo um acento quieto. Sem o tema industrial escuro de barbearia e sem o sistema lavanda de salão na LP. Sem “escolha o seu visual” como split de página. Barbearias e salões na mesma frase.
- Anti-referências: planilha com cor; dashboard SaaS genérico; glassmorphism de enfeite; Inter em tudo; gradiente roxo-azul; cards aninhados; grid de ícones; depoimento fake; métrica inventada; stock no lugar de print real do produto.

## Evidence on Hand

- Prints reais de booking: `public/landing/shots/book-barber.png` (DEMO · Barbearia Corte Fino) e `public/landing/shots/book-beauty.png` (DEMO · Studio Aurora). Links públicos de demo em `pages/landingContent.ts`.
- Vídeos de nicho existem em `public/landing/videos/` — **não** são identidade da LP neutra; prova visual da vitrine são os prints.
- Não há depoimento de cliente, case, número de casas ou “+40%” para citar. Trabalho futuro não inventa.

## Product Principles

1. **Uma vitrine, dois públicos.** A LP fala com barbearia e salão no mesmo tom; o app é que troca de tema depois do cadastro.
2. **Prova, não claim.** Mostrar o link de agendamento de verdade. Sem métrica, avatar ou quote fabricados.
3. **Celular primeiro.** O dono decide no 390px. CTA de teste não pode cobrir preço.
4. **Trial honesto.** 20 dias, o que inclui e o que ainda não existe.
5. **Ações antes de enfeite.** O visitante sabe o que é, por que importa e o que clicar em segundos.

## Accessibility & Inclusion

WCAG 2.1 AA. Alvos de toque ≥44px. `prefers-reduced-motion`. Copy em português brasileiro. Contraste medido, não olhômetro.
