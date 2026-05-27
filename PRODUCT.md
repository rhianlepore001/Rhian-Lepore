# Product — AgendiX

## Register

product

## Users

**Primary:** Donos de barbearias e salões de beleza no Brasil (e expanding para Portugal). São empreendedores pequenos/médios, nem sempre técnicos, que precisam gerenciar agenda, financeiro e equipe no dia a dia. Usam majoritariamente celular.

**Secondary:** Clientes finais que agendam serviços (corte, barba, manicure, etc.) pelo link público do salão. Querem rapidez e confiança.

## Product Purpose

AgendiX é o sistema operacional do salão de beleza/barbershop. Substitui caderno de agenda, planilha de Excel e anotações no WhatsApp por uma plataforma unificada: agenda inteligente, controle financeiro, gestão de equipe e link de agendamento público.

Success = dono do salão consegue ver de um relance: quanto faturou hoje, quem está agendado, se está no lucro ou prejuízo.

## Brand Personality

**Premium mas acessível.** Sofisticado sem ser intimidador. O dono do salão deve se sentir orgulhoso de mostrar o app para o cliente. O cliente final deve confiar no link de agendamento.

Three-word personality: **elegante, confiável, eficiente**.

## Anti-references

- **Planilha Excel com cor:** O financeiro não pode parecer exportação de CSV.
- **Dashboard genérico de SaaS:** Sem big numbers + sparkline clichês. Sem identical-card grids com ícone + heading + texto.
- **Glassmorphism decorativo:** Blur e transparância só quando indicam camada sobreposta, nunca como enfeite.
- **Tema "lavado":** O modo claro deve ter contraste real, não parecer que foi desbotado.
- **Chatbot lento:** O fluxo de agendamento público não pode forçar conversa quando o cliente quer agendar rápido.

## Design Principles

1. **Mobile-first, sempre.** O barbeiro olha o celular entre um cliente e outro. A informação mais importante deve estar visível em 390px sem scroll.
2. **Ações antes de dados.** O que o usuário precisa FAZER deve estar mais acessível que o que ele precisa SABER.
3. **Calma sob pressão.** O salão pode estar lotado. A interface não deve gritar. Cores só para estados críticos (vermelho = cancelamento). O resto é neutro elegante.
4. **Progressive disclosure.** Configurações complexas (horários, comissões) começam colapsadas. O usuário avança no seu ritmo.
5. **Consistência cross-tema.** Barber (dark industrial) e Beauty (light elegante) devem parecer irmãos, não primos distantes.

## Accessibility & Inclusion

- WCAG 2.1 AA mínimo. Contrastes verificados com ferramenta, não olhômetro.
- Touch targets mínimo 48×48dp.
- Todos os estados de erro próximos ao campo, não no topo da página.
- `prefers-reduced-motion` respeitado.
- Copy em português brasileiro claro. Nenhum termo em inglês na interface final.

## Strategic Context

- **Business model:** SaaS B2B/B2C. Assinatura mensal por salão. Clientes finais usam de graça.
- **GTM:** Barbershops primeiro (tema barber), salões de beleza em sequência (tema beauty).
- **Key metric:** Número de agendamentos feitos pelo link público / mês.
- **Differentiator:** Agendamento público premium + gestão financeira simples (não é concorrente do ContaAzul, é o "Excel do salão").
