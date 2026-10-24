# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19, TypeScript 5.8, Vite 6, Tailwind CSS, Supabase (auth + banco), HashRouter. Multi-tenant com isolamento por `company_id`. Deploy Vercel.

## Users

**Primary:** Donos de barbearias e salões de beleza no Brasil (expansão para Portugal). Empreendedores pequenos/médios, pouco técnicos, que gerenciam agenda, financeiro e equipe no celular entre atendimentos.

**Secondary:** Clientes finais que agendam pelo link público do salão. Querem rapidez, confiança e zero fricção.

## Product Purpose

AgendiX é o sistema operacional do salão. Substitui caderno, planilha e WhatsApp por agenda, financeiro, equipe e link de agendamento público em uma interface única.

**Success:** o dono vê de relance quanto faturou hoje, quem está agendado e se está no lucro ou prejuízo — sem abrir três apps.

## Positioning

Agendamento público premium + gestão financeira simples para o salão. Não compete com ContaAzul; é o "Excel do salão" com cara de produto que o dono tem orgulho de mostrar ao cliente.

## Operating Context

- Uso majoritário em celular (390px), entre um cliente e outro.
- Dois temas de negócio: `barber` (dark industrial / ouro) e `beauty` (elegante / violeta), cada um com dark e light.
- Rotas internas via HashRouter (`/#/dashboard`, `/#/agenda`); rotas públicas de booking e fila.
- Staff entra por link de registro; owner gerencia assinatura e configurações.

## Capabilities and Constraints

- Agenda, CRM de clientes, financeiro, equipe, serviços, assinatura Stripe, link público de agendamento.
- Multi-tenant: todo query filtra por `company_id` da sessão; RLS ativo.
- Copy da interface em português brasileiro; sem termos em inglês na UI final.
- Features de IA (OpenRouter) são pós-MVP — não priorizar.
- Design system centralizado em `design-system/tokens.css` + `useBrutalTheme()`.

## Brand Commitments

**Nome:** AgendiX.

**Personalidade:** premium mas acessível — elegante, confiável, eficiente. O dono se orgulha de mostrar o app; o cliente confia no link de agendamento.

**Anti-referências visuais (binding):**
- Financeiro que parece exportação de CSV (big numbers + sparklines).
- Dashboard genérico de SaaS (grids idênticos de ícone + heading + texto).
- Glassmorphism decorativo (blur só em overlay/modal).
- Tema claro "lavado" sem contraste real.
- Fluxo público que força chatbot quando o cliente quer agendar rápido.

## Evidence on Hand

- `design-system/tokens.css` — fonte única de tokens visuais (v1.1).
- `design-system/MASTER.md` — guia operacional do design system.
- `components/ui/*` — componentes canônicos (Button, Card, Input, Modal, etc.).
- Critiques históricas arquivadas em `.impeccable/critique/_archive/` — referência apenas, não autoridade.

## Product Principles

1. **Mobile-first, sempre.** Informação crítica visível em 390px sem scroll desnecessário.
2. **Ações antes de dados.** O que fazer deve estar mais acessível que o que saber.
3. **Calma sob pressão.** Cores só para estados críticos; o resto é neutro elegante.
4. **Progressive disclosure.** Configurações complexas começam colapsadas.
5. **Consistência cross-tema.** Barber e beauty são irmãos, não primos distantes.

## Accessibility & Inclusion

- WCAG 2.1 AA mínimo; contrastes verificados com ferramenta.
- Touch targets mínimo 44×44px.
- Erros inline, próximos ao campo.
- `prefers-reduced-motion` respeitado.
